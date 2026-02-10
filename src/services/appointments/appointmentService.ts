// src/services/appointments/appointmentService.ts
import { supabase } from '../supabase/client';
import { createGcalEvent } from '../calendar';
import logger from '../../utils/logger';
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
}

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

    const itemsPayload = procedures.map((item) => ({
      appointment_id: appointment.id,
      procedure_catalog_id: item.procedureId, // procedureId é o ID do procedure_catalog
      procedure_name_snapshot: item.name,
      final_price: item.finalPrice,
      quantity: item.quantity || 1,
      discount: item.discount || 0,
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

    const { error: updateError } = await supabase
      .from('appointments')
      .update(appointmentData)
      .eq('id', appointmentId);

    if (updateError) {
      logger.error('[APPOINTMENTS] Erro ao atualizar agendamento', { updateError, appointmentId });
      throw new Error(updateError.message || 'Erro ao atualizar agendamento');
    }

    await supabase.from('appointment_procedures').delete().eq('appointment_id', appointmentId);

    if (hasProcedures) {
      const itemsPayload = procedures.map((item) => ({
        appointment_id: appointmentId,
        procedure_catalog_id: item.procedureId,
        procedure_name_snapshot: item.name,
        final_price: item.finalPrice,
        quantity: item.quantity || 1,
        discount: item.discount || 0,
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

