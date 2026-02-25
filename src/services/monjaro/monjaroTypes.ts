// src/services/monjaro/monjaroTypes.ts

export type LedgerKind = 'in' | 'out';

export type PaymentMethod = 'cash' | 'pix' | 'card';

/** Entrada do ledger; usado também como DTO da listagem (listEntries retorna com note e patient_name). */
export interface MonjaroLedgerEntry {
  id: string;
  user_id: string;
  kind: LedgerKind;
  patient_id: string | null;
  /** Mantido por compatibilidade; preferir competence_date para entradas. */
  competence_month: string | null;
  /** Data real de competência (entradas). YYYY-MM-DD. */
  competence_date?: string | null;
  amount_cents: number;
  payment_method: PaymentMethod | null;
  note: string | null;
  occurred_at: string;
  created_at: string;
  /** Preenchido na listagem via join patients(name). */
  patient_name?: string | null;
}

export interface MonjaroSummary {
  totalInCents: number;
  totalOutCents: number;
  balanceCents: number;
}

export interface LedgerEntryInPayload {
  patient_id: string;
  /** Data real de competência. YYYY-MM-DD. */
  competence_date: string;
  amount_cents: number;
  payment_method: PaymentMethod;
  note?: string | null;
  occurred_at?: string; // optional, default now
}

export interface LedgerEntryOutPayload {
  amount_cents: number;
  note: string;
  occurred_at?: string;
}

export interface MonjaroListFilters {
  competenceMonth: string | null; // YYYY-MM or null = all
  kind: LedgerKind | 'all';
}

export interface PatientSearchResult {
  id: string;
  name: string;
}

/** Patch para edição de entrada (kind='in'). patient_id não editável. */
export interface UpdateLedgerInPatch {
  amount_cents?: number;
  payment_method?: PaymentMethod;
  note?: string | null;
  /** Data real de competência. YYYY-MM-DD. */
  competence_date?: string;
}

/** Patch para edição de saída (kind='out'). */
export interface UpdateLedgerOutPatch {
  amount_cents?: number;
  note?: string;
  occurred_at?: string; // ISO
}
