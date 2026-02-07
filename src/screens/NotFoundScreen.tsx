import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';

const NotFoundScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 max-w-md w-full max-w-full min-w-0 p-6 sm:p-8 md:p-10 text-center">
        <div className="mb-6">
          <AlertCircle className="mx-auto text-yellow-400" size={64} strokeWidth={2} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
          404
        </h1>
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-300 mb-4 whitespace-normal break-words">
          Página não encontrada
        </h2>
        <p className="text-gray-400 mb-8 text-sm sm:text-base whitespace-normal break-words">
          A página que você está procurando não existe ou foi movida.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-lg"
        >
          <Home size={20} className="shrink-0" />
          <span>Ir para Login</span>
        </button>
      </div>
    </div>
  );
};

export default NotFoundScreen;
