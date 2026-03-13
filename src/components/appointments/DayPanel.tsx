// src/components/appointments/DayPanel.tsx
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import AppointmentCard from './AppointmentCard';
import AppointmentEmptyState from './AppointmentEmptyState';
import AppointmentFiltersBar from './AppointmentFiltersBar';
import type { DayAppointment, AppointmentsPageFilters } from '../../hooks/useAppointmentsPage';
import type { UseAppointmentActionsReturn } from '../../hooks/useAppointmentActions';
import { isToday } from '../../utils/dateUtils';

interface Props {
  selectedDay: Date;
  appointments: DayAppointment[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  filters: AppointmentsPageFilters;
  onFiltersChange: (partial: Partial<AppointmentsPageFilters>) => void;
  actions: UseAppointmentActionsReturn;
  onEdit: (appt: DayAppointment) => void;
  onDeleteRequested: (appt: DayAppointment) => void;
  onNewAppointment: () => void;
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-3 bg-slate-800/60 rounded-lg px-3 py-3 border border-slate-700/30 animate-pulse">
      <div className="w-10 flex-shrink-0 space-y-1">
        <div className="h-2.5 bg-slate-700 rounded w-8 ml-auto" />
        <div className="h-2 bg-slate-700 rounded w-6 ml-auto" />
      </div>
      <div className="flex-1 space-y-1.5">
        <div className="h-3 bg-slate-700 rounded w-3/5" />
        <div className="h-2.5 bg-slate-700 rounded w-2/5" />
      </div>
      <div className="h-5 bg-slate-700 rounded-full w-16 flex-shrink-0" />
    </div>
  );
}

export default function DayPanel({
  selectedDay, appointments, loading, error, onRetry,
  filters, onFiltersChange, actions, onEdit, onDeleteRequested, onNewAppointment,
}: Props) {
  const dayLabel = isToday(selectedDay)
    ? 'Hoje'
    : selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const hasActiveFilters = filters.status !== 'all' || !!filters.patientSearch;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Day header */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <h2 className="text-sm font-semibold text-slate-200 capitalize">{dayLabel}</h2>
        {!loading && !error && (
          <p className="text-xs text-slate-500 mt-0.5">
            {appointments.length === 0
              ? 'Nenhum agendamento'
              : `${appointments.length} agendamento${appointments.length !== 1 ? 's' : ''}`}
          </p>
        )}
      </div>

      {/* Filters bar */}
      <div className="flex-shrink-0">
        <AppointmentFiltersBar filters={filters} onFiltersChange={onFiltersChange} />
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-sm text-slate-400">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Tentar novamente
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-2">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : appointments.length === 0 ? (
          <AppointmentEmptyState
            context={
              hasActiveFilters
                ? 'filter-no-results'
                : isToday(selectedDay)
                ? 'no-appointments-today'
                : 'past-day-empty'
            }
            onAction={!hasActiveFilters ? onNewAppointment : undefined}
          />
        ) : (
          <div className="space-y-2">
            {/* Note: onReschedule intentionally omitted — reschedule is handled via the edit drawer */}
            {appointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appointment={appt}
                busy={actions.busy}
                onConfirm={actions.confirmAppointment}
                onComplete={actions.completeAppointment}
                onMarkNoShow={actions.markNoShow}
                onCancel={actions.cancelAppointment}
                onEdit={onEdit}
                onDelete={(id) => {
                  const found = appointments.find((a) => a.id === id);
                  if (found) onDeleteRequested(found);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
