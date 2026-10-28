// src/components/appointments/MobileDateStrip.tsx
// Faixa de datas (mobile): 7 dias ao redor de uma âncora, setas de semana e seletor de data.
// Permite chegar a qualquer dia (inclusive passado) para registrar atendimentos retroativos.
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface Props {
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const toInputValue = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export default function MobileDateStrip({ selectedDay, onSelectDay }: Props) {
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(selectedDay));

  const shiftWeek = (weeks: number) => {
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + weeks * 7));
  };

  const handlePickDate = (value: string) => {
    if (!value) return;
    const [y, m, d] = value.split('-').map(Number);
    if (!y || !m || !d) return;
    const picked = new Date(y, m - 1, d);
    setAnchor(picked);
    onSelectDay(picked);
  };

  const todayStr = new Date().toDateString();
  const arrowClass =
    'flex-shrink-0 w-9 h-11 flex items-center justify-center rounded-lg bg-slate-800 text-slate-400 active:bg-slate-700';

  return (
    <div className="md:hidden flex-shrink-0 px-4 py-2 border-b border-slate-800">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => shiftWeek(-1)} className={arrowClass} aria-label="Semana anterior">
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-none justify-between">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - 3 + i);
            const isSelected = d.toDateString() === selectedDay.toDateString();
            const isT = d.toDateString() === todayStr;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectDay(d)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[44px] transition-colors ${
                  isSelected ? 'bg-cyan-500 text-slate-900' : isT ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-500 bg-slate-800'
                }`}
              >
                <span className="text-[10px] font-medium uppercase">
                  {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                </span>
                <span className="text-sm font-bold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={() => shiftWeek(1)} className={arrowClass} aria-label="Próxima semana">
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Seletor nativo de data: o input transparente cobre o botão para abrir o picker do iOS */}
        <label className="relative flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-lg bg-slate-800 text-cyan-400 active:bg-slate-700">
          <CalendarDays className="w-5 h-5" />
          <input
            type="date"
            value={toInputValue(selectedDay)}
            onChange={(e) => handlePickDate(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0"
            aria-label="Ir para uma data"
          />
        </label>
      </div>
      <p className="mt-1 text-[11px] text-slate-500 text-center">
        {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}
