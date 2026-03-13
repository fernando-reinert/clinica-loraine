// src/components/appointments/AppointmentDrawer.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, History, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabase/client';
import {
  createAppointmentWithProcedures,
  updateAppointmentWithProcedures,
  createRecurringAppointments,
  getAppointmentHistory,
  type CreateAppointmentPayload,
  type RecurrenceRule,
} from '../../services/appointments/appointmentService';
import type { AppointmentHistoryRow } from '../../types/db';
import { updateGcalEvent } from '../../services/calendar';
import {
  convertToSupabaseFormat,
  buildEndTimeFromDurationMinutes,
  toDatetimeLocal,
  convertToBrazilianFormat,
} from '../../utils/dateUtils';
import type { Procedure } from '../../types/db';
import type { AppointmentPlanItem, AppointmentPaymentInfo } from '../../types/appointmentPlan';
import { usePatientSearch } from '../../hooks/usePatientSearch';
import { useProcedureCatalog } from '../../hooks/useProcedureCatalog';
import PatientSelector from './form/PatientSelector';
import DateTimeSection from './form/DateTimeSection';
import ProcedurePlanSection from './form/ProcedurePlanSection';
import PaymentSection from './form/PaymentSection';
import toast from 'react-hot-toast';
import {
  DURATION_OPTIONS,
  OCCURRENCE_COUNT_DEFAULT,
  OCCURRENCE_COUNT_MIN,
  OCCURRENCE_COUNT_MAX,
  getRecurrenceInterval,
} from './appointmentDrawerUtils';

// ─── Public interfaces (consumed by AppointmentsScreen — do not remove) ────
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
  mode: 'create' | 'edit';
  initialDate?: Date;
  initialHour?: number;
  initialMinute?: number;
  initialAppointment?: DrawerAppointment | null;
  onDeleteRequested?: (appointment: DrawerAppointment) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function AppointmentDrawer({
  open, onClose, onSaved, mode,
  initialDate, initialHour = 8, initialMinute = 0,
  initialAppointment, onDeleteRequested,
}: AppointmentDrawerProps) {
  const { user } = useAuth();
  const { procedures } = useProcedureCatalog();

  // ── Form state ──────────────────────────────────────────────────────────
  const [dateTime, setDateTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [title, setTitle] = useState('');
  const [planItems, setPlanItems] = useState<AppointmentPlanItem[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<AppointmentPaymentInfo>({
    installments: 1,
    payment_method: 'pix',
    first_payment_date: new Date().toISOString().slice(0, 10),
  });
  const [recurrenceValue, setRecurrenceValue] = useState('');
  const [occurrenceCount, setOccurrenceCount] = useState(OCCURRENCE_COUNT_DEFAULT);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historySectionOpen, setHistorySectionOpen] = useState(false);
  const [historyList, setHistoryList] = useState<AppointmentHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const procedureDropdownRef = useRef<HTMLDivElement>(null);
  const bodyScrollLockRef = useRef<{ overflow: string; paddingRight: string } | null>(null);

  // Patient search hook
  const patientSearch = usePatientSearch(
    initialAppointment
      ? { id: initialAppointment.patient_id ?? 'unknown', name: initialAppointment.patient_name, phone: initialAppointment.patient_phone ?? '' }
      : null
  );

  // ── Body scroll lock ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    bodyScrollLockRef.current = { overflow: document.body.style.overflow, paddingRight: document.body.style.paddingRight };
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      if (bodyScrollLockRef.current) {
        document.body.style.overflow = bodyScrollLockRef.current.overflow;
        document.body.style.paddingRight = bodyScrollLockRef.current.paddingRight;
        bodyScrollLockRef.current = null;
      }
    };
  }, [open]);

  // ── History loader ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!historySectionOpen || !initialAppointment?.id || mode !== 'edit') return;
    let cancelled = false;
    setHistoryLoading(true);
    getAppointmentHistory(initialAppointment.id)
      .then((rows) => { if (!cancelled) setHistoryList(rows); })
      .catch(() => { if (!cancelled) setHistoryList([]); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [historySectionOpen, initialAppointment?.id, mode]);

  // ── Load existing procedures when editing ─────────────────────────────────
  useEffect(() => {
    if (!open || mode !== 'edit' || !initialAppointment?.id) return;
    if (procedures.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: rows } = await supabase
          .from('appointment_procedures')
          .select('procedure_catalog_id, procedure_name_snapshot, final_price, quantity, discount')
          .eq('appointment_id', initialAppointment.id);
        if (cancelled || !rows?.length) return;
        const items: AppointmentPlanItem[] = rows.map((r: any) => {
          const catalogId = r.procedure_catalog_id ?? r.procedure_id;
          const proc = procedures.find((p) => p.id === catalogId);
          return {
            procedure_catalog_id: catalogId,
            name: r.procedure_name_snapshot ?? proc?.name ?? '',
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
        if (!cancelled) toast.error('Erro ao carregar procedimentos do agendamento.');
      }
    })();
    return () => { cancelled = true; };
  }, [open, mode, initialAppointment?.id, procedures]);

  // ── Initialize form on open ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialAppointment) {
      setDateTime(toDatetimeLocal(initialAppointment.start_time));
      setTitle(initialAppointment.title ?? '');
      const start = new Date(initialAppointment.start_time);
      const end = initialAppointment.end_time
        ? new Date(initialAppointment.end_time)
        : new Date(start.getTime() + 60 * 60 * 1000);
      const minDiff = (end.getTime() - start.getTime()) / (60 * 1000);
      const match = DURATION_OPTIONS.find((o) => o.value >= minDiff - 2) ?? DURATION_OPTIONS.find((o) => o.value === 60);
      setDurationMinutes(match?.value ?? 60);
      setRecurrenceValue('');
      setOccurrenceCount(OCCURRENCE_COUNT_DEFAULT);
    } else {
      setPlanItems([]);
      const d = initialDate ? new Date(initialDate.getTime()) : new Date();
      d.setHours(initialHour, initialMinute, 0, 0);
      setDateTime(d.toISOString().slice(0, 16));
      setTitle('');
      setDurationMinutes(60);
      setRecurrenceValue('');
      setOccurrenceCount(OCCURRENCE_COUNT_DEFAULT);
      patientSearch.clearSelection();
    }
  }, [open, mode, initialAppointment, initialDate, initialHour, initialMinute]);

  // ── Click outside to close dropdowns ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!procedureDropdownRef.current?.contains(target)) setShowProcedureDropdown(false);
      if (!(e.target as HTMLElement)?.closest('[data-patient-dropdown]')) patientSearch.setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [patientSearch]);

  // ── Procedure handlers ────────────────────────────────────────────────────
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
    setProcedureSearch('');
    setShowProcedureDropdown(false);
    if (!title.trim()) setTitle(proc.name);
  }, [title]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientSearch.selected) {
      toast.error('Selecione o cliente.');
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
    if (!isoStart) { toast.error('Data e hora inválidos.'); return; }
    const endIso = buildEndTimeFromDurationMinutes(isoStart, durationMinutes);
    if (!endIso) { toast.error('Erro ao calcular duração.'); return; }

    const patientId = patientSearch.selected.id === 'unknown' ? null : patientSearch.selected.id;
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

      if (mode === 'edit' && initialAppointment?.id) {
        await updateAppointmentWithProcedures(initialAppointment.id, {
          patientId,
          patientName: patientSearch.selected.name,
          patientPhone: patientSearch.selected.phone ?? '',
          startTimeIso: isoStart,
          endTimeIso: endIso,
          title: title.trim() || patientSearch.selected.name,
          description: null,
          location: null,
          status: 'scheduled',
          procedures: proceduresPayload,
        });
        // Update Google Calendar if event exists
        if (initialAppointment.gcal_event_id) {
          try {
            const updateResult = await updateGcalEvent({
              eventId: initialAppointment.gcal_event_id,
              patientName: patientSearch.selected.name,
              start: isoStart,
              end: endIso,
              notes: title.trim() || undefined,
            });
            await supabase
              .from('appointments')
              .update({
                gcal_status: updateResult.ok ? 'synced' : 'error',
                gcal_last_error: updateResult.ok ? null : updateResult.error ?? '',
                gcal_updated_at: new Date().toISOString(),
                ...(updateResult.ok && updateResult.htmlLink ? { gcal_event_link: updateResult.htmlLink } : {}),
              })
              .eq('id', initialAppointment.id);
          } catch {
            toast('Agendamento atualizado. Evento do Google Calendar não foi sincronizado.', { icon: '⚠️' });
          }
        }
        toast.success('Agendamento atualizado.');
      } else {
        // Create — with optional recurrence
        const basePayload: CreateAppointmentPayload = {
          patientId,
          patientName: patientSearch.selected.name,
          patientPhone: patientSearch.selected.phone ?? '',
          startTimeIso: isoStart,
          endTimeIso: endIso,
          title: title.trim() || patientSearch.selected.name,
          description: null,
          location: null,
          status: 'scheduled',
          procedures: proceduresPayload,
          professionalId,
        };

        const recurrenceInterval = getRecurrenceInterval(recurrenceValue);
        if (recurrenceInterval && occurrenceCount > 1) {
          const count = Math.min(Math.max(occurrenceCount, OCCURRENCE_COUNT_MIN), OCCURRENCE_COUNT_MAX);
          const rule: RecurrenceRule =
            recurrenceInterval.kind === 'days'
              ? { kind: 'days', intervalDays: recurrenceInterval.intervalDays, occurrenceCount: count }
              : recurrenceInterval.kind === 'months'
              ? { kind: 'months', intervalMonths: recurrenceInterval.intervalMonths, occurrenceCount: count }
              : { kind: 'years', intervalYears: recurrenceInterval.intervalYears, occurrenceCount: count };
          const { created } = await createRecurringAppointments(basePayload, rule, durationMinutes, professionalId);
          toast.success(`${created} agendamentos recorrentes criados.`);
        } else {
          await createAppointmentWithProcedures(basePayload);
          toast.success('Agendamento criado.');
        }
      }
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar agendamento.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'edit' ? 'Editar agendamento' : 'Novo agendamento'}
        className="fixed inset-y-0 right-0 z-50 flex flex-col bg-slate-900 border-l border-slate-700/50 shadow-2xl w-[min(560px,100vw)] sm:w-[min(560px,95vw)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 flex-shrink-0">
          <h2 className="text-base font-semibold text-slate-100">
            {mode === 'edit' ? 'Editar agendamento' : 'Novo agendamento'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

            {/* Procedures */}
            <div ref={procedureDropdownRef}>
              <ProcedurePlanSection
                planItems={planItems}
                onPlanChange={setPlanItems}
                procedureSearch={procedureSearch}
                onProcedureSearchChange={setProcedureSearch}
                showProcedureDropdown={showProcedureDropdown}
                onShowProcedureDropdownChange={setShowProcedureDropdown}
                onSelectProcedure={handleSelectProcedure}
                disabled={submitting}
              />
            </div>

            {/* Patient */}
            <div data-patient-dropdown>
              <PatientSelector patientSearch={patientSearch} required disabled={submitting} />
            </div>

            {/* DateTime */}
            <DateTimeSection
              dateTime={dateTime}
              onDateTimeChange={setDateTime}
              durationMinutes={durationMinutes}
              onDurationChange={setDurationMinutes}
              recurrenceValue={recurrenceValue}
              onRecurrenceChange={setRecurrenceValue}
              occurrenceCount={occurrenceCount}
              onOccurrenceCountChange={setOccurrenceCount}
              disabled={submitting}
              isEditMode={mode === 'edit'}
            />

            {/* Title */}
            <div>
              <label htmlFor="appt-title" className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                Título
              </label>
              <input
                id="appt-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Botox Frontal"
                disabled={submitting}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
              />
            </div>

            {/* Payment (only when plan has items) */}
            {planItems.length > 0 && (
              <PaymentSection
                paymentInfo={paymentInfo}
                onPaymentChange={setPaymentInfo}
                planItems={planItems}
                disabled={submitting}
              />
            )}

            {/* History (edit mode only) */}
            {mode === 'edit' && (
              <div className="border-t border-slate-700/50 pt-4">
                <button
                  type="button"
                  onClick={() => setHistorySectionOpen((v) => !v)}
                  className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full text-left"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Histórico de alterações</span>
                  {historySectionOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                </button>

                {historySectionOpen && (
                  <div className="mt-3 space-y-2">
                    {historyLoading ? (
                      <p className="text-xs text-slate-500">Carregando histórico...</p>
                    ) : historyList.length === 0 ? (
                      <p className="text-xs text-slate-500">Sem histórico registrado.</p>
                    ) : (
                      historyList.map((row) => (
                        <div key={row.id} className="text-xs text-slate-500 bg-slate-800 rounded p-2">
                          <span className="text-slate-400">{convertToBrazilianFormat(row.created_at)}</span>
                          {' · '}
                          <span>{row.action_type}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center gap-3 px-5 py-4 border-t border-slate-700/50 flex-shrink-0 bg-slate-900"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {mode === 'edit' && onDeleteRequested && initialAppointment && (
              <button
                type="button"
                onClick={() => { onDeleteRequested(initialAppointment); onClose(); }}
                disabled={submitting}
                className="px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
              >
                Excluir
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !patientSearch.selected}
              className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 min-w-[100px] justify-center"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  Salvando...
                </>
              ) : mode === 'edit' ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
