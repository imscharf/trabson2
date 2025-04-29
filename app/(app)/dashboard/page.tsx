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
  onDelete: (taskId: string) => Promise<void>; // Tornando async para refletir o handler
  onAddActivity: (taskId: string, activityText: string) => Promise<void>; // Tornando async
  onToggleActivity: (taskId: string, activityId: string, currentStatus: boolean) => Promise<void>; // Tornando async
  isUpdating: boolean; // Para feedback visual em operações
}

const TaskCard = ({ task, onDelete, onAddActivity, onToggleActivity, isUpdating }: TaskCardProps) => {
  const [newActivityText, setNewActivityText] = useState('');
  const progress = calculateProgress(task.activities); // Calcula o progresso aqui

  const handleAddActivitySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newActivityText.trim() && task.id && !isUpdating) {
      onAddActivity(task.id, newActivityText); // Chama o handler async
      setNewActivityText('');
    }
  };

  const handleDeleteClick = () => {
     if (window.confirm(`Tem certeza que deseja excluir a tarefa "${task.title}"?`)) {
       if (task.id && !isUpdating) {
         onDelete(task.id); // Chama o handler async
       }
     }
   };

  const handleToggleClick = (activityId: string, currentStatus: boolean) => {
      if (task.id && !isUpdating) {
          onToggleActivity(task.id, activityId, currentStatus); // Chama o handler async
      }
  };


  return (
    // O JSX interno do TaskCard (estilização, elementos) permanece o mesmo da resposta anterior
     <div className={`bg-white shadow-md rounded-lg p-4 md:p-6 mb-6 transition duration-300 ease-in-out ${isUpdating ? 'opacity-70 animate-pulse' : ''}`}>
       {/* Título da Tarefa */}
       <h3 className="text-xl font-semibold text-gray-800 mb-2">{task.title}</h3>

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
                     // Chama o handleToggleClick que passará os parâmetros corretos
                     onChange={() => handleToggleClick(activity.id, activity.completed)}
                     disabled={isUpdating}
                     className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <label
                     htmlFor={`activity-${activity.id}`}
                      className={`ml-2 text-sm ${activity.completed ? 'text-gray-500 line-through' : 'text-gray-800'} ${isUpdating ? 'cursor-not-allowed': 'cursor-pointer'}`}
                   >
                     {activity.text}
                   </label>
                 </div>
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
           onClick={handleDeleteClick}
           disabled={isUpdating}
           className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
         >
           Excluir Tarefa
         </button>
       </div>
     </div>
  );
}; // Fim do TaskCard


// --- Componente Principal da Página Dashboard ---
export default function DashboardPage() {
  // --- Estados do Componente ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null); // Controla qual card está "ocupado"
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth(); // Hook para pegar o usuário autenticado

  // --- Função para Buscar Tarefas ---
  const fetchTasks = useCallback(async () => {
    if (!user) return;
    console.log("Buscando tarefas...");
    // Define loading para true APENAS se não houver um ID sendo atualizado,
    // para evitar o pisca-pisca da tela inteira em updates de cards individuais.
    if (!updatingTaskId) {
      setIsLoadingTasks(true);
    }
    setError(null); // Limpa erros anteriores
    try {
      const fetchedTasks = await getTasks();
      const validTasks = fetchedTasks.map(task => ({
        ...task,
        createdAt: task.createdAt instanceof Timestamp ? task.createdAt : Timestamp.now(),
      }));
      setTasks(validTasks); // Atualiza o estado com as tarefas buscadas
    } catch (err) {
      console.error("Erro detalhado ao buscar tarefas:", err);
      setError("Falha ao carregar suas tarefas. Tente recarregar a página.");
    } finally {
      // Só para loading geral se não havia um ID específico sendo atualizado
       if (!updatingTaskId) {
        setIsLoadingTasks(false);
      }
    }
  }, [user, updatingTaskId]); // Adiciona updatingTaskId como dependência

  // Busca inicial das tarefas
  useEffect(() => {
    if (user) { // Garante que o usuário existe antes de buscar
       fetchTasks();
    }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Dependência apenas no usuário para a busca inicial

  // --- Handlers para as Ações ---

  // Adicionar nova tarefa geral
  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !user || isSubmittingTask) return;
    setIsSubmittingTask(true); // Feedback visual no botão principal
    setError(null);
    const taskId = await addTask(newTaskTitle);
    if (taskId) {
      setNewTaskTitle('');
      fetchTasks(); // Recarrega todas as tarefas
    } else {
      setError("Não foi possível adicionar a tarefa.");
    }
    setIsSubmittingTask(false);
  };

  // Adicionar atividade a um card específico
  const handleAddActivity = async (taskId: string, activityText: string) => {
    if (!taskId || !activityText.trim() || updatingTaskId) return;
    setUpdatingTaskId(taskId); // Trava este card específico
    setError(null);
    const success = await addActivityToTask(taskId, activityText);
    if (!success) {
      setError("Não foi possível adicionar a atividade.");
    }
    // Recarregar TUDO após a operação, independentemente do sucesso, para garantir consistência
    // (Considerar update otimista aqui no futuro para melhor UX)
    await fetchTasks();
    setUpdatingTaskId(null); // Libera o card
  };

  // Marcar/desmarcar atividade (lógica de inversão aqui!)
  const handleToggleActivity = async (taskId: string, activityId: string, currentStatus: boolean) => {
    if (!taskId || !activityId || updatingTaskId) return;
    setUpdatingTaskId(taskId);
    setError(null);
    const newStatus = !currentStatus; // <<< INVERTE O STATUS AQUI!
    const success = await updateActivityStatus(taskId, activityId, newStatus);
    if (!success) {
      setError("Não foi possível atualizar o status da atividade.");
    }
    await fetchTasks(); // Recarrega sempre
    setUpdatingTaskId(null);
  };

  // Excluir uma tarefa
  const handleDeleteTask = async (taskId: string) => {
    if (!taskId || updatingTaskId) return;
    setUpdatingTaskId(taskId);
    setError(null);
    const success = await deleteTask(taskId);
    if (!success) {
      setError("Não foi possível excluir a tarefa.");
    }
     // Recarregar sempre, mesmo se a exclusão falhar (pode ter sido problema de rede)
    await fetchTasks();
    setUpdatingTaskId(null);
  };

  // --- JSX de Renderização ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Título Principal */}
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

      {/* Mensagem de Erro Geral */}
      {error && (
         <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
           <p><strong>Erro:</strong> {error}</p>
         </div>
       )}

      {/* Seção da Lista de Tarefas */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Suas Tarefas</h2>

        {/* Estado de Carregamento Inicial */}
        {isLoadingTasks && !updatingTaskId ? ( // Só mostra loading geral se não for update de card
           <div className="text-center py-10">
            <LoadingSpinner />
           </div>
        ) : // Estado Sem Tarefas
           tasks.length === 0 ? (
           <p className="text-center text-gray-500 py-10 italic">
             Nenhuma tarefa encontrada. Que tal adicionar uma? 😉
           </p>
        ) : (
           // Renderização da Lista de Tarefas
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onDelete={handleDeleteTask}       // Passando o handler correto
                onAddActivity={handleAddActivity}   // Passando o handler correto
                onToggleActivity={handleToggleActivity} // Passando o handler correto
                isUpdating={updatingTaskId === task.id} // Feedback visual por card
              />
            ))}
           </div>
        )}
      </div>
    </div>
  );
} // Fim do componente DashboardPage