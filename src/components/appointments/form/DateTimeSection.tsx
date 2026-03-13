// src/components/appointments/form/DateTimeSection.tsx
import React from 'react';
import { DURATION_OPTIONS, RECURRENCE_OPTIONS, OCCURRENCE_COUNT_OPTIONS, OCCURRENCE_COUNT_MIN, OCCURRENCE_COUNT_MAX } from '../appointmentDrawerUtils';

interface Props {
  dateTime: string;
  onDateTimeChange: (v: string) => void;
  durationMinutes: number;
  onDurationChange: (v: number) => void;
  recurrenceValue: string;
  onRecurrenceChange: (v: string) => void;
  occurrenceCount: number;
  onOccurrenceCountChange: (v: number) => void;
  disabled?: boolean;
  isEditMode?: boolean;
}

export default function DateTimeSection({
  dateTime, onDateTimeChange,
  durationMinutes, onDurationChange,
  recurrenceValue, onRecurrenceChange,
  occurrenceCount, onOccurrenceCountChange,
  disabled, isEditMode,
}: Props) {
  return (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
        Data e horário
      </label>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="appt-datetime" className="block text-xs text-slate-500 mb-1">Data e hora</label>
          <input
            id="appt-datetime"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => onDateTimeChange(e.target.value)}
            disabled={disabled}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
          />
        </div>
        <div>
          <label htmlFor="appt-duration" className="block text-xs text-slate-500 mb-1">Duração</label>
          <select
            id="appt-duration"
            value={durationMinutes}
            onChange={(e) => onDurationChange(Number(e.target.value))}
            disabled={disabled}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {!isEditMode && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="appt-recurrence" className="block text-xs text-slate-500 mb-1">Repetir</label>
            <select
              id="appt-recurrence"
              value={recurrenceValue}
              onChange={(e) => onRecurrenceChange(e.target.value)}
              disabled={disabled}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
            >
              {RECURRENCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {recurrenceValue && (
            <div>
              <label htmlFor="appt-occurrences" className="block text-xs text-slate-500 mb-1">Quantas vezes</label>
              <select
                id="appt-occurrences"
                value={occurrenceCount}
                onChange={(e) => onOccurrenceCountChange(Number(e.target.value))}
                disabled={disabled}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
              >
                {OCCURRENCE_COUNT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
