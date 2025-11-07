import { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface Patient {
  full_name: any;
  active: any;
  id: string;
  name: string;
  email?: string;
  phone: string;
  cpf: string;
  birth_date: string;
  address?: string;
  photo_url?: string;
  professional_id: string;
  created_at: string;
  // REMOVIDO: updated_at não existe na tabela
}

export const usePatients = () => {
  const { supabase } = useSupabase();
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPatients = async () => {
    if (!user || !supabase) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const getPatient = async (id: string): Promise<Patient | null> => {
    if (!user || !supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching patient:', error);
        toast.error('Erro ao carregar dados do paciente');
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error getting patient:', error);
      toast.error('Erro ao buscar dados do paciente');
      return null;
    }
  };

  // ✅ FUNÇÃO UPDATE PATIENT CORRIGIDA
  const updatePatient = async (patientId: string, updates: any): Promise<Patient | null> => {
    if (!user || !supabase) {
      toast.error('Usuário não autenticado');
      return null;
    }

    try {
      // REMOVIDO: updated_at não existe na tabela
      const updateData = { ...updates };

      const { data, error } = await supabase
        .from('patients')
        .update(updateData)
        .eq('id', patientId)
        .select()
        .single();

      if (error) {
        console.error('Error updating patient:', error);
        toast.error('Erro ao atualizar paciente');
        return null;
      }

      // Atualiza a lista local de pacientes
      setPatients(prevPatients => 
        prevPatients.map(patient => 
          patient.id === patientId ? data : patient
        )
      );

      toast.success('Paciente atualizado com sucesso!');
      return data;
    } catch (error) {
      console.error('Error updating patient:', error);
      toast.error('Erro ao atualizar paciente');
      return null;
    }
  };

  // ✅ FUNÇÃO PARA CRIAR NOVO PACIENTE CORRIGIDA
  const createPatient = async (patientData: Omit<Patient, 'id' | 'created_at'>): Promise<Patient | null> => {
    if (!user || !supabase) {
      toast.error('Usuário não autenticado');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([
          {
            ...patientData,
            professional_id: user.id,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating patient:', error);
        toast.error('Erro ao criar paciente');
        return null;
      }

      // Atualiza a lista local
      setPatients(prevPatients => [data, ...prevPatients]);
      
      toast.success('Paciente criado com sucesso!');
      return data;
    } catch (error) {
      console.error('Error creating patient:', error);
      toast.error('Erro ao criar paciente');
      return null;
    }
  };

  // ✅ FUNÇÃO PARA DELETAR PACIENTE
  const deletePatient = async (patientId: string): Promise<boolean> => {
    if (!user || !supabase) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientId);

      if (error) {
        console.error('Error deleting patient:', error);
        toast.error('Erro ao deletar paciente');
        return false;
      }

      // Atualiza a lista local
      setPatients(prevPatients => 
        prevPatients.filter(patient => patient.id !== patientId)
      );

      toast.success('Paciente deletado com sucesso!');
      return true;
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Erro ao deletar paciente');
      return false;
    }
  };

  useEffect(() => {
    loadPatients();
  }, [user]);

  return {
    patients,
    loading,
    loadPatients,
    getPatient,
    updatePatient,
    createPatient,
    deletePatient,
  };
};