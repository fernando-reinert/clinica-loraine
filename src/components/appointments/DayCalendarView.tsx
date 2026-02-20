// src/components/appointments/DayCalendarView.tsx
// Visão de um dia no estilo agenda: coluna de horários + blocos de eventos.

import React from "react";
import { Clock } from "lucide-react";
import { formatTimeOnly } from "../../utils/dateUtils";

const HOUR_START = 7;
const HOUR_END = 20;
const SLOT_HEIGHT_PX = 52;
const MINUTES_PER_SLOT = 30;

export interface DayCalendarEvent {
  id: string;
  start_time: string;
  end_time?: string | null;
  patient_name: string;
  title: string;
  status?: string;
  budget?: number;
}

export interface DayCalendarViewProps {
  day: Date;
  appointments: DayCalendarEvent[];
  onSlotClick: (date: Date, hour: number, minute: number) => void;
  onEventClick: (appointment: DayCalendarEvent) => void;
  hourStart?: number;
  hourEnd?: number;
}

function parseMinutesFromMidnight(iso: string, day: Date): number {
  const d = new Date(iso);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  return (d.getTime() - dayStart.getTime()) / (60 * 1000);
}

export default function DayCalendarView({
  day,
  appointments,
  onSlotClick,
  onEventClick,
  hourStart = HOUR_START,
  hourEnd = HOUR_END,
}: DayCalendarViewProps) {
  const slots: { hour: number; minute: number }[] = [];
  for (let h = hourStart; h < hourEnd; h++) {
    slots.push({ hour: h, minute: 0 });
    if (MINUTES_PER_SLOT === 30) slots.push({ hour: h, minute: 30 });
  }
  const hourHeightPx = (60 / MINUTES_PER_SLOT) * SLOT_HEIGHT_PX;

  const getEventStyle = (startIso: string, endIso: string | null | undefined) => {
    const startMin = parseMinutesFromMidnight(startIso, day);
    const endMin = endIso
      ? parseMinutesFromMidnight(endIso, day)
      : startMin + 60;
    const fromTop = Math.max(0, startMin - hourStart * 60);
    const duration = Math.max(15, endMin - startMin);
    const topPx = (fromTop / 60) * hourHeightPx;
    const heightPx = Math.max(24, (duration / 60) * hourHeightPx);
    return { top: topPx, height: heightPx };
  };

  const dayEvents = appointments.filter((a) => {
    const d = new Date(a.start_time);
    return (
      d.getFullYear() === day.getFullYear() &&
      d.getMonth() === day.getMonth() &&
      d.getDate() === day.getDate()
    );
  });

  return (
    <div className="flex flex-col rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="flex border-b border-white/10 bg-white/5">
        <div
          className="flex-shrink-0 w-14 sm:w-16 py-2 flex items-center justify-center text-gray-400 text-xs font-medium"
          aria-hidden
        >
          <Clock size={14} />
        </div>
        <div className="flex-1 py-2 px-2 text-center text-sm font-medium text-gray-300">
          Horário
        </div>
      </div>
      <div className="flex flex-1 min-h-0 relative">
        <div className="flex flex-col flex-shrink-0 w-14 sm:w-16 border-r border-white/10">
          {Array.from({ length: hourEnd - hourStart }, (_, i) => hourStart + i).map((h) => (
            <div
              key={h}
              className="flex items-start justify-end pr-2 text-xs text-gray-500"
              style={{ height: hourHeightPx }}
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>
        <div
          className="flex-1 relative"
          style={{
            minHeight: (hourEnd - hourStart) * hourHeightPx,
          }}
        >
          {slots.map(({ hour, minute }) => (
            <button
              key={`${hour}-${minute}`}
              type="button"
              className="absolute left-0 right-0 w-full border-b border-white/5 hover:bg-cyan-500/10 focus:bg-cyan-500/15 focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-colors"
              style={{
                top: ((hour - hourStart) * 60 + minute) * (hourHeightPx / 60),
                height: SLOT_HEIGHT_PX,
              }}
              onClick={() => {
                const d = new Date(day);
                d.setHours(hour, minute, 0, 0);
                onSlotClick(d, hour, minute);
              }}
              aria-label={`Horário ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`}
            />
          ))}
          {dayEvents.map((ev) => {
            const style = getEventStyle(ev.start_time, ev.end_time ?? undefined);
            const statusClass =
              ev.status === "confirmed"
                ? "bg-cyan-500/25 border-cyan-400/40"
                : ev.status === "completed"
                ? "bg-green-500/20 border-green-400/30"
                : ev.status === "cancelled"
                ? "bg-gray-500/20 border-gray-400/30 opacity-70"
                : "bg-purple-500/20 border-purple-400/30";
            return (
              <button
                key={ev.id}
                type="button"
                className={`absolute left-1 right-1 rounded-xl border text-left px-2 py-1 overflow-hidden ${statusClass} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all`}
                style={{
                  top: style.top,
                  height: style.height,
                  minHeight: 28,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(ev);
                }}
              >
                <div className="text-xs font-semibold text-white truncate">
                  {ev.patient_name || ev.title || "Sem título"}
                </div>
                {(ev.title && ev.title !== ev.patient_name) && (
                  <div className="text-xs text-gray-300 truncate">{ev.title}</div>
                )}
                <div className="text-[10px] text-gray-400">
                  {formatTimeOnly(ev.start_time)}
                  {ev.end_time && ` – ${formatTimeOnly(ev.end_time)}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
