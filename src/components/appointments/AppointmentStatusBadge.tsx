// src/components/appointments/AppointmentStatusBadge.tsx
import React from 'react';
import { getStatusConfig } from '../../constants/appointmentStatus';
import type { AppointmentStatus } from '../../types/db';

interface Props {
  status: AppointmentStatus | string;
  /** 'pill' = rounded badge (default), 'dot' = colored dot only, 'full' = dot + label */
  variant?: 'pill' | 'dot' | 'full';
  className?: string;
}

export default function AppointmentStatusBadge({ status, variant = 'pill', className = '' }: Props) {
  const cfg = getStatusConfig(status);

  if (variant === 'dot') {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${cfg.dotClass} ${className}`}
        title={cfg.label}
      />
    );
  }

  if (variant === 'full') {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
        <span className="text-slate-300 text-xs">{cfg.label}</span>
      </span>
    );
  }

  // pill (default)
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badgeClass} whitespace-nowrap ${className}`}
    >
      {cfg.label}
    </span>
  );
}
