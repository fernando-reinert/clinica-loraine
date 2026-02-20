// src/services/appointments/appointmentService.ts
import { supabase } from '../supabase/client';
import { createGcalEvent } from '../calendar';
import logger from '../../utils/logger';
import { addMinutesToDate } from '../../utils/dateUtils';
import type { Appointment } from '../../types/db';

export interface AppointmentProcedureItemInput {
  procedureId: string;
  name: string;
  finalPrice: number;
  quantity: number;
  discount: number;
}

export interface CreateAppointmentPayload {
  patientId: string | null;
  patientName: string;
  patientPhone: string;
  startTimeIso: string;
  endTimeIso?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  status?: Appointment['status'];
  procedures?: AppointmentProcedureItemInput[];
  professionalId?: string | null;
  recurrenceGroupId?: string | null;
}

/** Regra de recorrência: intervalo + número exato de ocorrências (1..60). */
export type RecurrenceRule =
  | { kind: 'days'; intervalDays: number; occurrenceCount: number }
  | { kind: 'months'; intervalMonths: number; occurrenceCount: number }
  | { kind: 'years'; intervalYears: number; occurrenceCount: number };

const MAX_RECURRENCE_OCCURRENCES = 60;

/**
 * Cria um agendamento + itens de procedimentos.
 * Estratégia "quase transacional":
 * 1) cria appointment;
 * 2) se der erro ao criar itens, tenta remover o appointment criado (rollback best-effort).
 */
export const createAppointmentWithProcedures = async (
  payload: CreateAppointmentPayload
): Promise<void> => {
  const {
    patientId,
    patientName,
    patientPhone,
    startTimeIso,
    endTimeIso,
    title,
    description,
    location,
    status = 'scheduled',
    procedures = [],
  } = payload;

  try {
    const hasProcedures = procedures.length > 0;
    const totalFromProcedures = procedures.reduce(
      (sum, item) => sum + Math.max(0, item.finalPrice * (item.quantity || 1) - (item.discount || 0)),
      0
    );

    const appointmentData: any = {
      patient_id: patientId,
      patient_name: patientName,
      patient_phone: patientPhone,
      start_time: startTimeIso,
      end_time: endTimeIso ?? null,
      title,
      description: description || null,
      location: location || null,
      status,
    };

    if (hasProcedures && totalFromProcedures > 0) {
      appointmentData.budget = totalFromProcedures;
    }
    if (payload.professionalId) appointmentData.professional_id = payload.professionalId;
    if (payload.recurrenceGroupId) appointmentData.recurrence_group_id = payload.recurrenceGroupId;

    logger.info('[APPOINTMENTS] Criando agendamento', {
      patientId,
      patientName,
      hasProcedures,
      totalFromProcedures,
    });

    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert([appointmentData])
      .select('id')
      .single();

    if (appointmentError || !appointment) {
      logger.error('[APPOINTMENTS] Erro ao criar agendamento', { appointmentError });
      const message = appointmentError?.message || 'Erro ao criar agendamento';
      const details = (appointmentError as any)?.details;
      throw new Error(details ? `${message} - ${details}` : message);
    }

    const endForGcal = endTimeIso ?? new Date(new Date(startTimeIso).getTime() + 60 * 60 * 1000).toISOString();
    const gcalResult = await createGcalEvent({
      patientName,
      start: startTimeIso,
      end: endForGcal,
      appointmentId: appointment.id,
    });
    const gcalUpdate: Record<string, unknown> = {
      gcal_event_id: gcalResult.eventId ?? null,
      gcal_event_link: gcalResult.htmlLink ?? null,
      gcal_status: gcalResult.ok ? 'synced' : 'error',
      gcal_last_error: gcalResult.ok ? null : (gcalResult.error ?? ''),
      gcal_updated_at: new Date().toISOString(),
    };
    await supabase.from('appointments').update(gcalUpdate).eq('id', appointment.id);
    if (!gcalResult.ok) {
      logger.warn('[APPOINTMENTS] Google Calendar falhou (agendamento salvo)', { id: appointment.id, error: gcalResult.error });
    }

    if (!hasProcedures) {
      logger.info('[APPOINTMENTS] Agendamento criado sem procedimentos', { id: appointment.id });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.error('[APPOINTMENTS] Usuário não autenticado ao salvar procedimentos');
      throw new Error('Sessão inválida. Faça login novamente.');
    }

    const itemsPayload = procedures.map((item) => ({
      appointment_id: appointment.id,
      procedure_catalog_id: item.procedureId, // procedureId é o ID do procedure_catalog
      procedure_name_snapshot: item.name,
      final_price: item.finalPrice,
      quantity: item.quantity || 1,
      discount: item.discount || 0,
      user_id: user.id,
    }));

    const { error: itemsError } = await supabase
      .from('appointment_procedures')
      .insert(itemsPayload);

    if (itemsError) {
      logger.error('[APPOINTMENTS] Erro ao criar itens de agendamento', {
        appointmentId: appointment.id,
        itemsError,
      });

      try {
        await supabase.from('appointments').delete().eq('id', appointment.id);
        logger.warn('[APPOINTMENTS] Agendamento removido após erro em itens', {
          id: appointment.id,
        });
      } catch (rollbackError: any) {
        logger.error('[APPOINTMENTS] Falha ao tentar rollback do agendamento', {
          id: appointment.id,
          rollbackError,
        });
      }

      const message = itemsError.message || 'Erro ao salvar procedimentos do agendamento';
      const details = (itemsError as any)?.details;
      throw new Error(details ? `${message} - ${details}` : message);
    }

    logger.info('[APPOINTMENTS] Agendamento + procedimentos criados com sucesso', {
      id: appointment.id,
      itemsCount: procedures.length,
    });
  } catch (error: any) {
    logger.error('[APPOINTMENTS] Falha inesperada ao criar agendamento com procedimentos', {
      error: error?.message || String(error),
    });
    throw error;
  }
};

/**
 * Lista agendamentos de um único dia (range start_time >= início do dia e < início do dia seguinte, horário local).
 */
export const listAppointmentsByDay = async (day: Date): Promise<any[]> => {
  const y = day.getFullYear();
  const m = day.getMonth();
  const d = day.getDate();
  const startOfDay = new Date(y, m, d, 0, 0, 0, 0);
  const startOfNextDay = new Date(y, m, d + 1, 0, 0, 0, 0);
  const startIso = startOfDay.toISOString();
  const endIso = startOfNextDay.toISOString();

  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .gte('start_time', startIso)
    .lt('start_time', endIso)
    .order('start_time', { ascending: true });

  if (error) {
    logger.error('[APPOINTMENTS] Erro ao listar agendamentos do dia', { error, day: day.toISOString() });
    throw new Error(error.message || 'Erro ao carregar agenda do dia');
  }
  return data ?? [];
};

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Adds months to a date preserving day-of-month when possible.
 * If the resulting month has fewer days (e.g. Jan 31 + 1 month), uses the last day of that month.
 * Preserves local time (hour, minute, second, ms).
 */
function addMonthsPreserveDom(date: Date, monthsToAdd: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const dom = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ms = date.getMilliseconds();

  const newM = m + monthsToAdd;
  const yearDelta = Math.floor(newM / 12);
  const newYear = y + yearDelta;
  const newMonth = ((newM % 12) + 12) % 12;
  const last = lastDayOfMonth(newYear, newMonth);
  const newDom = Math.min(dom, last);
  return new Date(newYear, newMonth, newDom, hours, minutes, seconds, ms);
}

/** Gera exatamente occurrenceCount ocorrências (k = 0..occurrenceCount-1). Sem truncamento. Base sempre em firstStart + k*interval. */
function generateRecurrenceOccurrences(
  firstStart: Date,
  rule: RecurrenceRule,
  durationMinutes: number
): { startIso: string; endIso: string }[] {
  const count = Math.min(Math.max(1, rule.occurrenceCount), MAX_RECURRENCE_OCCURRENCES);
  const out: { startIso: string; endIso: string }[] = [];
  const addMinutes = (d: Date, min: number) => new Date(d.getTime() + min * 60 * 1000);

  for (let k = 0; k < count; k++) {
    let occ: Date;
    if (rule.kind === 'days') {
      occ = new Date(firstStart.getTime());
      occ.setDate(occ.getDate() + k * rule.intervalDays);
    } else if (rule.kind === 'months') {
      occ = addMonthsPreserveDom(firstStart, k * rule.intervalMonths);
    } else {
      occ = addMonthsPreserveDom(firstStart, k * rule.intervalYears * 12);
    }
    const end = addMinutes(occ, durationMinutes);
    out.push({ startIso: occ.toISOString(), endIso: end.toISOString() });
  }

  return out;
}

const GCAL_CONCURRENCY = 3;

async function runInBatches<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const allResults: PromiseSettledResult<R>[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(batch.map((item) => fn(item)));
    allResults.push(...batchResults);
  }
  return allResults;
}

/**
 * Cria todos os agendamentos recorrentes em batch (insert único), depois sincroniza GCal em background.
 * Retorna assim que o insert no DB terminar; GCal não bloqueia a UI.
 */
export const createRecurringAppointments = async (
  basePayload: CreateAppointmentPayload,
  rule: RecurrenceRule,
  durationMinutes: number,
  professionalId?: string | null
): Promise<{ created: number; recurrenceGroupId: string }> => {
  const recurrenceGroupId = (() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  })();

  const firstStart = new Date(basePayload.startTimeIso);
  const occurrences = generateRecurrenceOccurrences(firstStart, rule, durationMinutes);
  const firstEndIso = basePayload.endTimeIso ?? addMinutesToDate(basePayload.startTimeIso, durationMinutes);
  if (!firstEndIso) throw new Error('Não foi possível calcular o término do agendamento.');

  if (occurrences.length === 0) {
    logger.warn('[APPOINTMENTS] Nenhuma ocorrência gerada para a regra', { rule });
    throw new Error('Nenhuma ocorrência gerada para a regra de recorrência.');
  }

  const totalFromProcedures = (basePayload.procedures ?? []).reduce(
    (s, i) => s + Math.max(0, i.finalPrice * (i.quantity || 1) - (i.discount || 0)),
    0
  );

  const totalCount = occurrences.length;
  const recurrenceRuleJson =
    rule.kind === 'days'
      ? { kind: 'days', intervalDays: rule.intervalDays, occurrenceCount: rule.occurrenceCount }
      : rule.kind === 'months'
      ? { kind: 'months', intervalMonths: rule.intervalMonths, occurrenceCount: rule.occurrenceCount }
      : { kind: 'years', intervalYears: rule.intervalYears, occurrenceCount: rule.occurrenceCount };

  const rows = occurrences.map((occ, i) => {
    const row: Record<string, unknown> = {
      patient_id: basePayload.patientId,
      patient_name: basePayload.patientName,
      patient_phone: basePayload.patientPhone,
      start_time: occ.startIso,
      end_time: occ.endIso,
      title: basePayload.title,
      description: basePayload.description ?? null,
      location: basePayload.location ?? null,
      status: basePayload.status ?? 'scheduled',
      recurrence_group_id: recurrenceGroupId,
      recurrence_index: i + 1,
      recurrence_count: totalCount,
      recurrence_rule: recurrenceRuleJson,
    };
    if (professionalId) row.professional_id = professionalId;
    if (totalFromProcedures > 0) row.budget = totalFromProcedures;
    return row;
  });

  logger.info('[APPOINTMENTS] Recorrência: gerando ocorrências', {
    rule: rule.kind,
    interval:
      rule.kind === 'days'
        ? rule.intervalDays
        : rule.kind === 'months'
        ? rule.intervalMonths
        : rule.intervalYears,
    total: totalCount,
    firstStart: occurrences[0]?.startIso,
    lastStart: occurrences[occurrences.length - 1]?.startIso,
    occurrenceCount: rule.occurrenceCount,
  });

  const { data: inserted, error: insertError } = await supabase
    .from('appointments')
    .insert(rows)
    .select('id, start_time, end_time, recurrence_group_id, recurrence_index');

  if (insertError || !inserted?.length) {
    logger.error('[APPOINTMENTS] Erro ao inserir agendamentos recorrentes em batch', { insertError });
    throw new Error(insertError?.message ?? 'Erro ao criar agendamentos.');
  }

  if (inserted.length !== totalCount) {
    logger.error('[APPOINTMENTS] Truncamento detectado: inseridos !== total solicitado', {
      inserted: inserted.length,
      totalCount,
      recurrenceGroupId,
    });
    throw new Error(
      `Recorrência: foram inseridos ${inserted.length} agendamentos, mas ${totalCount} eram esperados. Tente novamente.`
    );
  }

  const procedureItems = basePayload.procedures ?? [];
  if (procedureItems.length > 0) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      logger.error('[APPOINTMENTS] Usuário não autenticado ao inserir procedimentos da série');
      throw new Error('Sessão inválida. Faça login novamente.');
    }
    const allProcedureRows = inserted.flatMap((app: { id: string }) =>
      procedureItems.map((item) => ({
        appointment_id: app.id,
        procedure_catalog_id: item.procedureId,
        procedure_name_snapshot: item.name,
        final_price: item.finalPrice,
        quantity: item.quantity || 1,
        discount: item.discount || 0,
        user_id: user.id,
      }))
    );
    const { error: procErr } = await supabase.from('appointment_procedures').insert(allProcedureRows);
    if (procErr) {
      logger.error('[APPOINTMENTS] Erro ao inserir procedimentos em batch para série recorrente', {
        procErr,
        recurrenceGroupId,
        expectedRows: allProcedureRows.length,
      });
      throw new Error(
        procErr.message || 'Erro ao salvar procedimentos dos agendamentos recorrentes. Os agendamentos foram criados.'
      );
    }
    logger.info('[APPOINTMENTS] Procedimentos inseridos para todos os agendamentos da série', {
      recurrenceGroupId,
      appointments: inserted.length,
      procedureRows: allProcedureRows.length,
    });
  }

  const created = inserted.length;
  logger.info('[APPOINTMENTS] Série recorrente criada (batch)', { recurrenceGroupId, created });

  if (created > 0) {
    runInBatches(inserted as { id: string; start_time: string; end_time: string }[], GCAL_CONCURRENCY, async (app) => {
      const gcalResult = await createGcalEvent({
        patientName: basePayload.patientName,
        start: app.start_time,
        end: app.end_time,
        appointmentId: app.id,
      });
      await supabase
        .from('appointments')
        .update({
          gcal_event_id: gcalResult.eventId ?? null,
          gcal_event_link: gcalResult.htmlLink ?? null,
          gcal_status: gcalResult.ok ? 'synced' : 'error',
          gcal_last_error: gcalResult.ok ? null : (gcalResult.error ?? ''),
          gcal_updated_at: new Date().toISOString(),
        })
        .eq('id', app.id);
      return gcalResult;
    }).then((results) => {
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) logger.warn('[APPOINTMENTS] GCal sync: algumas falhas', { failed, total: results.length });
    });
  }

  return { created, recurrenceGroupId };
};

// ============================================
// INTERFACES PARA LISTAGEM
// ============================================

export interface AppointmentWithProcedures {
  id: string;
  patient_id: string;
  patient_name: string;
  professional_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  created_at: string;
  procedures: {
    id: string;
    procedure_catalog_id: string | null;
    procedure_name_snapshot: string;
    final_price: number;
    quantity: number;
    discount: number;
  }[];
  totalPotential: number; // Soma dos final_price dos procedimentos
}

/**
 * Lista agendamentos com seus procedimentos planejados em uma janela de tempo
 */
export const listAppointmentsWithProcedures = async (
  daysBefore: number = 30,
  daysAfter: number = 30
): Promise<AppointmentWithProcedures[]> => {
  try {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBefore);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + daysAfter);

    // Buscar agendamentos na janela
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (appointmentsError) {
      logger.error('[APPOINTMENTS] Erro ao listar agendamentos', { appointmentsError });
      throw new Error(appointmentsError.message || 'Erro ao listar agendamentos');
    }

    if (!appointments || appointments.length === 0) {
      return [];
    }

    // Buscar procedimentos para cada agendamento
    const appointmentsWithProcedures = await Promise.all(
      appointments.map(async (appointment) => {
        const { data: procedures } = await supabase
          .from('appointment_procedures')
          .select('*')
          .eq('appointment_id', appointment.id)
          .order('created_at');

        const proceduresList = (procedures || []).map((p: any) => ({
          id: p.id,
          procedure_catalog_id: p.procedure_catalog_id || p.procedure_id,
          procedure_name_snapshot: p.procedure_name_snapshot,
          final_price: p.final_price,
          quantity: p.quantity || 1,
          discount: p.discount || 0,
        }));

        const totalPotential = proceduresList.reduce(
          (sum, p) => sum + (p.final_price * p.quantity - p.discount),
          0
        );

        return {
          ...appointment,
          procedures: proceduresList,
          totalPotential,
        } as AppointmentWithProcedures;
      })
    );

    return appointmentsWithProcedures;
  } catch (error: any) {
    logger.error('[APPOINTMENTS] Falha ao listar agendamentos com procedimentos', {
      error: error?.message || String(error),
    });
    throw error;
  }
};

export interface UpdateAppointmentPayload {
  patientId: string | null;
  patientName: string;
  patientPhone: string;
  startTimeIso: string;
  endTimeIso?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  status?: Appointment['status'];
  procedures?: AppointmentProcedureItemInput[];
}

/**
 * Atualiza um agendamento e substitui os procedimentos (idempotente: remove os que não vêm no payload e insere/atualiza os enviados).
 */
export const updateAppointmentWithProcedures = async (
  appointmentId: string,
  payload: UpdateAppointmentPayload
): Promise<void> => {
  const {
    patientId,
    patientName,
    patientPhone,
    startTimeIso,
    endTimeIso,
    title,
    description,
    location,
    status = 'scheduled',
    procedures = [],
  } = payload;

  try {
    const hasProcedures = procedures.length > 0;
    const totalFromProcedures = procedures.reduce(
      (sum, item) => sum + Math.max(0, item.finalPrice * (item.quantity || 1) - (item.discount || 0)),
      0
    );

    const appointmentData: Record<string, unknown> = {
      patient_id: patientId,
      patient_name: patientName,
      patient_phone: patientPhone,
      start_time: startTimeIso,
      end_time: endTimeIso ?? null,
      title,
      description: description || null,
      location: location || null,
      status,
    };
    if (hasProcedures && totalFromProcedures > 0) {
      appointmentData.budget = totalFromProcedures;
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from('appointments')
      .update(appointmentData)
      .eq('id', appointmentId)
      .select('id')
      .maybeSingle();

    if (updateError) {
      logger.error('[APPOINTMENTS] Erro ao atualizar agendamento', { updateError, appointmentId });
      throw new Error(updateError.message || 'Erro ao atualizar agendamento');
    }
    if (!updatedRow) {
      logger.error('[APPOINTMENTS] Agendamento não encontrado ou sem permissão para editar', { appointmentId });
      throw new Error('Agendamento não encontrado ou você não tem permissão para editá-lo.');
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user && hasProcedures) {
      logger.error('[APPOINTMENTS] Usuário não autenticado ao salvar procedimentos');
      throw new Error('Sessão inválida. Faça login novamente.');
    }

    await supabase.from('appointment_procedures').delete().eq('appointment_id', appointmentId);

    if (hasProcedures && user) {
      const itemsPayload = procedures.map((item) => ({
        appointment_id: appointmentId,
        procedure_catalog_id: item.procedureId,
        procedure_name_snapshot: item.name,
        final_price: item.finalPrice,
        quantity: item.quantity || 1,
        discount: item.discount || 0,
        user_id: user.id,
      }));
      const { error: itemsError } = await supabase
        .from('appointment_procedures')
        .insert(itemsPayload);
      if (itemsError) {
        logger.error('[APPOINTMENTS] Erro ao atualizar procedimentos do agendamento', { appointmentId, itemsError });
        throw new Error(itemsError.message || 'Erro ao salvar procedimentos do agendamento');
      }
    }

    logger.info('[APPOINTMENTS] Agendamento atualizado com procedimentos', { appointmentId, itemsCount: procedures.length });
  } catch (error: any) {
    logger.error('[APPOINTMENTS] Falha ao atualizar agendamento com procedimentos', {
      error: error?.message || String(error),
      appointmentId,
    });
    throw error;
  }
};

/**
 * Atualiza o status de um agendamento
 */
export const markAppointmentStatus = async (
  appointmentId: string,
  status: 'scheduled' | 'completed_with_sale' | 'completed_no_sale' | 'cancelled'
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId);

    if (error) {
      logger.error('[APPOINTMENTS] Erro ao atualizar status', { error, appointmentId, status });
      throw new Error(error.message || 'Erro ao atualizar status do agendamento');
    }

    logger.info('[APPOINTMENTS] Status atualizado', { appointmentId, status });
  } catch (error: any) {
    logger.error('[APPOINTMENTS] Falha ao atualizar status', {
      error: error?.message || String(error),
      appointmentId,
      status,
    });
    throw error;
  }
};

