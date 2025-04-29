// app/(app)/dashboard/page.tsx
'use client'; // Necessário para estado, efeitos e interações

import { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext'; // Hook de Autenticação
import LoadingSpinner from '@/components/ui/LoadingSpinner'; // Componente Spinner
import { // Funções e Tipos do Serviço Firestore
  Task,
  getTasks,
  addTask,
  deleteTask,
  addActivityToTask,
  updateActivityStatus,
  deleteActivityFromTask, // <-- Incluindo a nova função
  calculateProgress
} from '@/lib/firebase/firestoreService';
import { Timestamp } from 'firebase/firestore'; // Tipo Timestamp

// --- Componente Interno para Exibir UM Card de Tarefa ---
// (Pode ser movido para components/TaskCard.tsx se preferir organizar)
interface TaskCardProps {
  task: Task;
  // Handlers recebidos do componente pai (DashboardPage)
  onDelete: (taskId: string) => Promise<void>;
  onAddActivity: (taskId: string, activityText: string) => Promise<void>;
  onToggleActivity: (taskId: string, activityId: string, currentStatus: boolean) => Promise<void>;
  onDeleteActivity: (taskId: string, activityId: string) => Promise<void>; // <-- Nova Prop
  isUpdating: boolean; // Indica se este card está em processo de atualização
}

const TaskCard = ({ task, onDelete, onAddActivity, onToggleActivity, onDeleteActivity, isUpdating }: TaskCardProps) => {
  const [newActivityText, setNewActivityText] = useState(''); // Estado local para o input de nova atividade
  const progress = calculateProgress(task.activities); // Calcula o progresso

  // Handler local para submeter o formulário de nova atividade
  const handleAddActivitySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newActivityText.trim() && task.id && !isUpdating) {
      onAddActivity(task.id, newActivityText); // Chama o handler passado via prop
      setNewActivityText(''); // Limpa o input
    }
  };

  // Handler local para o clique no botão de excluir tarefa (com confirmação)
  const handleDeleteTaskClick = () => {
    if (window.confirm(`Tem certeza que deseja excluir a tarefa "${task.title}"? Esta ação não pode ser desfeita.`)) {
      if (task.id && !isUpdating) {
        onDelete(task.id); // Chama o handler passado via prop
      }
    }
  };

  // Handler local para o clique no checkbox da atividade
  const handleToggleClick = (activityId: string, currentStatus: boolean) => {
    if (task.id && !isUpdating) {
      onToggleActivity(task.id, activityId, currentStatus); // Chama o handler passado via prop
    }
  };

  // Handler local para o clique no botão de excluir atividade
  const handleDeleteActivityClick = (activityId: string, activityText: string) => {
    // Adiciona confirmação opcional
     if (window.confirm(`Excluir a atividade "${activityText}"?`)) {
       if (task.id && !isUpdating) {
         onDeleteActivity(task.id, activityId); // Chama o handler passado via prop
       }
     }
  };

  // JSX de Renderização do Card
  return (
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
              // Cada linha de atividade
              <li key={activity.id} className="flex items-center justify-between bg-gray-50 p-2 rounded group hover:bg-gray-100 transition-colors duration-150">
                {/* Checkbox e Texto (ocupam espaço disponível) */}
                <div className="flex items-center flex-grow mr-2 overflow-hidden"> {/* Adicionado overflow */}
                  <input
                    type="checkbox"
                    id={`activity-${task.id}-${activity.id}`} // ID mais específico
                    checked={activity.completed}
                    onChange={() => handleToggleClick(activity.id, activity.completed)}
                    disabled={isUpdating}
                    className="flex-shrink-0 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <label
                    htmlFor={`activity-${task.id}-${activity.id}`}
                    // truncate para evitar que texto longo quebre o layout
                    className={`ml-2 text-sm truncate ${activity.completed ? 'text-gray-500 line-through' : 'text-gray-800'} ${isUpdating ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    title={activity.text} // Mostra texto completo no hover
                  >
                    {activity.text}
                  </label>
                </div>
                {/* Botão Deletar Atividade (lado direito) */}
                <button
                  onClick={() => handleDeleteActivityClick(activity.id, activity.text)} // Passa o texto para confirmação
                  disabled={isUpdating}
                  title="Excluir esta atividade"
                  // Estilo do botão de lixeira
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all duration-150 focus:outline-none rounded-full hover:bg-red-100 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 italic">Nenhuma atividade adicionada.</p>
        )}
      </div>

      {/* Formulário para Adicionar Nova Atividade */}
      <form onSubmit={handleAddActivitySubmit} className="flex gap-2 mt-4 flex-wrap sm:flex-nowrap"> {/* Ajustado wrap */}
        <input
          type="text"
          value={newActivityText}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setNewActivityText(e.target.value)}
          placeholder="Nova atividade..."
          disabled={isUpdating}
          className="flex-grow px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 w-full sm:w-auto" // Ajuste de largura
        />
        <button
          type="submit"
          disabled={!newActivityText.trim() || isUpdating}
          className="px-3 py-1.5 w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed" // Removido grow
        >
          + Adicionar
        </button>
      </form>

      {/* Botão para Deletar Tarefa */}
      <div className="mt-4 pt-4 flex justify-center border-t border-gray-200 text-right"> {/* Mudado alinhamento e adicionado separador */}
        <button
          onClick={handleDeleteTaskClick}
          disabled={isUpdating}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed" // Texto menor
        >
          Excluir Tarefa
        </button>
      </div>
    </div>
  );
}; // --- Fim do Componente TaskCard ---


// --- Componente Principal da Página Dashboard ---
export default function DashboardPage() {
  // --- Estados do Componente ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isLoadingTasks, setIsLoadingTasks] = useState(true); // Loading geral da lista
  const [isSubmittingTask, setIsSubmittingTask] = useState(false); // Loading do form principal
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null); // ID da tarefa em atualização (para feedback visual no card)
  const [error, setError] = useState<string | null>(null); // Mensagens de erro gerais
  const { user } = useAuth(); // Pega o usuário do contexto de autenticação

  // --- Função para Buscar Tarefas do Firestore ---
  const fetchTasks = useCallback(async () => {
    if (!user) return; // Aborta se não houver usuário
    console.log("Buscando tarefas...");
    if (!updatingTaskId) { setIsLoadingTasks(true); } // Mostra loading geral só se não for update de card
    setError(null); // Limpa erros anteriores
    try {
      const fetchedTasks = await getTasks(); // Chama a função do firestoreService
      // Valida e mapeia os dados recebidos
      const validTasks = fetchedTasks.map(task => ({
        ...task, // Copia os dados da tarefa
        // Garante que 'createdAt' seja um Timestamp, com fallback se necessário
        createdAt: task.createdAt instanceof Timestamp ? task.createdAt : Timestamp.now(),
      }));
      setTasks(validTasks); // Atualiza o estado com as tarefas válidas
    } catch (err) {
      console.error("Erro detalhado ao buscar tarefas:", err);
      setError("Falha ao carregar suas tarefas. Tente recarregar a página."); // Define mensagem de erro
    } finally {
      if (!updatingTaskId) { setIsLoadingTasks(false); } // Para loading geral se aplicável
    }
  }, [user, updatingTaskId]); // Dependências: refaz se usuário mudar ou um update de card terminar

  // --- Efeito para Buscar Tarefas na Montagem Inicial ---
  useEffect(() => {
    if (user) { fetchTasks(); } // Chama a busca assim que o usuário estiver disponível
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Roda só quando o usuário muda (primeira vez que não é null)

  // --- Handlers para as Ações do Usuário ---

  // Adicionar uma nova tarefa principal
  const handleAddTask = async (e: FormEvent) => {
    e.preventDefault(); // Previne recarregamento da página
    // Validações: Título não vazio, usuário logado, não estar submetendo outra tarefa
    if (!newTaskTitle.trim() || !user || isSubmittingTask) return;
    setIsSubmittingTask(true); setError(null);
    const taskId = await addTask(newTaskTitle); // Chama o serviço
    if (taskId) { // Sucesso
      setNewTaskTitle(''); // Limpa o input
      await fetchTasks(); // Recarrega a lista
    } else { // Falha
      setError("Não foi possível adicionar a tarefa.");
    }
    setIsSubmittingTask(false); // Libera o botão
  };

  // Adicionar uma atividade a uma tarefa específica
  const handleAddActivity = async (taskId: string, activityText: string) => {
    if (!taskId || !activityText.trim() || updatingTaskId) return; // Validações
    setUpdatingTaskId(taskId); setError(null); // Marca o card como "ocupado"
    const success = await addActivityToTask(taskId, activityText); // Chama o serviço
    if (!success) { setError("Não foi possível adicionar a atividade."); }
    await fetchTasks(); // Recarrega a lista
    setUpdatingTaskId(null); // Libera o card
  };

  // Marcar/Desmarcar o status de uma atividade
  const handleToggleActivity = async (taskId: string, activityId: string, currentStatus: boolean) => {
    if (!taskId || !activityId || updatingTaskId) return; // Validações
    setUpdatingTaskId(taskId); setError(null);
    const newStatus = !currentStatus; // <<< A LÓGICA DE INVERSÃO É FEITA AQUI
    const success = await updateActivityStatus(taskId, activityId, newStatus); // Chama o serviço com o NOVO status
    if (!success) { setError("Não foi possível atualizar o status da atividade."); }
    await fetchTasks(); // Recarrega a lista
    setUpdatingTaskId(null);
  };

  // Excluir uma tarefa inteira
  const handleDeleteTask = async (taskId: string) => {
    if (!taskId || updatingTaskId) return; // Validações
    // Confirmação já está no TaskCard, mas poderia ser movida para cá
    setUpdatingTaskId(taskId); setError(null);
    const success = await deleteTask(taskId); // Chama o serviço
    if (!success) { setError("Não foi possível excluir a tarefa."); }
    await fetchTasks(); // Recarrega a lista (sem a tarefa excluída)
    setUpdatingTaskId(null);
  };

  // Excluir uma atividade específica de uma tarefa
  const handleDeleteActivity = async (taskId: string, activityId: string) => {
    if (!taskId || !activityId || updatingTaskId) return; // Validações
    // Confirmação já está no TaskCard, mas poderia ser movida para cá
    setUpdatingTaskId(taskId); setError(null);
    const success = await deleteActivityFromTask(taskId, activityId); // Chama o novo serviço
    if (!success) { setError("Não foi possível excluir a atividade."); }
    await fetchTasks(); // Recarrega a lista (sem a atividade e com progresso recalculado)
    setUpdatingTaskId(null);
  };

  // --- JSX de Renderização da Página Dashboard ---
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Título Principal */}
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Meu Painel de Tarefas</h1>

      {/* Formulário para Adicionar Nova Tarefa */}
      <form onSubmit={handleAddTask} className="mb-8 bg-white p-4 rounded-lg shadow">
        <label htmlFor="new-task-title" className="block text-sm font-medium text-gray-700 mb-1">
          Adicionar Nova Tarefa:
        </label>
        <div className="flex gap-3 flex-wrap sm:flex-nowrap"> {/* Ajustado wrap */}
          <input
            type="text"
            id="new-task-title"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="O que precisa ser feito?"
            required
            disabled={isSubmittingTask}
            className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 w-full sm:w-auto"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim() || isSubmittingTask}
            className="px-6 py-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed" // Removido grow
          >
            {isSubmittingTask ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
      </form>

      {/* Mensagem de Erro Geral */}
      {error && (
         <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md" role="alert">
           <p><strong>Erro:</strong> {error}</p>
         </div>
       )}

      {/* Seção da Lista de Tarefas */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Suas Tarefas</h2>

        {/* Indicador de Carregamento Geral */}
        {isLoadingTasks && !updatingTaskId ? (
           <div className="text-center py-10"><LoadingSpinner /></div>
        ) : // Mensagem de Nenhuma Tarefa
           tasks.length === 0 ? (
           <p className="text-center text-gray-500 py-10 italic">Nenhuma tarefa encontrada. Que tal adicionar uma? 😉</p>
        ) : (
           // Grid com os Cards de Tarefa
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                // Passa todos os handlers necessários para o Card
                onDelete={handleDeleteTask}
                onAddActivity={handleAddActivity}
                onToggleActivity={handleToggleActivity}
                onDeleteActivity={handleDeleteActivity} // <<< Passando o novo handler
                isUpdating={updatingTaskId === task.id} // Indica se ESTE card está sendo atualizado
              />
            ))}
           </div>
        )}
      </div>
    </div>
  );
} // --- Fim do Componente DashboardPage ---