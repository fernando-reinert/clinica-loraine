import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import LoginForm from './LoginForm';
import SignUpForm from './SignUpForm';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Sparkles, Heart } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { user, loading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <LoadingSpinner size="lg" className="text-blue-500" />
            <Sparkles className="absolute -top-2 -right-2 text-purple-500 animate-pulse" size={20} />
          </div>
          <p className="mt-4 text-gray-300">Carregando universo...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header Futurista - Mesmo padrão do Dashboard */}
        <div className="glass-card p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10"></div>
          
          <div className="relative z-10 text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30">
                <Heart className="text-blue-300" size={28} />
              </div>
            </div>
            <h1 className="text-3xl font-bold glow-text mb-2">Clínica Loraine Vilela</h1>
            <p className="text-gray-300 text-lg">Sistema de gestão clínica</p>
          </div>
        </div>

        {/* Formulário em glass-card */}
        <div className="glass-card p-8">
          {isLogin ? <LoginForm /> : <SignUpForm />}
        </div>

        {/* Botão de alternância */}
        <div className="glass-card p-6">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full neon-button flex items-center justify-center"
          >
            <span className="font-semibold">
              {isLogin ? 'Criar nova conta' : 'Já tenho conta'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
