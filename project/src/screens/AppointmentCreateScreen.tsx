// src/screens/AppointmentCreateScreen.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Calendar, Clock } from 'lucide-react';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import LoadingSpinner from '../components/LoadingSpinner';

const AppointmentCreateScreen: React.FC = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const urlParams = new URLSearchParams(search);
  const patientId = urlParams.get('patientId');  // Pega o patientId da URL
  const [patient, setPatient] = useState<any | null>(null);
  const [startTime, setStartTime] = useState('');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patientId) {
      loadPatient(patientId);  // Carrega as informações do paciente
    }
  }, [patientId]);

  const loadPatient = async (id: string) => {
    const { data, error } = await supabase.from('patients').select('*').eq('id', id).single();
    if (error) {
      console.error('Erro ao carregar paciente:', error);
    } else {
      setPatient(data);  // Atualiza o estado com os dados do paciente
    }
    setLoading(false);
  };

  const createAppointment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!startTime || !description || !title) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    const { data, error } = await supabase.from('appointments').insert([
      {
        patient_id: patientId,
        start_time: startTime,
        description,
        title,
        status: 'scheduled',
      },
    ]);

    if (error) {
      console.error('Erro ao criar agendamento:', error);
      alert('Erro ao criar agendamento');
    } else {
      alert('Agendamento criado com sucesso!');
      navigate('/appointments');
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Agendar Procedimento" showBack />

      <div className="p-4 space-y-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Agendar Procedimento para {patient?.name}</h2>

        <form onSubmit={createAppointment} className="space-y-4">
          <input
            type="text"
            placeholder="Título do Procedimento"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="ios-input"
          />
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="ios-input"
          />
          <textarea
            placeholder="Descrição do Procedimento"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="ios-input h-20 resize-none"
          />
          <button type="submit" className="ios-button">
            Criar Agendamento
          </button>
        </form>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default AppointmentCreateScreen;
