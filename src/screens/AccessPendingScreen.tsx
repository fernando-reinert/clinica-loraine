// Tela para usuário logado mas inativo (aguardando ativação pelo owner).
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchMyAccessProfile } from '../services/admin/adminService';
import LoadingSpinner from '../components/LoadingSpinner';

const AccessPendingScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    fetchMyAccessProfile().then((profile) => {
      setChecking(false);
      if (profile?.is_active) {
        navigate('/dashboard', { replace: true });
      }
    }).catch(() => setChecking(false));
  }, [user, navigate]);

  if (!user || checking) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4">
      <div className="glass-card p-8 max-w-md text-center">
        <ShieldOff className="mx-auto text-amber-400 mb-4" size={48} />
        <h2 className="text-xl font-semibold text-white mb-2">Acesso pendente</h2>
        <p className="text-gray-400 mb-6">
          Sua conta ainda não foi ativada. Entre em contato com o administrador da clínica para liberar seu acesso.
        </p>
        <button
          type="button"
          onClick={() => signOut()}
          className="neon-button min-h-[44px] px-6 inline-flex items-center justify-center"
        >
          Sair
        </button>
      </div>
    </div>
  );
};

export default AccessPendingScreen;
