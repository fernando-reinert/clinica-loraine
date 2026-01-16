// src/hooks/useClinicalRecord.ts
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase/client';
import { PostgrestError } from '@supabase/supabase-js';
import toast from 'react-hot-toast';

export const useClinicalRecord = (patientId: string) => {
  const [record, setRecord] = useState<any>({}); // Record para os dados do paciente
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPatientData = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;

      setRecord((prev: any) => ({
        ...prev,
        ...data,
      }));
    } catch (error) {
      console.error('Erro ao carregar dados do paciente:', error);
      toast.error('Erro ao carregar dados do paciente');
    }
  };

  const loadClinicalRecord = async () => {
    try {
      const { data, error } = await supabase
        .from('clinical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setRecord((prev: any) => ({
          ...prev,
          ...data[0],
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar ficha clínica:', error);
      toast.error('Erro ao carregar ficha clínica');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      loadPatientData();
      loadClinicalRecord();
    } else {
      setLoading(false);
      toast.error('ID do paciente não encontrado');
    }
  }, [patientId]);

  return { record, loading, saving, setRecord };
};
