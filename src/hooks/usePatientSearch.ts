// src/hooks/usePatientSearch.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase/client';

export interface PatientSearchResult {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

const DEBOUNCE_MS = 280;
const MIN_CHARS = 2;

export interface UsePatientSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  results: PatientSearchResult[];
  searching: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  selected: PatientSearchResult | null;
  selectPatient: (patient: PatientSearchResult) => void;
  clearSelection: () => void;
  error: string | null;
}

export function usePatientSearch(initialPatient?: PatientSearchResult | null): UsePatientSearchReturn {
  const [query, setQueryState] = useState(initialPatient?.name ?? '');
  const [results, setResults] = useState<PatientSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<PatientSearchResult | null>(initialPatient ?? null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    if (q.length < MIN_CHARS) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (query.length < MIN_CHARS) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      debounceRef.current = null;
      setSearching(true);
      setError(null);
      try {
        const { data, error: sbErr } = await supabase
          .from('patients')
          .select('id, name, phone, email')
          .or(`name.ilike.%${query.trim()}%,phone.ilike.%${query.trim()}%`)
          .limit(15);
        if (sbErr) throw sbErr;
        setResults(data ?? []);
      } catch {
        setError('Erro ao buscar pacientes. Tente novamente.');
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const selectPatient = useCallback((patient: PatientSearchResult) => {
    setSelected(patient);
    setQueryState(patient.name);
    setIsOpen(false);
    setResults([]);
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(null);
    setQueryState('');
    setResults([]);
    setIsOpen(false);
  }, []);

  return { query, setQuery, results, searching, isOpen, setIsOpen, selected, selectPatient, clearSelection, error };
}
