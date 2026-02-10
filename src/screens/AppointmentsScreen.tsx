// src/screens/AppointmentsScreen.tsx
import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabase/client";
import {
  Calendar,
  Clock,
  User,
  Search,
  DollarSign,
  Edit,
  Trash2,
  Filter,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  Zap,
  Stethoscope,
} from "lucide-react";
import ResponsiveAppLayout from "../components/Layout/ResponsiveAppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import { convertToSupabaseFormat, convertToBrazilianFormat } from "../utils/dateUtils";
import { useNavigate } from "react-router-dom";

interface Appointment {
  id: string;
  patient_name: string;
  patient_phone: string;
  start_time: string;
  description?: string;
  title: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  budget?: number;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

const AppointmentsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [startTime, setStartTime] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    loadAppointments();
    loadPatients();
  }, []);

  useEffect(() => {
    filterAndSortAppointments();
  }, [appointments, filter, sortOrder]);

  useEffect(() => {
    if (patientSearch) {
      const filtered = patients.filter(
        (patient) =>
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
      const { data, error } = await supabase.from("appointments").select("*").order("start_time", { ascending: true });

      if (error) throw error;

      const formattedAppointments =
        data?.map((appointment: any) => ({
          id: appointment.id,
          patient_name: appointment.patient_name,
          patient_phone: appointment.patient_phone,
          start_time: appointment.start_time,
          description: appointment.description,
          title: appointment.title,
          status: appointment.status,
          budget: appointment.budget,
        })) || [];

      setAppointments(formattedAppointments);
      setFilteredAppointments(formattedAppointments);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      setPatientsLoading(true);
      const { data, error } = await supabase.from("patients").select("id, name, phone, email").order("name", { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
    } finally {
      setPatientsLoading(false);
    }
  };

  const filterAndSortAppointments = () => {
    const now = new Date();

    let filtered = appointments.filter((appointment) => {
      const appointmentDate = new Date(appointment.start_time);
      switch (filter) {
        case "upcoming":
          return appointmentDate >= now;
        case "past":
          return appointmentDate < now;
        default:
          return true;
      }
    });

    filtered.sort((a, b) => {
      const dateA = new Date(a.start_time);
      const dateB = new Date(b.start_time);
      return sortOrder === "asc" ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
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
    setPatientSearch("");
  };

  const clearForm = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setTitle("");
    setStartTime("");
    setDescription("");
    setBudget("");
  };

  const startEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setSelectedPatient({
      id: "",
      name: appointment.patient_name,
      phone: appointment.patient_phone,
    });
    setPatientSearch(appointment.patient_name);
    setTitle(appointment.title);
    setStartTime(appointment.start_time.slice(0, 16));
    setDescription(appointment.description || "");
    setBudget(appointment.budget?.toString() || "");
  };

  const cancelEdit = () => {
    setEditingAppointment(null);
    clearForm();
  };

  const createAppointment = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedPatient || !startTime || !title) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      const isoStartTime = convertToSupabaseFormat(startTime);
      if (!isoStartTime) {
        alert("Data e hora de início inválidos.");
        return;
      }

      const appointmentData: any = {
        patient_name: selectedPatient.name,
        patient_phone: selectedPatient.phone,
        start_time: isoStartTime,
        title,
        status: "scheduled",
      };

      if (description) appointmentData.description = description;

      if (budget) {
        try {
          appointmentData.budget = parseFloat(budget);
        } catch {
          // ignore
        }
      }

      let error;
      if (editingAppointment) {
        ({ error } = await supabase.from("appointments").update(appointmentData).eq("id", editingAppointment.id));
      } else {
        ({ error } = await supabase.from("appointments").insert([appointmentData]));
      }

      if (error) throw error;

      alert(editingAppointment ? "Agendamento atualizado com sucesso!" : "Agendamento criado com sucesso!");
      clearForm();
      setEditingAppointment(null);
      loadAppointments();
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      alert("Erro ao salvar agendamento.");
    }
  };

  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;

    try {
      const { error } = await supabase.from("appointments").delete().eq("id", appointmentId);
      if (error) throw error;

      alert("Agendamento excluído com sucesso!");
      loadAppointments();
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      alert("Erro ao excluir agendamento.");
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: Appointment["status"]) => {
    try {
      const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);
      if (error) throw error;
      loadAppointments();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status do agendamento.");
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const isPastAppointment = (appointment: Appointment) => new Date(appointment.start_time) < new Date();

  if (loading) {
    return (
      <ResponsiveAppLayout title="Agendamentos" showBack={true}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative">
              <LoadingSpinner size="lg" className="text-blue-500" />
              <Sparkles className="absolute -top-2 -right-2 text-purple-500 animate-pulse" size={20} />
            </div>
            <p className="mt-4 text-gray-300">Carregando universo de agendamentos...</p>
          </div>
        </div>
      </ResponsiveAppLayout>
    );
  }

  const total = appointments.length;
  const upcoming = appointments.filter((a) => !isPastAppointment(a)).length;
  const confirmed = appointments.filter((a) => a.status === "confirmed").length;

  return (
    <ResponsiveAppLayout title="Agendamentos" showBack={true}>
      <div className="space-y-6 sm:space-y-8 w-full max-w-full min-w-0">
        {/* Header (padrão Dashboard) */}
        <div className="glass-card p-4 sm:p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 min-w-0">
                <div className="p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30 flex-shrink-0">
                  <Sparkles className="text-blue-300" size={28} />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-bold glow-text mb-2 whitespace-normal break-words">Gestão de Agendamentos</h1>
                  <p className="text-gray-300 text-base sm:text-lg whitespace-normal break-words">Controle completo da agenda da clínica</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 sm:mt-6 max-w-2xl w-full min-w-0">
                <div className="glass-card p-4 border border-white/10">
                  <p className="text-2xl font-bold text-white">{total}</p>
                  <p className="text-gray-400 text-sm">Total</p>
                </div>
                <div className="glass-card p-4 border border-white/10">
                  <p className="text-2xl font-bold text-green-300">{upcoming}</p>
                  <p className="text-gray-400 text-sm">Futuros</p>
                </div>
                <div className="glass-card p-4 border border-white/10">
                  <p className="text-2xl font-bold text-cyan-300">{confirmed}</p>
                  <p className="text-gray-400 text-sm">Confirmados</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="neon-button group relative overflow-hidden w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center"
              type="button"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus size={22} className="mr-2 sm:mr-3 relative z-10 shrink-0" />
              <span className="relative z-10 font-semibold whitespace-normal break-words">{editingAppointment ? "Editando..." : "Novo Agendamento"}</span>
            </button>
          </div>
        </div>

        {/* Form (padrão Dashboard: glass-card + inputs dark) */}
        <div className="glass-card p-4 sm:p-6 md:p-8 border border-white/10">
          <div className="flex items-center gap-3 mb-6 min-w-0">
            <Calendar className="text-purple-300 flex-shrink-0" size={26} />
            <h2 className="text-xl sm:text-2xl font-bold glow-text whitespace-normal break-words">{editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}</h2>
          </div>

          <form onSubmit={createAppointment} className="space-y-6 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
              {/* Paciente */}
              <div className="relative min-w-0">
                <label className="block text-sm font-medium text-gray-200 mb-2 whitespace-normal break-words">Paciente *</label>
                <div className="relative min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none shrink-0" size={20} />
                  <input
                    type="text"
                    placeholder={patientsLoading ? "Carregando pacientes..." : "Buscar paciente..."}
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full max-w-full min-h-[44px] pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                    disabled={!!editingAppointment || patientsLoading}
                  />
                  {selectedPatient && (
                    <button
                      type="button"
                      onClick={clearPatientSelection}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
                      disabled={!!editingAppointment}
                      title="Limpar paciente"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {showPatientDropdown && filteredPatients.length > 0 && !editingAppointment && (
                  <div className="absolute z-20 w-full mt-2 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-64 overflow-y-auto">
                    {filteredPatients.map((patient) => (
                      <button
                        type="button"
                        key={patient.id}
                        onClick={() => handlePatientSelect(patient)}
                        className="w-full text-left p-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                      >
                        <div className="font-semibold text-white">{patient.name}</div>
                        <div className="text-sm text-gray-300">{patient.phone}</div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedPatient && (
                  <div className="mt-3 glass-card p-4 border border-cyan-400/20 bg-cyan-500/10">
                    <p className="text-sm text-cyan-100 font-medium">
                      ✅ Paciente selecionado: {selectedPatient.name} — {selectedPatient.phone}
                    </p>
                  </div>
                )}
              </div>

              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Título do Procedimento *</label>
                <input
                  type="text"
                  placeholder="Ex: Limpeza de Pele, Botox..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Data/Hora */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Data e Hora *</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                  required
                />
              </div>

              {/* Orçamento */}
              <div>
                <label className="block text-sm font-medium text-gray-200 mb-2">Orçamento</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    placeholder="0,00"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Descrição do Procedimento</label>
              <textarea
                placeholder="Detalhes adicionais sobre o procedimento..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all h-28 resize-none"
              />
            </div>

            {/* Botões */}
<div className="flex flex-col sm:flex-row gap-3">
  <button
    type="submit"
    className="neon-button w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl leading-none"
  >
    <Plus size={20} className="shrink-0" />
    <span className="font-semibold whitespace-nowrap">
      {editingAppointment ? "Atualizar Agendamento" : "Criar Agendamento"}
    </span>
  </button>

  {editingAppointment && (
    <button
      type="button"
      onClick={cancelEdit}
      className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all leading-none"
    >
      <span className="font-semibold whitespace-nowrap">Cancelar</span>
    </button>
  )}
</div>


            <div className="text-xs text-gray-400 flex items-center gap-2">
              <Zap size={14} className="text-purple-300" />
              Dica: confirme e conclua direto no card do agendamento.
            </div>
          </form>
        </div>

        {/* Filtros (padrão Dashboard) */}
        <div className="glass-card p-6 border border-white/10">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            <div className="flex flex-wrap gap-2">
              {(["upcoming", "past", "all"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-2xl font-medium transition-all ${
                    filter === key ? "bg-white/15 text-white border border-white/20" : "bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {key === "upcoming" ? "Próximos" : key === "past" ? "Passados" : "Todos"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 transition-all"
            >
              <Filter size={16} />
              Ordenar: {sortOrder === "asc" ? "Mais Antigos" : "Mais Recentes"}
              {sortOrder === "asc" ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
          </div>
        </div>

        {/* Lista (cards glass) */}
        <div className="glass-card p-8 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="text-cyan-300" size={26} />
            <h3 className="text-2xl font-bold glow-text">
              Agendamentos ({filteredAppointments.length})
              {filter === "upcoming" && " — Próximos"}
              {filter === "past" && " — Passados"}
            </h3>
          </div>

          {filteredAppointments.length > 0 ? (
            <div className="space-y-4">
              {filteredAppointments.map((appointment) => {
                const isPast = isPastAppointment(appointment);

                const statusLabel =
                  appointment.status === "scheduled"
                    ? "Agendado"
                    : appointment.status === "confirmed"
                    ? "Confirmado"
                    : appointment.status === "completed"
                    ? "Concluído"
                    : "Cancelado";

                const statusClass =
                  appointment.status === "scheduled"
                    ? "bg-amber-500/15 text-amber-200 border border-amber-400/20"
                    : appointment.status === "confirmed"
                    ? "bg-cyan-500/15 text-cyan-200 border border-cyan-400/20"
                    : appointment.status === "completed"
                    ? "bg-green-500/15 text-green-200 border border-green-400/20"
                    : "bg-red-500/15 text-red-200 border border-red-400/20";

                return (
                  <div
                    key={appointment.id}
                    className={`glass-card p-6 border border-white/10 transition-all duration-300 hover:scale-[1.01] ${
                      isPast ? "opacity-75" : ""
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-4 mb-3">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                              isPast ? "bg-white/5 border-white/10" : "bg-gradient-to-r from-purple-500 to-pink-500 border-white/10"
                            }`}
                          >
                            <User className="text-white" size={22} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-lg truncate">{appointment.patient_name}</h4>
                            <p className="text-gray-300 font-medium">{appointment.title}</p>

                            {appointment.budget != null && (
                              <p className="text-green-300 font-bold text-sm mt-1">{formatCurrency(appointment.budget)}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
                          <div className="flex items-center gap-2">
                            <Clock size={16} />
                            <span>{convertToBrazilianFormat(appointment.start_time)}</span>
                          </div>

                          {isPast && (
                            <span className="text-xs font-medium bg-red-500/15 text-red-200 border border-red-400/20 px-3 py-1 rounded-full">
                              Passado
                            </span>
                          )}
                        </div>

                        {appointment.description && <p className="text-gray-300 mt-3 text-sm">{appointment.description}</p>}
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusClass}`}>{statusLabel}</span>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(appointment)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-200 transition-colors"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAppointment(appointment.id)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-red-200 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        {!isPast && appointment.status !== "cancelled" && (
                          <div className="flex gap-2 flex-wrap justify-end">
                            {appointment.status === "confirmed" && (
                              <button
                                type="button"
                                onClick={() => navigate(`/appointments/${appointment.id}/treatment`)}
                                className="text-xs px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/20 text-purple-100 transition-all flex items-center gap-1"
                              >
                                <Stethoscope size={14} />
                                <span>Iniciar Atendimento</span>
                              </button>
                            )}
                            {appointment.status !== "confirmed" && (
                              <button
                                type="button"
                                onClick={() => updateAppointmentStatus(appointment.id, "confirmed")}
                                className="text-xs px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/20 text-cyan-100 transition-all"
                              >
                                Confirmar
                              </button>
                            )}
                            {appointment.status !== "completed" && (
                              <button
                                type="button"
                                onClick={() => updateAppointmentStatus(appointment.id, "completed")}
                                className="text-xs px-3 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-400/20 text-green-100 transition-all"
                              >
                                Concluir
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => updateAppointmentStatus(appointment.id, "cancelled")}
                              className="text-xs px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/20 text-red-100 transition-all"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                <Calendar className="text-gray-400" size={40} />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">
                {filter === "upcoming"
                  ? "Nenhum agendamento futuro"
                  : filter === "past"
                  ? "Nenhum agendamento passado"
                  : "Nenhum agendamento encontrado"}
              </h4>
              <p className="text-gray-300">
                {filter === "upcoming"
                  ? "Todos os agendamentos futuros aparecerão aqui."
                  : "Comece criando seu primeiro agendamento."}
              </p>
            </div>
          )}
        </div>
      </div>
    </ResponsiveAppLayout>
  );
};

export default AppointmentsScreen;
