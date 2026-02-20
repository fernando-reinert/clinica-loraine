// src/components/appointments/AppointmentDrawer.tsx
// Modal/drawer create/edit no estilo "Minha Agenda": data, horário, profissional, cliente, serviços, duração, repetir.

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Plus, Calendar, Clock, User } from "lucide-react";
import { supabase } from "../../services/supabase/client";
import { useAuth } from "../../contexts/AuthContext";
import {
  createAppointmentWithProcedures,
  updateAppointmentWithProcedures,
  createRecurringAppointments,
  type CreateAppointmentPayload,
  type RecurrenceRule,
} from "../../services/appointments/appointmentService";
import { updateGcalEvent } from "../../services/calendar";
import { listActiveProcedures } from "../../services/procedures/procedureService";
import { buildEndTimeFromDurationMinutes } from "../../utils/dateUtils";
import { convertToSupabaseFormat } from "../../utils/dateUtils";
import type { Procedure } from "../../types/db";
import type { AppointmentPlanItem } from "../../types/appointmentPlan";
import AppointmentPlanEditor from "../AppointmentPlanEditor";
import toast from "react-hot-toast";
import {
  DURATION_OPTIONS,
  RECURRENCE_OPTIONS,
  OCCURRENCE_COUNT_OPTIONS,
  OCCURRENCE_COUNT_DEFAULT,
  OCCURRENCE_COUNT_MIN,
  OCCURRENCE_COUNT_MAX,
  getRecurrenceInterval,
} from "./appointmentDrawerUtils";

const DEBOUNCE_MS = 280;
const PATIENT_MIN_CHARS = 2;

export interface DrawerAppointment {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_id?: string | null;
  start_time: string;
  end_time?: string | null;
  title: string;
  description?: string | null;
  status?: string;
  budget?: number;
  gcal_event_id?: string | null;
}

export interface AppointmentDrawerProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode: "create" | "edit";
  initialDate?: Date;
  initialHour?: number;
  initialMinute?: number;
  initialAppointment?: DrawerAppointment | null;
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

export default function AppointmentDrawer({
  open,
  onClose,
  onSaved,
  mode,
  initialDate,
  initialHour = 8,
  initialMinute = 0,
  initialAppointment,
}: AppointmentDrawerProps) {
  const { user } = useAuth();
  const [dateTime, setDateTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [professionalLabel, setProfessionalLabel] = useState("Eu");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<{ id: string; name: string; phone: string; email?: string }[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string; phone: string; email?: string } | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [procedureSearch, setProcedureSearch] = useState("");
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
  const [planItems, setPlanItems] = useState<AppointmentPlanItem[]>([]);
  const [recurrenceValue, setRecurrenceValue] = useState("");
  const [occurrenceCount, setOccurrenceCount] = useState(OCCURRENCE_COUNT_DEFAULT);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const procedureDropdownRef = useRef<HTMLDivElement>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyScrollLockRef = useRef<{ overflow: string; paddingRight: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    bodyScrollLockRef.current = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };
    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      if (bodyScrollLockRef.current) {
        document.body.style.overflow = bodyScrollLockRef.current.overflow;
        document.body.style.paddingRight = bodyScrollLockRef.current.paddingRight;
        bodyScrollLockRef.current = null;
      }
    };
  }, [open]);

  const filteredProcedures = procedureSearch.trim()
    ? procedures.filter(
        (p) =>
          p.name.toLowerCase().includes(procedureSearch.toLowerCase()) ||
          (p.category ?? "").toLowerCase().includes(procedureSearch.toLowerCase())
      )
    : procedures;

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initialAppointment) {
      setDateTime(toDatetimeLocal(initialAppointment.start_time));
      setSelectedPatient({
        id: initialAppointment.patient_id ?? "unknown",
        name: initialAppointment.patient_name,
        phone: initialAppointment.patient_phone ?? "",
      });
      setPatientQuery(initialAppointment.patient_name);
      setTitle(initialAppointment.title ?? "");
      const start = new Date(initialAppointment.start_time);
      const end = initialAppointment.end_time ? new Date(initialAppointment.end_time) : new Date(start.getTime() + 60 * 60 * 1000);
      const minDiff = (end.getTime() - start.getTime()) / (60 * 1000);
      const match = DURATION_OPTIONS.find((o) => o.value >= minDiff - 2) ?? DURATION_OPTIONS.find((o) => o.value === 60);
      setDurationMinutes(match?.value ?? 60);
      setRecurrenceValue("");
      setOccurrenceCount(OCCURRENCE_COUNT_DEFAULT);
    } else {
      setPlanItems([]);
      const d = initialDate ? new Date(initialDate.getTime()) : new Date();
      d.setHours(initialHour, initialMinute, 0, 0);
      setDateTime(d.toISOString().slice(0, 16));
      setSelectedPatient(null);
      setPatientQuery("");
      setIsPatientDropdownOpen(false);
      setTitle("");
      setDurationMinutes(60);
      setRecurrenceValue("");
      setOccurrenceCount(OCCURRENCE_COUNT_DEFAULT);
    }
  }, [open, mode, initialAppointment, initialDate, initialHour, initialMinute]);

  useEffect(() => {
    if (!open || mode !== "edit" || !initialAppointment?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: rows } = await supabase
          .from("appointment_procedures")
          .select("procedure_catalog_id, procedure_name_snapshot, final_price, quantity, discount")
          .eq("appointment_id", initialAppointment.id);
        if (cancelled || !rows?.length) return;
        const catalog = await listActiveProcedures();
        const items: AppointmentPlanItem[] = rows.map((r: any) => {
          const catalogId = r.procedure_catalog_id ?? r.procedure_id;
          const proc = catalog.find((p) => p.id === catalogId);
          return {
            procedure_catalog_id: catalogId,
            name: r.procedure_name_snapshot ?? proc?.name ?? "",
            category: proc?.category ?? null,
            cost_price: proc?.cost_price ?? 0,
            sale_price: proc?.sale_price ?? 0,
            final_price: Number(r.final_price) ?? 0,
            quantity: r.quantity ?? 1,
            discount: r.discount ?? 0,
          };
        });
        if (!cancelled) setPlanItems(items);
      } catch {
        if (!cancelled) toast.error("Erro ao carregar procedimentos do agendamento.");
      }
    })();
    return () => { cancelled = true; };
  }, [open, mode, initialAppointment?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProceduresLoading(true);
        const data = await listActiveProcedures();
        if (!cancelled) setProcedures(data);
      } catch {
        if (!cancelled) toast.error("Erro ao carregar procedimentos.");
      } finally {
        if (!cancelled) setProceduresLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (patientQuery.length < PATIENT_MIN_CHARS) {
      setPatientResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null;
      setPatientSearching(true);
      try {
        const q = patientQuery.trim();
        const { data, error } = await supabase
          .from("patients")
          .select("id, name, phone, email")
          .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(15);
        if (!error) setPatientResults(data ?? []);
        else setPatientResults([]);
      } catch {
        setPatientResults([]);
      } finally {
        setPatientSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [patientQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (patientDropdownRef.current?.contains(target) || procedureDropdownRef.current?.contains(target)) return;
      setIsPatientDropdownOpen(false);
      setShowProcedureDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPatientDropdownOpen(false);
        setShowProcedureDropdown(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleSelectProcedure = useCallback((proc: Procedure) => {
    setPlanItems((prev) => {
      const i = prev.findIndex((x) => x.procedure_catalog_id === proc.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          procedure_catalog_id: proc.id,
          name: proc.name,
          category: proc.category ?? null,
          cost_price: proc.cost_price ?? 0,
          sale_price: proc.sale_price ?? 0,
          final_price: proc.sale_price ?? 0,
          quantity: 1,
          discount: 0,
        },
      ];
    });
    setProcedureSearch("");
    setShowProcedureDropdown(false);
    if (!title.trim()) setTitle(proc.name);
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      toast.error("Selecione o cliente.");
      return;
    }
    if (recurrenceValue && getRecurrenceInterval(recurrenceValue)) {
      const count = Math.min(Math.max(occurrenceCount, OCCURRENCE_COUNT_MIN), OCCURRENCE_COUNT_MAX);
      if (count < OCCURRENCE_COUNT_MIN || count > OCCURRENCE_COUNT_MAX) {
        toast.error(`Quantas consultas deve ser entre ${OCCURRENCE_COUNT_MIN} e ${OCCURRENCE_COUNT_MAX}.`);
        return;
      }
    }
    const isoStart = convertToSupabaseFormat(dateTime);
    if (!isoStart) {
      toast.error("Data e hora inválidos.");
      return;
    }
    const endIso = buildEndTimeFromDurationMinutes(isoStart, durationMinutes);
    if (!endIso) {
      toast.error("Erro ao calcular duração.");
      return;
    }

    const patientId = selectedPatient.id === "unknown" ? null : selectedPatient.id;
    const proceduresPayload = planItems.map((item) => ({
      procedureId: item.procedure_catalog_id,
      name: item.name,
      finalPrice: item.final_price,
      quantity: item.quantity,
      discount: item.discount,
    }));

    setSubmitting(true);
    try {
      const professionalId = user?.id ?? null;

      if (mode === "edit" && initialAppointment?.id) {
        await updateAppointmentWithProcedures(initialAppointment.id, {
          patientId,
          patientName: selectedPatient.name,
          patientPhone: selectedPatient.phone,
          startTimeIso: isoStart,
          endTimeIso: endIso,
          title: title || selectedPatient.name,
          description: null,
          location: null,
          status: "scheduled",
          procedures: proceduresPayload,
        });
        const gcalId = initialAppointment.gcal_event_id ?? null;
        if (gcalId) {
          const updateResult = await updateGcalEvent({
            eventId: gcalId,
            patientName: selectedPatient.name,
            start: isoStart,
            end: endIso,
            notes: title || undefined,
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
        toast.success("Agendamento atualizado.");
        onSaved();
        onClose();
        return;
      }

      const interval = getRecurrenceInterval(recurrenceValue);
      if (interval) {
        const count = Math.min(Math.max(occurrenceCount, OCCURRENCE_COUNT_MIN), OCCURRENCE_COUNT_MAX);
        const rule: RecurrenceRule =
          interval.kind === "days"
            ? { kind: "days", intervalDays: interval.intervalDays, occurrenceCount: count }
            : interval.kind === "months"
            ? { kind: "months", intervalMonths: interval.intervalMonths, occurrenceCount: count }
            : { kind: "years", intervalYears: interval.intervalYears, occurrenceCount: count };
        const { created } = await createRecurringAppointments(
          {
            patientId,
            patientName: selectedPatient.name,
            patientPhone: selectedPatient.phone,
            startTimeIso: isoStart,
            endTimeIso: endIso,
            title: title || selectedPatient.name,
            description: null,
            location: null,
            status: "scheduled",
            procedures: proceduresPayload,
          },
          rule,
          durationMinutes,
          professionalId
        );
        toast.success(`${created} agendamento(s) criado(s). Sincronizando com Google Calendar...`);
      } else {
        await createAppointmentWithProcedures({
          patientId,
          patientName: selectedPatient.name,
          patientPhone: selectedPatient.phone,
          startTimeIso: isoStart,
          endTimeIso: endIso,
          title: title || selectedPatient.name,
          description: null,
          location: null,
          status: "scheduled",
          procedures: proceduresPayload,
          professionalId,
        });
        toast.success("Agendamento criado.");
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="z-[9999] w-[min(92vw,520px)] max-h-[92vh] rounded-2xl glass-card flex flex-col overflow-hidden border border-white/10 bg-slate-900/95 shadow-2xl transition-none"
        style={{ transform: "none" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/10">
          <h2 id="drawer-title" className="text-xl font-bold text-white truncate pr-2">
            {mode === "edit" ? "Editar Agendamento" : "Novo Agendamento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-gray-300 hover:text-white transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </header>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div
            className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
            style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
          >
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5 flex items-center gap-2">
              <Calendar size={16} /> Data e horário *
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5 flex items-center gap-2">
              <Clock size={16} /> Duração *
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-slate-800">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5 flex items-center gap-2">
              <User size={16} /> Profissional
            </label>
            <div className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300">
              {professionalLabel}
            </div>
          </div>
          <div className="relative" ref={patientDropdownRef}>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Cliente *</label>
            {selectedPatient ? (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20">
                <span className="flex-1 text-white font-medium truncate">{selectedPatient.name}</span>
                {mode !== "edit" && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setPatientQuery("");
                      setIsPatientDropdownOpen(false);
                      setPatientResults([]);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
                    aria-label="Limpar paciente"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  <input
                    type="text"
                    value={patientQuery}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPatientQuery(v);
                      if (v.length >= PATIENT_MIN_CHARS) setIsPatientDropdownOpen(true);
                      else setPatientResults([]);
                    }}
                    onFocus={() => {
                      if (patientQuery.length >= PATIENT_MIN_CHARS) setIsPatientDropdownOpen(true);
                    }}
                    placeholder={patientSearching ? "Buscando..." : "Buscar por nome ou telefone (mín. 2 letras)"}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 outline-none"
                    disabled={mode === "edit"}
                    autoComplete="off"
                  />
                </div>
                {isPatientDropdownOpen && patientResults.length > 0 && mode !== "edit" && (
                  <div className="absolute z-50 w-full mt-1 rounded-xl border border-white/10 bg-slate-900 shadow-xl max-h-48 overflow-y-auto">
                    {patientResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedPatient(p);
                          setPatientQuery("");
                          setPatientResults([]);
                          setIsPatientDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-white/10 border-b border-white/5 last:border-b-0 focus:outline-none focus:bg-white/10"
                      >
                        <div className="font-medium text-white">{p.name}</div>
                        <div className="text-sm text-gray-400">{p.phone}</div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="relative" ref={procedureDropdownRef}>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Serviços / Procedimentos</label>
            <input
              type="text"
              value={procedureSearch}
              onChange={(e) => {
                const v = e.target.value;
                setProcedureSearch(v);
                setShowProcedureDropdown(!!v.trim());
              }}
              onFocus={() => {
                if (procedureSearch.trim()) setShowProcedureDropdown(true);
              }}
              placeholder={proceduresLoading ? "Carregando..." : "Adicionar item do catálogo"}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 outline-none"
              disabled={proceduresLoading}
              autoComplete="off"
            />
            {showProcedureDropdown && filteredProcedures.length > 0 && (
              <div className="absolute z-50 w-full max-w-[calc(100vw-2rem)] mt-1 rounded-xl border border-white/10 bg-slate-900 shadow-xl max-h-48 overflow-y-auto">
                {filteredProcedures.map((proc) => (
                  <button
                    key={proc.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectProcedure(proc);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-white/10 border-b border-white/5 last:border-b-0 flex justify-between items-center focus:outline-none focus:bg-white/10"
                  >
                    <span className="text-white font-medium truncate">{proc.name}</span>
                    <span className="text-green-400 text-sm shrink-0 ml-2">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(proc.sale_price ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {planItems.length > 0 && (
              <div className="mt-3">
                <AppointmentPlanEditor items={planItems} onChange={setPlanItems} title="Itens" />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Título / Observação</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Consulta, Retorno..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">Repetir agendamento</label>
            <select
              value={recurrenceValue}
              onChange={(e) => setRecurrenceValue(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              aria-describedby={recurrenceValue ? "quantas-consultas-label" : undefined}
            >
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value || "none"} value={o.value} className="bg-slate-800">
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {recurrenceValue && getRecurrenceInterval(recurrenceValue) && (
            <div>
              <label id="quantas-consultas-label" className="block text-sm font-medium text-gray-200 mb-1.5">
                Quantas consultas (total, incluindo a primeira)
              </label>
              <select
                value={occurrenceCount}
                onChange={(e) => setOccurrenceCount(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              >
                {OCCURRENCE_COUNT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-slate-800">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          </div>
          <footer
            className="flex-shrink-0 border-t border-white/10 p-4 flex gap-3 bg-slate-900/95 rounded-b-2xl"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-3 rounded-xl neon-button inline-flex items-center justify-center gap-2 disabled:opacity-60 font-medium"
            >
              <Plus size={18} />
              {submitting ? "Salvando..." : "Salvar"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
