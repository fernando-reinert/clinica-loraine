// src/components/appointments/form/ProcedurePlanSection.tsx
import React, { useRef } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useProcedureCatalog } from '../../../hooks/useProcedureCatalog';
import AppointmentPlanEditor from '../../AppointmentPlanEditor';
import type { AppointmentPlanItem } from '../../../types/appointmentPlan';
import type { Procedure } from '../../../types/db';

interface Props {
  planItems: AppointmentPlanItem[];
  onPlanChange: (items: AppointmentPlanItem[]) => void;
  procedureSearch: string;
  onProcedureSearchChange: (v: string) => void;
  showProcedureDropdown: boolean;
  onShowProcedureDropdownChange: (v: boolean) => void;
  onSelectProcedure: (proc: Procedure) => void;
  disabled?: boolean;
}

export default function ProcedurePlanSection({
  planItems, onPlanChange,
  procedureSearch, onProcedureSearchChange,
  showProcedureDropdown, onShowProcedureDropdownChange,
  onSelectProcedure,
  disabled,
}: Props) {
  const { procedures, loading: proceduresLoading } = useProcedureCatalog();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filtered = procedureSearch.trim()
    ? procedures.filter(
        (p) =>
          p.name.toLowerCase().includes(procedureSearch.toLowerCase()) ||
          (p.category ?? '').toLowerCase().includes(procedureSearch.toLowerCase())
      )
    : procedures;

  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
        Procedimentos
      </label>

      {/* Procedure search */}
      <div className="relative" ref={dropdownRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
        {proceduresLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 animate-spin" />
        )}
        <input
          type="text"
          value={procedureSearch}
          onChange={(e) => {
            onProcedureSearchChange(e.target.value);
            onShowProcedureDropdownChange(true);
          }}
          onFocus={() => onShowProcedureDropdownChange(true)}
          placeholder="Buscar procedimento..."
          disabled={disabled || proceduresLoading}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
        />

        {showProcedureDropdown && filtered.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <ul className="max-h-48 overflow-y-auto divide-y divide-slate-700/50">
              {filtered.map((proc) => (
                <li key={proc.id}>
                  <button
                    type="button"
                    onClick={() => onSelectProcedure(proc)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700 transition-colors text-left"
                  >
                    <div>
                      <p className="text-sm text-slate-100">{proc.name}</p>
                      {proc.category && <p className="text-xs text-slate-500">{proc.category}</p>}
                    </div>
                    <span className="text-xs text-slate-400 ml-3 flex-shrink-0">
                      {proc.sale_price ? `R$ ${proc.sale_price.toFixed(2)}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Plan editor (existing component — do not replace) */}
      {planItems.length > 0 && (
        <AppointmentPlanEditor
          items={planItems}
          onChange={onPlanChange}
          readOnly={disabled}
        />
      )}
    </div>
  );
}
