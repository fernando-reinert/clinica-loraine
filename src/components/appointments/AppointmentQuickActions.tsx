// src/components/appointments/AppointmentQuickActions.tsx
import React, { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, CheckCircle, XCircle, Clock, UserX, Edit, Trash2, Loader2 } from 'lucide-react';
import type { AppointmentStatus } from '../../types/db';

interface Action {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
}

interface Props {
  status: AppointmentStatus;
  busy?: boolean;
  onConfirm: () => void;
  onComplete: () => void;
  onMarkNoShow: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReschedule?: () => void;
}

export default function AppointmentQuickActions({
  status, busy,
  onConfirm, onComplete, onMarkNoShow, onCancel, onEdit, onDelete, onReschedule,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const actions: Action[] = [];

  if (status === 'scheduled') {
    actions.push({ label: 'Confirmar', icon: CheckCircle, onClick: onConfirm, variant: 'success' });
  }
  if (status === 'confirmed') {
    actions.push({ label: 'Marcar como realizado', icon: CheckCircle, onClick: onComplete, variant: 'success' });
    actions.push({ label: 'Marcar falta', icon: UserX, onClick: onMarkNoShow });
  }
  if (status !== 'completed' && status !== 'cancelled' && status !== 'no_show') {
    if (onReschedule) actions.push({ label: 'Remarcar', icon: Clock, onClick: onReschedule });
    actions.push({ label: 'Cancelar', icon: XCircle, onClick: onCancel, variant: 'danger' });
  }
  actions.push({ label: 'Editar', icon: Edit, onClick: onEdit });
  actions.push({ label: 'Excluir', icon: Trash2, onClick: onDelete, variant: 'danger' });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50 min-w-[32px] min-h-[32px] flex items-center justify-center"
        aria-label="Ações do agendamento"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MoreHorizontal className="w-4 h-4" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px]">
          {actions.map((action) => {
            const Icon = action.icon;
            const colorClass =
              action.variant === 'danger' ? 'text-red-400 hover:bg-red-500/10' :
              action.variant === 'success' ? 'text-green-400 hover:bg-green-500/10' :
              'text-slate-300 hover:bg-slate-700';
            return (
              <button
                key={action.label}
                type="button"
                onClick={() => { setOpen(false); action.onClick(); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${colorClass}`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
