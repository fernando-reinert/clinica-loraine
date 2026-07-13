// src/components/financial/PaymentMethodSelect.tsx
// Dropdown customizado (substitui o <select> nativo, cujo popup não segue o tema escuro do app).
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface PaymentMethodOption {
  value: string;
  label: string;
}

export const DEFAULT_PAYMENT_METHOD_OPTIONS: PaymentMethodOption[] = [
  { value: 'pix', label: 'PIX' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'infinit_tag', label: 'Infinit Tag' },
  { value: 'bank_transfer', label: 'Transferência' },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  options?: PaymentMethodOption[];
  disabled?: boolean;
  className?: string;
}

export default function PaymentMethodSelect({
  value,
  onChange,
  options = DEFAULT_PAYMENT_METHOD_OPTIONS,
  disabled,
  className,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selected = options.find((o) => o.value === value) ?? options[0];

  return (
    <div className={`relative ${className ?? ''}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((v) => !v)}
        disabled={disabled}
        className="w-full flex items-center justify-between gap-2 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white hover:bg-white/15 focus:outline-none focus:border-cyan-400 disabled:opacity-50 transition-colors"
      >
        <span className="truncate">{selected?.label ?? 'Selecione'}</span>
        <ChevronDown size={14} className={`flex-shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 left-0 min-w-full w-max bg-slate-900 border border-white/10 rounded-lg shadow-xl overflow-hidden py-1">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${
                  isSelected ? 'bg-cyan-500/15 text-cyan-200' : 'text-gray-200 hover:bg-white/10'
                }`}
              >
                <span className="whitespace-nowrap">{opt.label}</span>
                {isSelected && <Check size={14} className="flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
