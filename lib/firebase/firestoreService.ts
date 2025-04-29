// lib/firebase/firestoreService.ts
import { db, auth } from './config'; // Importa instâncias do Firebase config
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  getDoc, // Import necessário para buscar um doc específico
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp,
  orderBy // Import para ordenação
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid'; // Para IDs únicos de atividades

// --- Interfaces ---
// Interface para Atividade dentro de uma Tarefa
export interface Activity {
  id: string;       // ID único da atividade (gerado com uuid)
  text: string;     // Texto/Descrição da atividade
  completed: boolean; // Status (concluída ou não)
}

// Interface para Tarefa (Documento no Firestore)
export interface Task {
  id: string; // ID do documento no Firestore (atribuído na leitura)
  userId: string;   // ID do usuário do Firebase Auth que criou a tarefa
  title: string;    // Título da tarefa
  activities: Activity[]; // Array de atividades associadas
  createdAt: Timestamp; // Data/Hora de criação (usando Timestamp do Firestore)
  // Poderia adicionar outros campos como `updatedAt`, `dueDate`, etc.
}

// --- Referência à Coleção ---
const tasksCollection = collection(db, 'tasks'); // Referência à coleção 'tasks'

// --- Funções CRUD ---

/**
 * Adiciona uma nova tarefa para o usuário logado.
 * @param title - O título da nova tarefa.
 * @returns O ID da tarefa criada ou null em caso de falha.
 */
export const addTask = async (title: string): Promise<string | null> => {
  const user = auth.currentUser;
  if (!user || !title.trim()) return null; // Verifica usuário e título não vazio

  try {
    const docRef = await addDoc(tasksCollection, {
      userId: user.uid,       // ID do usuário logado
      title: title.trim(),    // Título sem espaços extras
      activities: [],         // Começa sem atividades
      createdAt: serverTimestamp(), // Timestamp do servidor para criação
    });
    console.log("Tarefa adicionada com ID:", docRef.id);
    return docRef.id; // Retorna o ID da nova tarefa
  } catch (e) {
    console.error("Erro ao adicionar tarefa: ", e);
    return null;
  }
};

/**
 * Busca todas as tarefas do usuário logado, ordenadas por data de criação (mais recentes primeiro).
 * @returns Uma Promise que resolve com um array de tarefas (Task[]).
 */
export const getTasks = async (): Promise<Task[]> => {
  const user = auth.currentUser;
  if (!user) return []; // Retorna array vazio se não logado

  try {
    // Cria a query: busca na coleção 'tasks', filtra por 'userId' igual ao UID do usuário logado,
    // e ordena por 'createdAt' em ordem decrescente (mais recentes primeiro).
    const q = query(
        tasksCollection,
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc") // Ordena aqui!
    );

    const querySnapshot = await getDocs(q); // Executa a query
    const tasks: Task[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Monta o objeto Task, garantindo que os tipos estão corretos
      tasks.push({
        id: doc.id, // Pega o ID do documento
        userId: data.userId,
        title: data.title,
        // Garante que 'activities' seja sempre um array, mesmo que não exista no Firestore
        activities: Array.isArray(data.activities) ? data.activities as Activity[] : [],
        // Garante que 'createdAt' seja um Timestamp, usa o tempo atual como fallback se necessário
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
      });
    });
    // console.log("Tarefas buscadas:", tasks); // Para debug
    return tasks; // Retorna a lista de tarefas
  } catch (e) {
    console.error("Erro ao buscar tarefas: ", e);
    return []; // Retorna array vazio em caso de erro
  }
};

/**
 * Adiciona uma nova atividade a uma tarefa existente.
 * @param taskId - ID da tarefa onde adicionar a atividade.
 * @param activityText - Texto da nova atividade.
 * @returns Uma Promise que resolve com true se sucesso, false se falha.
 */
export const addActivityToTask = async (taskId: string, activityText: string): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user || !taskId || !activityText.trim()) return false; // Validações

  const taskDocRef = doc(db, 'tasks', taskId); // Referência ao documento da tarefa

  const newActivity: Activity = {
    id: uuidv4(),             // Gera um ID único para a atividade
    text: activityText.trim(), // Texto sem espaços extras
    completed: false,          // Começa como não concluída
  };

  try {
    // 1. Busca a tarefa para garantir que pertence ao usuário e pegar as atividades atuais
    const taskSnap = await getDoc(taskDocRef);
    if (!taskSnap.exists() || taskSnap.data().userId !== user.uid) {
      console.error("Permissão negada ou tarefa não encontrada para adicionar atividade.");
      return false;
    }

    // 2. Pega o array de atividades atual ou um array vazio se não existir
    const currentActivities = taskSnap.data().activities || [];

    // 3. Atualiza o documento no Firestore, adicionando a nova atividade ao array existente
    await updateDoc(taskDocRef, {
      activities: [...currentActivities, newActivity] // Cria um novo array com a atividade adicionada
    });
    console.log(`Atividade "${newActivity.text}" adicionada à tarefa ${taskId}`);
    return true;
  } catch (e) {
    console.error("Erro ao adicionar atividade: ", e);
    return false;
  }
};

/**
 * Atualiza o status (concluído/não concluído) de uma atividade específica dentro de uma tarefa.
 * É mais eficiente, pois só tenta atualizar se o status realmente mudou.
 * @param taskId - ID da tarefa que contém a atividade.
 * @param activityId - ID da atividade a ser atualizada.
 * @param completed - O novo status de conclusão desejado (true ou false).
 * @returns Uma Promise que resolve com true se sucesso OU se nenhuma atualização era necessária, false se erro no Firestore.
 */
export const updateActivityStatus = async (taskId: string, activityId: string, completed: boolean): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user || !taskId || !activityId === undefined) { // Verifica activityId também
      console.warn("[updateActivityStatus] Parâmetros inválidos recebidos.");
      return false; // Retorna false se parâmetros essenciais faltam
  }

  const taskDocRef = doc(db, 'tasks', taskId);

  try {
    // 1. Busca a tarefa
    const taskSnap = await getDoc(taskDocRef);
    if (!taskSnap.exists() || taskSnap.data().userId !== user.uid) {
      console.error(`[updateActivityStatus] Permissão negada ou tarefa ${taskId} não encontrada.`);
      return false; // Falha se não achar ou não for dono
    }

    // 2. Pega as atividades atuais
    const currentActivities: Activity[] = taskSnap.data().activities || [];
    let activityFound = false;
    let needsUpdate = false; // Flag para saber se o status realmente precisa mudar

    // 3. Mapeia as atividades, verificando se precisa atualizar
    const updatedActivities = currentActivities.map(activity => {
      if (activity.id === activityId) {
        activityFound = true;
        // Só marca que precisa atualizar SE o estado atual for DIFERENTE do desejado
        if (activity.completed !== completed) {
          needsUpdate = true;
          return { ...activity, completed: completed }; // Retorna o objeto atualizado
        }
      }
      return activity; // Retorna o objeto original se não for o ID ou se o status já estiver correto
    });

    // 4. Decide o que fazer
    if (!activityFound) {
      // Se o ID não foi encontrado DE FATO
      console.warn(`[updateActivityStatus] Atividade com ID ${activityId} não encontrada na tarefa ${taskId}. Nenhuma atualização será feita.`);
      // Consideramos sucesso porque não houve erro, apenas a condição não foi atendida.
      // Poderia ser false dependendo da lógica do seu app.
      return true;
    }

    if (!needsUpdate) {
       // Se o ID foi encontrado, MAS o status já era o desejado
       console.log(`[updateActivityStatus] Status da atividade ${activityId} já era ${completed}. Nenhuma atualização de Firestore necessária.`);
       return true; // Sucesso, pois o estado final está correto, sem precisar escrever no DB.
    }

    // 5. SOMENTE se a atividade foi encontrada E o status precisa mudar, atualiza o Firestore
    console.log(`[updateActivityStatus] Atualizando status da atividade ${activityId} (tarefa ${taskId}) para ${completed} no Firestore...`);
    await updateDoc(taskDocRef, {
      activities: updatedActivities
    });

    return true; // Sucesso na atualização

  } catch (e) {
    console.error("[updateActivityStatus] Erro durante a atualização no Firestore: ", e);
    return false; // Erro durante a operação do Firestore
  }
};

/**
 * Deleta uma tarefa completa (incluindo suas atividades).
 * @param taskId - O ID da tarefa a ser deletada.
 * @returns Uma Promise que resolve com true se sucesso, false se falha.
 */
export const deleteTask = async (taskId: string): Promise<boolean> => {
  const user = auth.currentUser;
  if (!user || !taskId) return false;

  const taskDocRef = doc(db, 'tasks', taskId);

  try {
    // Opcional, mas bom: Verificar posse antes de deletar (regra de segurança é a garantia principal)
     const taskSnap = await getDoc(taskDocRef);
     if (taskSnap.exists() && taskSnap.data().userId !== user.uid) {
         console.error("Permissão negada para deletar tarefa.");
         return false;
     }

    await deleteDoc(taskDocRef); // Deleta o documento
    console.log(`Tarefa ${taskId} deletada.`);
    return true;
  } catch (e) {
    console.error("Erro ao deletar tarefa: ", e);
    return false;
  }
};

/**
 * Calcula o percentual de conclusão de uma tarefa baseado em suas atividades.
 * @param activities - O array de atividades da tarefa.
 * @returns O percentual de conclusão (0 a 100).
 */
export const calculateProgress = (activities: Activity[] | undefined): number => {
    if (!activities || activities.length === 0) {
      return 0; // Se não há atividades, o progresso é 0
    }
    const completedCount = activities.filter(act => act.completed).length;
    // Arredonda para o inteiro mais próximo
    return Math.round((completedCount / activities.length) * 100);
};

// Futuras funções poderiam incluir:
// - updateTaskTitle(taskId: string, newTitle: string)

/**
 * Deleta uma atividade específica de dentro de uma tarefa.
 * @param taskId - O ID da tarefa pai.
 * @param activityId - O ID da atividade a ser removida.
 * @returns Uma Promise que resolve com true se a atividade foi removida (ou não encontrada), false se ocorreu um erro.
 */
export const deleteActivityFromTask = async (taskId: string, activityId: string): Promise<boolean> => {
  const user = auth.currentUser;
  // Validação básica de entrada
  if (!user || !taskId || !activityId) {
    console.warn("[deleteActivityFromTask] Parâmetros inválidos ou usuário não logado.");
    return false;
  }

  const taskDocRef = doc(db, 'tasks', taskId); // Referência ao documento da tarefa

  try {
    // 1. Busca a tarefa atual para verificar permissão e obter o array de atividades
    const taskSnap = await getDoc(taskDocRef);
    if (!taskSnap.exists() || taskSnap.data().userId !== user.uid) {
      console.error(`[deleteActivityFromTask] Permissão negada ou tarefa ${taskId} não encontrada.`);
      return false; // Falha se não encontrar a tarefa ou não for o dono
    }

    // 2. Pega o array de atividades atual
    const currentActivities: Activity[] = taskSnap.data().activities || [];

    // 3. Filtra o array, criando um NOVO array SEM a atividade a ser deletada
    const updatedActivities = currentActivities.filter(activity => activity.id !== activityId);

    // 4. Verifica se alguma atividade foi realmente removida (opcional, mas bom para log)
    if (currentActivities.length === updatedActivities.length) {
      // Isso significa que a activityId fornecida não estava na lista
      console.warn(`[deleteActivityFromTask] Atividade com ID ${activityId} não foi encontrada na tarefa ${taskId}. Nenhuma alteração feita.`);
      // Retorna true aqui porque não houve erro de Firestore, apenas a condição não se aplicou.
      return true;
    }

    // 5. Atualiza o documento da tarefa no Firestore com o array filtrado
    console.log(`[deleteActivityFromTask] Removendo atividade ${activityId} da tarefa ${taskId}...`);
    await updateDoc(taskDocRef, {
      activities: updatedActivities // Salva o array sem a atividade deletada
    });

    return true; // Sucesso na remoção

  } catch (e) {
    console.error("[deleteActivityFromTask] Erro durante a remoção da atividade no Firestore: ", e);
    return false; // Erro durante a operação do Firestore
  }
};