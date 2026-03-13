// src/components/appointments/AppointmentFiltersBar.tsx
import React from 'react';
import { Search, X } from 'lucide-react';
import { APPOINTMENT_STATUS_CONFIG } from '../../constants/appointmentStatus';
import type { AppointmentStatus } from '../../types/db';
import type { AppointmentsPageFilters } from '../../hooks/useAppointmentsPage';

interface Props {
  filters: AppointmentsPageFilters;
  onFiltersChange: (partial: Partial<AppointmentsPageFilters>) => void;
}

const STATUS_OPTIONS: { value: AppointmentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'scheduled', label: APPOINTMENT_STATUS_CONFIG.scheduled.label },
  { value: 'confirmed', label: APPOINTMENT_STATUS_CONFIG.confirmed.label },
  { value: 'completed', label: APPOINTMENT_STATUS_CONFIG.completed.label },
  { value: 'cancelled', label: APPOINTMENT_STATUS_CONFIG.cancelled.label },
  { value: 'no_show', label: APPOINTMENT_STATUS_CONFIG.no_show.label },
];

export default function AppointmentFiltersBar({ filters, onFiltersChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-slate-900/50">
      {/* Patient search */}
      <div className="relative flex-1 min-w-[160px] max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={filters.patientSearch}
          onChange={(e) => onFiltersChange({ patientSearch: e.target.value })}
          placeholder="Buscar paciente..."
          className="w-full bg-slate-800 border border-slate-700 rounded-md pl-7 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        {filters.patientSearch && (
          <button
            type="button"
            onClick={() => onFiltersChange({ patientSearch: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            aria-label="Limpar busca"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onFiltersChange({ status: opt.value })}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.status === opt.value
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
