// Professional appointment status: visual mapping (badge, border, background)
// Internal-only; no patient-side confirmation.

import type { AppointmentStatus } from '../types/db';

export interface AppointmentStatusConfig {
  label: string;
  /** Tailwind: text + border + optional bg (e.g. badge) */
  badgeClass: string;
  /** Tailwind: left border accent on card */
  borderClass: string;
  /** Tailwind: subtle background tint (low opacity) */
  bgTintClass: string;
}

export const APPOINTMENT_STATUS_CONFIG: Record<AppointmentStatus, AppointmentStatusConfig> = {
  scheduled: {
    label: 'Agendado',
    badgeClass: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
    borderClass: 'border-l-blue-400',
    bgTintClass: 'bg-blue-500/5',
  },
  confirmed: {
    label: 'Confirmado',
    badgeClass: 'bg-green-500/20 text-green-200 border-green-400/30',
    borderClass: 'border-l-green-400',
    bgTintClass: 'bg-green-500/5',
  },
  completed: {
    label: 'Concluído',
    badgeClass: 'bg-purple-500/20 text-purple-200 border-purple-400/30',
    borderClass: 'border-l-purple-400',
    bgTintClass: 'bg-purple-500/5',
  },
  cancelled: {
    label: 'Cancelado',
    badgeClass: 'bg-red-500/20 text-red-200 border-red-400/30',
    borderClass: 'border-l-red-400',
    bgTintClass: 'bg-red-500/5',
  },
  no_show: {
    label: 'Falta',
    badgeClass: 'bg-orange-500/20 text-orange-200 border-orange-400/30',
    borderClass: 'border-l-orange-400',
    bgTintClass: 'bg-orange-500/5',
  },
  rescheduled: {
    label: 'Remarcado',
    badgeClass: 'bg-yellow-500/20 text-yellow-200 border-yellow-400/30',
    borderClass: 'border-l-yellow-400',
    bgTintClass: 'bg-yellow-500/5',
  },
};

export function getStatusConfig(status: string | undefined): AppointmentStatusConfig {
  const s = status as AppointmentStatus | undefined;
  if (s && s in APPOINTMENT_STATUS_CONFIG) {
    return APPOINTMENT_STATUS_CONFIG[s];
  }
  return APPOINTMENT_STATUS_CONFIG.scheduled;
}
