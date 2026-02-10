// src/components/appointments/AppointmentDetailsForm.tsx
// Formulário padrão "Detalhes do Agendamento" — create/edit, paciente, procedimentos do catálogo, plano e pagamento.

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Calendar, Search, DollarSign, Plus, Zap } from "lucide-react";
import { convertToSupabaseFormat, buildEndTimeIso } from "../../utils/dateUtils";
import { supabase } from "../../services/supabase/client";
import { createGcalEvent, updateGcalEvent } from "../../services/calendar";
import { createAppointmentWithProcedures, updateAppointmentWithProcedures } from "../../services/appointments/appointmentService";
import { listActiveProcedures } from "../../services/procedures/procedureService";
import type { Procedure } from "../../types/db";
import type { AppointmentPlanItem, AppointmentPaymentInfo } from "../../types/appointmentPlan";
import { calculatePlanTotals } from "../../types/appointmentPlan";
import AppointmentPlanEditor from "../AppointmentPlanEditor";
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

  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [procedureSearch, setProcedureSearch] = useState("");
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
  const [planItems, setPlanItems] = useState<AppointmentPlanItem[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<AppointmentPaymentInfo>({
    installments: 1,
    payment_method: "pix",
    first_payment_date: new Date().toISOString().split("T")[0],
  });
  const procedureDropdownRef = useRef<HTMLDivElement>(null);

  const filteredPatients = patientSearch
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
          (p.phone || "").includes(patientSearch)
      )
    : patients;

  const filteredProcedures = useMemo(() => {
    if (!procedureSearch.trim()) return procedures;
    const search = procedureSearch.toLowerCase();
    return procedures.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.category && p.category.toLowerCase().includes(search))
    );
  }, [procedures, procedureSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setProceduresLoading(true);
        const data = await listActiveProcedures();
        if (!cancelled) setProcedures(data);
      } catch {
        if (!cancelled) toast.error("Erro ao carregar catálogo de procedimentos.");
      } finally {
        if (!cancelled) setProceduresLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
    if (mode !== "edit" || !initialAppointment?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: rows } = await supabase
          .from("appointment_procedures")
          .select("procedure_catalog_id, procedure_name_snapshot, final_price, quantity, discount")
          .eq("appointment_id", initialAppointment.id);
        if (cancelled || !rows?.length) {
          if (!cancelled && rows) setPlanItems([]);
          return;
        }
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
  }, [mode, initialAppointment?.id]);

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

  const handleSelectProcedure = (procedure: Procedure) => {
    const existingIndex = planItems.findIndex((item) => item.procedure_catalog_id === procedure.id);
    if (existingIndex >= 0) {
      const updated = [...planItems];
      updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
      setPlanItems(updated);
    } else {
      const newItem: AppointmentPlanItem = {
        procedure_catalog_id: procedure.id,
        name: procedure.name,
        category: procedure.category ?? null,
        cost_price: procedure.cost_price ?? 0,
        sale_price: procedure.sale_price ?? 0,
        final_price: procedure.sale_price ?? 0,
        quantity: 1,
        discount: 0,
      };
      setPlanItems([...planItems, newItem]);
    }
    setProcedureSearch("");
    setShowProcedureDropdown(false);
    if (!title?.trim()) setTitle(procedure.name);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (procedureDropdownRef.current && !procedureDropdownRef.current.contains(e.target as Node)) {
        setShowProcedureDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const endTimeIso = buildEndTimeIso(isoStartTime, endTime.trim() || null);
    if (endTimeIso === null) {
      toast.error("Hora de término inválida ou deve ser maior que a de início.");
      return;
    }

    setSubmitting(true);
    try {
      const patientId = selectedPatient.id === "unknown" ? null : selectedPatient.id;
      const proceduresPayload = planItems.map((item) => ({
        procedureId: item.procedure_catalog_id,
        name: item.name,
        finalPrice: item.final_price,
        quantity: item.quantity,
        discount: item.discount,
      }));

      if (mode === "edit" && initialAppointment) {
        await updateAppointmentWithProcedures(initialAppointment.id, {
          patientId,
          patientName: selectedPatient.name,
          patientPhone: selectedPatient.phone,
          startTimeIso: isoStartTime,
          endTimeIso,
          title,
          description: description || null,
          location: location || null,
          status: "scheduled",
          procedures: proceduresPayload,
        });
        const existingGcalId = initialAppointment.gcal_event_id ?? null;
        if (existingGcalId) {
          const updateResult = await updateGcalEvent({
            eventId: existingGcalId,
            patientName: selectedPatient.name,
            start: isoStartTime,
            end: endTimeIso,
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
      } else if (planItems.length > 0) {
        await createAppointmentWithProcedures({
          patientId,
          patientName: selectedPatient.name,
          patientPhone: selectedPatient.phone,
          startTimeIso: isoStartTime,
          endTimeIso,
          title,
          description: description || null,
          location: location || null,
          status: "scheduled",
          procedures: proceduresPayload,
        });
        toast.success("Agendamento criado com sucesso!");
        onCreated?.();
      } else {
        const appointmentData: Record<string, unknown> = {
          patient_id: patientId,
          patient_name: selectedPatient.name,
          patient_phone: selectedPatient.phone,
          start_time: isoStartTime,
          end_time: endTimeIso,
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
          end: endTimeIso,
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
      const msg = err instanceof Error ? err.message : "Erro ao salvar agendamento.";
      toast.error(msg);
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
                placeholder={patientsLoading ? "Carregando pacientes..." : "Buscar paciente (nome ou telefone)..."}
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                onFocus={() => !isEdit && setShowPatientDropdown(true)}
                className="w-full min-h-[44px] pl-10 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
                disabled={isEdit || patientsLoading}
                autoComplete="off"
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
            {showPatientDropdown && !isEdit && (
              <div className="absolute z-20 w-full mt-2 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-64 overflow-y-auto">
                {filteredPatients.length === 0 ? (
                  <div className="p-3 text-sm text-gray-400">Nenhum paciente encontrado</div>
                ) : (
                  filteredPatients.map((patient) => (
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
                  ))
                )}
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

        <div ref={procedureDropdownRef} className="relative">
          <label className="block text-sm font-medium text-gray-200 mb-2">Adicionar Procedimento *</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            <input
              type="text"
              placeholder={proceduresLoading ? "Carregando catálogo..." : "Buscar procedimento do catálogo..."}
              value={procedureSearch}
              onChange={(e) => {
                setProcedureSearch(e.target.value);
                setShowProcedureDropdown(true);
              }}
              onFocus={() => setShowProcedureDropdown(true)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all"
              disabled={proceduresLoading}
              autoComplete="off"
            />
          </div>
          {showProcedureDropdown && filteredProcedures.length > 0 && (
            <div className="absolute z-20 w-full mt-2 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl max-h-64 overflow-y-auto">
              {filteredProcedures.map((proc) => (
                <button
                  type="button"
                  key={proc.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectProcedure(proc);
                  }}
                  className="w-full text-left p-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white truncate">{proc.name}</div>
                    {proc.category && <div className="text-xs text-gray-400 truncate">{proc.category}</div>}
                  </div>
                  <div className="text-sm font-semibold text-green-400 shrink-0">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(proc.sale_price ?? 0)}
                  </div>
                </button>
              ))}
            </div>
          )}
          {proceduresLoading && <p className="text-xs text-gray-400 mt-1">Carregando procedimentos...</p>}
        </div>

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

        {planItems.length > 0 && (
          <AppointmentPlanEditor
            items={planItems}
            onChange={setPlanItems}
            title="Plano do Atendimento"
          />
        )}

        {planItems.length > 0 && (() => {
          const planTotals = calculatePlanTotals(planItems);
          const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
          const installmentValue = planTotals.totalFinal / paymentInfo.installments;
          return (
            <div className="glass-card p-6 border border-white/10 bg-white/5">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <DollarSign className="text-green-300" size={20} />
                Pagamento do Atendimento
              </h3>
              <div className="mb-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-300">Total do Atendimento</p>
                    <p className="text-lg font-bold text-white">{formatCurrency(planTotals.totalFinal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-300">Valor por Parcela ({paymentInfo.installments}x)</p>
                    <p className="text-lg font-bold text-green-400">{formatCurrency(installmentValue)}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Número de Parcelas *</label>
                  <input
                    type="number"
                    min={1}
                    value={paymentInfo.installments}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (v >= 1) setPaymentInfo({ ...paymentInfo, installments: v });
                    }}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Método de Pagamento *</label>
                  <select
                    value={paymentInfo.payment_method}
                    onChange={(e) =>
                      setPaymentInfo({
                        ...paymentInfo,
                        payment_method: e.target.value as AppointmentPaymentInfo["payment_method"],
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                  >
                    <option value="pix" className="bg-slate-800">PIX</option>
                    <option value="cash" className="bg-slate-800">Dinheiro</option>
                    <option value="credit_card" className="bg-slate-800">Cartão de Crédito</option>
                    <option value="debit_card" className="bg-slate-800">Cartão de Débito</option>
                    <option value="bank_transfer" className="bg-slate-800">Transferência Bancária</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">Data do Primeiro Pagamento *</label>
                  <input
                    type="date"
                    value={paymentInfo.first_payment_date}
                    onChange={(e) => setPaymentInfo({ ...paymentInfo, first_payment_date: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                  />
                </div>
              </div>
            </div>
          );
        })()}

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
