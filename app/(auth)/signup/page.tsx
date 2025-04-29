// app/(auth)/signup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import Link from 'next/link';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Para confirmar senha
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Estado de loading para o botão
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Limpa erros anteriores

    // Validação simples de senha
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true); // Inicia o loading

    try {
      // Tenta criar o usuário no Firebase Auth
      await createUserWithEmailAndPassword(auth, email, password);
      // Não precisa mais esperar setLoading(false) aqui, pois o router.push vai desmontar o componente
      router.push('/dashboard'); // Redireciona para o painel após sucesso
    } catch (error: unknown) { // <<< Mude para unknown
      setLoading(false); // Garante que o loading pare em caso de erro
      // Verifica se 'error' é um objeto e tem as propriedades 'code' e 'message'
       if (error instanceof Error && 'code' in error) {
           const err = error as { code?: string; message: string }; // Type assertion
           console.error("Erro no cadastro Firebase:", err.code, err.message);
           let friendlyMessage = 'Falha ao cadastrar. Tente novamente.';
           if (err.code === 'auth/email-already-in-use') {
             friendlyMessage = 'Este e-mail já está cadastrado.';
           } else if (err.code === 'auth/invalid-email') {
             friendlyMessage = 'Formato de e-mail inválido.';
           } else if (err.code === 'auth/weak-password') {
             friendlyMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
           }
           setError(friendlyMessage);
       } else {
           // Caso o erro não seja no formato esperado
            console.error("Erro no cadastro (formato inesperado):", error);
           setError('Ocorreu um erro inesperado. Tente novamente.');
       }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Crie sua Conta</h1>
        <form onSubmit={handleSignUp}>
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
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {/* Campo Confirmar Senha */}
          <div className="mb-6">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirme a Senha:
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a senha"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Mensagem de Erro */}
          {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}

          {/* Botão Cadastrar */}
          <button
            type="submit"
            disabled={loading} // Desabilita enquanto carrega
            className={`w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>
        {/* Link para Login */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
            Faça login
          </Link>
        </p>
      </div>
    </div>
  );
}