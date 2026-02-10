// src/screens/AppointmentsScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../services/supabase/client";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  User,
  Edit,
  Trash2,
  Filter,
  ChevronDown,
  ChevronUp,
  Plus,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import ResponsiveAppLayout from "../components/Layout/ResponsiveAppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import AppointmentDetailsForm from "../components/appointments/AppointmentDetailsForm";
import type { AppointmentForForm, PatientForForm } from "../components/appointments/AppointmentDetailsForm";
import { convertToBrazilianFormat } from "../utils/dateUtils";
import { cancelGcalEvent } from "../services/calendar";

interface Appointment {
  id: string;
  patient_name: string;
  patient_phone: string;
  start_time: string;
  end_time?: string | null;
  description?: string;
  title: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  budget?: number;
  gcal_event_id?: string | null;
}

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

const AppointmentsScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdFromUrl = searchParams.get("patientId");

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientFromUrl, setPatientFromUrl] = useState<PatientForForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState<Appointment | null>(null);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [formResetKey, setFormResetKey] = useState(0);
  const formFirstInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAppointments();
    loadPatients();
  }, []);

  useEffect(() => {
    filterAndSortAppointments();
  }, [appointments, filter, sortOrder]);

  useEffect(() => {
    if (!patientIdFromUrl) {
      setPatientFromUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("patients")
        .select("id, name, phone, email")
        .eq("id", patientIdFromUrl)
        .single();
      if (!cancelled && !error && data) {
        setPatientFromUrl(data as PatientForForm);
      } else {
        setPatientFromUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientIdFromUrl]);

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
          end_time: appointment.end_time ?? null,
          description: appointment.description,
          title: appointment.title,
          status: appointment.status,
          budget: appointment.budget,
          gcal_event_id: appointment.gcal_event_id ?? appointment.google_event_id ?? null,
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

  const startEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => titleInputRef.current?.focus(), 150);
  };

  const cancelEdit = () => {
    setEditingAppointment(null);
  };

  const handleFormCreated = () => {
    setFormResetKey((k) => k + 1);
    setEditingAppointment(null);
    loadAppointments();
  };

  const handleFormUpdated = () => {
    setEditingAppointment(null);
    loadAppointments();
  };

  const deleteAppointment = (appointment: Appointment) => {
    setDeleteConfirming(appointment);
  };

  const confirmDeleteAppointment = async () => {
    const appointment = deleteConfirming;
    if (!appointment) return;
    setDeleteConfirming(null);
    try {
      if (appointment.gcal_event_id) {
        await cancelGcalEvent(appointment.gcal_event_id);
      }
      const { error } = await supabase.from("appointments").delete().eq("id", appointment.id);
      if (error) throw error;
      toast.success("Agendamento excluído com sucesso!");
      loadAppointments();
    } catch (error: any) {
      console.error("Erro ao excluir agendamento:", error);
      toast.error("Erro ao excluir agendamento.");
    }
  };

  const updateAppointmentStatus = async (appointment: Appointment, status: Appointment["status"]) => {
    try {
      if (status === "cancelled" && appointment.gcal_event_id) {
        const cancelResult = await cancelGcalEvent(appointment.gcal_event_id);
        await supabase
          .from("appointments")
          .update({
            status,
            gcal_status: "cancelled",
            gcal_updated_at: new Date().toISOString(),
            ...(cancelResult.ok ? {} : { gcal_last_error: cancelResult.error ?? "Cancelamento no Google falhou" }),
          })
          .eq("id", appointment.id);
      } else {
        const { error } = await supabase.from("appointments").update({ status }).eq("id", appointment.id);
        if (error) throw error;
      }
      loadAppointments();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do agendamento.");
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

        {/* Formulário padrão "Detalhes do Agendamento" — único componente reutilizado */}
        <AppointmentDetailsForm
          key={editingAppointment?.id ?? `new-${formResetKey}`}
          mode={editingAppointment ? "edit" : "create"}
          showPatientPicker={!patientIdFromUrl}
          initialPatientId={patientIdFromUrl ?? undefined}
          initialPatient={patientFromUrl}
          initialAppointment={editingAppointment ? (editingAppointment as AppointmentForForm) : null}
          patients={patients as PatientForForm[]}
          patientsLoading={patientsLoading}
          onCreated={handleFormCreated}
          onUpdated={handleFormUpdated}
          onCancel={cancelEdit}
          formFirstInputRef={formFirstInputRef}
          titleInputRef={titleInputRef}
        />

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

        {/* Lista / Histórico de agendamentos — sempre visível abaixo do formulário e dos filtros */}
        <div id="historico-agendamentos" className="glass-card p-8 border border-white/10">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="text-cyan-300" size={26} />
            <h3 className="text-2xl font-bold glow-text">
              Histórico de Agendamentos ({filteredAppointments.length})
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
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              startEdit(appointment);
                            }}
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-200 transition-colors"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteAppointment(appointment);
                            }}
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
                                onClick={() => updateAppointmentStatus(appointment, "confirmed")}
                                className="text-xs px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/20 text-cyan-100 transition-all"
                              >
                                Confirmar
                              </button>
                            )}
                            {appointment.status !== "completed" && (
                              <button
                                type="button"
                                onClick={() => updateAppointmentStatus(appointment, "completed")}
                                className="text-xs px-3 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-400/20 text-green-100 transition-all"
                              >
                                Concluir
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => updateAppointmentStatus(appointment, "cancelled")}
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

      {/* Modal de confirmação de exclusão */}
      {deleteConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirming(null)}>
          <div
            className="glass-card p-6 border border-white/20 rounded-2xl shadow-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Excluir agendamento?</h3>
            <p className="text-gray-300 text-sm mb-4">
              Tem certeza que deseja excluir o agendamento de <strong className="text-white">{deleteConfirming.patient_name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirming(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteAppointment}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </ResponsiveAppLayout>
  );
};

export default AppointmentsScreen;
