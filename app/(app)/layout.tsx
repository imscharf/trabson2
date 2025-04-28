// app/(app)/layout.tsx
'use client';

import { useEffect, ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Hook para pegar o usuário logado
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config'; // Instância do Auth
import LoadingSpinner from '@/components/ui/LoadingSpinner'; // Spinner

// Layout para as páginas que exigem login (tudo dentro de /app/(app)/*)
export default function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading: authLoading } = useAuth(); // Pega usuário e status de carregamento do AuthContext
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false); // Estado para indicar logout em progresso

  useEffect(() => {
    // Roda quando o status de autenticação (usuário ou loading) muda
    // Redireciona para /login se a verificação terminou e NÃO HÁ usuário
    if (!authLoading && !user) {
      console.log("AppLayout: Usuário não encontrado após carregamento, redirecionando para login.");
      router.replace('/login'); // Use replace para não adicionar ao histórico
    }
  }, [user, authLoading, router]);

  const handleLogout = async () => {
    setLoggingOut(true); // Mostra feedback visual de logout
    try {
      await signOut(auth);
      // Não precisa de setLoading(false) pois será redirecionado
      // router.push('/login'); // AuthContext fará o redirecionamento automaticamente ao detectar !user
    } catch (error) {
      console.error("Falha no logout:", error);
      alert("Erro ao sair. Tente novamente."); // Feedback simples de erro
      setLoggingOut(false); // Reseta estado de logout em caso de erro
    }
  };

  // Enquanto o AuthContext está carregando as informações iniciais do usuário,
  // ou se já detectou que não há usuário e está redirecionando, mostra loading.
  if (authLoading || !user) {
    console.log(`AppLayout: Renderizando LoadingSpinner (authLoading: ${authLoading}, user: ${!!user})`);
     return <LoadingSpinner />;
  }

  // Se passou pelas verificações, significa que o usuário está logado
  // Renderiza o header/navbar e o conteúdo da página (children)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simples */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo ou Nome */}
            <div className="flex-shrink-0">
               <span className="text-xl font-bold text-gray-800">Tarefas</span>
            </div>
            {/* Infos do Usuário e Botão Sair */}
            <div className="flex items-center space-x-4">
               <span className="text-sm text-gray-600 hidden sm:block">
                 Logado como: {user.email}
               </span>
               <button
                 onClick={handleLogout}
                 disabled={loggingOut} // Desabilita enquanto está saindo
                 className={`px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-150 ease-in-out ${loggingOut ? 'opacity-50 cursor-wait' : ''}`}
               >
                 {loggingOut ? 'Saindo...' : 'Sair'}
               </button>
             </div>
          </div>
        </nav>
      </header>

      {/* Conteúdo Principal da Página */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children} {/* Renderiza a página atual (ex: /dashboard) */}
      </main>
    </div>
  );
}