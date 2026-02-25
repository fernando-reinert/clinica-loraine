// src/services/monjaro/monjaroService.ts - toda integração Supabase do Monjaro Ledger
import { supabase } from '../supabase/client';
import logger from '../../utils/logger';
import type {
  MonjaroLedgerEntry,
  MonjaroSummary,
  LedgerEntryInPayload,
  LedgerEntryOutPayload,
  MonjaroListFilters,
  PatientSearchResult,
  UpdateLedgerInPatch,
  UpdateLedgerOutPatch,
  LedgerKind,
} from './monjaroTypes';

const TABLE = 'monjaro_ledger';
const LIMIT_RECENT = 50;

/**
 * Busca pacientes por nome (para select de entradas). Limit 10, debounce no hook.
 */
export async function searchPatientsByName(
  userId: string,
  query: string,
  limit = 10
): Promise<PatientSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const { data, error } = await supabase
    .from('patients')
    .select('id, name')
    .ilike('name', `%${q}%`)
    .limit(limit)
    .order('name');

  if (error) {
    logger.error('[MONJARO] searchPatientsByName', error);
    throw error;
  }
  return (data ?? []) as PatientSearchResult[];
}

/**
 * Inserir entrada (kind='in'). RLS exige user_id = auth.uid(). Usa competence_date (data real).
 */
export async function insertEntryIn(
  userId: string,
  payload: LedgerEntryInPayload
): Promise<MonjaroLedgerEntry> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      kind: 'in',
      patient_id: payload.patient_id,
      competence_date: payload.competence_date,
      amount_cents: payload.amount_cents,
      payment_method: payload.payment_method,
      note: payload.note ?? null,
      occurred_at: payload.occurred_at ?? new Date().toISOString(),
    })
    .select('id, user_id, kind, patient_id, competence_month, competence_date, amount_cents, payment_method, note, occurred_at, created_at')
    .single();

  if (error) {
    logger.error('[MONJARO] insertEntryIn', error);
    throw error;
  }
  return data as MonjaroLedgerEntry;
}

/**
 * Inserir saída (kind='out'). RLS exige user_id = auth.uid().
 */
export async function insertEntryOut(
  userId: string,
  payload: LedgerEntryOutPayload
): Promise<MonjaroLedgerEntry> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      user_id: userId,
      kind: 'out',
      patient_id: null,
      competence_month: null,
      competence_date: null,
      payment_method: null,
      amount_cents: payload.amount_cents,
      note: payload.note,
      occurred_at: payload.occurred_at ?? new Date().toISOString(),
    })
    .select('id, user_id, kind, patient_id, competence_month, competence_date, amount_cents, payment_method, note, occurred_at, created_at')
    .single();

  if (error) {
    logger.error('[MONJARO] insertEntryOut', error);
    throw error;
  }
  return data as MonjaroLedgerEntry;
}

/**
 * Resumo: totais de entradas, saídas e saldo. Filtro opcional por mês (competence_date entre first/last day).
 */
export async function getSummary(
  userId: string,
  competenceMonth: string | null // YYYY-MM ou null = todos
): Promise<MonjaroSummary> {
  const range = competenceMonth ? getMonthRange(competenceMonth) : null;

  const inQuery = supabase
    .from(TABLE)
    .select('amount_cents', { count: 'exact', head: false })
    .eq('user_id', userId)
    .eq('kind', 'in');
  if (range) {
    inQuery.gte('competence_date', range.firstDay).lte('competence_date', range.lastDay);
  }
  const { data: inRows, error: inErr } = await inQuery;

  if (inErr) {
    logger.error('[MONJARO] getSummary in', inErr);
    throw inErr;
  }

  const outQuery = supabase
    .from(TABLE)
    .select('amount_cents', { count: 'exact', head: false })
    .eq('user_id', userId)
    .eq('kind', 'out');
  if (range) {
    outQuery.gte('occurred_at', range.firstDayTs).lt('occurred_at', range.nextMonthTs);
  }
  const { data: outRows, error: outErr } = await outQuery;

  if (outErr) {
    logger.error('[MONJARO] getSummary out', outErr);
    throw outErr;
  }

  const totalInCents = (inRows ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const totalOutCents = (outRows ?? []).reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  return {
    totalInCents,
    totalOutCents,
    balanceCents: totalInCents - totalOutCents,
  };
}

function nextMonth(ymd: string): string {
  const [y, m] = ymd.split('-').map(Number);
  const next = m === 12 ? [y + 1, 1] : [y, m + 1];
  return `${next[0]}-${String(next[1]).padStart(2, '0')}-01T00:00:00.000Z`;
}

/** Dado YYYY-MM retorna firstDay e lastDay (YYYY-MM-DD) e timestamps para occurred_at. */
function getMonthRange(ym: string): { firstDay: string; lastDay: string; firstDayTs: string; nextMonthTs: string } {
  const [y, m] = ym.split('-').map(Number);
  const firstDay = `${ym}-01`;
  const lastDayNum = new Date(y, m, 0).getDate();
  const lastDay = `${ym}-${String(lastDayNum).padStart(2, '0')}`;
  const nextMonthTs = nextMonth(firstDay);
  return { firstDay, lastDay, firstDayTs: `${firstDay}T00:00:00.000Z`, nextMonthTs };
}

/**
 * Totais gerais (todos os meses). Reutiliza getSummary com month = null.
 */
export async function getTotalsOverall(userId: string): Promise<MonjaroSummary> {
  return getSummary(userId, null);
}

/**
 * Atualizar lançamento. RLS exige user_id = auth.uid().
 * Entrada (kind='in'): amount_cents, payment_method, note, competence_month (patient_id não editável).
 * Saída (kind='out'): amount_cents, note, occurred_at.
 */
export async function updateLedgerEntry(
  userId: string,
  entryId: string,
  kind: LedgerKind,
  patch: UpdateLedgerInPatch | UpdateLedgerOutPatch
): Promise<MonjaroLedgerEntry> {
  const payload: Record<string, unknown> = {};
  if (kind === 'in') {
    const p = patch as UpdateLedgerInPatch;
    if (p.amount_cents !== undefined) payload.amount_cents = p.amount_cents;
    if (p.payment_method !== undefined) payload.payment_method = p.payment_method;
    if (p.note !== undefined) payload.note = p.note;
    if (p.competence_date !== undefined) payload.competence_date = p.competence_date;
  } else {
    const p = patch as UpdateLedgerOutPatch;
    if (p.amount_cents !== undefined) payload.amount_cents = p.amount_cents;
    if (p.note !== undefined) payload.note = p.note;
    if (p.occurred_at !== undefined) payload.occurred_at = p.occurred_at;
  }
  if (Object.keys(payload).length === 0) {
    const { data } = await supabase
      .from(TABLE)
      .select('id, user_id, kind, patient_id, competence_month, competence_date, amount_cents, payment_method, note, occurred_at, created_at')
      .eq('id', entryId)
      .eq('user_id', userId)
      .single();
    if (!data) throw new Error('Lançamento não encontrado');
    return data as MonjaroLedgerEntry;
  }
  const { data, error } = await supabase
    .from(TABLE)
    .update(payload)
    .eq('id', entryId)
    .eq('user_id', userId)
    .select('id, user_id, kind, patient_id, competence_month, competence_date, amount_cents, payment_method, note, occurred_at, created_at')
    .single();

  if (error) {
    logger.error('[MONJARO] updateLedgerEntry', error);
    throw error;
  }
  return data as MonjaroLedgerEntry;
}

/**
 * Listagem de lançamentos recentes (até 50). Filtros: mês e tipo (all/in/out). Ordenação occurred_at desc.
 * Para 'in' filtra por competence_date entre first/last day do mês; para 'out' por occurred_at no intervalo.
 */
export async function listEntries(
  userId: string,
  filters: MonjaroListFilters
): Promise<MonjaroLedgerEntry[]> {
  const range = filters.competenceMonth ? getMonthRange(filters.competenceMonth) : null;

  /* Campos explícitos para listagem: note, competence_date + patients(name) para patient_name */
  const selectCols = `
    id, user_id, kind, patient_id, competence_month, competence_date, amount_cents, payment_method, note, occurred_at, created_at,
    patients(name)
  `;

  if (filters.kind === 'all' && range) {
    const [inRes, outRes] = await Promise.all([
      supabase
        .from(TABLE)
        .select(selectCols)
        .eq('user_id', userId)
        .eq('kind', 'in')
        .gte('competence_date', range.firstDay)
        .lte('competence_date', range.lastDay)
        .order('occurred_at', { ascending: false })
        .limit(LIMIT_RECENT),
      supabase
        .from(TABLE)
        .select(selectCols)
        .eq('user_id', userId)
        .eq('kind', 'out')
        .gte('occurred_at', range.firstDayTs)
        .lt('occurred_at', range.nextMonthTs)
        .order('occurred_at', { ascending: false })
        .limit(LIMIT_RECENT),
    ]);
    if (inRes.error) {
      logger.error('[MONJARO] listEntries in', inRes.error);
      throw inRes.error;
    }
    if (outRes.error) {
      logger.error('[MONJARO] listEntries out', outRes.error);
      throw outRes.error;
    }
    const inRows = (inRes.data ?? []) as (MonjaroLedgerEntry & { patients: { name: string } | null })[];
    const outRows = (outRes.data ?? []) as (MonjaroLedgerEntry & { patients: { name: string } | null })[];
    const merged = [...inRows, ...outRows]
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
      .slice(0, LIMIT_RECENT);
    return merged.map((r) => ({
      ...r,
      patient_name: r.patients?.name ?? null,
      patients: undefined,
    })) as MonjaroLedgerEntry[];
  }

  let query = supabase
    .from(TABLE)
    .select(selectCols)
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false })
    .limit(LIMIT_RECENT);

  if (filters.kind !== 'all') {
    query = query.eq('kind', filters.kind);
  }
  if (range) {
    if (filters.kind === 'in') {
      query = query.gte('competence_date', range.firstDay).lte('competence_date', range.lastDay);
    } else if (filters.kind === 'out') {
      query = query.gte('occurred_at', range.firstDayTs).lt('occurred_at', range.nextMonthTs);
    }
  }

  const { data, error } = await query;

  if (error) {
    logger.error('[MONJARO] listEntries', error);
    throw error;
  }

  const rows = (data ?? []) as (MonjaroLedgerEntry & { patients: { name: string } | null })[];
  return rows.map((r) => ({
    ...r,
    patient_name: r.patients?.name ?? null,
    patients: undefined,
  })) as MonjaroLedgerEntry[];
}
