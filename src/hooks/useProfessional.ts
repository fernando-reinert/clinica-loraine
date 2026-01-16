// src/hooks/useProfessional.ts
// Hook para gerenciar profissional atual
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProfessionalByUserId, Professional } from '../services/professionals/professionalService';

export const useProfessional = () => {
  const { user } = useAuth();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfessional();
    } else {
      setLoading(false);
      setProfessional(null);
      setNeedsSetup(false);
    }
  }, [user]);

  const loadProfessional = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const prof = await getProfessionalByUserId(user.id);
      
      if (prof) {
        setProfessional(prof);
        setNeedsSetup(false);
      } else {
        setProfessional(null);
        setNeedsSetup(true);
      }
    } catch (error) {
      console.error('Erro ao carregar profissional:', error);
      setProfessional(null);
      setNeedsSetup(true);
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    loadProfessional();
  };

  return {
    professional,
    loading,
    needsSetup,
    refresh,
  };
};
