// src/screens/AppointmentsScreen.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, User, Search, DollarSign, Edit, Trash2, Filter, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/Layout/AppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { convertToSupabaseFormat, convertToBrazilianFormat } from '../utils/dateUtils';

interface Appointment {
  id: string;
  patient_name: string; 
  patient_phone: string;
  start_time: string; 
  description?: string;
  title: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  budget?: number;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

const AppointmentsScreen: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [startTime, setStartTime] = useState('');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const navigate = useNavigate();

  useEffect(() => {
    loadAppointments();
    loadPatients();
  }, []);

  useEffect(() => {
    filterAndSortAppointments();
  }, [appointments, filter, sortOrder]);

  useEffect(() => {
    if (patientSearch) {
      const filtered = patients.filter(patient =>
        patient.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        patient.phone.includes(patientSearch)
      );
      setFilteredPatients(filtered);
      setShowPatientDropdown(true);
    } else {
      setFilteredPatients([]);
      setShowPatientDropdown(false);
    }
  }, [patientSearch, patients]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;

      // ✅ CORREÇÃO: Mapear corretamente os campos
      const formattedAppointments = data?.map(appointment => ({
        id: appointment.id,
        patient_name: appointment.patient_name,
        patient_phone: appointment.patient_phone,
        start_time: appointment.start_time,
        description: appointment.description,
        title: appointment.title,
        status: appointment.status,
        budget: appointment.budget
      })) || [];

      setAppointments(formattedAppointments);
      setFilteredAppointments(formattedAppointments);
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      setPatientsLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, phone, email')
        .order('name', { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    } finally {
      setPatientsLoading(false);
    }
  };

  const filterAndSortAppointments = () => {
    const now = new Date();
    
    let filtered = appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_time);
      
      switch (filter) {
        case 'upcoming':
          return appointmentDate >= now;
        case 'past':
          return appointmentDate < now;
        default:
          return true;
      }
    });

    // Ordenar por data
    filtered.sort((a, b) => {
      const dateA = new Date(a.start_time);
      const dateB = new Date(b.start_time);
      return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
    });

    setFilteredAppointments(filtered);
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.name);
    setShowPatientDropdown(false);
  };

  const clearPatientSelection = () => {
    setSelectedPatient(null);
    setPatientSearch('');
  };

  const startEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedPatient({
      id: '',
      name: appointment.patient_name,
      phone: appointment.patient_phone
    });
    setPatientSearch(appointment.patient_name);
    setTitle(appointment.title);
    setStartTime(appointment.start_time.slice(0, 16));
    setDescription(appointment.description || '');
    setBudget(appointment.budget?.toString() || '');
  };

  const cancelEdit = () => {
    setEditingAppointment(null);
    clearForm();
  };

  const clearForm = () => {
    setSelectedPatient(null);
    setPatientSearch('');
    setTitle('');
    setStartTime('');
    setDescription('');
    setBudget('');
  };

  const createAppointment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedPatient || !startTime || !title) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const isoStartTime = convertToSupabaseFormat(startTime);
      if (!isoStartTime) {
        alert('Data e hora de início inválidos.');
        return;
      }

      const appointmentData: any = {
        patient_name: selectedPatient.name,
        patient_phone: selectedPatient.phone,
        start_time: isoStartTime,
        title,
        status: 'scheduled',
      };

      if (description) {
        appointmentData.description = description;
      }

      if (budget) {
        try {
          appointmentData.budget = parseFloat(budget);
        } catch (error) {
          console.warn('Erro ao processar orçamento, ignorando...');
        }
      }

      let error;
      if (editingAppointment) {
        ({ error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', editingAppointment.id));
      } else {
        ({ error } = await supabase.from('appointments').insert([appointmentData]));
      }

      if (error) throw error;

      alert(editingAppointment ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!');
      
      clearForm();
      setEditingAppointment(null);
      loadAppointments();
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      alert('Erro ao salvar agendamento.');
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      alert('Agendamento excluído com sucesso!');
      loadAppointments();
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      alert('Erro ao excluir agendamento.');
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: Appointment['status']) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId);

      if (error) throw error;

      loadAppointments();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      alert('Erro ao atualizar status do agendamento.');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const isPastAppointment = (appointment: Appointment) => {
    return new Date(appointment.start_time) < new Date();
  };

  if (loading) {
    return (
      <AppLayout title="Agendamentos" showBack={true}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Agendamentos" showBack={true}>
      <div className="p-6 space-y-6">
        {/* Header Premium */}
        <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">Gestão de Agendamentos</h1>
              <p className="text-white/80 text-lg">
                Controle completo da agenda da clínica
              </p>
              
              {/* Estatísticas */}
              <div className="flex flex-wrap gap-6 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{appointments.length}</div>
                  <div className="text-white/60 text-sm">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {appointments.filter(a => !isPastAppointment(a)).length}
                  </div>
                  <div className="text-white/60 text-sm">Futuros</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {appointments.filter(a => a.status === 'confirmed').length}
                  </div>
                  <div className="text-white/60 text-sm">Confirmados</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário de Criação/Edição - Design Premium */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <Calendar className="text-purple-600" size={24} />
            <span>{editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}</span>
          </h2>
          
          <form onSubmit={createAppointment} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Campo de Busca de Paciente */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paciente *
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar paciente..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                    disabled={!!editingAppointment}
                  />
                  {selectedPatient && (
                    <button
                      type="button"
                      onClick={clearPatientSelection}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={!!editingAppointment}
                    >
                      ✕
                    </button>
                  )}
                </div>
                
                {showPatientDropdown && filteredPatients.length > 0 && !editingAppointment && (
                  <div className="absolute z-10 w-full bg-white border border-gray-300 rounded-xl shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {filteredPatients.map(patient => (
                      <div
                        key={patient.id}
                        onClick={() => handlePatientSelect(patient)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900">{patient.name}</div>
                        <div className="text-sm text-gray-600">{patient.phone}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {selectedPatient && (
                  <div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-800 font-medium">
                      ✅ Paciente selecionado: {selectedPatient.name} - {selectedPatient.phone}
                    </p>
                  </div>
                )}
              </div>

              {/* Título do Procedimento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título do Procedimento *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Limpeza de Pele, Botox..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data e Hora */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data e Hora *
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  required
                />
              </div>
              
              {/* Orçamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Orçamento
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
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
                placeholder="Detalhes adicionais sobre o procedimento..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 h-24 resize-none"
              />
            </div>

            {/* Botões */}
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Plus size={20} />
                <span>{editingAppointment ? 'Atualizar' : 'Criar'} Agendamento</span>
              </button>
              
              {editingAppointment && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 bg-gray-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-gray-600 transition-all duration-300 hover:scale-105"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Filtros e Controles */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  filter === 'upcoming' 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Próximos
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  filter === 'past' 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Passados
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  filter === 'all' 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
            </div>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300"
            >
              <Filter size={16} />
              Ordenar: {sortOrder === 'asc' ? 'Mais Antigos' : 'Mais Recentes'}
              {sortOrder === 'asc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </div>

        {/* Lista de Agendamentos - Design Premium */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
            <Clock className="text-purple-600" size={24} />
            <span>
              Agendamentos ({filteredAppointments.length})
              {filter === 'upcoming' && ' - Próximos'}
              {filter === 'past' && ' - Passados'}
            </span>
          </h3>
          
          {filteredAppointments.length > 0 ? (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={`p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg group ${
                    isPastAppointment(appointment) 
                      ? 'bg-gray-50 border-gray-200 opacity-75' 
                      : 'bg-white border-gray-200 hover:border-purple-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Informações do Agendamento */}
                    <div className="flex-1">
                      <div className="flex items-start space-x-4 mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          isPastAppointment(appointment) ? 'bg-gray-400' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                        }`}>
                          <User className="text-white" size={24} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg group-hover:text-purple-600 transition-colors">
                            {appointment.patient_name}
                          </h4>
                          <p className="text-gray-700 font-medium">{appointment.title}</p>
                          
                          {appointment.budget && (
                            <p className="text-green-600 font-bold text-sm mt-1">
                              {formatCurrency(appointment.budget)}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Clock size={16} />
                          <span>{convertToBrazilianFormat(appointment.start_time)}</span>
                        </div>
                        {isPastAppointment(appointment) && (
                          <span className="text-red-500 text-xs font-medium bg-red-50 px-2 py-1 rounded-full">
                            Passado
                          </span>
                        )}
                      </div>

                      {appointment.description && (
                        <p className="text-gray-600 mt-3 text-sm">
                          {appointment.description}
                        </p>
                      )}
                    </div>

                    {/* Status e Ações */}
                    <div className="flex flex-col items-end space-y-3">
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full ${
                          appointment.status === 'scheduled'
                            ? 'bg-yellow-100 text-yellow-800'
                            : appointment.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : appointment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {appointment.status === 'scheduled'
                          ? 'Agendado'
                          : appointment.status === 'confirmed'
                          ? 'Confirmado'
                          : appointment.status === 'completed'
                          ? 'Concluído'
                          : 'Cancelado'}
                      </span>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(appointment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar agendamento"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => deleteAppointment(appointment.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir agendamento"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Ações Rápidas de Status */}
                      {!isPastAppointment(appointment) && appointment.status !== 'cancelled' && (
                        <div className="flex gap-2 flex-wrap">
                          {appointment.status !== 'confirmed' && (
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                              className="text-xs px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                              Confirmar
                            </button>
                          )}
                          {appointment.status !== 'completed' && (
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                              className="text-xs px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                            >
                              Concluir
                            </button>
                          )}
                          <button
                            onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                            className="text-xs px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-gray-400" size={40} />
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {filter === 'upcoming' 
                  ? 'Nenhum agendamento futuro' 
                  : filter === 'past' 
                  ? 'Nenhum agendamento passado'
                  : 'Nenhum agendamento encontrado'}
              </h4>
              <p className="text-gray-600">
                {filter === 'upcoming' 
                  ? 'Todos os agendamentos futuros aparecerão aqui' 
                  : 'Comece criando seu primeiro agendamento'}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AppointmentsScreen;