// src/hooks/useAppointmentActions.ts
import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  updateAppointmentStatus,
  deleteAppointment,
  rescheduleAppointment,
} from '../services/appointments/appointmentService';
import type { AppointmentStatus } from '../types/db';

interface UseAppointmentActionsOptions {
  onSuccess: () => void; // called after any successful mutation to trigger list refresh
}

export interface UseAppointmentActionsReturn {
  busy: boolean;
  confirmAppointment: (id: string) => Promise<void>;
  completeAppointment: (id: string) => Promise<void>;
  markNoShow: (id: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;
  reschedule: (id: string, newStart: string, newEnd: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useAppointmentActions({ onSuccess }: UseAppointmentActionsOptions): UseAppointmentActionsReturn {
  const [busy, setBusy] = useState(false);

  const runAction = useCallback(
    async (action: () => Promise<void>, successMsg: string, errorMsg: string) => {
      setBusy(true);
      try {
        await action();
        toast.success(successMsg);
        onSuccess();
      } catch (err) {
        const msg = err instanceof Error ? err.message : errorMsg;
        toast.error(msg);
      } finally {
        setBusy(false);
      }
    },
    [onSuccess]
  );

  const confirmAppointment = useCallback(
    (id: string) =>
      runAction(
        () => updateAppointmentStatus(id, 'confirmed' as AppointmentStatus),
        'Agendamento confirmado.',
        'Erro ao confirmar agendamento.'
      ),
    [runAction]
  );

  const completeAppointment = useCallback(
    (id: string) =>
      runAction(
        () => updateAppointmentStatus(id, 'completed' as AppointmentStatus),
        'Marcado como realizado.',
        'Erro ao marcar como realizado.'
      ),
    [runAction]
  );

  const markNoShow = useCallback(
    (id: string) =>
      runAction(
        () => updateAppointmentStatus(id, 'no_show' as AppointmentStatus),
        'Marcado como falta.',
        'Erro ao marcar falta.'
      ),
    [runAction]
  );

  const cancelAppointment = useCallback(
    (id: string) =>
      runAction(
        () => updateAppointmentStatus(id, 'cancelled' as AppointmentStatus),
        'Agendamento cancelado.',
        'Erro ao cancelar agendamento.'
      ),
    [runAction]
  );

  const reschedule = useCallback(
    (id: string, newStart: string, newEnd: string) =>
      runAction(
        () => rescheduleAppointment(id, newStart, newEnd),
        'Agendamento remarcado.',
        'Erro ao remarcar agendamento.'
      ),
    [runAction]
  );

  const remove = useCallback(
    (id: string) =>
      runAction(async () => {
        const result = await deleteAppointment(id);
        if (result.gcalFailed) {
          toast('Agendamento removido. Evento do Google Calendar não foi excluído.', { icon: '⚠️' });
        }
      }, 'Agendamento excluído.', 'Erro ao excluir agendamento.'),
    [runAction]
  );

  return { busy, confirmAppointment, completeAppointment, markNoShow, cancelAppointment, reschedule, remove };
}
