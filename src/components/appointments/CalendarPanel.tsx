// src/components/appointments/CalendarPanel.tsx
import React, { useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isToday } from '../../utils/dateUtils';

interface Props {
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
  allAppointments: { start_time: string }[]; // for dot indicators across month
}

const WEEKDAY_LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function CalendarPanel({ selectedDay, onSelectDay, allAppointments }: Props) {
  const [viewYear, setViewYear] = React.useState(selectedDay.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(selectedDay.getMonth());

  useEffect(() => {
    setViewYear(selectedDay.getFullYear());
    setViewMonth(selectedDay.getMonth());
  }, [selectedDay]);

  // Days with appointments this month (for dot indicators)
  const daysWithAppts = useMemo(() => {
    const set = new Set<number>();
    for (const a of allAppointments) {
      const d = new Date(a.start_time);
      if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        set.add(d.getDate());
      }
    }
    return set;
  }, [allAppointments, viewYear, viewMonth]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const todayDate = new Date();

  // Stats for the selected day
  const totalToday = useMemo(
    () => allAppointments.filter((a) => {
      const d = new Date(a.start_time);
      return (
        d.getFullYear() === selectedDay.getFullYear() &&
        d.getMonth() === selectedDay.getMonth() &&
        d.getDate() === selectedDay.getDate()
      );
    }).length,
    [allAppointments, selectedDay]
  );

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <div className="flex gap-1">
          <button type="button" onClick={prevMonth} className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors" aria-label="Mês anterior">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={nextMonth} className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors" aria-label="Próximo mês">
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_LABELS.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-slate-600 font-medium py-0.5">{d}</div>
        ))}

        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const date = new Date(viewYear, viewMonth, dayNum);
          const isSelected =
            selectedDay.getFullYear() === viewYear &&
            selectedDay.getMonth() === viewMonth &&
            selectedDay.getDate() === dayNum;
          const isTodayDate = isToday(date);
          const hasAppts = daysWithAppts.has(dayNum);

          return (
            <button
              key={dayNum}
              type="button"
              onClick={() => onSelectDay(date)}
              className={`
                relative flex flex-col items-center justify-center aspect-square rounded-md text-[11px] font-medium transition-colors
                ${isSelected
                  ? 'bg-cyan-500 text-slate-900 font-bold'
                  : isTodayDate
                  ? 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
                  : 'text-slate-500 hover:bg-slate-700 hover:text-slate-300'}
              `}
              aria-label={`${dayNum} de ${MONTH_NAMES[viewMonth]}`}
              aria-pressed={isSelected}
            >
              {dayNum}
              {hasAppts && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Day stats */}
      <div className="border-t border-slate-700/50 pt-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
          {isToday(selectedDay) ? 'Hoje' : selectedDay.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-800 rounded-md p-2.5">
            <p className="text-sm font-bold text-cyan-400">{totalToday}</p>
            <p className="text-[10px] text-slate-500">agendamento{totalToday !== 1 ? 's' : ''}</p>
          </div>
          <div className="bg-slate-800 rounded-md p-2.5">
            <button
              type="button"
              onClick={() => onSelectDay(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate()))}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors text-left"
            >
              Ir para hoje →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
