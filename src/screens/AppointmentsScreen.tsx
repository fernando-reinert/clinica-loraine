// src/screens/AppointmentsScreen.tsx - Calendar-first: visão do dia + drawer create/edit
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Stethoscope,
} from "lucide-react";
import ResponsiveAppLayout from "../components/Layout/ResponsiveAppLayout";
import LoadingSpinner from "../components/LoadingSpinner";
import DayCalendarView from "../components/appointments/DayCalendarView";
import type { DayCalendarEvent } from "../components/appointments/DayCalendarView";
import AppointmentDrawer from "../components/appointments/AppointmentDrawer";
import type { DrawerAppointment } from "../components/appointments/AppointmentDrawer";
import { convertToBrazilianFormat } from "../utils/dateUtils";
import { cancelGcalEvent } from "../services/calendar";
import { listAppointmentsByDay } from "../services/appointments/appointmentService";

interface Appointment {
  id: string;
  patient_id?: string | null;
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

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const AppointmentsScreen: React.FC = () => {
  const navigate = useNavigate();

  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0, 0);
  });
  const [dayAppointments, setDayAppointments] = useState<DayCalendarEvent[]>([]);
  const [dayLoading, setDayLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [drawerInitialDate, setDrawerInitialDate] = useState<Date | undefined>();
  const [drawerInitialHour, setDrawerInitialHour] = useState(8);
  const [drawerInitialMinute, setDrawerInitialMinute] = useState(0);
  const [drawerAppointment, setDrawerAppointment] = useState<DrawerAppointment | null>(null);
  const [deleteConfirming, setDeleteConfirming] = useState<Appointment | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [expandedPatientKeys, setExpandedPatientKeys] = useState<Set<string>>(new Set());
  const requestIdRef = useRef(0);

  const historyGroups = React.useMemo(() => {
    const map = new Map<string, { patientName: string; appointments: Appointment[] }>();
    for (const a of filteredAppointments) {
      const key = a.patient_id ?? a.patient_name ?? "sem-nome";
      const name = a.patient_name?.trim() || "Sem nome";
      if (!map.has(key)) map.set(key, { patientName: name, appointments: [] });
      map.get(key)!.appointments.push(a);
    }
    return Array.from(map.entries())
      .map(([key, { patientName, appointments }]) => ({
        key,
        patientName,
        appointments: [...appointments].sort(
          (x, y) => new Date(x.start_time).getTime() - new Date(y.start_time).getTime()
        ),
      }))
      .sort((a, b) => a.patientName.localeCompare(b.patientName, "pt-BR"));
  }, [filteredAppointments]);

  const togglePatientGroup = (key: string) => {
    setExpandedPatientKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const loadDayAppointments = useCallback(async () => {
    const myId = ++requestIdRef.current;
    setDayLoading(true);
    try {
      const data = await listAppointmentsByDay(selectedDay);
      if (myId !== requestIdRef.current) return;
      setDayAppointments(
        (data ?? []).map((a: any) => ({
          id: a.id,
          start_time: a.start_time,
          end_time: a.end_time,
          patient_name: a.patient_name ?? "",
          title: a.title ?? "",
          status: a.status,
          budget: a.budget,
        }))
      );
    } catch (err) {
      if (myId === requestIdRef.current) toast.error("Erro ao carregar agenda do dia.");
    } finally {
      if (myId === requestIdRef.current) setDayLoading(false);
    }
  }, [selectedDay]);

  useEffect(() => {
    loadDayAppointments();
  }, [loadDayAppointments]);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("appointments").select("*").order("start_time", { ascending: true });
      if (error) throw error;
      const formatted =
        data?.map((a: any) => ({
          id: a.id,
          patient_id: a.patient_id,
          patient_name: a.patient_name,
          patient_phone: a.patient_phone,
          start_time: a.start_time,
          end_time: a.end_time ?? null,
          description: a.description,
          title: a.title,
          status: a.status,
          budget: a.budget,
          gcal_event_id: a.gcal_event_id ?? a.google_event_id ?? null,
        })) ?? [];
      setAppointments(formatted);
      setFilteredAppointments(formatted);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
      toast.error("Erro ao carregar lista.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    const now = new Date();
    let filtered = appointments.filter((a) => {
      const d = new Date(a.start_time);
      if (filter === "upcoming") return d >= now;
      if (filter === "past") return d < now;
      return true;
    });
    filtered.sort((a, b) => {
      const ta = new Date(a.start_time).getTime();
      const tb = new Date(b.start_time).getTime();
      return sortOrder === "asc" ? ta - tb : tb - ta;
    });
    setFilteredAppointments(filtered);
  }, [appointments, filter, sortOrder]);

  const handleSlotClick = (date: Date, hour: number, minute: number) => {
    setDrawerInitialDate(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
    setDrawerInitialHour(hour);
    setDrawerInitialMinute(minute);
    setDrawerAppointment(null);
    setDrawerMode("create");
    setDrawerOpen(true);
  };

  const handleEventClick = (ev: DayCalendarEvent) => {
    const full = appointments.find((a) => a.id === ev.id);
    if (full) {
setDrawerAppointment({
      id: full.id,
      patient_id: full.patient_id,
      patient_name: full.patient_name,
      patient_phone: full.patient_phone ?? "",
      start_time: full.start_time,
      end_time: full.end_time,
      title: full.title,
      description: full.description,
      status: full.status,
      budget: full.budget,
      gcal_event_id: full.gcal_event_id,
    });
    } else {
      setDrawerAppointment({
        id: ev.id,
        patient_name: ev.patient_name,
        patient_phone: "",
        start_time: ev.start_time,
        end_time: ev.end_time,
        title: ev.title,
      });
    }
    setDrawerMode("edit");
    setDrawerInitialDate(undefined);
    setDrawerOpen(true);
  };

  const handleDrawerSaved = () => {
    loadDayAppointments();
    loadAppointments();
  };

  const goPrevDay = () => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() - 1);
    setSelectedDay(d);
  };
  const goNextDay = () => {
    const d = new Date(selectedDay);
    d.setDate(d.getDate() + 1);
    setSelectedDay(d);
  };
  const goToday = () => {
    const t = new Date();
    setSelectedDay(new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0, 0));
  };

  const openEditFromList = (appointment: Appointment) => {
    setDrawerAppointment({
      id: appointment.id,
      patient_id: appointment.patient_id,
      patient_name: appointment.patient_name,
      patient_phone: appointment.patient_phone ?? "",
      start_time: appointment.start_time,
      end_time: appointment.end_time,
      title: appointment.title,
      description: appointment.description,
      status: appointment.status,
      budget: appointment.budget,
      gcal_event_id: appointment.gcal_event_id,
    });
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  const confirmDeleteAppointment = async () => {
    const appointment = deleteConfirming;
    if (!appointment) return;
    setDeleteConfirming(null);
    let gcalFailed = false;
    try {
      if (appointment.gcal_event_id) {
        try {
          await cancelGcalEvent(appointment.gcal_event_id);
        } catch (gcalErr: any) {
          console.warn("Google Calendar: falha ao remover evento", gcalErr);
          gcalFailed = true;
        }
      }
      const { error } = await supabase.from("appointments").delete().eq("id", appointment.id);
      if (error) throw error;
      toast.success(
        gcalFailed
          ? "Agendamento excluído. Não foi possível remover do Google Calendar."
          : "Agendamento excluído."
      );
      loadDayAppointments();
      loadAppointments();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao excluir.");
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
        await supabase.from("appointments").update({ status }).eq("id", appointment.id);
      }
      loadDayAppointments();
      loadAppointments();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar status.");
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const isPastAppointment = (a: Appointment) => new Date(a.start_time) < new Date();

  const total = appointments.length;
  const upcoming = appointments.filter((a) => !isPastAppointment(a)).length;
  const confirmed = appointments.filter((a) => a.status === "confirmed").length;

  return (
    <ResponsiveAppLayout title="Agendamentos" showBack>
      <div className="space-y-6 w-full max-w-full min-w-0">
        {/* Header: dia selecionado + navegação */}
        <div className="glass-card p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="p-3 bg-blue-500/20 rounded-2xl border border-blue-400/30">
                <Sparkles className="text-blue-300" size={28} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold glow-text">Agenda do dia</h1>
                <p className="text-gray-300 capitalize">{formatDayLabel(selectedDay)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrevDay}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                aria-label="Dia anterior"
              >
                <ChevronLeft size={22} />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-medium"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={goNextDay}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                aria-label="Próximo dia"
              >
                <ChevronRight size={22} />
              </button>
            </div>
          </div>
          <div className="relative z-10 grid grid-cols-3 gap-3 mt-4 max-w-xs">
            <div className="glass-card p-3 border border-white/10">
              <p className="text-lg font-bold text-white">{total}</p>
              <p className="text-gray-400 text-xs">Total</p>
            </div>
            <div className="glass-card p-3 border border-white/10">
              <p className="text-lg font-bold text-green-300">{upcoming}</p>
              <p className="text-gray-400 text-xs">Futuros</p>
            </div>
            <div className="glass-card p-3 border border-white/10">
              <p className="text-lg font-bold text-cyan-300">{confirmed}</p>
              <p className="text-gray-400 text-xs">Confirmados</p>
            </div>
          </div>
        </div>

        {/* Visão do dia: grid de horários + eventos */}
        <div className="glass-card p-4 sm:p-6 border border-white/10">
          {dayLoading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <LoadingSpinner size="lg" className="text-cyan-500" />
            </div>
          ) : (
            <DayCalendarView
              day={selectedDay}
              appointments={dayAppointments}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
            />
          )}
        </div>

        {/* Histórico (secundário): accordion */}
        <div className="glass-card border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setHistoryExpanded((e) => !e)}
            className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Clock className="text-cyan-300" size={24} />
              <h3 className="text-lg font-bold text-white">
                Histórico ({filteredAppointments.length})
                {filter === "upcoming" && " — Próximos"}
                {filter === "past" && " — Passados"}
              </h3>
            </div>
            {historyExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {historyExpanded && (
            <div className="border-t border-white/10 p-4 sm:p-6">
              <div className="flex flex-wrap gap-2 mb-4">
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
                <button
                  type="button"
                  onClick={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200"
                >
                  <Filter size={16} />
                  {sortOrder === "asc" ? "Mais antigos" : "Mais recentes"}
                </button>
              </div>
              {filteredAppointments.length > 0 ? (
                <div className="space-y-3">
                  {historyGroups.map((group) => {
                    const isGroupExpanded = expandedPatientKeys.has(group.key);
                    return (
                      <div key={group.key} className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
                        <button
                          type="button"
                          onClick={() => togglePatientGroup(group.key)}
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center flex-shrink-0">
                              <User className="text-cyan-200" size={20} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-white truncate">{group.patientName}</h4>
                              <p className="text-gray-400 text-sm">
                                {group.appointments.length} agendamento{group.appointments.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          {isGroupExpanded ? (
                            <ChevronUp className="text-gray-400 flex-shrink-0" size={20} />
                          ) : (
                            <ChevronDown className="text-gray-400 flex-shrink-0" size={20} />
                          )}
                        </button>
                        {isGroupExpanded && (
                          <div className="border-t border-white/10 p-3 pt-2 space-y-2">
                            {group.appointments.map((appointment) => {
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
                                  ? "bg-amber-500/15 text-amber-200 border-amber-400/20"
                                  : appointment.status === "confirmed"
                                  ? "bg-cyan-500/15 text-cyan-200 border-cyan-400/20"
                                  : appointment.status === "completed"
                                  ? "bg-green-500/15 text-green-200 border-green-400/20"
                                  : "bg-red-500/15 text-red-200 border-red-400/20";
                              return (
                                <div
                                  key={appointment.id}
                                  className={`glass-card p-4 border border-white/10 ${isPast ? "opacity-75" : ""}`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-gray-300 text-sm truncate mb-1">{appointment.title}</p>
                                      <div className="flex items-center gap-2 text-sm text-gray-400">
                                        <Clock size={14} />
                                        {convertToBrazilianFormat(appointment.start_time)}
                                      </div>
                                      {appointment.budget != null && (
                                        <p className="text-green-300 text-sm font-semibold mt-1">{formatCurrency(appointment.budget)}</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full border ${statusClass}`}>
                                        {statusLabel}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => openEditFromList(appointment)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-cyan-200"
                                        title="Editar"
                                      >
                                        <Edit size={18} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteConfirming(appointment)}
                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-red-200"
                                        title="Excluir"
                                      >
                                        <Trash2 size={18} />
                                      </button>
                                      {!isPast && appointment.status !== "cancelled" && (
                                        <>
                                          {appointment.status === "confirmed" && (
                                            <button
                                              type="button"
                                              onClick={() => navigate(`/appointments/${appointment.id}/treatment`)}
                                              className="text-xs px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/20 text-purple-100 flex items-center gap-1"
                                            >
                                              <Stethoscope size={14} />
                                              Atendimento
                                            </button>
                                          )}
                                          {appointment.status !== "confirmed" && (
                                            <button
                                              type="button"
                                              onClick={() => updateAppointmentStatus(appointment, "confirmed")}
                                              className="text-xs px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/20 text-cyan-100"
                                            >
                                              Confirmar
                                            </button>
                                          )}
                                          {appointment.status !== "completed" && (
                                            <button
                                              type="button"
                                              onClick={() => updateAppointmentStatus(appointment, "completed")}
                                              className="text-xs px-3 py-2 rounded-xl bg-green-500/20 border border-green-400/20 text-green-100"
                                            >
                                              Concluir
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => updateAppointmentStatus(appointment, "cancelled")}
                                            className="text-xs px-3 py-2 rounded-xl bg-red-500/20 border border-red-400/20 text-red-100"
                                          >
                                            Cancelar
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  {filter === "upcoming" ? "Nenhum agendamento futuro." : filter === "past" ? "Nenhum agendamento passado." : "Nenhum agendamento."}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <AppointmentDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleDrawerSaved}
        mode={drawerMode}
        initialDate={drawerInitialDate}
        initialHour={drawerInitialHour}
        initialMinute={drawerInitialMinute}
        initialAppointment={drawerMode === "edit" ? drawerAppointment : null}
      />

      {deleteConfirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteConfirming(null)}
        >
          <div
            className="glass-card p-6 border border-white/20 rounded-2xl max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-2">Excluir agendamento?</h3>
            <p className="text-gray-300 text-sm mb-4">
              Excluir agendamento de <strong className="text-white">{deleteConfirming.patient_name}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirming(null)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteAppointment}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200"
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
