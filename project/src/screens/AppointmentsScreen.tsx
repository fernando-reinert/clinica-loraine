// src/screens/AppointmentsScreen.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Calendar, Clock, User, Search, DollarSign, Edit, Trash2, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
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
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;

      const formattedAppointments = data?.map(appointment => ({
        ...appointment,
        patientName: appointment.patient_name,
        patientPhone: appointment.patient_phone,
        startTime: appointment.start_time
      })) || [];

      setAppointments(formattedAppointments);
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
    setStartTime(appointment.start_time.slice(0, 16)); // Formato para datetime-local
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
          delete appointmentData.budget;
        }
      }

      let error;
      if (editingAppointment) {
        // Editar agendamento existente
        ({ error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', editingAppointment.id));
      } else {
        // Criar novo agendamento
        ({ error } = await supabase.from('appointments').insert([appointmentData]));
      }

      if (error) {
        if (error.message.includes('budget') || error.code === 'PGRST204') {
          console.warn('Coluna budget não encontrada, criando/atualizando sem orçamento...');
          delete appointmentData.budget;
          
          if (editingAppointment) {
            ({ error } = await supabase
              .from('appointments')
              .update(appointmentData)
              .eq('id', editingAppointment.id));
          } else {
            ({ error } = await supabase.from('appointments').insert([appointmentData]));
          }
          if (error) throw error;
        } else {
          throw error;
        }
      }

      alert(editingAppointment ? 'Agendamento atualizado com sucesso!' : 'Agendamento criado com sucesso!');
      
      clearForm();
      setEditingAppointment(null);
      loadAppointments();
    } catch (error) {
      console.error('Erro ao salvar agendamento:', error);
      alert('Erro ao salvar agendamento. Verifique o console para mais detalhes.');
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
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      <Header title="Agendamentos" />

      <div className="p-4 space-y-6">
        {/* Formulário de Criação/Edição de Agendamento */}
        <div className="ios-card p-6 bg-gradient-to-r from-purple-600 to-blue-500 shadow-2xl rounded-lg">
          <h2 className="text-xl font-semibold mb-4">
            {editingAppointment ? 'Editar Agendamento' : 'Novo Agendamento'}
          </h2>
          <form onSubmit={createAppointment} className="space-y-4">
            {/* Campo de Busca de Paciente */}
            <div className="relative">
              <label className="block text-sm font-medium text-white mb-2">
                Paciente *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="ios-input bg-black border-gray-700 focus:border-blue-400 pl-10"
                  disabled={!!editingAppointment}
                />
                {selectedPatient && (
                  <button
                    type="button"
                    onClick={clearPatientSelection}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                    disabled={!!editingAppointment}
                  >
                    ✕
                  </button>
                )}
                {showPatientDropdown && filteredPatients.length > 0 && !editingAppointment && (
                  <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                    {filteredPatients.map(patient => (
                      <div
                        key={patient.id}
                        onClick={() => handlePatientSelect(patient)}
                        className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                      >
                        <div className="font-medium text-white">{patient.name}</div>
                        <div className="text-sm text-gray-400">{patient.phone}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {selectedPatient && (
                <div className="mt-2 p-2 bg-gray-800 rounded-lg">
                  <p className="text-sm text-white">
                    <strong>Paciente selecionado:</strong> {selectedPatient.name} - {selectedPatient.phone}
                  </p>
                </div>
              )}
            </div>

            <input
              type="text"
              placeholder="Título do Procedimento *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="ios-input bg-black border-gray-700 focus:border-blue-400"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Data e Hora *
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="ios-input bg-black border-gray-700 focus:border-blue-400 w-full"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Orçamento (R$)
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
                    className="ios-input bg-black border-gray-700 focus:border-blue-400 pl-10"
                  />
                </div>
              </div>
            </div>

            <textarea
              placeholder="Descrição do procedimento (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="ios-input h-20 resize-none bg-black border-gray-700 focus:border-blue-400"
            />

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 ios-button bg-gradient-to-r from-green-500 to-green-600 hover:scale-105 transition-transform"
              >
                {editingAppointment ? 'Atualizar' : 'Criar'} Agendamento
              </button>
              {editingAppointment && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 ios-button bg-gradient-to-r from-gray-500 to-gray-600 hover:scale-105 transition-transform"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Filtros e Ordenação */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'upcoming' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Próximos
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'past' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Passados
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Todos
            </button>
          </div>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <Filter size={16} />
            Ordenar: {sortOrder === 'asc' ? 'Mais Antigos' : 'Mais Recentes'}
            {sortOrder === 'asc' ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        {/* Agendamentos Listados */}
        <div>
          <h3 className="text-lg font-semibold mb-4">
            Agendamentos ({filteredAppointments.length})
            {filter === 'upcoming' && ' - Próximos'}
            {filter === 'past' && ' - Passados'}
          </h3>
          {filteredAppointments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className={`ios-card p-6 border-gray-700 rounded-lg shadow-xl hover:scale-105 transition-all ${
                    isPastAppointment(appointment) 
                      ? 'bg-gray-800 opacity-75' 
                      : 'bg-black'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isPastAppointment(appointment) ? 'bg-gray-600' : 'bg-blue-500'
                      }`}>
                        <User className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{appointment.patient_name}</h3>
                        <p className="text-sm">{appointment.title}</p>
                        {appointment.budget && (
                          <p className="text-sm text-green-400 font-medium">
                            {formatCurrency(appointment.budget)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          appointment.status === 'scheduled'
                            ? 'bg-yellow-500'
                            : appointment.status === 'confirmed'
                            ? 'bg-blue-500'
                            : appointment.status === 'completed'
                            ? 'bg-green-500'
                            : 'bg-red-500'
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
                      <div className="flex space-x-1">
                        <button
                          onClick={() => startEdit(appointment)}
                          className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                          title="Editar agendamento"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => deleteAppointment(appointment.id)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Excluir agendamento"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 text-sm mb-2">
                    <Clock size={16} />
                    <span>{convertToBrazilianFormat(appointment.start_time)}</span>
                    {isPastAppointment(appointment) && (
                      <span className="text-red-400 text-xs">(Passado)</span>
                    )}
                  </div>
                  
                  {appointment.description && (
                    <p className="text-sm text-gray-400 mt-2">
                      {appointment.description}
                    </p>
                  )}
                  
                  {/* Ações Rápidas de Status */}
                  {!isPastAppointment(appointment) && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')}
                        className={`text-xs px-2 py-1 rounded ${
                          appointment.status === 'confirmed' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                        className={`text-xs px-2 py-1 rounded ${
                          appointment.status === 'completed' 
                            ? 'bg-green-600 text-white' 
                            : 'bg-green-500 text-white hover:bg-green-600'
                        }`}
                      >
                        Concluir
                      </button>
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')}
                        className={`text-xs px-2 py-1 rounded ${
                          appointment.status === 'cancelled' 
                            ? 'bg-red-600 text-white' 
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="ios-card p-8 text-center bg-gray-800">
              <Calendar className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 mb-4">
                {filter === 'upcoming' 
                  ? 'Nenhum agendamento futuro encontrado' 
                  : filter === 'past' 
                  ? 'Nenhum agendamento passado encontrado'
                  : 'Nenhum agendamento encontrado'}
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AppointmentsScreen;