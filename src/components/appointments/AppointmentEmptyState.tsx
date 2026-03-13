// src/components/appointments/AppointmentEmptyState.tsx
import React from 'react';
import { Calendar, Search } from 'lucide-react';

interface Props {
  context: 'no-appointments-today' | 'filter-no-results' | 'past-day-empty';
  onAction?: () => void;
  actionLabel?: string;
}

const CONTENT = {
  'no-appointments-today': {
    icon: Calendar,
    title: 'Nenhum agendamento hoje',
    subtitle: 'Que tal criar o primeiro da lista?',
    showAction: true,
  },
  'filter-no-results': {
    icon: Search,
    title: 'Nenhum resultado',
    subtitle: 'Tente ajustar os filtros aplicados.',
    showAction: false,
  },
  'past-day-empty': {
    icon: Calendar,
    title: 'Nenhum agendamento neste dia',
    subtitle: '',
    showAction: false,
  },
} as const;

export default function AppointmentEmptyState({ context, onAction, actionLabel = 'Novo agendamento' }: Props) {
  const { icon: Icon, title, subtitle, showAction } = CONTENT[context];
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-slate-500" />
      </div>
      <p className="text-slate-300 text-sm font-medium mb-1">{title}</p>
      {subtitle && <p className="text-slate-500 text-xs mb-4">{subtitle}</p>}
      {showAction && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline-offset-2 hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
