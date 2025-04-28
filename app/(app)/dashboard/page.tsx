// app/(app)/dashboard/page.tsx
'use client'; // Necessário para estado, efeitos e interações

import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner'; // Spinner de loading
import {
  Task,
  Activity,
  getTasks,
  addTask,
  deleteTask,
  addActivityToTask,
  updateActivityStatus,
  calculateProgress // Importa a função de cálculo
} from '@/lib/firebase/firestoreService';
import { Timestamp } from 'firebase/firestore';

// --- Componente para exibir UM Card de Tarefa ---
interface TaskCardProps {
  task: Task;
  onDelete: (taskId: string) => void;
  onAddActivity: (taskId: string, activityText: string) => void;
  onToggleActivity: (taskId: string, activityId: string, currentStatus: boolean) => void;
  isUpdating: boolean; // Para feedback visual em operações
}

const TaskCard = ({ task, onDelete, onAddActivity, onToggleActivity, isUpdating }: TaskCardProps) => {
  const [newActivityText, setNewActivityText] = useState('');
  const progress = calculateProgress(task.activities); // Calcula o progresso aqui

  const handleAddActivitySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newActivityText.trim() && task.id && !isUpdating) { // Verifica se não está atualizando
      onAddActivity(task.id, newActivityText);
      setNewActivityText(''); // Limpa input
    }
  };

  const handleDeleteClick = () => {
     // Adiciona uma confirmação simples antes de deletar
     if (window.confirm(`Tem certeza que deseja excluir a tarefa "${task.title}"?`)) {
       if (task.id && !isUpdating) {
         onDelete(task.id);
       }
     }
   };

  return (
    <div className={`bg-white shadow-md rounded-lg p-4 md:p-6 mb-6 transition duration-300 ease-in-out ${isUpdating ? 'opacity-70 animate-pulse' : ''}`}>
      {/* Título da Tarefa */}
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{task.title}</h3>

      {/* Data de Criação (opcional) */}
       {/* <p className="text-xs text-gray-500 mb-3">
           Criada em: {task.createdAt.toDate().toLocaleDateString('pt-BR')}
        </p> */}


      {/* Indicador de Progresso */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
           <span className="text-sm font-medium text-gray-600">Progresso:</span>
           <span className="text-sm font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
           <div
            className="bg-blue-600 h-2.5 rounded-full transition-width duration-500 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Lista de Atividades */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Atividades:</h4>
        {task.activities && task.activities.length > 0 ? (
          <ul className="space-y-2">
            {task.activities.map(activity => (
              <li key={activity.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                 <div className="flex items-center">
                   <input
                    type="checkbox"
                    id={`activity-${activity.id}`}
                    checked={activity.completed}
                    onChange={() => task.id && !isUpdating && onToggleActivity(task.id, activity.id, activity.completed)}
                    disabled={isUpdating} // Desabilita durante update
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                   />
                   <label
                    htmlFor={`activity-${activity.id}`}
                     className={`ml-2 text-sm ${activity.completed ? 'text-gray-500 line-through' : 'text-gray-800'} ${isUpdating ? 'cursor-not-allowed': 'cursor-pointer'}`}
                  >
                    {activity.text}
                  </label>
                </div>
                 {/* Adicionar botão de deletar atividade aqui seria útil */}
               </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">Nenhuma atividade adicionada.</p>
        )}
      </div>

      {/* Formulário para Adicionar Nova Atividade */}
      <form onSubmit={handleAddActivitySubmit} className="flex gap-2 mt-4">
        <input
          type="text"
          value={newActivityText}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setNewActivityText(e.target.value)}
          placeholder="Nova atividade..."
          disabled={isUpdating}
          className="flex-grow px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={!newActivityText.trim() || isUpdating}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Add
        </button>
      </form>

      {/* Botão para Deletar Tarefa */}
      <div className="mt-4 text-right">
        <button
          onClick={handleDeleteClick} // Usa o handler com confirmação
          disabled={isUpdating}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Excluir Tarefa
        </button>
      </div>
    </div>
  );
};

// --- Componente Principal da Página Dashboard ---
export default function DashboardPage() {
  const { user } = useAuth(); // Pega infos do usuário
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoadingTasks, setIsLoadingTasks] = useState(true); // Loading da lista inicial
  const [isSubmittingTask, setIsSubmittingTask] = useState(false); // Loading ao adicionar tarefa
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null); // Indica qual card está em operação
  const [error, setError] = useState<string | null>(null);

  // Busca tarefas ao carregar o componente ou quando o usuário muda
  const fetchTasks = useCallback(async () => {
    if (!user) return; // Não faz nada se não houver usuário
    console.log("Buscando tarefas...");
    setIsLoadingTasks(true);
    setError(null);
    try {
      const fetchedTasks = await getTasks();
      // Validação extra (opcional): garantir que createdAt é um Timestamp
      const validTasks = fetchedTasks.map(task => ({
          ...task,
          createdAt: task.createdAt instanceof Timestamp ? task.createdAt : Timestamp.now()
      }));
      setTasks(validTasks);
    } catch (err) {
      console.error("Erro detalhado ao buscar tarefas:", err);
      setError("Falha ao carregar suas tarefas. Tente recarregar a página.");
    } finally {
      setIsLoadingTasks(false);
    }
  }, [user]); // Depende do objeto user

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]); // Executa a função de busca

  // --- Handlers ---
  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user || isSubmittingTask) return;

    setIsSubmittingTask(true);
    setError(null);
    const success = await addTask(newTaskTitle);
    if (success) {
      setNewTaskTitle(''); // Limpa input
      fetchTasks(); // Atualiza a lista
    } else {
      setError("Não foi possível adicionar a tarefa. Tente novamente.");
    }
    setIsSubmittingTask(false);
  };

  // O wrapper garante que o estado `updatingTaskId` seja definido/limpo
  const makeUpdateWrapper = <T extends any[]>(
      asyncFunc: (taskId: string, ...args: T) => Promise<boolean>
  ) => {
      return async (taskId: string, ...args: T) => {
          if (updatingTaskId) return; // Evita múltiplas operações simultâneas
          setUpdatingTaskId(taskId); // Marca o card como 'atualizando'
          setError(null);
          const success = await asyncFunc(taskId, ...args);
          if (!success) {
              setError("Ocorreu um erro ao atualizar a tarefa.");
          } else {
              // Atualiza a lista localmente APÓS sucesso, SE a função original não recarregar
               fetchTasks(); // Ou apenas fetchTasks() para recarregar tudo
          }
          setUpdatingTaskId(null); // Libera o card
      };
  };

   // Usa o wrapper para as funções que modificam um card específico
  const handleAddActivity = makeUpdateWrapper(addActivityToTask);
  const handleToggleActivity = makeUpdateWrapper(updateActivityStatus);
  const handleDeleteTask = makeUpdateWrapper(deleteTask);


  // --- Renderização ---
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Meu Painel de Tarefas</h1>

      {/* Formulário para Adicionar Nova Tarefa */}
      <form onSubmit={handleAddTask} className="mb-8 bg-white p-4 rounded-lg shadow">
        <label htmlFor="new-task-title" className="block text-sm font-medium text-gray-700 mb-1">
          Adicionar Nova Tarefa:
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            id="new-task-title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="O que precisa ser feito?"
            required
            disabled={isSubmittingTask}
            className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim() || isSubmittingTask}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmittingTask ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </form>

      {/* Exibição de Erros Gerais */}
      {error && (
         <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
           <p><strong>Erro:</strong> {error}</p>
         </div>
       )}

      {/* Lista de Tarefas */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Suas Tarefas</h2>
        {isLoadingTasks ? (
           <div className="text-center py-10">
            <LoadingSpinner /> {/* Reutiliza o spinner */}
           </div>
        ) : tasks.length === 0 ? (
           <p className="text-center text-gray-500 py-10 italic">
             Nenhuma tarefa encontrada. Que tal adicionar uma? 😉
           </p>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={handleDeleteTask}
                onAddActivity={handleAddActivity}
                onToggleActivity={handleToggleActivity}
                isUpdating={updatingTaskId === task.id} // Passa se este card está sendo atualizado
              />
            ))}
           </div>
        )}
      </div>
    </div>
  );
}