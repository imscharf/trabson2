// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Estado de loading
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Tenta fazer login com Firebase Auth
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard'); // Redireciona para o painel
    } catch (error: unknown) { // <<< Mude para unknown
      setLoading(false); // Garante que o loading pare em caso de erro
      // Verifica se 'error' é um objeto e tem as propriedades 'code' e 'message'
      if (error instanceof Error && 'code' in error) {
          const err = error as { code?: string; message: string }; // Type assertion após checagem
          console.error("Erro no login Firebase:", err.code, err.message);
          let friendlyMessage = 'Falha ao fazer login. Verifique seu e-mail e senha.';
          if (err.code === 'auth/invalid-email') {
            friendlyMessage = 'Formato de e-mail inválido.';
          } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            friendlyMessage = 'E-mail ou senha inválidos.';
          } else {
            friendlyMessage = 'Ocorreu um erro inesperado. Tente novamente.';
          }
          setError(friendlyMessage);
      } else {
          // Caso o erro não seja no formato esperado
          console.error("Erro no login (formato inesperado):", error);
          setError('Ocorreu um erro inesperado. Tente novamente.');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
       <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Faça seu Login</h1>
        <form onSubmit={handleLogin}>
          {/* Campo E-mail */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail:
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Campo Senha */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Sua senha"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
             {/* Opcional: Link "Esqueci minha senha" */}
             {/* <div className="text-right mt-1">
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
                    Esqueceu a senha?
                </Link>
             </div> */}
          </div>

          {/* Mensagem de Erro */}
          {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={loading}
             className={`w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
           >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        {/* Link para Cadastro */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Não tem uma conta?{' '}
          <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}