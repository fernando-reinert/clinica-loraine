// src/components/ConfirmDialog.tsx
// Modal de confirmação reutilizável com estilo do dashboard
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 overflow-x-hidden overflow-y-auto">
      <div className="glass-card p-6 border border-white/10 max-w-md w-full max-w-full min-w-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-3 mb-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              confirmVariant === 'danger' ? 'bg-red-500/20' : 'bg-cyan-500/20'
            }`}>
              <AlertTriangle 
                className={confirmVariant === 'danger' ? 'text-red-400' : 'text-cyan-400'} 
                size={24} 
              />
            </div>
            <h3 className="text-lg sm:text-xl font-bold glow-text whitespace-normal break-words min-w-0">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Fechar"
          >
            <X size={20} className="text-gray-300" />
          </button>
        </div>

        <p className="text-gray-300 mb-6 text-sm leading-relaxed whitespace-normal break-words min-w-0">
          {message}
        </p>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 min-w-0">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              confirmVariant === 'danger'
                ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200'
                : 'neon-button'
            }`}
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Processando...</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
