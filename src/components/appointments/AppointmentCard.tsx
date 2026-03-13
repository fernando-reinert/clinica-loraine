// src/components/appointments/AppointmentCard.tsx
import React from 'react';
import { getStatusConfig } from '../../constants/appointmentStatus';
import AppointmentStatusBadge from './AppointmentStatusBadge';
import AppointmentQuickActions from './AppointmentQuickActions';
import type { AppointmentStatus } from '../../types/db';
import type { DayAppointment } from '../../hooks/useAppointmentsPage';

// Helper: format ISO to "HH:MM"
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--:--';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Helper: compute duration in minutes between two ISO strings
function getDurationMin(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}

interface Props {
  appointment: DayAppointment;
  busy?: boolean;
  onConfirm: (id: string) => void;
  onComplete: (id: string) => void;
  onMarkNoShow: (id: string) => void;
  onCancel: (id: string) => void;
  onEdit: (appt: DayAppointment) => void;
  onDelete: (id: string) => void;
  onReschedule?: (appt: DayAppointment) => void;
}

export default function AppointmentCard({
  appointment, busy,
  onConfirm, onComplete, onMarkNoShow, onCancel, onEdit, onDelete, onReschedule,
}: Props) {
  const { id, status, start_time, end_time, patient_name, title } = appointment;
  const cfg = getStatusConfig(status);
  const startLabel = formatTime(start_time);
  const durationMin = end_time ? getDurationMin(start_time, end_time) : null;
  const isCompleted = status === 'completed';

  return (
    <div
      className={`
        group relative flex items-center gap-3
        bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50
        rounded-lg px-3 py-3 border-l-2 ${cfg.borderClass}
        transition-colors
        ${isCompleted ? 'opacity-60' : ''}
      `}
    >
      {/* Time column */}
      <div className="flex-shrink-0 text-right w-10">
        <p className="text-xs font-medium text-slate-300">{startLabel}</p>
        {durationMin != null && (
          <p className="text-[10px] text-slate-500">
            {durationMin < 60 ? `${durationMin}min` : `${Math.round(durationMin / 60)}h`}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate leading-tight">
          {patient_name || 'Paciente não informado'}
        </p>
        {title && (
          <p className="text-xs text-slate-500 truncate mt-0.5">{title}</p>
        )}
      </div>

      {/* Status badge (hidden on mobile — left border indicates status) */}
      <div className="hidden sm:block flex-shrink-0">
        <AppointmentStatusBadge status={status} variant="pill" />
      </div>

      {/* Quick actions */}
      <div className="flex-shrink-0">
        <AppointmentQuickActions
          appointmentId={id}
          status={status as AppointmentStatus}
          busy={busy}
          onConfirm={() => onConfirm(id)}
          onComplete={() => onComplete(id)}
          onMarkNoShow={() => onMarkNoShow(id)}
          onCancel={() => onCancel(id)}
          onEdit={() => onEdit(appointment)}
          onDelete={() => onDelete(id)}
          onReschedule={onReschedule ? () => onReschedule(appointment) : undefined}
        />
      </div>
    </div>
  );
}
