// src/components/appointments/form/PatientSelector.tsx
import React, { useRef, useEffect } from 'react';
import { Search, X, User, Loader2 } from 'lucide-react';
import type { UsePatientSearchReturn } from '../../../hooks/usePatientSearch';

interface Props {
  patientSearch: UsePatientSearchReturn;
  disabled?: boolean;
  required?: boolean;
}

export default function PatientSelector({ patientSearch, disabled, required }: Props) {
  const { query, setQuery, results, searching, isOpen, setIsOpen, selected, selectPatient, clearSelection, error } = patientSearch;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  return (
    <div className="space-y-1.5">
      <p className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
        Paciente {required && <span className="text-red-400">*</span>}
      </p>

      <div className="relative" ref={containerRef}>
        {selected ? (
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <User className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-100 font-medium truncate">{selected.name}</p>
              <p className="text-xs text-slate-500 truncate">{selected.phone}</p>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={clearSelection}
                className="p-1 text-slate-500 hover:text-slate-300 rounded transition-colors"
                aria-label="Limpar seleção de paciente"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            {searching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 animate-spin" />
            )}
            <input
              id="patient-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => query.length >= 2 && setIsOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Escape') setIsOpen(false); }}
              placeholder="Buscar paciente por nome ou telefone..."
              disabled={disabled}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
            />
          </div>
        )}

        {/* Dropdown results */}
        {isOpen && !selected && (
          <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
            {error ? (
              <div className="px-3 py-3 text-xs text-red-400">{error}</div>
            ) : results.length === 0 && !searching ? (
              <div className="px-3 py-3 text-xs text-slate-500">
                {query.length < 2 ? 'Digite ao menos 2 caracteres...' : 'Nenhum paciente encontrado.'}
              </div>
            ) : (
              <ul className="max-h-52 overflow-y-auto divide-y divide-slate-700/50">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectPatient(p)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-700 transition-colors text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                        <User className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-100 truncate">{p.name}</p>
                        <p className="text-xs text-slate-500 truncate">{p.phone}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
