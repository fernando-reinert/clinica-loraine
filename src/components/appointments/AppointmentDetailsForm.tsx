// src/components/appointments/AppointmentDetailsForm.tsx
// Formulário padrão "Detalhes do Agendamento" — create/edit, paciente opcional, início + hora de término.

import React, { useState, useEffect, useRef } from "react";
import { Calendar, Search, DollarSign, Plus, Zap } from "lucide-react";
import { convertToSupabaseFormat, combineDateWithTime } from "../../utils/dateUtils";
import { supabase } from "../../services/supabase/client";
import { createGcalEvent, updateGcalEvent } from "../../services/calendar";
import toast from "react-hot-toast";

export interface AppointmentForForm {
  id: string;
  patient_name: string;
  patient_phone: string;
  start_time: string;
  end_time?: string | null;
  description?: string;
  title: string;
  budget?: number;
  gcal_event_id?: string | null;
}

export interface PatientForForm {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

function toTimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export interface AppointmentDetailsFormProps {
  mode: "create" | "edit";
  showPatientPicker: boolean;
  /** Quando dentro do perfil do paciente ou ?patientId= — pré-seleciona o paciente */
  initialPatientId?: string | null;
  /** Paciente já carregado (ex.: quando veio de /appointments?patientId=) */
  initialPatient?: PatientForForm | null;
  initialAppointment?: AppointmentForForm | null;
  patients?: PatientForForm[];
  patientsLoading?: boolean;
  onCreated?: () => void;
  onUpdated?: () => void;
  onCancel?: () => void;
  formFirstInputRef?: React.RefObject<HTMLInputElement | null>;
  titleInputRef?: React.RefObject<HTMLInputElement | null>;
}

const AppointmentDetailsForm: React.FC<AppointmentDetailsFormProps> = ({
  mode,
  showPatientPicker,
  initialPatientId,
  initialPatient,
  initialAppointment,
  patients = [],
  patientsLoading = false,
  onCreated,
  onUpdated,
  onCancel,
  formFirstInputRef,
  titleInputRef,
}) => {
  const [selectedPatient, setSelectedPatient] = useState<PatientForForm | null>(initialPatient ?? null);
  const [patientSearch, setPatientSearch] = useState(initialPatient ? initialPatient.name : "");
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const filteredPatients = patientSearch
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
          (p.phone || "").includes(patientSearch)
      )
    : [];

  useEffect(() => {
    if (initialAppointment) {
      setTitle(initialAppointment.title);
      setStartTime(toDatetimeLocal(initialAppointment.start_time));
      setEndTime(initialAppointment.end_time ? toTimeLocal(initialAppointment.end_time) : "");
      setLocation("");
      setDescription(initialAppointment.description || "");
      setBudget(initialAppointment.budget?.toString() || "");
      setSelectedPatient({
        id: "unknown",
        name: initialAppointment.patient_name,
        phone: initialAppointment.patient_phone,
      });
      setPatientSearch(initialAppointment.patient_name);
    }
  }, [initialAppointment]);

  useEffect(() => {
    if (initialPatient) {
      setSelectedPatient(initialPatient);
      setPatientSearch(initialPatient.name);
    }
  }, [initialPatient]);

  useEffect(() => {
    if (!initialPatient && initialPatientId && patients.length > 0) {
      const p = patients.find((x) => x.id === initialPatientId);
      if (p) {
        setSelectedPatient(p);
        setPatientSearch(p.name);
      }
    }
  }, [initialPatientId, initialPatient, patients]);

  const handlePatientSelect = (patient: PatientForForm) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.name);
    setShowPatientDropdown(false);
  };

  const clearPatientSelection = () => {
    setSelectedPatient(null);
    setPatientSearch("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !startTime || !title) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    const isoStartTime = convertToSupabaseFormat(startTime);
    if (!isoStartTime) {
      toast.error("Data e hora de início inválidos.");
      return;
    }
    const startDate = new Date(isoStartTime);
    const defaultEnd = new Date(startDate.getTime() + 60 * 60 * 1000);
    const endTimeValue =
      endTime.trim() ||
      `${String(defaultEnd.getHours()).padStart(2, "0")}:${String(defaultEnd.getMinutes()).padStart(2, "0")}`;
    const isoEndTime = combineDateWithTime(isoStartTime, endTimeValue);
    if (!isoEndTime) {
      toast.error("Hora de término inválida.");
      return;
    }
    const endDate = new Date(isoEndTime);
    if (endDate.getTime() <= startDate.getTime()) {
      toast.error("Hora de término deve ser maior que a de início (não suportamos passar da meia-noite).");
      return;
    }

    setSubmitting(true);
    try {
      const appointmentData: Record<string, unknown> = {
        patient_name: selectedPatient.name,
        patient_phone: selectedPatient.phone,
        start_time: isoStartTime,
        end_time: isoEndTime,
        title,
        status: "scheduled",
      };
      if (description) appointmentData.description = description;
      if (budget) {
        try {
          appointmentData.budget = parseFloat(budget);
        } catch {
          /* ignore */
        }
      }

      if (mode === "edit" && initialAppointment) {
        const { error } = await supabase
          .from("appointments")
          .update(appointmentData)
          .eq("id", initialAppointment.id);
        if (error) throw error;
        const existingGcalId = initialAppointment.gcal_event_id ?? null;
        if (existingGcalId) {
          const updateResult = await updateGcalEvent({
            eventId: existingGcalId,
            patientName: selectedPatient.name,
            start: isoStartTime,
            end: isoEndTime,
            notes: description || undefined,
          });
          await supabase
            .from("appointments")
            .update({
              gcal_status: updateResult.ok ? "synced" : "error",
              gcal_last_error: updateResult.ok ? null : updateResult.error ?? "",
              gcal_updated_at: new Date().toISOString(),
              ...(updateResult.ok && updateResult.htmlLink ? { gcal_event_link: updateResult.htmlLink } : {}),
            })
            .eq("id", initialAppointment.id);
        }
        toast.success("Agendamento atualizado com sucesso!");
        onUpdated?.();
      } else {
        const { data: inserted, error } = await supabase
          .from("appointments")
          .insert([appointmentData])
          .select("id")
          .single();
        if (error || !inserted) throw error || new Error("ID não retornado");
        const appointmentId = (inserted as { id: string }).id;
        const createResult = await createGcalEvent({
          patientName: selectedPatient.name,
          start: isoStartTime,
          end: isoEndTime,
          appointmentId,
        });
        await supabase
          .from("appointments")
          .update({
            gcal_event_id: createResult.eventId ?? null,
            gcal_event_link: createResult.htmlLink ?? null,
            gcal_status: createResult.ok ? "synced" : "error",
            gcal_last_error: createResult.ok ? null : createResult.error ?? "",
            gcal_updated_at: new Date().toISOString(),
          })
          .eq("id", appointmentId);
        toast.success("Agendamento criado com sucesso!");
        onCreated?.();
      }
    } catch (err: unknown) {
      console.error("Erro ao salvar agendamento:", err);
      toast.error("Erro ao salvar agendamento.");
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = mode === "edit" && !!initialAppointment;

  return (
    <div className="glass-card p-4 sm:p-6 md:p-8 border border-white/10">
      <div className="flex items-center gap-3 mb-6 min-w-0">
        <Calendar className="text-purple-300 flex-shrink-0" size={26} />
        <h2 className="text-xl sm:text-2xl font-bold glow-text whitespace-normal break-words">
          {isEdit ? "Editar Agendamento" : "Detalhes do Agendamento"}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 min-w-0">
        {showPatientPicker && (
          <div className="relative min-w-0">
            <label className="block text-sm font-medium text-gray-200 mb-2">Paciente *</label>
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none shrink-0" size={20} />
              <input
                ref={formFirstInputRef}
                type="text"
                placeholder={patientsLoading ? "Carregando pacientes..." : "Buscar paciente..."}
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full min-h-[44px] pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                disabled={isEdit || patientsLoading}
              />
              {selectedPatient && (
                <button
                  type="button"
                  onClick={clearPatientSelection}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition-colors"
                  disabled={isEdit}
                  title="Limpar paciente"
                >
                  ✕
                </button>
              )}
            </div>
            {showPatientDropdown && filteredPatients.length > 0 && !isEdit && (
              <div className="absolute z-20 w-full mt-2 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-64 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <button
                    type="button"
                    key={patient.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handlePatientSelect(patient);
                    }}
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
        )}

        {!showPatientPicker && (
          selectedPatient ? (
            <div className="glass-card p-4 border border-cyan-400/20 bg-cyan-500/10">
              <p className="text-sm text-cyan-100 font-medium">
                Paciente: {selectedPatient.name} — {selectedPatient.phone}
              </p>
            </div>
          ) : initialPatientId ? (
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-gray-400 text-sm">
              Carregando paciente...
            </div>
          ) : null
        )}

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Título / Observação (opcional)</label>
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Título adicional ou observação sobre o procedimento..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            required
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Data e Hora de Início *</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">Hora de Término</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Local</label>
          <input
            type="text"
            placeholder="Local da consulta"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-200 mb-2">Descrição / Observações</label>
          <textarea
            placeholder="Detalhes adicionais, observações, materiais necessários..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all h-28 resize-none"
          />
        </div>

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

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="neon-button w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl leading-none disabled:opacity-60"
          >
            <Plus size={20} className="shrink-0" />
            <span className="font-semibold whitespace-nowrap">
              {isEdit ? "Atualizar Agendamento" : "Criar Agendamento"}
            </span>
          </button>
          {isEdit && onCancel && (
            <button
              type="button"
              onClick={onCancel}
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
  );
};

export default AppointmentDetailsForm;
