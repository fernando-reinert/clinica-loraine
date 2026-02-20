// Opções de duração: 5, 10, ..., 55 min; 1h05 até 12h (incrementos de 5 min)
export const DURATION_OPTIONS: { value: number; label: string }[] = (() => {
  const list: { value: number; label: string }[] = [];
  for (let m = 5; m <= 55; m += 5) {
    list.push({ value: m, label: `${m} min` });
  }
  for (let h = 1; h <= 12; h++) {
    for (let m = 0; m < 60; m += 5) {
      const total = h * 60 + m;
      if (total <= 720) {
        const label = m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
        list.push({ value: total, label });
      }
    }
  }
  return list;
})();

// Recorrência: intervalo (dias / meses / anos). occurrenceCount vem do estado da UI.
export type RecurrenceInterval =
  | { kind: "days"; intervalDays: number }
  | { kind: "months"; intervalMonths: number }
  | { kind: "years"; intervalYears: number };

export const RECURRENCE_OPTIONS: { value: string; label: string; interval: RecurrenceInterval }[] = [
  { value: "", label: "Não repetir", interval: { kind: "days", intervalDays: 0 } },
  { value: "weekly-1", label: "Semanal (1 semana)", interval: { kind: "days", intervalDays: 7 } },
  { value: "weekly-2", label: "A cada 2 semanas", interval: { kind: "days", intervalDays: 14 } },
  { value: "weekly-3", label: "A cada 3 semanas", interval: { kind: "days", intervalDays: 21 } },
  { value: "weekly-4", label: "A cada 4 semanas", interval: { kind: "days", intervalDays: 28 } },
  { value: "days-15", label: "A cada 15 dias", interval: { kind: "days", intervalDays: 15 } },
  { value: "days-20", label: "A cada 20 dias", interval: { kind: "days", intervalDays: 20 } },
  { value: "days-25", label: "A cada 25 dias", interval: { kind: "days", intervalDays: 25 } },
  { value: "monthly-1", label: "Mensal (1 mês)", interval: { kind: "months", intervalMonths: 1 } },
  { value: "monthly-2", label: "A cada 2 meses", interval: { kind: "months", intervalMonths: 2 } },
  { value: "monthly-3", label: "A cada 3 meses", interval: { kind: "months", intervalMonths: 3 } },
  { value: "monthly-6", label: "A cada 6 meses", interval: { kind: "months", intervalMonths: 6 } },
  { value: "yearly-1", label: "Anual (1 ano)", interval: { kind: "years", intervalYears: 1 } },
];

export const OCCURRENCE_COUNT_MIN = 1;
export const OCCURRENCE_COUNT_MAX = 60;
export const OCCURRENCE_COUNT_DEFAULT = 10;

/** Opções para o select "Quantas consultas" (1..30 e 60). */
export const OCCURRENCE_COUNT_OPTIONS: { value: number; label: string }[] = (() => {
  const list: { value: number; label: string }[] = [];
  for (let i = 1; i <= 30; i++) {
    list.push({ value: i, label: String(i) });
  }
  list.push({ value: 60, label: "60" });
  return list;
})();

export function getRecurrenceInterval(value: string): RecurrenceInterval | null {
  const opt = RECURRENCE_OPTIONS.find((o) => o.value === value);
  if (!opt || !opt.value) return null;
  const { interval } = opt;
  if (interval.kind === "days" && interval.intervalDays === 0) return null;
  return interval;
}
