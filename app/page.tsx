// app/page.tsx
import Link from 'next/link'; // Importa o componente Link do Next.js para navegação
import { Inter } from 'next/font/google'; // Opcional: usar a mesma fonte do layout

const inter = Inter({ subsets: ['latin'] }); // Se for usar a fonte Inter

export default function HomePage() {
  return (
    <div className={`flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-gray-50 to-white dark:from-zinc-900/80 dark:to-zinc-950 ${inter.className}`}>
      <main className="container mx-auto text-center px-4">
        {/* Título Principal */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-400 dark:to-indigo-500">
          Gerenciador de Tarefas Simples
        </h1>

        {/* Descrição Curta */}
        <p className="mt-4 text-lg sm:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Organize seu dia, acompanhe seu progresso e mantenha o foco no que realmente importa. Crie tarefas, adicione etapas e nunca mais perca um prazo!
        </p>

        {/* Principais Funcionalidades (Opcional) */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="p-4 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white/50 dark:bg-zinc-800/50 shadow-sm">
             <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Crie Tarefas</h3>
             <p className="text-sm text-gray-500 dark:text-gray-400">Defina seus objetivos principais de forma clara e direta.</p>
          </div>
           <div className="p-4 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white/50 dark:bg-zinc-800/50 shadow-sm">
             <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Adicione Atividades</h3>
             <p className="text-sm text-gray-500 dark:text-gray-400">Quebre tarefas grandes em passos menores e gerenciáveis.</p>
           </div>
          <div className="p-4 border border-gray-200 dark:border-zinc-700 rounded-lg bg-white/50 dark:bg-zinc-800/50 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Acompanhe Progresso</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Veja o percentual de conclusão de cada tarefa com base nas atividades.</p>
          </div>
        </div>

        {/* Botões de Chamada para Ação (CTA) */}
        <div className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white text-base font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 ease-in-out w-full sm:w-auto"
          >
            Entrar na minha conta
          </Link>
          <span className="text-gray-500 dark:text-gray-400 my-2 sm:my-0">ou</span>
          <Link
            href="/signup"
            className="px-8 py-3 bg-green-500 text-white text-base font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors duration-200 ease-in-out w-full sm:w-auto"
          >
            Criar Conta Gratuita
          </Link>
        </div>
      </main>

      {/* Rodapé Simples (Opcional) */}
      <footer className="mt-16 text-center text-xs text-gray-400 dark:text-gray-500">
         © {new Date().getFullYear()} Meu Gerenciador de Tarefas.
      </footer>
    </div>
  );
}