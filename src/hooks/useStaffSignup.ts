// Hook para completar cadastro staff por link (chama completeStaffSignup).
import { useState, useCallback } from 'react';
import { completeStaffSignup } from '../services/admin/adminService';
import type { CompleteStaffSignupPayload } from '../services/admin/adminTypes';

export function useStaffSignup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (payload: CompleteStaffSignupPayload): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      await completeStaffSignup(payload);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao completar cadastro');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submit, loading, error };
}
