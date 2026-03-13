// src/components/appointments/form/PaymentSection.tsx
import React from 'react';
import type { AppointmentPaymentInfo, AppointmentPlanItem } from '../../../types/appointmentPlan';
import { calculatePlanTotals } from '../../../types/appointmentPlan';

const PAYMENT_METHODS = [
  { value: 'pix', label: 'PIX' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'bank_transfer', label: 'Transferência' },
] as const;

interface Props {
  paymentInfo: AppointmentPaymentInfo;
  onPaymentChange: (info: AppointmentPaymentInfo) => void;
  planItems: AppointmentPlanItem[];
  disabled?: boolean;
}

export default function PaymentSection({ paymentInfo, onPaymentChange, planItems, disabled }: Props) {
  const totals = calculatePlanTotals(planItems);
  const installmentValue = paymentInfo.installments > 0
    ? totals.totalFinal / paymentInfo.installments
    : totals.totalFinal;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
          Pagamento
        </label>
        <span className="text-sm font-semibold text-cyan-400">
          Total: R$ {totals.totalFinal.toFixed(2)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Forma de pagamento</label>
          <select
            value={paymentInfo.payment_method}
            onChange={(e) =>
              onPaymentChange({ ...paymentInfo, payment_method: e.target.value as AppointmentPaymentInfo['payment_method'] })
            }
            disabled={disabled}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Parcelas</label>
          <input
            type="number"
            min={1}
            max={24}
            value={paymentInfo.installments}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 1 && v <= 24) onPaymentChange({ ...paymentInfo, installments: v });
            }}
            disabled={disabled}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Data do primeiro pagamento</label>
          <input
            type="date"
            value={paymentInfo.first_payment_date}
            onChange={(e) => onPaymentChange({ ...paymentInfo, first_payment_date: e.target.value })}
            disabled={disabled}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
          />
        </div>
        {paymentInfo.installments > 1 && (
          <div className="flex flex-col justify-end pb-0.5">
            <p className="text-xs text-slate-500">Valor por parcela</p>
            <p className="text-sm font-medium text-slate-300">R$ {installmentValue.toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
