// src/screens/AppointmentCreateScreen.tsx - VERSÃO SEM GOOGLE CALENDAR
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase/client';
import { Calendar, Clock, User, ArrowLeft, Plus, Search } from 'lucide-react';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';

// Função de conversão de data segura
const convertToSupabaseFormat = (dateTimeString: string): string | null => {
  try {
    if (!dateTimeString) return null;
    const date = new Date(dateTimeString);
    return date.toISOString();
  } catch (error) {
    console.error('Erro na conversão de data:', error);
    return null;
  }
};

const AppointmentCreateScreen: React.FC = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const urlParams = new URLSearchParams(search);
  const patientId = urlParams.get('patientId');
  
  const [patient, setPatient] = useState<any | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientSearch, setShowPatientSearch] = useState(!patientId);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('Clínica Estética');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (patientId) {
      loadPatient(patientId);
    } else {
      loadPatients();
      setLoading(false);
    }
  }, [patientId]);

  const loadPatient = async (id: string) => {
    try {
      setError('');
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao carregar paciente:', error);
        setError('Paciente não encontrado');
        setShowPatientSearch(true);
        await loadPatients();
        return;
      }

      setPatient(data);
    } catch (error) {
      console.error('Erro ao carregar paciente:', error);
      setError('Erro ao carregar paciente');
      setShowPatientSearch(true);
      await loadPatients();
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('name');

      if (error) {
        console.error('Erro ao carregar pacientes:', error);
        setError('Erro ao carregar lista de pacientes');
        return;
      }

      setPatients(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      setError('Erro ao carregar lista de pacientes');
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.phone?.includes(searchTerm)
  );

  const selectPatient = (selectedPatient: any) => {
    setPatient(selectedPatient);
    setShowPatientSearch(false);
    setError('');
  };

  const createAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError('');

    try {
      // Validações
      if (!startTime || !title) {
        throw new Error('Por favor, preencha todos os campos obrigatórios.');
      }

      if (!patient && !showPatientSearch) {
        throw new Error('Por favor, selecione um paciente.');
      }

      const isoStartTime = convertToSupabaseFormat(startTime);
      if (!isoStartTime) {
        throw new Error('Data e hora de início inválidos.');
      }

      const isoEndTime = endTime ? convertToSupabaseFormat(endTime) : null;

      const appointmentData: any = {
        patient_id: patient?.id || null,
        patient_name: patient?.name || '',
        patient_phone: patient?.phone || '',
        start_time: isoStartTime,
        end_time: isoEndTime,
        title,
        description: description || null,
        location: location,
        status: 'scheduled',
      };

      // Adicionar orçamento se preenchido
      if (budget) {
        try {
          appointmentData.budget = parseFloat(budget);
        } catch (error) {
          console.warn('Erro ao processar orçamento, ignorando...');
        }
      }

      // Criar no Supabase
      const { error: supabaseError } = await supabase
        .from('appointments')
        .insert([appointmentData]);

      if (supabaseError) {
        console.error('❌ Erro Supabase:', supabaseError);
        throw new Error(`Erro ao salvar agendamento: ${supabaseError.message}`);
      }

      // Mensagem de sucesso
      alert('✅ Agendamento criado com sucesso!');
      navigate('/appointments');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar agendamento';
      setError(errorMessage);
      console.error('💥 ERRO GERAL:', error);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  if (loading) {
    return (
      <AppLayout title="Carregando..." showBack={true}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Novo Agendamento" showBack={true}>
      <div className="p-6 space-y-6">
        {/* Header Premium */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center overflow-hidden">
              {patient?.photo_url ? (
                <img
                  src={patient.photo_url}
                  alt={patient.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="text-white" size={28} />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">Novo Agendamento</h1>
              {patient ? (
                <p className="text-white/80">
                  Para {patient.name} • {patient.phone}
                </p>
              ) : (
                <p className="text-white/80">Selecione um paciente</p>
              )}
              {patient?.birth_date && (
                <p className="text-white/60 text-sm mt-1">
                  {formatDate(patient.birth_date)} • {new Date().getFullYear() - new Date(patient.birth_date).getFullYear()} anos
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Mensagem de Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center space-x-3">
              <div className="text-red-600">⚠️</div>
              <div>
                <p className="text-red-800 font-medium">Erro</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Seletor de Paciente */}
        {showPatientSearch && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center space-x-2">
              <User className="text-purple-600" size={24} />
              <span>Selecionar Paciente</span>
            </h2>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar paciente por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {filteredPatients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPatient(p)}
                  className="w-full text-left p-4 border border-gray-200 rounded-xl hover:border-purple-300 hover:bg-purple-50 transition-all duration-300"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-semibold text-sm">
                      {p.name?.charAt(0) || 'P'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-sm text-gray-600">{p.phone}</p>
                    </div>
                  </div>
                </button>
              ))}
              
              {filteredPatients.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <User className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>Nenhum paciente encontrado</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => navigate('/patients/new')}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2"
              >
                <Plus size={20} />
                <span>Cadastrar Novo Paciente</span>
              </button>
            </div>
          </div>
        )}

        {/* Botão para trocar de paciente */}
        {patient && !showPatientSearch && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-semibold">
                  {patient.name?.charAt(0) || 'P'}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{patient.name}</p>
                  <p className="text-sm text-gray-600">{patient.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPatientSearch(true)}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                Trocar Paciente
              </button>
            </div>
          </div>
        )}

        {/* Formulário de Agendamento */}
        {(patient || !showPatientSearch) && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
              <Calendar className="text-purple-600" size={24} />
              <span>Detalhes do Agendamento</span>
            </h2>
            
            <form onSubmit={createAppointment} className="space-y-6">
              {/* Título do Procedimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Procedimento *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Limpeza de Pele, Aplicação de Botox, Consulta de Rotina..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  required
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Data e Hora de Início */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data e Hora de Início *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="datetime-local"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                      required
                    />
                  </div>
                </div>
                
                {/* Data e Hora de Término */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data e Hora de Término
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="datetime-local"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Local */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local
                  </label>
                  <input
                    type="text"
                    placeholder="Local da consulta"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  />
                </div>
                
                {/* Orçamento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Orçamento (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">R$</span>
                    <input
                      type="number"
                      placeholder="0,00"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    />
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrição do Procedimento
                </label>
                <textarea
                  placeholder="Detalhes adicionais, observações, materiais necessários..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 h-32 resize-none"
                />
              </div>

              {/* Botões */}
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/appointments')}
                  className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-600 transition-all duration-300"
                >
                  Cancelar
                </button>
                
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {creating ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Plus size={20} />
                  )}
                  <span>{creating ? 'Criando...' : 'Criar Agendamento'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Informações do Paciente */}
        {patient && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Informações do Paciente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Nome</p>
                <p className="font-semibold text-gray-900">{patient.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Telefone</p>
                <p className="font-semibold text-gray-900">{patient.phone}</p>
              </div>
              {patient.email && (
                <div>
                  <p className="text-gray-600">Email</p>
                  <p className="font-semibold text-gray-900">{patient.email}</p>
                </div>
              )}
              {patient.birth_date && (
                <div>
                  <p className="text-gray-600">Data de Nascimento</p>
                  <p className="font-semibold text-gray-900">{formatDate(patient.birth_date)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AppointmentCreateScreen;