// context/AuthContext.tsx
'use client'; // Necessário para hooks de cliente

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config'; // Importa nossa config do Firebase
import LoadingSpinner from '../components/ui/LoadingSpinner'; // Importa o Spinner

// Define a forma (interface) dos dados que o contexto fornecerá
interface AuthContextType {
  user: User | null; // Objeto do usuário do Firebase ou null se não logado
  loading: boolean;   // Indica se a verificação inicial de auth foi concluída
}

// Cria o contexto com um valor padrão inicial (útil para TypeScript)
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

// Componente Provedor que envolverá a aplicação
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null); // Estado para o usuário
  const [loading, setLoading] = useState(true); // Estado de carregamento inicial

  useEffect(() => {
    // O Firebase fornece este listener que é chamado quando o estado de auth muda
    // ou imediatamente com o estado atual na primeira vez que é registrado.
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Define o usuário (pode ser null)
      setLoading(false);   // Marca que a verificação terminou
      console.log("Auth State Changed - User:", currentUser?.email || 'No user'); // Para debug
    });

    // Função de limpeza: Desregistra o listener quando o componente é desmontado
    return () => unsubscribe();
  }, []); // O array vazio [] garante que o efeito rode apenas uma vez

  // Mostra um spinner enquanto verifica o estado inicial de autenticação
  if (loading) {
    return <LoadingSpinner />;
  }

  // Fornece o usuário e o estado de loading para os componentes filhos
  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook customizado para facilitar o uso do contexto nos componentes
export const useAuth = () => useContext(AuthContext);