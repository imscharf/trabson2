// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Importa os estilos globais (Tailwind)
import { AuthProvider } from '../context/AuthContext'; // Importa nosso provedor de autenticação

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Gerenciador de Tarefas TOP', // Mude o título se quiser
  description: 'Sua vida organizada, tarefa por tarefa.',
};

export default function RootLayout({
  children,
}: Readonly<{ // Boa prática usar Readonly<> para props de layout
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR"> {/* Define a língua */}
      <body className={inter.className}>
        {/* Envolve TODA a aplicação com o AuthProvider */}
        {/* Assim, o estado de auth fica disponível globalmente */}
        <AuthProvider>
          {children} {/* Aqui serão renderizadas as páginas específicas */}
        </AuthProvider>
      </body>
    </html>
  );
}