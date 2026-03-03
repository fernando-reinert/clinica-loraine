// src/components/ui/ConfirmModal.tsx
// Modal de confirmação genérico com estilo glass/neon da Clínica Áurea

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!loading) onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (loading) return;
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  const handleConfirm = async () => {
    await onConfirm();
  };

  const confirmClasses =
    variant === 'danger'
      ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-400/40 text-red-100'
      : 'neon-button';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={handleOverlayClick}
    >
      <div className="max-w-md w-full rounded-2xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl glass-card p-6 relative">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="absolute top-3 right-3 p-2 rounded-lg hover:bg-white/10 text-gray-300 disabled:opacity-50"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-gray-300 mb-6 whitespace-pre-line">{description}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-gray-200 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${confirmClasses}`}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Processando...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

