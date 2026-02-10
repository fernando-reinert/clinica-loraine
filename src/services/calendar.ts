/**
 * Integração com Google Calendar via Supabase Edge Functions.
 * Usa secrets no Supabase (GCAL_*); nunca envia tokens pelo frontend.
 */

import { supabase } from './supabase/client';

export interface CreateGcalEventParams {
  patientName: string;
  start: string; // ISO 8601 (ex: 2025-02-10T14:00:00.000Z ou 2025-02-10T14:00:00-03:00)
  end: string;
  appointmentId?: string;
}

export interface CreateGcalEventResult {
  ok: boolean;
  eventId?: string | null;
  htmlLink?: string | null;
  error?: string;
  details?: string;
}

export interface UpdateGcalEventParams {
  eventId: string;
  patientName?: string;
  start?: string;
  end?: string;
  notes?: string;
}

export interface UpdateGcalEventResult {
  ok: boolean;
  eventId?: string;
  htmlLink?: string | null;
  error?: string;
  details?: string;
}

export interface CancelGcalEventResult {
  ok: boolean;
  error?: string;
  details?: string;
}

/**
 * Garante que a string de data/hora está em formato ISO aceito pela API (timezone -03:00).
 */
function toIsoForGcal(dateTime: string): string {
  const d = new Date(dateTime);
  if (Number.isNaN(d.getTime())) throw new Error('Data/hora inválida: ' + dateTime);
  return d.toISOString();
}

/**
 * Cria evento no Google Calendar.
 */
export async function createGcalEvent(params: CreateGcalEventParams): Promise<CreateGcalEventResult> {
  const { patientName, start, end, appointmentId } = params;
  if (!patientName?.trim() || !start || !end) {
    return { ok: false, error: 'patientName, start e end são obrigatórios' };
  }

  try {
    const body: Record<string, unknown> = {
      patientName: patientName.trim(),
      start: toIsoForGcal(start),
      end: toIsoForGcal(end),
    };
    if (appointmentId) body.appointmentId = appointmentId;

    const { data, error } = await supabase.functions.invoke('create-gcal-event', {
      body,
    });

    if (error) {
      return {
        ok: false,
        error: error.message || 'Erro ao chamar create-gcal-event',
      };
    }

    const result = data as CreateGcalEventResult | null;
    if (result && result.ok) {
      return {
        ok: true,
        eventId: result.eventId ?? null,
        htmlLink: result.htmlLink ?? null,
      };
    }

    return {
      ok: false,
      error: (result as any)?.error ?? 'Resposta inválida da função',
      details: (result as any)?.details,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? 'Erro ao criar evento no Google Calendar',
    };
  }
}

/**
 * Atualiza evento existente no Google Calendar (remarca).
 */
export async function updateGcalEvent(params: UpdateGcalEventParams): Promise<UpdateGcalEventResult> {
  const { eventId, patientName, start, end, notes } = params;
  if (!eventId?.trim()) {
    return { ok: false, error: 'eventId é obrigatório' };
  }

  try {
    const body: Record<string, unknown> = { eventId: eventId.trim() };
    if (patientName != null) body.patientName = patientName;
    if (start != null) body.start = toIsoForGcal(start);
    if (end != null) body.end = toIsoForGcal(end);
    if (notes != null) body.notes = notes;

    const { data, error } = await supabase.functions.invoke('update-gcal-event', {
      body,
    });

    if (error) {
      return {
        ok: false,
        error: error.message || 'Erro ao chamar update-gcal-event',
      };
    }

    const result = data as UpdateGcalEventResult | null;
    if (result && result.ok) {
      return {
        ok: true,
        eventId: result.eventId ?? eventId,
        htmlLink: result.htmlLink ?? null,
      };
    }

    return {
      ok: false,
      error: (result as any)?.error ?? 'Resposta inválida da função',
      details: (result as any)?.details,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? 'Erro ao atualizar evento no Google Calendar',
    };
  }
}

/**
 * Cancela (exclui) evento no Google Calendar.
 */
export async function cancelGcalEvent(eventId: string): Promise<CancelGcalEventResult> {
  if (!eventId?.trim()) {
    return { ok: false, error: 'eventId é obrigatório' };
  }

  try {
    const { data, error } = await supabase.functions.invoke('cancel-gcal-event', {
      body: { eventId: eventId.trim() },
    });

    if (error) {
      return {
        ok: false,
        error: error.message || 'Erro ao chamar cancel-gcal-event',
      };
    }

    const result = data as CancelGcalEventResult | null;
    if (result && result.ok) {
      return { ok: true };
    }

    return {
      ok: false,
      error: (result as any)?.error ?? 'Resposta inválida da função',
      details: (result as any)?.details,
    };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message ?? 'Erro ao cancelar evento no Google Calendar',
    };
  }
}
