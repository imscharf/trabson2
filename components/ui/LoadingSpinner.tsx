// components/ui/LoadingSpinner.tsx
import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div
        className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"
        role="status"
      >
         <span className="sr-only">Carregando...</span> {/* Acessibilidade */}
      </div>
       <p className="ml-3 text-gray-700">Carregando...</p>
    </div>
  );
};

export default LoadingSpinner;