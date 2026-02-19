// src/components/AppointmentPlanEditor.tsx
// Componente reutilizável para edição do Plano do Atendimento
// Usado tanto no Financeiro quanto no Agendamento

import React from 'react';
import { X } from 'lucide-react';
import type { AppointmentPlanItem, AppointmentPlanTotals } from '../types/appointmentPlan';
import { calculatePlanTotals, calculateItemProfit } from '../types/appointmentPlan';

export interface AppointmentPlanEditorProps {
  items: AppointmentPlanItem[];
  onChange: (items: AppointmentPlanItem[]) => void;
  title?: string;
  readOnly?: boolean;
  className?: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const AppointmentPlanEditor: React.FC<AppointmentPlanEditorProps> = ({
  items,
  onChange,
  title = 'Plano do Atendimento',
  readOnly = false,
  className = '',
}) => {
  const totals: AppointmentPlanTotals = calculatePlanTotals(items);

  const handleUpdateItem = (index: number, updates: Partial<AppointmentPlanItem>) => {
    if (readOnly) return;
    const updated = [...items];
    updated[index] = { ...updated[index], ...updates };
    if (process.env.NODE_ENV === 'development' && updated[0]) {
      console.debug('[PLAN_EDITOR] item after change', { cost_price: updated[0].cost_price, sale_price: updated[0].sale_price, final_price: updated[0].final_price });
    }
    onChange(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (readOnly) return;
    onChange(items.filter((_, i) => i !== index));
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <h4 className="font-semibold text-white">{title}</h4>
      
      {items.map((item, index) => {
        const itemProfit = calculateItemProfit(item);
        
        return (
          <div key={index} className="glass-card p-4 border border-cyan-500/30 bg-cyan-500/5">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h5 className="font-semibold text-white">{item.name}</h5>
                {item.category && <p className="text-xs text-gray-400">{item.category}</p>}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={16} className="text-red-400" />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">Quantidade</label>
                {readOnly ? (
                  <p className="text-sm font-semibold text-white">{item.quantity}</p>
                ) : (
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleUpdateItem(index, { quantity: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  />
                )}
              </div>
              
              <div>
                <label className="block text-xs text-gray-300 mb-1">Preço Final</label>
                {readOnly ? (
                  <p className="text-sm font-semibold text-white">{formatCurrency(item.final_price)}</p>
                ) : (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.final_price}
                    onChange={(e) => handleUpdateItem(index, { final_price: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  />
                )}
              </div>
              
              <div>
                <label className="block text-xs text-gray-300 mb-1">Desconto</label>
                {readOnly ? (
                  <p className="text-sm font-semibold text-white">{formatCurrency(item.discount)}</p>
                ) : (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.discount}
                    onChange={(e) => handleUpdateItem(index, { discount: Number(e.target.value) })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  />
                )}
              </div>
              
              <div>
                <label className="block text-xs text-gray-300 mb-1">Lucro</label>
                <p className="text-sm font-semibold text-green-400">{formatCurrency(itemProfit)}</p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Resumo do Atendimento */}
      <div className="glass-card p-4 border border-white/10 bg-white/5">
        <h4 className="font-semibold text-white mb-3">Resumo do Atendimento</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-300">Total Final</p>
            <p className="text-lg font-bold text-white">{formatCurrency(totals.totalFinal)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-300">Total Custo</p>
            <p className="text-lg font-bold text-gray-300">{formatCurrency(totals.totalCost)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-300">Total Lucro</p>
            <p className="text-lg font-bold text-green-400">{formatCurrency(totals.totalProfit)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-300">Margem</p>
            <p className="text-lg font-bold text-purple-400">{totals.margin.toFixed(1)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentPlanEditor;
