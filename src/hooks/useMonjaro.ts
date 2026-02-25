// src/hooks/useMonjaro.ts - orquestra estado e chama monjaroService (sem Supabase direto)
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as monjaroService from '../services/monjaro/monjaroService';
import type {
  MonjaroSummary,
  MonjaroLedgerEntry,
  MonjaroListFilters,
  PaymentMethod,
  PatientSearchResult,
  LedgerKind,
  UpdateLedgerInPatch,
  UpdateLedgerOutPatch,
} from '../services/monjaro/monjaroTypes';

const DEBOUNCE_MS = 300;

export function useMonjaro() {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [summary, setSummary] = useState<MonjaroSummary>({
    totalInCents: 0,
    totalOutCents: 0,
    balanceCents: 0,
  });
  const [overallSummary, setOverallSummary] = useState<MonjaroSummary>({
    totalInCents: 0,
    totalOutCents: 0,
    balanceCents: 0,
  });
  const [summaryMonth, setSummaryMonth] = useState<string | null>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }); // YYYY-MM ou null (default: mês atual)
  const [entries, setEntries] = useState<MonjaroLedgerEntry[]>([]);
  const [listFilters, setListFilters] = useState<MonjaroListFilters>({
    competenceMonth: null,
    kind: 'all',
  });

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingOverallSummary, setLoadingOverallSummary] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<PatientSearchResult[]>([]);
  const [loadingPatientSearch, setLoadingPatientSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSummary = useCallback(async () => {
    if (!userId) return;
    setLoadingSummary(true);
    try {
      const data = await monjaroService.getSummary(userId, summaryMonth);
      setSummary(data);
    } catch {
      setSummary({ totalInCents: 0, totalOutCents: 0, balanceCents: 0 });
    } finally {
      setLoadingSummary(false);
    }
  }, [userId, summaryMonth]);

  const loadSummaryOverall = useCallback(async () => {
    if (!userId) return;
    setLoadingOverallSummary(true);
    try {
      const data = await monjaroService.getTotalsOverall(userId);
      setOverallSummary(data);
    } catch {
      setOverallSummary({ totalInCents: 0, totalOutCents: 0, balanceCents: 0 });
    } finally {
      setLoadingOverallSummary(false);
    }
  }, [userId]);

  const loadList = useCallback(async () => {
    if (!userId) return;
    setLoadingList(true);
    try {
      const data = await monjaroService.listEntries(userId, listFilters);
      setEntries(data);
    } catch {
      setEntries([]);
    } finally {
      setLoadingList(false);
    }
  }, [userId, listFilters.competenceMonth, listFilters.kind]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadSummaryOverall();
  }, [loadSummaryOverall]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // Busca de pacientes com debounce 300ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = patientSearchQuery.trim();
    if (!q) {
      setPatientSearchResults([]);
      setLoadingPatientSearch(false);
      return;
    }
    setLoadingPatientSearch(true);
    debounceRef.current = setTimeout(async () => {
      try {
        if (!userId) {
          setPatientSearchResults([]);
          return;
        }
        const results = await monjaroService.searchPatientsByName(userId, q, 10);
        setPatientSearchResults(results);
      } catch {
        setPatientSearchResults([]);
      } finally {
        setLoadingPatientSearch(false);
      }
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [patientSearchQuery, userId]);

  const submitEntryIn = useCallback(
    async (payload: {
      patient_id: string;
      competence_date: string; // YYYY-MM-DD
      amount_cents: number;
      payment_method: PaymentMethod;
      note?: string | null;
    }) => {
      if (!userId) throw new Error('Usuário não autenticado');
      setSubmitting(true);
      try {
        await monjaroService.insertEntryIn(userId, payload);
        await Promise.all([loadSummary(), loadSummaryOverall(), loadList()]);
      } finally {
        setSubmitting(false);
      }
    },
    [userId, loadSummary, loadSummaryOverall, loadList]
  );

  const submitEntryOut = useCallback(
    async (payload: { amount_cents: number; note: string }) => {
      if (!userId) throw new Error('Usuário não autenticado');
      setSubmitting(true);
      try {
        await monjaroService.insertEntryOut(userId, payload);
        await Promise.all([loadSummary(), loadSummaryOverall(), loadList()]);
      } finally {
        setSubmitting(false);
      }
    },
    [userId, loadSummary, loadSummaryOverall, loadList]
  );

  const editEntry = useCallback(
    async (entryId: string, kind: LedgerKind, patch: UpdateLedgerInPatch | UpdateLedgerOutPatch) => {
      if (!userId) throw new Error('Usuário não autenticado');
      setSubmitting(true);
      try {
        await monjaroService.updateLedgerEntry(userId, entryId, kind, patch);
        await Promise.all([loadSummary(), loadSummaryOverall(), loadList()]);
      } finally {
        setSubmitting(false);
      }
    },
    [userId, loadSummary, loadSummaryOverall, loadList]
  );

  return {
    summary,
    overallSummary,
    summaryMonth,
    setSummaryMonth,
    entries,
    listFilters,
    setListFilters,
    loadingSummary,
    loadingOverallSummary,
    loadingList,
    submitting,
    patientSearchQuery,
    setPatientSearchQuery,
    patientSearchResults,
    loadingPatientSearch,
    submitEntryIn,
    submitEntryOut,
    editEntry,
    refetchSummary: loadSummary,
    refetchSummaryOverall: loadSummaryOverall,
    refetchList: loadList,
  };
}
