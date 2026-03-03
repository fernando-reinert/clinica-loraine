// src/screens/TreatmentPlanConfirmScreen.tsx – Confirmar procedimento: agendar plano como appointment
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, User, Clock, DollarSign } from 'lucide-react';
import ResponsiveAppLayout from '../components/Layout/ResponsiveAppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTreatmentPlans } from '../hooks/useTreatmentPlans';
import { usePatients } from '../hooks/usePatients';
import { useProcedureCatalog } from '../hooks/useProcedureCatalog';
import { createAppointmentWithProcedures } from '../services/appointments/appointmentService';
import { addMinutesToDate } from '../utils/dateUtils';
import { confirmPlanPayloadSchema } from '../services/treatmentPlans/validation';
import toast from 'react-hot-toast';
import type { TreatmentPlanWithItems, TreatmentPlanItem } from '../types/treatmentPlan';
import type { Procedure } from '../types/db';

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

/** Build start ISO from date (YYYY-MM-DD) and time (HH:mm or H:mm). */
function toStartTimeIso(date: string, time: string): string | null {
  const [h, m] = time.trim().split(':').map(Number);
  if (h == null || m == null || h < 0 || h > 23 || m < 0 || m > 59) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = `${date}T${pad(h)}:${pad(m)}:00`;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

const TreatmentPlanConfirmScreen: React.FC = () => {
  const { id: patientId, planId } = useParams<{ id: string; planId: string }>();
  const navigate = useNavigate();
  const { getPlanWithItems, updatePlan } = useTreatmentPlans(patientId);
  const { getPatient } = usePatients();
  const { procedures } = useProcedureCatalog();

  const [plan, setPlan] = useState<TreatmentPlanWithItems | null>(null);
  const [patientName, setPatientName] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /** Optional manual duration when catalog items have no duration (manual items or missing duration_minutes). */
  const [manualDurationMinutes, setManualDurationMinutes] = useState<number | ''>('');

  const catalogById = useMemo(() => {
    const map = new Map<string, Procedure>();
    procedures.forEach((p) => map.set(p.id, p));
    return map;
  }, [procedures]);

  const itemsWithCatalog = useMemo(() => {
    if (!plan?.items) return [];
    return plan.items.filter((i): i is TreatmentPlanItem & { procedure_catalog_id: string } => i.procedure_catalog_id != null);
  }, [plan?.items]);

  const itemsWithoutCatalog = useMemo(() => {
    if (!plan?.items) return [];
    return plan.items.filter((i) => i.procedure_catalog_id == null);
  }, [plan?.items]);

  useEffect(() => {
    if (!patientId || !planId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [planData, patient] = await Promise.all([
          getPlanWithItems(planId),
          getPatient(patientId),
        ]);
        if (cancelled) return;
        setPlan(planData ?? null);
        setPatientName(patient?.name ?? '');
        setPatientPhone(patient?.phone ?? '');
        const today = new Date().toISOString().slice(0, 10);
        setDate(today);
        if (planData?.items) {
          const selectable = planData.items.filter((i) => i.procedure_catalog_id != null).map((i) => i.id);
          setSelectedIds(new Set(selectable));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId, planId, getPlanWithItems, getPatient]);

  const toggleItem = useCallback((itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }, []);

  const selectAllCatalog = useCallback(() => {
    setSelectedIds(new Set(itemsWithCatalog.map((i) => i.id)));
  }, [itemsWithCatalog]);

  const totalCents = useMemo(() => {
    if (!plan?.items) return 0;
    return plan.items.filter((i) => selectedIds.has(i.id)).reduce((s, i) => s + i.unit_price_cents * i.quantity, 0);
  }, [plan?.items, selectedIds]);

  const totalDurationMinutes = useMemo(() => {
    let sum = 0;
    plan?.items?.forEach((i) => {
      if (!selectedIds.has(i.id) || !i.procedure_catalog_id) return;
      const proc = catalogById.get(i.procedure_catalog_id);
      const mins = proc?.duration_minutes != null ? Number(proc.duration_minutes) : 0;
      if (mins > 0) sum += mins * i.quantity;
    });
    return sum;
  }, [plan?.items, selectedIds, catalogById]);

  const selectedProceduresForAppointment = useMemo(() => {
    if (!plan?.items) return [];
    return plan.items.filter((i) => selectedIds.has(i.id) && i.procedure_catalog_id != null);
  }, [plan?.items, selectedIds]);

  const manualMinutes = typeof manualDurationMinutes === 'number' ? manualDurationMinutes : (manualDurationMinutes === '' ? 0 : Number(manualDurationMinutes) || 0);
  const effectiveDurationMinutes = totalDurationMinutes > 0 ? totalDurationMinutes : manualMinutes;
  const needsManualDuration = selectedProceduresForAppointment.length > 0 && totalDurationMinutes <= 0;
  const canSubmit = selectedProceduresForAppointment.length > 0 && effectiveDurationMinutes > 0;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!patientId || !planId || !plan) return;
      const payload = {
        date,
        time,
        selectedItemIds: Array.from(selectedIds),
      };
      const parsed = confirmPlanPayloadSchema.safeParse(payload);
      if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => e.message).join(' ');
        toast.error(msg);
        return;
      }
      if (selectedProceduresForAppointment.length === 0) {
        toast.error('Selecione pelo menos um item vinculado ao catálogo para criar o agendamento.');
        return;
      }
      const startTimeIso = toStartTimeIso(date, time);
      if (!startTimeIso) {
        toast.error('Data ou hora inválida.');
        return;
      }
      if (effectiveDurationMinutes <= 0) {
        toast.error('Informe a duração (itens do catálogo ou duração manual).');
        return;
      }
      const endTimeIso = addMinutesToDate(startTimeIso, effectiveDurationMinutes);
      if (!endTimeIso) {
        toast.error('Erro ao calcular horário de término.');
        return;
      }
      setSubmitting(true);
      try {
        const { id: appointmentId } = await createAppointmentWithProcedures({
          patientId: plan.patient_id,
          patientName,
          patientPhone: patientPhone || '',
          startTimeIso,
          endTimeIso,
          title: plan.title,
          procedures: selectedProceduresForAppointment.map((i) => ({
            procedureId: i.procedure_catalog_id!,
            name: i.procedure_name_snapshot,
            finalPrice: i.unit_price_cents / 100,
            quantity: i.quantity,
            discount: 0,
          })),
        });
        await updatePlan(planId, {
          scheduled_appointment_id: appointmentId,
          confirmed_at: new Date().toISOString(),
          status: 'scheduled',
        });
        toast.success('Agendamento criado e plano vinculado.');
        navigate(`/appointments`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao criar agendamento.');
      } finally {
        setSubmitting(false);
      }
    },
    [
      patientId,
      planId,
      plan,
      date,
      time,
      selectedIds,
      selectedProceduresForAppointment,
      effectiveDurationMinutes,
      patientName,
      patientPhone,
      updatePlan,
      navigate,
    ]
  );

  if (!patientId || !planId) {
    return (
      <ResponsiveAppLayout title="Confirmar procedimento" showBack>
        <p className="text-gray-400">Paciente ou plano não identificado.</p>
      </ResponsiveAppLayout>
    );
  }

  if (loading) {
    return (
      <ResponsiveAppLayout title="Confirmar procedimento" showBack>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" className="text-cyan-500" />
        </div>
      </ResponsiveAppLayout>
    );
  }

  if (!plan) {
    return (
      <ResponsiveAppLayout title="Confirmar procedimento" showBack>
        <p className="text-gray-400">Plano não encontrado.</p>
      </ResponsiveAppLayout>
    );
  }

  if (plan.scheduled_appointment_id) {
    return (
      <ResponsiveAppLayout title="Confirmar procedimento" showBack>
        <div className="glass-card p-6 text-center text-gray-400">
          <p>Este plano já foi agendado.</p>
          <button
            type="button"
            onClick={() => navigate(`/patients/${patientId}/treatment-plans`)}
            className="mt-4 neon-button min-h-[44px] px-4"
          >
            Voltar aos planos
          </button>
        </div>
      </ResponsiveAppLayout>
    );
  }

  return (
    <ResponsiveAppLayout title="Confirmar procedimento" showBack>
      <div className="space-y-6 max-w-2xl">
        <div className="glass-card p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white truncate">{plan.title}</h2>
          <p className="flex items-center gap-2 text-gray-400 mt-1">
            <User size={16} />
            {patientName || 'Paciente'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass-card p-4 sm:p-6 space-y-4">
            <h3 className="font-medium text-white">Data e horário</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-gray-400 text-sm">Data</span>
                <div className="flex items-center gap-2 mt-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                  <Calendar size={18} className="text-cyan-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="flex-1 bg-transparent text-white min-w-0"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-gray-400 text-sm">Hora</span>
                <div className="flex items-center gap-2 mt-1 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                  <Clock size={18} className="text-cyan-400" />
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="flex-1 bg-transparent text-white min-w-0"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="glass-card p-4 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-white">Itens do plano</h3>
              {itemsWithCatalog.length > 0 && (
                <button type="button" onClick={selectAllCatalog} className="text-sm text-cyan-400 hover:underline">
                  Selecionar todos
                </button>
              )}
            </div>
            <ul className="space-y-2">
              {itemsWithCatalog.map((item) => {
                const proc = catalogById.get(item.procedure_catalog_id!);
                const duration = proc?.duration_minutes != null ? proc.duration_minutes * item.quantity : null;
                return (
                  <li key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="mt-1 rounded border-white/30 text-cyan-500 focus:ring-cyan-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-white">{item.procedure_name_snapshot}</span>
                      <span className="text-gray-400"> × {item.quantity}</span>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatCurrency(item.unit_price_cents * item.quantity)}
                        {duration != null ? ` · ${formatDuration(duration)}` : ''}
                      </p>
                    </div>
                  </li>
                );
              })}
              {itemsWithoutCatalog.map((item) => (
                <li key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 opacity-75">
                  <input type="checkbox" disabled className="mt-1 rounded border-white/30" />
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-400">{item.procedure_name_snapshot}</span>
                    <span className="text-gray-500"> × {item.quantity}</span>
                    <p className="text-sm text-amber-500/80">Item manual · duração não definida · não incluído no agendamento</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-card p-4 sm:p-6 space-y-4">
            {needsManualDuration && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-3">
                <p className="text-amber-200 text-sm">
                  Duração não definida nos itens do catálogo. Informe a duração total abaixo para habilitar &quot;Criar agendamento&quot;.
                </p>
                <label className="mt-2 flex items-center gap-2">
                  <span className="text-gray-300 text-sm">Duração manual (min):</span>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={manualDurationMinutes === '' ? '' : manualDurationMinutes}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '') setManualDurationMinutes('');
                      else setManualDurationMinutes(Math.max(0, Math.min(600, parseInt(v, 10) || 0)));
                    }}
                    className="w-24 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white"
                    placeholder="ex: 60"
                  />
                </label>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-6">
                <span className="flex items-center gap-2 text-white">
                  <DollarSign size={18} className="text-cyan-400" />
                  Total: {formatCurrency(totalCents)}
                </span>
                <span className="flex items-center gap-2 text-gray-400">
                  <Clock size={18} />
                  {effectiveDurationMinutes > 0 ? `Duração: ${formatDuration(effectiveDurationMinutes)}` : 'Duração não definida'}
                </span>
              </div>
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="neon-button min-h-[44px] px-6 disabled:opacity-50"
              >
                {submitting ? <LoadingSpinner size="sm" className="text-current" /> : 'Criar agendamento'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </ResponsiveAppLayout>
  );
};

export default TreatmentPlanConfirmScreen;
