# Appointments Module Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the /appointments module into an enterprise SaaS-grade product with clean component architecture, proper state management, full responsive design, and production-quality UX — without changing any backend contracts.

**Architecture:** Structural Refactor approach — service layer untouched, UI layer decomposed into focused components, state extracted into purpose-built hooks. Three new layers: Panels (layout blocks), Cards/Atoms (rendering), Form Sections (independent form pieces).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, MUI v5, Lucide React, react-hot-toast, Supabase client, React Router v6

**Spec:** `docs/superpowers/specs/2026-03-13-appointments-redesign-design.md`

---

## Key Context (read before starting)

### Auth & Supabase pattern
```typescript
import { useAuth } from '../../contexts/AuthContext';        // → { user }
import { supabase } from '../../services/supabase/client'; // direct client
```

### Service methods (DO NOT MODIFY)
```typescript
import {
  listAppointmentsByDay,           // (day: Date) → Promise<any[]>
  listAppointmentsWithProcedures,  // (daysBefore?, daysAfter?) → Promise<AppointmentWithProcedures[]>
  updateAppointmentStatus,         // (id, status: AppointmentStatus) → Promise<void>
  rescheduleAppointment,           // (id, newStart: string, newEnd: string) → Promise<void>
  deleteAppointment,               // (id) → Promise<{ gcalFailed?: boolean }>
  createAppointmentWithProcedures, // (payload: CreateAppointmentPayload) → Promise<{ id }>
  updateAppointmentWithProcedures, // (id, payload) → Promise<void>
  createRecurringAppointments,
  getAppointmentHistory,
} from '../../services/appointments/appointmentService';
```

### Status system (single source of truth)
```typescript
import { getStatusConfig, APPOINTMENT_STATUS_CONFIG } from '../../constants/appointmentStatus';
// Returns: { label, badgeClass, borderClass, bgTintClass }
```

### Key types
```typescript
import type { AppointmentStatus } from '../../types/db';
import type { AppointmentPlanItem, AppointmentPaymentInfo } from '../../types/appointmentPlan';
import type { AppointmentWithProcedures } from '../../services/appointments/appointmentService';
```

### Drawer interface (preserve for screen compatibility)
```typescript
// Keep this interface in AppointmentDrawer.tsx — AppointmentsScreen imports it
export interface DrawerAppointment {
  id: string;
  patient_name: string;
  patient_phone: string;
  patient_id?: string | null;
  start_time: string;
  end_time?: string | null;
  title: string;
  description?: string | null;
  status?: string;
  budget?: number;
  gcal_event_id?: string | null;
}
```

---

## Chunk 1: Foundation — Utilities + Atomic Components

### Task 1: Add `toDatetimeLocal` to dateUtils + create AppointmentStatusBadge + AppointmentEmptyState

**Files:**
- Modify: `src/utils/dateUtils.ts` (add export at bottom)
- Create: `src/components/appointments/AppointmentStatusBadge.tsx`
- Create: `src/components/appointments/AppointmentEmptyState.tsx`

---

- [ ] **Step 1.1: Add `toDatetimeLocal` to `src/utils/dateUtils.ts`**

  Add this export at the end of the file (it currently exists as a private function inside `AppointmentDrawer.tsx` — we're promoting it to shared utility):

  ```typescript
  /**
   * Converts an ISO string to the value format required by <input type="datetime-local">
   * Format: "YYYY-MM-DDTHH:MM"
   */
  export function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${day}T${h}:${min}`;
  }
  ```

- [ ] **Step 1.2: Create `src/components/appointments/AppointmentStatusBadge.tsx`**

  ```typescript
  // src/components/appointments/AppointmentStatusBadge.tsx
  import React from 'react';
  import { getStatusConfig } from '../../constants/appointmentStatus';
  import type { AppointmentStatus } from '../../types/db';

  interface Props {
    status: AppointmentStatus | string;
    /** 'pill' = rounded badge (default), 'dot' = colored dot only, 'full' = dot + label */
    variant?: 'pill' | 'dot' | 'full';
    className?: string;
  }

  export default function AppointmentStatusBadge({ status, variant = 'pill', className = '' }: Props) {
    const cfg = getStatusConfig(status);

    if (variant === 'dot') {
      return (
        <span
          className={`inline-block w-2 h-2 rounded-full ${cfg.borderClass.replace('border-l-', 'bg-')} ${className}`}
          title={cfg.label}
        />
      );
    }

    if (variant === 'full') {
      return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.borderClass.replace('border-l-', 'bg-')}`} />
          <span className="text-slate-300 text-xs">{cfg.label}</span>
        </span>
      );
    }

    // pill (default)
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.badgeClass} whitespace-nowrap ${className}`}
      >
        {cfg.label}
      </span>
    );
  }
  ```

- [ ] **Step 1.3: Create `src/components/appointments/AppointmentEmptyState.tsx`**

  ```typescript
  // src/components/appointments/AppointmentEmptyState.tsx
  import React from 'react';
  import { Calendar, Search } from 'lucide-react';

  interface Props {
    context: 'no-appointments-today' | 'filter-no-results' | 'past-day-empty';
    onAction?: () => void;
    actionLabel?: string;
  }

  const CONTENT = {
    'no-appointments-today': {
      icon: Calendar,
      title: 'Nenhum agendamento hoje',
      subtitle: 'Que tal criar o primeiro da lista?',
      showAction: true,
    },
    'filter-no-results': {
      icon: Search,
      title: 'Nenhum resultado',
      subtitle: 'Tente ajustar os filtros aplicados.',
      showAction: false,
    },
    'past-day-empty': {
      icon: Calendar,
      title: 'Nenhum agendamento neste dia',
      subtitle: '',
      showAction: false,
    },
  } as const;

  export default function AppointmentEmptyState({ context, onAction, actionLabel = 'Novo agendamento' }: Props) {
    const { icon: Icon, title, subtitle, showAction } = CONTENT[context];
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-slate-500" />
        </div>
        <p className="text-slate-300 text-sm font-medium mb-1">{title}</p>
        {subtitle && <p className="text-slate-500 text-xs mb-4">{subtitle}</p>}
        {showAction && onAction && (
          <button
            onClick={onAction}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors underline-offset-2 hover:underline"
          >
            {actionLabel}
          </button>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 1.4: Commit**

  ```bash
  git add src/utils/dateUtils.ts src/components/appointments/AppointmentStatusBadge.tsx src/components/appointments/AppointmentEmptyState.tsx
  git commit -m "feat(appointments): add toDatetimeLocal util + StatusBadge + EmptyState atoms"
  ```

---

### Task 2: Create `usePatientSearch` and `useAppointmentActions` hooks

**Files:**
- Create: `src/hooks/usePatientSearch.ts`
- Create: `src/hooks/useAppointmentActions.ts`

---

- [ ] **Step 2.1: Create `src/hooks/usePatientSearch.ts`**

  Extracts the debounced patient search logic currently duplicated in `AppointmentDrawer.tsx` and `AppointmentCreateScreen.tsx`.

  ```typescript
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
  ```

- [ ] **Step 2.2: Create `src/hooks/useAppointmentActions.ts`**

  Centralizes status mutations, delete, and reschedule — all currently scattered inline in `AppointmentsScreen.tsx`.

  ```typescript
  // src/hooks/useAppointmentActions.ts
  import { useState, useCallback } from 'react';
  import toast from 'react-hot-toast';
  import {
    updateAppointmentStatus,
    deleteAppointment,
    rescheduleAppointment,
  } from '../services/appointments/appointmentService';
  import type { AppointmentStatus } from '../types/db';

  interface UseAppointmentActionsOptions {
    onSuccess: () => void; // called after any successful mutation to trigger list refresh
  }

  export interface UseAppointmentActionsReturn {
    busy: boolean;
    confirmAppointment: (id: string) => Promise<void>;
    completeAppointment: (id: string) => Promise<void>;
    markNoShow: (id: string) => Promise<void>;
    cancelAppointment: (id: string) => Promise<void>;
    reschedule: (id: string, newStart: string, newEnd: string) => Promise<void>;
    remove: (id: string) => Promise<void>;
  }

  export function useAppointmentActions({ onSuccess }: UseAppointmentActionsOptions): UseAppointmentActionsReturn {
    const [busy, setBusy] = useState(false);

    const runAction = useCallback(
      async (action: () => Promise<void>, successMsg: string, errorMsg: string) => {
        setBusy(true);
        try {
          await action();
          toast.success(successMsg);
          onSuccess();
        } catch (err) {
          const msg = err instanceof Error ? err.message : errorMsg;
          toast.error(msg);
        } finally {
          setBusy(false);
        }
      },
      [onSuccess]
    );

    const confirmAppointment = useCallback(
      (id: string) =>
        runAction(
          () => updateAppointmentStatus(id, 'confirmed' as AppointmentStatus),
          'Agendamento confirmado.',
          'Erro ao confirmar agendamento.'
        ),
      [runAction]
    );

    const completeAppointment = useCallback(
      (id: string) =>
        runAction(
          () => updateAppointmentStatus(id, 'completed' as AppointmentStatus),
          'Marcado como realizado.',
          'Erro ao marcar como realizado.'
        ),
      [runAction]
    );

    const markNoShow = useCallback(
      (id: string) =>
        runAction(
          () => updateAppointmentStatus(id, 'no_show' as AppointmentStatus),
          'Marcado como falta.',
          'Erro ao marcar falta.'
        ),
      [runAction]
    );

    const cancelAppointment = useCallback(
      (id: string) =>
        runAction(
          () => updateAppointmentStatus(id, 'cancelled' as AppointmentStatus),
          'Agendamento cancelado.',
          'Erro ao cancelar agendamento.'
        ),
      [runAction]
    );

    const reschedule = useCallback(
      (id: string, newStart: string, newEnd: string) =>
        runAction(
          () => rescheduleAppointment(id, newStart, newEnd),
          'Agendamento remarcado.',
          'Erro ao remarcar agendamento.'
        ),
      [runAction]
    );

    const remove = useCallback(
      (id: string) =>
        runAction(async () => {
          const result = await deleteAppointment(id);
          if (result.gcalFailed) {
            toast('Agendamento removido. Evento do Google Calendar não foi excluído.', { icon: '⚠️' });
          }
        }, 'Agendamento excluído.', 'Erro ao excluir agendamento.'),
      [runAction]
    );

    return { busy, confirmAppointment, completeAppointment, markNoShow, cancelAppointment, reschedule, remove };
  }
  ```

- [ ] **Step 2.3: Commit**

  ```bash
  git add src/hooks/usePatientSearch.ts src/hooks/useAppointmentActions.ts
  git commit -m "feat(appointments): add usePatientSearch and useAppointmentActions hooks"
  ```

---

### Task 3: Create `useAppointmentsPage` hook

**Files:**
- Create: `src/hooks/useAppointmentsPage.ts`

---

- [ ] **Step 3.1: Create `src/hooks/useAppointmentsPage.ts`**

  This replaces the 19 inline `useState` calls and two `loadXxx` functions in `AppointmentsScreen.tsx`. **Critical:** adds the missing `professional_id` filter for tenant safety (defense-in-depth alongside RLS).

  ```typescript
  // src/hooks/useAppointmentsPage.ts
  import { useState, useEffect, useCallback, useRef } from 'react';
  import { useAuth } from '../contexts/AuthContext';
  import {
    listAppointmentsByDay,
    listAppointmentsWithProcedures,
  } from '../services/appointments/appointmentService';
  import type { AppointmentWithProcedures } from '../services/appointments/appointmentService';
  import type { AppointmentStatus } from '../types/db';

  export interface DayAppointment {
    id: string;
    patient_name: string;
    patient_phone: string;
    patient_id?: string | null;
    title: string;
    start_time: string;
    end_time?: string | null;
    status: AppointmentStatus;
    budget?: number;
    gcal_event_id?: string | null;
    description?: string | null;
  }

  export interface AppointmentsPageFilters {
    status: AppointmentStatus | 'all';
    patientSearch: string;
    view: 'calendar' | 'list';
  }

  export interface UseAppointmentsPageReturn {
    // Day view
    selectedDay: Date;
    setSelectedDay: (day: Date) => void;
    dayAppointments: DayAppointment[];
    dayLoading: boolean;
    dayError: string | null;
    retryDay: () => void;

    // List / history view
    appointments: AppointmentWithProcedures[];
    listLoading: boolean;
    listError: string | null;
    retryList: () => void;

    // Filters
    filters: AppointmentsPageFilters;
    setFilters: (f: Partial<AppointmentsPageFilters>) => void;
    filteredDayAppointments: DayAppointment[];

    // Drawer state
    drawerOpen: boolean;
    drawerMode: 'create' | 'edit';
    drawerInitialDate: Date | undefined;
    drawerInitialHour: number;
    drawerInitialMinute: number;
    drawerAppointment: DayAppointment | null;
    openDrawerCreate: (date?: Date, hour?: number, minute?: number) => void;
    openDrawerEdit: (appt: DayAppointment) => void;
    closeDrawer: () => void;
    handleDrawerSaved: () => void;

    // Refresh
    refreshAll: () => void;
  }

  export function useAppointmentsPage(): UseAppointmentsPageReturn {
    const { user } = useAuth();

    // Day state
    const [selectedDay, setSelectedDayState] = useState<Date>(() => {
      const t = new Date();
      return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 0, 0, 0, 0);
    });
    const [dayAppointments, setDayAppointments] = useState<DayAppointment[]>([]);
    const [dayLoading, setDayLoading] = useState(true);
    const [dayError, setDayError] = useState<string | null>(null);
    const requestIdRef = useRef(0);

    // List state
    const [appointments, setAppointments] = useState<AppointmentWithProcedures[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState<string | null>(null);

    // Filters
    const [filters, setFiltersState] = useState<AppointmentsPageFilters>({
      status: 'all',
      patientSearch: '',
      view: 'calendar',
    });

    // Drawer state
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');
    const [drawerInitialDate, setDrawerInitialDate] = useState<Date | undefined>();
    const [drawerInitialHour, setDrawerInitialHour] = useState(8);
    const [drawerInitialMinute, setDrawerInitialMinute] = useState(0);
    const [drawerAppointment, setDrawerAppointment] = useState<DayAppointment | null>(null);

    const loadDayAppointments = useCallback(async (day: Date) => {
      const myId = ++requestIdRef.current;
      setDayLoading(true);
      setDayError(null);
      try {
        const data = await listAppointmentsByDay(day);
        if (myId !== requestIdRef.current) return;
        // Defense-in-depth: filter by professional_id (RLS is primary protection)
        const filtered = user
          ? (data ?? []).filter((a: any) => !a.professional_id || a.professional_id === user.id)
          : (data ?? []);
        setDayAppointments(
          filtered.map((a: any) => ({
            id: a.id,
            patient_name: a.patient_name ?? '',
            patient_phone: a.patient_phone ?? '',
            patient_id: a.patient_id ?? null,
            title: a.title ?? '',
            start_time: a.start_time,
            end_time: a.end_time ?? null,
            status: a.status,
            budget: a.budget,
            gcal_event_id: a.gcal_event_id ?? null,
            description: a.description ?? null,
          }))
        );
      } catch {
        if (myId === requestIdRef.current) setDayError('Erro ao carregar agenda do dia.');
      } finally {
        if (myId === requestIdRef.current) setDayLoading(false);
      }
    }, [user]);

    const loadAppointmentsList = useCallback(async () => {
      setListLoading(true);
      setListError(null);
      try {
        const data = await listAppointmentsWithProcedures(90, 365);
        // Defense-in-depth: filter by professional_id
        const filtered = user
          ? data.filter((a) => a.professional_id === user.id)
          : data;
        setAppointments(filtered);
      } catch {
        setListError('Erro ao carregar lista de agendamentos.');
      } finally {
        setListLoading(false);
      }
    }, [user]);

    useEffect(() => {
      loadDayAppointments(selectedDay);
    }, [selectedDay, loadDayAppointments]);

    useEffect(() => {
      loadAppointmentsList();
    }, [loadAppointmentsList]);

    const setSelectedDay = useCallback((day: Date) => {
      setSelectedDayState(new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0));
    }, []);

    const setFilters = useCallback((partial: Partial<AppointmentsPageFilters>) => {
      setFiltersState((prev) => ({ ...prev, ...partial }));
    }, []);

    const filteredDayAppointments = dayAppointments.filter((a) => {
      if (filters.status !== 'all' && a.status !== filters.status) return false;
      if (filters.patientSearch.trim()) {
        const q = filters.patientSearch.toLowerCase();
        if (!a.patient_name.toLowerCase().includes(q) && !a.title.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const openDrawerCreate = useCallback((date?: Date, hour = 8, minute = 0) => {
      setDrawerMode('create');
      setDrawerInitialDate(date);
      setDrawerInitialHour(hour);
      setDrawerInitialMinute(minute);
      setDrawerAppointment(null);
      setDrawerOpen(true);
    }, []);

    const openDrawerEdit = useCallback((appt: DayAppointment) => {
      setDrawerMode('edit');
      setDrawerAppointment(appt);
      setDrawerOpen(true);
    }, []);

    const closeDrawer = useCallback(() => setDrawerOpen(false), []);

    const handleDrawerSaved = useCallback(() => {
      setDrawerOpen(false);
      loadDayAppointments(selectedDay);
      loadAppointmentsList();
    }, [loadDayAppointments, loadAppointmentsList, selectedDay]);

    const refreshAll = useCallback(() => {
      loadDayAppointments(selectedDay);
      loadAppointmentsList();
    }, [loadDayAppointments, loadAppointmentsList, selectedDay]);

    return {
      selectedDay, setSelectedDay,
      dayAppointments, dayLoading, dayError,
      retryDay: () => loadDayAppointments(selectedDay),
      appointments, listLoading, listError,
      retryList: loadAppointmentsList,
      filters, setFilters, filteredDayAppointments,
      drawerOpen, drawerMode, drawerInitialDate, drawerInitialHour, drawerInitialMinute, drawerAppointment,
      openDrawerCreate, openDrawerEdit, closeDrawer, handleDrawerSaved,
      refreshAll,
    };
  }
  ```

- [ ] **Step 3.2: Commit**

  ```bash
  git add src/hooks/useAppointmentsPage.ts
  git commit -m "feat(appointments): add useAppointmentsPage hook with professional_id filter fix"
  ```

---

## Chunk 2: Components

### Task 4: Create Form Sections (PatientSelector, DateTimeSection, ProcedurePlanSection, PaymentSection)

**Files:**
- Create: `src/components/appointments/form/PatientSelector.tsx`
- Create: `src/components/appointments/form/DateTimeSection.tsx`
- Create: `src/components/appointments/form/ProcedurePlanSection.tsx`
- Create: `src/components/appointments/form/PaymentSection.tsx`

---

- [ ] **Step 4.1: Create `src/components/appointments/form/PatientSelector.tsx`**

  ```typescript
  // src/components/appointments/form/PatientSelector.tsx
  import React, { useRef } from 'react';
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

    return (
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
          Paciente {required && <span className="text-red-400">*</span>}
        </label>

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
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setIsOpen(true)}
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
  ```

- [ ] **Step 4.2: Create `src/components/appointments/form/DateTimeSection.tsx`**

  ```typescript
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
            <label className="block text-xs text-slate-500 mb-1">Data e hora</label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => onDateTimeChange(e.target.value)}
              disabled={disabled}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Duração</label>
            <select
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
              <label className="block text-xs text-slate-500 mb-1">Repetir</label>
              <select
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
                <label className="block text-xs text-slate-500 mb-1">Quantas vezes</label>
                <select
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
  ```

- [ ] **Step 4.3: Create `src/components/appointments/form/ProcedurePlanSection.tsx`**

  ```typescript
  // src/components/appointments/form/ProcedurePlanSection.tsx
  import React, { useRef } from 'react';
  import { Search, Loader2 } from 'lucide-react';
  import { useProcedureCatalog } from '../../../hooks/useProcedureCatalog';
  import AppointmentPlanEditor from '../../AppointmentPlanEditor';
  import type { AppointmentPlanItem } from '../../../types/appointmentPlan';
  import type { Procedure } from '../../../types/db';

  interface Props {
    planItems: AppointmentPlanItem[];
    onPlanChange: (items: AppointmentPlanItem[]) => void;
    procedureSearch: string;
    onProcedureSearchChange: (v: string) => void;
    showProcedureDropdown: boolean;
    onShowProcedureDropdownChange: (v: boolean) => void;
    onSelectProcedure: (proc: Procedure) => void;
    disabled?: boolean;
  }

  export default function ProcedurePlanSection({
    planItems, onPlanChange,
    procedureSearch, onProcedureSearchChange,
    showProcedureDropdown, onShowProcedureDropdownChange,
    onSelectProcedure,
    disabled,
  }: Props) {
    const { procedures, loading: proceduresLoading } = useProcedureCatalog();
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filtered = procedureSearch.trim()
      ? procedures.filter(
          (p) =>
            p.name.toLowerCase().includes(procedureSearch.toLowerCase()) ||
            (p.category ?? '').toLowerCase().includes(procedureSearch.toLowerCase())
        )
      : procedures;

    return (
      <div className="space-y-3">
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
          Procedimentos
        </label>

        {/* Procedure search */}
        <div className="relative" ref={dropdownRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          {proceduresLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 animate-spin" />
          )}
          <input
            type="text"
            value={procedureSearch}
            onChange={(e) => {
              onProcedureSearchChange(e.target.value);
              onShowProcedureDropdownChange(true);
            }}
            onFocus={() => onShowProcedureDropdownChange(true)}
            placeholder="Buscar procedimento..."
            disabled={disabled || proceduresLoading}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
          />

          {showProcedureDropdown && filtered.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
              <ul className="max-h-48 overflow-y-auto divide-y divide-slate-700/50">
                {filtered.map((proc) => (
                  <li key={proc.id}>
                    <button
                      type="button"
                      onClick={() => onSelectProcedure(proc)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm text-slate-100">{proc.name}</p>
                        {proc.category && <p className="text-xs text-slate-500">{proc.category}</p>}
                      </div>
                      <span className="text-xs text-slate-400 ml-3 flex-shrink-0">
                        {proc.sale_price ? `R$ ${proc.sale_price.toFixed(2)}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Plan editor (existing component — do not replace) */}
        {planItems.length > 0 && (
          <AppointmentPlanEditor
            items={planItems}
            onChange={onPlanChange}
            disabled={disabled}
          />
        )}
      </div>
    );
  }
  ```

- [ ] **Step 4.4: Create `src/components/appointments/form/PaymentSection.tsx`**

  ```typescript
  // src/components/appointments/form/PaymentSection.tsx
  import React from 'react';
  import type { AppointmentPaymentInfo, AppointmentPlanItem } from '../../../types/appointmentPlan';
  import { calculatePlanTotals } from '../../../types/appointmentPlan';

  const PAYMENT_METHODS = [
    { value: 'pix', label: 'PIX' },
    { value: 'cash', label: 'Dinheiro' },
    { value: 'credit_card', label: 'Cartão de Crédito' },
    { value: 'debit_card', label: 'Cartão de Débito' },
    { value: 'bank_transfer', label: 'Transferência' },
  ] as const;

  interface Props {
    paymentInfo: AppointmentPaymentInfo;
    onPaymentChange: (info: AppointmentPaymentInfo) => void;
    planItems: AppointmentPlanItem[];
    disabled?: boolean;
  }

  export default function PaymentSection({ paymentInfo, onPaymentChange, planItems, disabled }: Props) {
    const totals = calculatePlanTotals(planItems);
    const installmentValue = paymentInfo.installments > 0
      ? totals.totalFinal / paymentInfo.installments
      : totals.totalFinal;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
            Pagamento
          </label>
          <span className="text-sm font-semibold text-cyan-400">
            Total: R$ {totals.totalFinal.toFixed(2)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Forma de pagamento</label>
            <select
              value={paymentInfo.payment_method}
              onChange={(e) =>
                onPaymentChange({ ...paymentInfo, payment_method: e.target.value as AppointmentPaymentInfo['payment_method'] })
              }
              disabled={disabled}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">Parcelas</label>
            <input
              type="number"
              min={1}
              max={24}
              value={paymentInfo.installments}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 1) onPaymentChange({ ...paymentInfo, installments: v });
              }}
              disabled={disabled}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Data do primeiro pagamento</label>
            <input
              type="date"
              value={paymentInfo.first_payment_date}
              onChange={(e) => onPaymentChange({ ...paymentInfo, first_payment_date: e.target.value })}
              disabled={disabled}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
            />
          </div>
          {paymentInfo.installments > 1 && (
            <div className="flex flex-col justify-end pb-0.5">
              <p className="text-xs text-slate-500">Valor por parcela</p>
              <p className="text-sm font-medium text-slate-300">R$ {installmentValue.toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 4.5: Commit**

  ```bash
  git add src/components/appointments/form/
  git commit -m "feat(appointments): add PatientSelector, DateTimeSection, ProcedurePlanSection, PaymentSection form sections"
  ```

---

### Task 5: Create `AppointmentQuickActions` + `AppointmentCard`

**Files:**
- Create: `src/components/appointments/AppointmentQuickActions.tsx`
- Create: `src/components/appointments/AppointmentCard.tsx`

---

- [ ] **Step 5.1: Create `src/components/appointments/AppointmentQuickActions.tsx`**

  Context-aware dropdown menu. Items shown depend on current status.

  ```typescript
  // src/components/appointments/AppointmentQuickActions.tsx
  import React, { useState, useRef, useEffect } from 'react';
  import { MoreHorizontal, CheckCircle, XCircle, Clock, UserX, Edit, Trash2, Loader2 } from 'lucide-react';
  import type { AppointmentStatus } from '../../types/db';

  interface Action {
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'success';
  }

  interface Props {
    appointmentId: string;
    status: AppointmentStatus;
    busy?: boolean;
    onConfirm: () => void;
    onComplete: () => void;
    onMarkNoShow: () => void;
    onCancel: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onReschedule?: () => void;
  }

  export default function AppointmentQuickActions({
    status, busy,
    onConfirm, onComplete, onMarkNoShow, onCancel, onEdit, onDelete, onReschedule,
  }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (!ref.current?.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const actions: Action[] = [];

    if (status === 'scheduled') {
      actions.push({ label: 'Confirmar', icon: CheckCircle, onClick: onConfirm, variant: 'success' });
    }
    if (status === 'confirmed') {
      actions.push({ label: 'Marcar como realizado', icon: CheckCircle, onClick: onComplete, variant: 'success' });
      actions.push({ label: 'Marcar falta', icon: UserX, onClick: onMarkNoShow });
    }
    if (status !== 'completed' && status !== 'cancelled' && status !== 'no_show') {
      if (onReschedule) actions.push({ label: 'Remarcar', icon: Clock, onClick: onReschedule });
      actions.push({ label: 'Cancelar', icon: XCircle, onClick: onCancel, variant: 'danger' });
    }
    actions.push({ label: 'Editar', icon: Edit, onClick: onEdit });
    actions.push({ label: 'Excluir', icon: Trash2, onClick: onDelete, variant: 'danger' });

    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50 min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label="Ações do agendamento"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <MoreHorizontal className="w-4 h-4" />
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px]">
            {actions.map((action) => {
              const Icon = action.icon;
              const colorClass =
                action.variant === 'danger' ? 'text-red-400 hover:bg-red-500/10' :
                action.variant === 'success' ? 'text-green-400 hover:bg-green-500/10' :
                'text-slate-300 hover:bg-slate-700';
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => { setOpen(false); action.onClick(); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${colorClass}`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  ```

- [ ] **Step 5.2: Create `src/components/appointments/AppointmentCard.tsx`**

  ```typescript
  // src/components/appointments/AppointmentCard.tsx
  import React from 'react';
  import { formatTimeOnly, getMinutesDifference } from '../../utils/dateUtils';
  import { getStatusConfig } from '../../constants/appointmentStatus';
  import AppointmentStatusBadge from './AppointmentStatusBadge';
  import AppointmentQuickActions from './AppointmentQuickActions';
  import type { AppointmentStatus } from '../../types/db';
  import type { DayAppointment } from '../../hooks/useAppointmentsPage';

  interface Props {
    appointment: DayAppointment;
    busy?: boolean;
    onConfirm: (id: string) => void;
    onComplete: (id: string) => void;
    onMarkNoShow: (id: string) => void;
    onCancel: (id: string) => void;
    onEdit: (appt: DayAppointment) => void;
    onDelete: (id: string) => void;
    onReschedule?: (appt: DayAppointment) => void;
  }

  export default function AppointmentCard({
    appointment, busy,
    onConfirm, onComplete, onMarkNoShow, onCancel, onEdit, onDelete, onReschedule,
  }: Props) {
    const { id, status, start_time, end_time, patient_name, title } = appointment;
    const cfg = getStatusConfig(status);
    const startLabel = formatTimeOnly(start_time);
    const durationMin = end_time ? getMinutesDifference(start_time, end_time) : null;
    const isCompleted = status === 'completed';

    return (
      <div
        className={`
          group relative flex items-center gap-3
          bg-slate-800/80 hover:bg-slate-800 border border-slate-700/50
          rounded-lg px-3 py-3 border-l-2 ${cfg.borderClass}
          transition-colors
          ${isCompleted ? 'opacity-60' : ''}
        `}
      >
        {/* Time column */}
        <div className="flex-shrink-0 text-right w-10">
          <p className="text-xs font-medium text-slate-300">{startLabel}</p>
          {durationMin != null && (
            <p className="text-[10px] text-slate-500">
              {durationMin < 60 ? `${durationMin}min` : `${Math.round(durationMin / 60)}h`}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate leading-tight">
            {patient_name || 'Paciente não informado'}
          </p>
          {title && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{title}</p>
          )}
        </div>

        {/* Status badge (hidden on mobile — replaced by left border) */}
        <div className="hidden sm:block flex-shrink-0">
          <AppointmentStatusBadge status={status} variant="pill" />
        </div>

        {/* Quick actions */}
        <div className="flex-shrink-0">
          <AppointmentQuickActions
            appointmentId={id}
            status={status as AppointmentStatus}
            busy={busy}
            onConfirm={() => onConfirm(id)}
            onComplete={() => onComplete(id)}
            onMarkNoShow={() => onMarkNoShow(id)}
            onCancel={() => onCancel(id)}
            onEdit={() => onEdit(appointment)}
            onDelete={() => onDelete(id)}
            onReschedule={onReschedule ? () => onReschedule(appointment) : undefined}
          />
        </div>

        {/* Mobile status indicator (dot) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-px sm:hidden">
          <AppointmentStatusBadge status={status} variant="dot" />
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 5.3: Commit**

  ```bash
  git add src/components/appointments/AppointmentQuickActions.tsx src/components/appointments/AppointmentCard.tsx
  git commit -m "feat(appointments): add AppointmentCard and AppointmentQuickActions components"
  ```

---

### Task 6: Refactor `AppointmentDrawer`

**Files:**
- Modify: `src/components/appointments/AppointmentDrawer.tsx`

---

- [ ] **Step 6.1: Replace the body of `AppointmentDrawer.tsx`**

  The goal: keep the same public interface (`DrawerAppointment`, `AppointmentDrawerProps`) but decompose the form into sections. The submit logic, history section, and validations are preserved exactly. State is consolidated but logic unchanged.

  **Important:** Keep the `DrawerAppointment` and `AppointmentDrawerProps` interfaces at the top — `AppointmentsScreen.tsx` imports them.

  Replace the full file content with:

  ```typescript
  // src/components/appointments/AppointmentDrawer.tsx
  import React, { useState, useEffect, useRef, useCallback } from 'react';
  import { X, History, ChevronDown, ChevronUp } from 'lucide-react';
  import { useAuth } from '../../contexts/AuthContext';
  import { supabase } from '../../services/supabase/client';
  import {
    createAppointmentWithProcedures,
    updateAppointmentWithProcedures,
    createRecurringAppointments,
    getAppointmentHistory,
    type CreateAppointmentPayload,
  } from '../../services/appointments/appointmentService';
  import type { AppointmentHistoryRow } from '../../types/db';
  import { updateGcalEvent } from '../../services/calendar';
  import {
    convertToSupabaseFormat,
    buildEndTimeFromDurationMinutes,
    toDatetimeLocal,
  } from '../../utils/dateUtils';
  import type { Procedure } from '../../types/db';
  import type { AppointmentPlanItem, AppointmentPaymentInfo } from '../../types/appointmentPlan';
  import { usePatientSearch } from '../../hooks/usePatientSearch';
  import type { PatientSearchResult } from '../../hooks/usePatientSearch';
  import PatientSelector from './form/PatientSelector';
  import DateTimeSection from './form/DateTimeSection';
  import ProcedurePlanSection from './form/ProcedurePlanSection';
  import PaymentSection from './form/PaymentSection';
  import { convertToBrazilianFormat } from '../../utils/dateUtils';
  import toast from 'react-hot-toast';
  import { useProcedureCatalog } from '../../hooks/useProcedureCatalog';
  import {
    DURATION_OPTIONS,
    OCCURRENCE_COUNT_DEFAULT,
    OCCURRENCE_COUNT_MIN,
    OCCURRENCE_COUNT_MAX,
    getRecurrenceInterval,
  } from './appointmentDrawerUtils';

  // ─── Public interfaces (consumed by AppointmentsScreen — do not remove) ────
  export interface DrawerAppointment {
    id: string;
    patient_name: string;
    patient_phone: string;
    patient_id?: string | null;
    start_time: string;
    end_time?: string | null;
    title: string;
    description?: string | null;
    status?: string;
    budget?: number;
    gcal_event_id?: string | null;
  }

  export interface AppointmentDrawerProps {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    mode: 'create' | 'edit';
    initialDate?: Date;
    initialHour?: number;
    initialMinute?: number;
    initialAppointment?: DrawerAppointment | null;
    onDeleteRequested?: (appointment: DrawerAppointment) => void;
  }

  // ─── Component ──────────────────────────────────────────────────────────────
  export default function AppointmentDrawer({
    open, onClose, onSaved, mode,
    initialDate, initialHour = 8, initialMinute = 0,
    initialAppointment, onDeleteRequested,
  }: AppointmentDrawerProps) {
    const { user } = useAuth();
    const { procedures } = useProcedureCatalog();

    // ── Form state ──────────────────────────────────────────────────────────
    const [dateTime, setDateTime] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [title, setTitle] = useState('');
    const [planItems, setPlanItems] = useState<AppointmentPlanItem[]>([]);
    const [paymentInfo, setPaymentInfo] = useState<AppointmentPaymentInfo>({
      installments: 1,
      payment_method: 'pix',
      first_payment_date: new Date().toISOString().slice(0, 10),
    });
    const [recurrenceValue, setRecurrenceValue] = useState('');
    const [occurrenceCount, setOccurrenceCount] = useState(OCCURRENCE_COUNT_DEFAULT);
    const [procedureSearch, setProcedureSearch] = useState('');
    const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [historySectionOpen, setHistorySectionOpen] = useState(false);
    const [historyList, setHistoryList] = useState<AppointmentHistoryRow[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const procedureDropdownRef = useRef<HTMLDivElement>(null);
    const bodyScrollLockRef = useRef<{ overflow: string; paddingRight: string } | null>(null);

    // Patient search hook
    const patientSearch = usePatientSearch(
      initialAppointment
        ? { id: initialAppointment.patient_id ?? 'unknown', name: initialAppointment.patient_name, phone: initialAppointment.patient_phone ?? '' }
        : null
    );

    // ── Body scroll lock ─────────────────────────────────────────────────────
    useEffect(() => {
      if (!open) return;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      bodyScrollLockRef.current = { overflow: document.body.style.overflow, paddingRight: document.body.style.paddingRight };
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      return () => {
        if (bodyScrollLockRef.current) {
          document.body.style.overflow = bodyScrollLockRef.current.overflow;
          document.body.style.paddingRight = bodyScrollLockRef.current.paddingRight;
          bodyScrollLockRef.current = null;
        }
      };
    }, [open]);

    // ── History loader ───────────────────────────────────────────────────────
    useEffect(() => {
      if (!historySectionOpen || !initialAppointment?.id || mode !== 'edit') return;
      let cancelled = false;
      setHistoryLoading(true);
      getAppointmentHistory(initialAppointment.id)
        .then((rows) => { if (!cancelled) setHistoryList(rows); })
        .catch(() => { if (!cancelled) setHistoryList([]); })
        .finally(() => { if (!cancelled) setHistoryLoading(false); });
      return () => { cancelled = true; };
    }, [historySectionOpen, initialAppointment?.id, mode]);

    // ── Load existing procedures when editing ─────────────────────────────────
    useEffect(() => {
      if (!open || mode !== 'edit' || !initialAppointment?.id) return;
      if (procedures.length === 0) return;
      let cancelled = false;
      (async () => {
        try {
          const { data: rows } = await supabase
            .from('appointment_procedures')
            .select('procedure_catalog_id, procedure_name_snapshot, final_price, quantity, discount')
            .eq('appointment_id', initialAppointment.id);
          if (cancelled || !rows?.length) return;
          const items: AppointmentPlanItem[] = rows.map((r: any) => {
            const catalogId = r.procedure_catalog_id ?? r.procedure_id;
            const proc = procedures.find((p) => p.id === catalogId);
            return {
              procedure_catalog_id: catalogId,
              name: r.procedure_name_snapshot ?? proc?.name ?? '',
              category: proc?.category ?? null,
              cost_price: proc?.cost_price ?? 0,
              sale_price: proc?.sale_price ?? 0,
              final_price: Number(r.final_price) ?? 0,
              quantity: r.quantity ?? 1,
              discount: r.discount ?? 0,
            };
          });
          if (!cancelled) setPlanItems(items);
        } catch {
          if (!cancelled) toast.error('Erro ao carregar procedimentos do agendamento.');
        }
      })();
      return () => { cancelled = true; };
    }, [open, mode, initialAppointment?.id, procedures]);

    // ── Initialize form on open ───────────────────────────────────────────────
    useEffect(() => {
      if (!open) return;
      if (mode === 'edit' && initialAppointment) {
        setDateTime(toDatetimeLocal(initialAppointment.start_time));
        setTitle(initialAppointment.title ?? '');
        const start = new Date(initialAppointment.start_time);
        const end = initialAppointment.end_time
          ? new Date(initialAppointment.end_time)
          : new Date(start.getTime() + 60 * 60 * 1000);
        const minDiff = (end.getTime() - start.getTime()) / (60 * 1000);
        const match = DURATION_OPTIONS.find((o) => o.value >= minDiff - 2) ?? DURATION_OPTIONS.find((o) => o.value === 60);
        setDurationMinutes(match?.value ?? 60);
        setRecurrenceValue('');
        setOccurrenceCount(OCCURRENCE_COUNT_DEFAULT);
      } else {
        setPlanItems([]);
        const d = initialDate ? new Date(initialDate.getTime()) : new Date();
        d.setHours(initialHour, initialMinute, 0, 0);
        setDateTime(d.toISOString().slice(0, 16));
        setTitle('');
        setDurationMinutes(60);
        setRecurrenceValue('');
        setOccurrenceCount(OCCURRENCE_COUNT_DEFAULT);
        patientSearch.clearSelection();
      }
    }, [open, mode, initialAppointment, initialDate, initialHour, initialMinute]);

    // ── Click outside to close dropdowns ─────────────────────────────────────
    useEffect(() => {
      const handler = (e: MouseEvent) => {
        const target = e.target as Node;
        if (!procedureDropdownRef.current?.contains(target)) setShowProcedureDropdown(false);
        if (!(e.target as HTMLElement)?.closest('[data-patient-dropdown]')) patientSearch.setIsOpen(false);
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [patientSearch]);

    // ── Procedure handlers ────────────────────────────────────────────────────
    const handleSelectProcedure = useCallback((proc: Procedure) => {
      setPlanItems((prev) => {
        const i = prev.findIndex((x) => x.procedure_catalog_id === proc.id);
        if (i >= 0) {
          const next = [...prev];
          next[i] = { ...next[i], quantity: next[i].quantity + 1 };
          return next;
        }
        return [
          ...prev,
          {
            procedure_catalog_id: proc.id,
            name: proc.name,
            category: proc.category ?? null,
            cost_price: proc.cost_price ?? 0,
            sale_price: proc.sale_price ?? 0,
            final_price: proc.sale_price ?? 0,
            quantity: 1,
            discount: 0,
          },
        ];
      });
      setProcedureSearch('');
      setShowProcedureDropdown(false);
      if (!title.trim()) setTitle(proc.name);
    }, [title]);

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!patientSearch.selected) {
        toast.error('Selecione o cliente.');
        return;
      }
      if (recurrenceValue && getRecurrenceInterval(recurrenceValue)) {
        const count = Math.min(Math.max(occurrenceCount, OCCURRENCE_COUNT_MIN), OCCURRENCE_COUNT_MAX);
        if (count < OCCURRENCE_COUNT_MIN || count > OCCURRENCE_COUNT_MAX) {
          toast.error(`Quantas consultas deve ser entre ${OCCURRENCE_COUNT_MIN} e ${OCCURRENCE_COUNT_MAX}.`);
          return;
        }
      }
      const isoStart = convertToSupabaseFormat(dateTime);
      if (!isoStart) { toast.error('Data e hora inválidos.'); return; }
      const endIso = buildEndTimeFromDurationMinutes(isoStart, durationMinutes);
      if (!endIso) { toast.error('Erro ao calcular duração.'); return; }

      const patientId = patientSearch.selected.id === 'unknown' ? null : patientSearch.selected.id;
      const proceduresPayload = planItems.map((item) => ({
        procedureId: item.procedure_catalog_id,
        name: item.name,
        finalPrice: item.final_price,
        quantity: item.quantity,
        discount: item.discount,
      }));

      setSubmitting(true);
      try {
        const professionalId = user?.id ?? null;

        if (mode === 'edit' && initialAppointment?.id) {
          await updateAppointmentWithProcedures(initialAppointment.id, {
            patientId,
            patientName: patientSearch.selected.name,
            patientPhone: patientSearch.selected.phone ?? '',
            startTimeIso: isoStart,
            endTimeIso: endIso,
            title: title.trim() || patientSearch.selected.name,
            professionalId,
            procedures: proceduresPayload,
          });
          // Update Google Calendar if event exists
          if (initialAppointment.gcal_event_id) {
            try {
              await updateGcalEvent(initialAppointment.gcal_event_id, {
                summary: title.trim() || patientSearch.selected.name,
                start: isoStart,
                end: endIso,
              });
            } catch {
              toast('Agendamento atualizado. Evento do Google Calendar não foi sincronizado.', { icon: '⚠️' });
            }
          }
          toast.success('Agendamento atualizado.');
        } else {
          // Create — with optional recurrence
          const basePayload: CreateAppointmentPayload = {
            patientId,
            patientName: patientSearch.selected.name,
            patientPhone: patientSearch.selected.phone ?? '',
            startTimeIso: isoStart,
            endTimeIso: endIso,
            title: title.trim() || patientSearch.selected.name,
            professionalId,
            procedures: proceduresPayload,
          };

          const recurrenceInterval = getRecurrenceInterval(recurrenceValue);
          if (recurrenceInterval && occurrenceCount > 1) {
            await createRecurringAppointments(basePayload, recurrenceInterval, occurrenceCount);
            toast.success(`${occurrenceCount} agendamentos recorrentes criados.`);
          } else {
            await createAppointmentWithProcedures(basePayload);
            toast.success('Agendamento criado.');
          }
        }
        onSaved();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao salvar agendamento.';
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    };

    if (!open) return null;

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Drawer */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'edit' ? 'Editar agendamento' : 'Novo agendamento'}
          className="fixed inset-y-0 right-0 z-50 flex flex-col bg-slate-900 border-l border-slate-700/50 shadow-2xl w-[min(560px,100vw)] sm:w-[min(560px,95vw)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50 flex-shrink-0">
            <h2 className="text-base font-semibold text-slate-100">
              {mode === 'edit' ? 'Editar agendamento' : 'Novo agendamento'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Título
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Botox Frontal"
                  disabled={submitting}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50 transition-colors"
                />
              </div>

              {/* Patient */}
              <div data-patient-dropdown>
                <PatientSelector patientSearch={patientSearch} required disabled={submitting} />
              </div>

              {/* DateTime */}
              <DateTimeSection
                dateTime={dateTime}
                onDateTimeChange={setDateTime}
                durationMinutes={durationMinutes}
                onDurationChange={setDurationMinutes}
                recurrenceValue={recurrenceValue}
                onRecurrenceChange={setRecurrenceValue}
                occurrenceCount={occurrenceCount}
                onOccurrenceCountChange={setOccurrenceCount}
                disabled={submitting}
                isEditMode={mode === 'edit'}
              />

              {/* Procedures */}
              <div ref={procedureDropdownRef}>
                <ProcedurePlanSection
                  planItems={planItems}
                  onPlanChange={setPlanItems}
                  procedureSearch={procedureSearch}
                  onProcedureSearchChange={setProcedureSearch}
                  showProcedureDropdown={showProcedureDropdown}
                  onShowProcedureDropdownChange={setShowProcedureDropdown}
                  onSelectProcedure={handleSelectProcedure}
                  disabled={submitting}
                />
              </div>

              {/* Payment (only when plan has items) */}
              {planItems.length > 0 && (
                <PaymentSection
                  paymentInfo={paymentInfo}
                  onPaymentChange={setPaymentInfo}
                  planItems={planItems}
                  disabled={submitting}
                />
              )}

              {/* History (edit mode only) */}
              {mode === 'edit' && (
                <div className="border-t border-slate-700/50 pt-4">
                  <button
                    type="button"
                    onClick={() => setHistorySectionOpen((v) => !v)}
                    className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors w-full text-left"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Histórico de alterações</span>
                    {historySectionOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
                  </button>

                  {historySectionOpen && (
                    <div className="mt-3 space-y-2">
                      {historyLoading ? (
                        <p className="text-xs text-slate-500">Carregando histórico...</p>
                      ) : historyList.length === 0 ? (
                        <p className="text-xs text-slate-500">Sem histórico registrado.</p>
                      ) : (
                        historyList.map((row) => (
                          <div key={row.id} className="text-xs text-slate-500 bg-slate-800 rounded p-2">
                            <span className="text-slate-400">{convertToBrazilianFormat(row.created_at)}</span>
                            {' · '}
                            <span>{row.action}</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              className="flex items-center gap-3 px-5 py-4 border-t border-slate-700/50 flex-shrink-0 bg-slate-900"
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              {mode === 'edit' && onDeleteRequested && initialAppointment && (
                <button
                  type="button"
                  onClick={() => { onDeleteRequested(initialAppointment); onClose(); }}
                  disabled={submitting}
                  className="px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  Excluir
                </button>
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || !patientSearch.selected}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold text-sm rounded-lg transition-colors flex items-center gap-2 min-w-[100px] justify-center"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : mode === 'edit' ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      </>
    );
  }
  ```

- [ ] **Step 6.2: Verify the old `toDatetimeLocal` local function is removed**

  The function was a private function in the old `AppointmentDrawer.tsx`. The new version imports it from `dateUtils`. Confirm there's no duplicate definition.

- [ ] **Step 6.3: Commit**

  ```bash
  git add src/components/appointments/AppointmentDrawer.tsx
  git commit -m "refactor(appointments): decompose AppointmentDrawer into form sections + hooks"
  ```

---

## Chunk 3: Layout + Screen Refactor

### Task 7: Create Panels — CalendarPanel, DayPanel, AppointmentFiltersBar

**Files:**
- Create: `src/components/appointments/CalendarPanel.tsx`
- Create: `src/components/appointments/DayPanel.tsx`
- Create: `src/components/appointments/AppointmentFiltersBar.tsx`

---

- [ ] **Step 7.1: Create `src/components/appointments/AppointmentFiltersBar.tsx`**

  ```typescript
  // src/components/appointments/AppointmentFiltersBar.tsx
  import React from 'react';
  import { Search, X } from 'lucide-react';
  import { APPOINTMENT_STATUS_CONFIG } from '../../constants/appointmentStatus';
  import type { AppointmentStatus } from '../../types/db';
  import type { AppointmentsPageFilters } from '../../hooks/useAppointmentsPage';

  interface Props {
    filters: AppointmentsPageFilters;
    onFiltersChange: (partial: Partial<AppointmentsPageFilters>) => void;
  }

  const STATUS_OPTIONS: { value: AppointmentStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'scheduled', label: APPOINTMENT_STATUS_CONFIG.scheduled.label },
    { value: 'confirmed', label: APPOINTMENT_STATUS_CONFIG.confirmed.label },
    { value: 'completed', label: APPOINTMENT_STATUS_CONFIG.completed.label },
    { value: 'cancelled', label: APPOINTMENT_STATUS_CONFIG.cancelled.label },
    { value: 'no_show', label: APPOINTMENT_STATUS_CONFIG.no_show.label },
  ];

  export default function AppointmentFiltersBar({ filters, onFiltersChange }: Props) {
    return (
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-700/50 bg-slate-900/50">
        {/* Patient search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={filters.patientSearch}
            onChange={(e) => onFiltersChange({ patientSearch: e.target.value })}
            placeholder="Buscar paciente..."
            className="w-full bg-slate-800 border border-slate-700 rounded-md pl-7 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          {filters.patientSearch && (
            <button
              onClick={() => onFiltersChange({ patientSearch: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFiltersChange({ status: opt.value })}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.status === opt.value
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 7.2: Create `src/components/appointments/CalendarPanel.tsx`**

  ```typescript
  // src/components/appointments/CalendarPanel.tsx
  import React, { useMemo } from 'react';
  import { ChevronLeft, ChevronRight } from 'lucide-react';
  import { isToday } from '../../utils/dateUtils';
  import type { DayAppointment } from '../../hooks/useAppointmentsPage';

  interface Props {
    selectedDay: Date;
    onSelectDay: (day: Date) => void;
    dayAppointments: DayAppointment[]; // used to show dot indicators
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
    const totalToday = allAppointments.filter((a) => {
      const d = new Date(a.start_time);
      return (
        d.getFullYear() === selectedDay.getFullYear() &&
        d.getMonth() === selectedDay.getMonth() &&
        d.getDate() === selectedDay.getDate()
      );
    }).length;

    return (
      <div className="flex flex-col h-full p-4 space-y-4">
        {/* Month nav */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors" aria-label="Mês anterior">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={nextMonth} className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors" aria-label="Próximo mês">
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
  ```

- [ ] **Step 7.3: Create `src/components/appointments/DayPanel.tsx`**

  ```typescript
  // src/components/appointments/DayPanel.tsx
  import React from 'react';
  import { AlertCircle, RefreshCw } from 'lucide-react';
  import AppointmentCard from './AppointmentCard';
  import AppointmentEmptyState from './AppointmentEmptyState';
  import AppointmentFiltersBar from './AppointmentFiltersBar';
  import type { DayAppointment, AppointmentsPageFilters } from '../../hooks/useAppointmentsPage';
  import type { UseAppointmentActionsReturn } from '../../hooks/useAppointmentActions';
  import { isToday } from '../../utils/dateUtils';

  interface Props {
    selectedDay: Date;
    appointments: DayAppointment[];
    loading: boolean;
    error: string | null;
    onRetry: () => void;
    filters: AppointmentsPageFilters;
    onFiltersChange: (partial: Partial<AppointmentsPageFilters>) => void;
    actions: UseAppointmentActionsReturn;
    onEdit: (appt: DayAppointment) => void;
    onDeleteRequested: (appt: DayAppointment) => void;
    onNewAppointment: () => void;
  }

  function SkeletonCard() {
    return (
      <div className="flex items-center gap-3 bg-slate-800/60 rounded-lg px-3 py-3 border border-slate-700/30 animate-pulse">
        <div className="w-10 flex-shrink-0 space-y-1">
          <div className="h-2.5 bg-slate-700 rounded w-8 ml-auto" />
          <div className="h-2 bg-slate-700 rounded w-6 ml-auto" />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-slate-700 rounded w-3/5" />
          <div className="h-2.5 bg-slate-700 rounded w-2/5" />
        </div>
        <div className="h-5 bg-slate-700 rounded-full w-16 flex-shrink-0" />
      </div>
    );
  }

  export default function DayPanel({
    selectedDay, appointments, loading, error, onRetry,
    filters, onFiltersChange, actions, onEdit, onDeleteRequested, onNewAppointment,
  }: Props) {
    const dayLabel = isToday(selectedDay)
      ? 'Hoje'
      : selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    const hasActiveFilters = filters.status !== 'all' || !!filters.patientSearch;

    return (
      <div className="flex flex-col h-full min-h-0">
        {/* Day header */}
        <div className="px-4 pt-4 pb-2 flex-shrink-0">
          <h2 className="text-sm font-semibold text-slate-200 capitalize">{dayLabel}</h2>
          {!loading && !error && (
            <p className="text-xs text-slate-500 mt-0.5">
              {appointments.length === 0
                ? 'Nenhum agendamento'
                : `${appointments.length} agendamento${appointments.length !== 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        {/* Filters bar */}
        <div className="flex-shrink-0">
          <AppointmentFiltersBar filters={filters} onFiltersChange={onFiltersChange} />
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-sm text-slate-400">{error}</p>
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Tentar novamente
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-2">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : appointments.length === 0 ? (
            <AppointmentEmptyState
              context={
                hasActiveFilters
                  ? 'filter-no-results'
                  : isToday(selectedDay)
                  ? 'no-appointments-today'
                  : 'past-day-empty'
              }
              onAction={!hasActiveFilters ? onNewAppointment : undefined}
            />
          ) : (
            <div className="space-y-2">
              {appointments.map((appt) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  busy={actions.busy}
                  onConfirm={actions.confirmAppointment}
                  onComplete={actions.completeAppointment}
                  onMarkNoShow={actions.markNoShow}
                  onCancel={actions.cancelAppointment}
                  onEdit={onEdit}
                  onDelete={(id) => {
                    const found = appointments.find((a) => a.id === id);
                    if (found) onDeleteRequested(found);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 7.4: Commit**

  ```bash
  git add src/components/appointments/AppointmentFiltersBar.tsx src/components/appointments/CalendarPanel.tsx src/components/appointments/DayPanel.tsx
  git commit -m "feat(appointments): add CalendarPanel, DayPanel, AppointmentFiltersBar panels"
  ```

---

### Task 8: Refactor `AppointmentsScreen`

**Files:**
- Modify: `src/screens/AppointmentsScreen.tsx`

---

- [ ] **Step 8.1: Replace `AppointmentsScreen.tsx` with the new orchestrator**

  The new version:
  - Uses `useAppointmentsPage()` for all state + data loading
  - Uses `useAppointmentActions()` for status mutations
  - Composes `CalendarPanel` + `DayPanel` for the hybrid layout
  - Preserves the `AppointmentDrawer` + `ConfirmDialog` integration
  - Preserves list/history view (accordion) via the tab switcher
  - Fixes the missing `professional_id` filter (done in `useAppointmentsPage`)

  **Important:** Keep the `DayCalendarView` import for backwards compatibility if it's used elsewhere. The new screen uses a list-based day view instead of the time-grid view, which is less dense and more mobile-friendly.

  Replace the full file content with:

  ```typescript
  // src/screens/AppointmentsScreen.tsx
  import React, { useState, useMemo, useCallback } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { Plus, LayoutGrid, List } from 'lucide-react';
  import toast from 'react-hot-toast';
  import ResponsiveAppLayout from '../components/Layout/ResponsiveAppLayout';
  import AppointmentDrawer from '../components/appointments/AppointmentDrawer';
  import type { DrawerAppointment } from '../components/appointments/AppointmentDrawer';
  import CalendarPanel from '../components/appointments/CalendarPanel';
  import DayPanel from '../components/appointments/DayPanel';
  import ConfirmDialog from '../components/ConfirmDialog';
  import { useAppointmentsPage } from '../hooks/useAppointmentsPage';
  import { useAppointmentActions } from '../hooks/useAppointmentActions';
  import type { DayAppointment } from '../hooks/useAppointmentsPage';
  import { getStatusConfig } from '../constants/appointmentStatus';
  import { convertToBrazilianFormat } from '../utils/dateUtils';
  import AppointmentStatusBadge from '../components/appointments/AppointmentStatusBadge';

  export default function AppointmentsScreen() {
    const navigate = useNavigate();

    const page = useAppointmentsPage();

    const actions = useAppointmentActions({ onSuccess: page.refreshAll });

    // Delete confirmation state
    const [deleteTarget, setDeleteTarget] = useState<DayAppointment | null>(null);

    // Cancel confirmation state
    const [cancelTarget, setCancelTarget] = useState<DayAppointment | null>(null);

    // Convert DayAppointment → DrawerAppointment for the drawer
    const toDrawerAppt = (a: DayAppointment): DrawerAppointment => ({
      id: a.id,
      patient_name: a.patient_name,
      patient_phone: a.patient_phone,
      patient_id: a.patient_id,
      start_time: a.start_time,
      end_time: a.end_time,
      title: a.title,
      description: a.description,
      status: a.status,
      budget: a.budget,
      gcal_event_id: a.gcal_event_id,
    });

    const handleEditAppt = useCallback((appt: DayAppointment) => {
      page.openDrawerEdit(appt);
    }, [page]);

    const handleDeleteRequested = useCallback((appt: DayAppointment) => {
      setDeleteTarget(appt);
    }, []);

    const handleCancelRequested = useCallback((id: string) => {
      const appt = page.dayAppointments.find((a) => a.id === id);
      if (appt) setCancelTarget(appt);
    }, [page.dayAppointments]);

    const handleConfirmDelete = useCallback(async () => {
      if (!deleteTarget) return;
      await actions.remove(deleteTarget.id);
      setDeleteTarget(null);
    }, [deleteTarget, actions]);

    const handleConfirmCancel = useCallback(async () => {
      if (!cancelTarget) return;
      await actions.cancelAppointment(cancelTarget.id);
      setCancelTarget(null);
    }, [cancelTarget, actions]);

    // Actions adapter that intercepts cancel to show confirm dialog
    const actionsWithConfirm = useMemo(() => ({
      ...actions,
      cancelAppointment: handleCancelRequested,
    }), [actions, handleCancelRequested]);

    // History view: group appointments by patient
    const historyGroups = useMemo(() => {
      const map = new Map<string, { patientName: string; appointments: typeof page.appointments[0][] }>();
      const filtered = page.appointments.filter((a) => {
        if (page.filters.status !== 'all' && a.status !== page.filters.status) return false;
        if (page.filters.patientSearch) {
          const q = page.filters.patientSearch.toLowerCase();
          if (!a.patient_name.toLowerCase().includes(q)) return false;
        }
        return true;
      });
      for (const a of filtered) {
        const key = a.patient_id ?? a.patient_name ?? 'sem-nome';
        if (!map.has(key)) map.set(key, { patientName: a.patient_name?.trim() || 'Sem nome', appointments: [] });
        map.get(key)!.appointments.push(a);
      }
      return Array.from(map.entries())
        .map(([key, { patientName, appointments }]) => ({ key, patientName, appointments }))
        .sort((a, b) => a.patientName.localeCompare(b.patientName, 'pt-BR'));
    }, [page.appointments, page.filters]);

    const [expandedPatientKeys, setExpandedPatientKeys] = useState<Set<string>>(new Set());
    const togglePatientGroup = (key: string) => {
      setExpandedPatientKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    };

    return (
      <ResponsiveAppLayout>
        <div className="flex flex-col h-full min-h-0 bg-slate-950">

          {/* ── Top bar ────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-800 flex-shrink-0">
            <div>
              <h1 className="text-base font-semibold text-slate-100">Agendamentos</h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* View toggle (hidden on mobile) */}
              <div className="hidden md:flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => page.setFilters({ view: 'calendar' })}
                  className={`p-1.5 rounded-md transition-colors ${page.filters.view === 'calendar' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
                  aria-label="Visão calendário"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => page.setFilters({ view: 'list' })}
                  className={`p-1.5 rounded-md transition-colors ${page.filters.view === 'list' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
                  aria-label="Visão lista"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => page.openDrawerCreate()}
                className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-xs rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Novo agendamento</span>
                <span className="sm:hidden">Novo</span>
              </button>
            </div>
          </div>

          {/* ── Mobile: horizontal date strip ─────────────────────────────── */}
          <div className="md:hidden flex-shrink-0 px-4 py-2 border-b border-slate-800">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - 3 + i); // 3 days before, 3 days after today
                const dayNum = d.getDate();
                const isSelected =
                  d.getFullYear() === page.selectedDay.getFullYear() &&
                  d.getMonth() === page.selectedDay.getMonth() &&
                  d.getDate() === page.selectedDay.getDate();
                const isT = d.toDateString() === new Date().toDateString();
                return (
                  <button
                    key={i}
                    onClick={() => page.setSelectedDay(d)}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg min-w-[44px] transition-colors ${
                      isSelected ? 'bg-cyan-500 text-slate-900' : isT ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-500 bg-slate-800'
                    }`}
                  >
                    <span className="text-[10px] font-medium uppercase">
                      {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                    </span>
                    <span className="text-sm font-bold">{dayNum}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Main content ───────────────────────────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-hidden">

            {/* Desktop: 2-column hybrid layout */}
            <div className="hidden md:grid grid-cols-[260px_1fr] h-full">
              {/* Calendar panel */}
              <div className="border-r border-slate-800 overflow-y-auto">
                <CalendarPanel
                  selectedDay={page.selectedDay}
                  onSelectDay={page.setSelectedDay}
                  dayAppointments={page.dayAppointments}
                  allAppointments={page.appointments}
                />
              </div>

              {/* Day panel or list */}
              {page.filters.view === 'calendar' ? (
                <DayPanel
                  selectedDay={page.selectedDay}
                  appointments={page.filteredDayAppointments}
                  loading={page.dayLoading}
                  error={page.dayError}
                  onRetry={page.retryDay}
                  filters={page.filters}
                  onFiltersChange={page.setFilters}
                  actions={actionsWithConfirm}
                  onEdit={handleEditAppt}
                  onDeleteRequested={handleDeleteRequested}
                  onNewAppointment={() => page.openDrawerCreate(page.selectedDay)}
                />
              ) : (
                /* List / history view */
                <div className="flex flex-col h-full overflow-y-auto px-6 py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-300">Histórico por paciente</h3>
                    <span className="text-xs text-slate-500">{page.appointments.length} agendamentos</span>
                  </div>
                  {page.listLoading ? (
                    <p className="text-sm text-slate-500">Carregando...</p>
                  ) : historyGroups.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum resultado.</p>
                  ) : (
                    historyGroups.map(({ key, patientName, appointments }) => (
                      <div key={key} className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
                        <button
                          onClick={() => togglePatientGroup(key)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
                        >
                          <span className="text-sm font-medium text-slate-200">{patientName}</span>
                          <span className="text-xs text-slate-500">{appointments.length} consulta{appointments.length !== 1 ? 's' : ''}</span>
                        </button>
                        {expandedPatientKeys.has(key) && (
                          <div className="divide-y divide-slate-700/30">
                            {appointments.map((a) => {
                              const cfg = getStatusConfig(a.status);
                              return (
                                <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-300">{convertToBrazilianFormat(a.start_time)}</p>
                                    <p className="text-xs text-slate-500 truncate">{a.title}</p>
                                  </div>
                                  <AppointmentStatusBadge status={a.status} variant="pill" />
                                  <button
                                    onClick={() => navigate(`/appointments/${a.id}/treatment`)}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                                  >
                                    Ver →
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Mobile: day panel only (full width) */}
            <div className="md:hidden h-full">
              <DayPanel
                selectedDay={page.selectedDay}
                appointments={page.filteredDayAppointments}
                loading={page.dayLoading}
                error={page.dayError}
                onRetry={page.retryDay}
                filters={page.filters}
                onFiltersChange={page.setFilters}
                actions={actionsWithConfirm}
                onEdit={handleEditAppt}
                onDeleteRequested={handleDeleteRequested}
                onNewAppointment={() => page.openDrawerCreate(page.selectedDay)}
              />
            </div>
          </div>
        </div>

        {/* ── Drawer ───────────────────────────────────────────────────────── */}
        <AppointmentDrawer
          open={page.drawerOpen}
          onClose={page.closeDrawer}
          onSaved={page.handleDrawerSaved}
          mode={page.drawerMode}
          initialDate={page.drawerInitialDate}
          initialHour={page.drawerInitialHour}
          initialMinute={page.drawerInitialMinute}
          initialAppointment={page.drawerAppointment ? toDrawerAppt(page.drawerAppointment) : null}
          onDeleteRequested={(appt) => setDeleteTarget(page.drawerAppointment)}
        />

        {/* ── Delete confirm dialog ─────────────────────────────────────────── */}
        <ConfirmDialog
          open={!!deleteTarget}
          title="Excluir agendamento"
          message={`Tem certeza que deseja excluir o agendamento de ${deleteTarget?.patient_name ?? ''}? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />

        {/* ── Cancel confirm dialog ─────────────────────────────────────────── */}
        <ConfirmDialog
          open={!!cancelTarget}
          title="Cancelar agendamento"
          message={`Deseja cancelar o agendamento de ${cancelTarget?.patient_name ?? ''}?`}
          confirmLabel="Cancelar agendamento"
          variant="warning"
          onConfirm={handleConfirmCancel}
          onCancel={() => setCancelTarget(null)}
        />
      </ResponsiveAppLayout>
    );
  }
  ```

- [ ] **Step 8.2: Check ConfirmDialog props match**

  Open `src/components/ConfirmDialog.tsx` and verify it accepts: `open`, `title`, `message`, `confirmLabel`, `variant` (`'danger'` | `'warning'`), `onConfirm`, `onCancel`. Adjust the props passed in Step 8.1 to match exactly.

- [ ] **Step 8.3: Commit**

  ```bash
  git add src/screens/AppointmentsScreen.tsx
  git commit -m "refactor(appointments): replace AppointmentsScreen with hybrid panel-based layout"
  ```

---

## QA Checklist

Run through every item after implementation. No automated tests exist — manual verification required.

### Functional
- [ ] Create appointment — fill all fields → saved → appears in day list
- [ ] Create appointment with procedures — plan items + payment section visible → saved
- [ ] Create recurring appointment — select recurrence → N appointments created
- [ ] Edit appointment — change date/time/patient/procedures → saved
- [ ] Confirm appointment via ⋯ menu → status badge turns green
- [ ] Mark as completed → status badge turns purple, card opacity 70%
- [ ] Mark no-show → status badge turns orange
- [ ] Cancel appointment → confirm dialog appears → confirmed → status turns red
- [ ] Delete appointment → confirm dialog appears → confirmed → card removed
- [ ] Delete with gcal_failed → warning toast shown (no crash)
- [ ] Click calendar day → day panel updates to that day
- [ ] Navigate calendar months (‹ ›) → days update
- [ ] "Ir para hoje →" button → returns to today
- [ ] Filters bar — status chip filters cards
- [ ] Filters bar — patient search filters cards
- [ ] Empty state "hoje" shown when no appointments today
- [ ] Empty state "filtro" shown when filter has no results
- [ ] Error state + retry button when day load fails (simulate by going offline)
- [ ] History view (list tab) — shows patient groups, expandable
- [ ] Navigate to treatment from history row → `/appointments/:id/treatment`

### UI/UX
- [ ] Desktop: 2-column layout visible at 1024px+
- [ ] Tablet (768px–1023px): calendar panel hidden, day panel full width
- [ ] Mobile (375px): date strip visible, stats strip, cards with badges
- [ ] Drawer: opens on right, full-screen on mobile
- [ ] Drawer form sections visible and functional
- [ ] Quick actions dropdown closes on outside click
- [ ] Quick actions: correct items per status (confirm not shown for confirmed, etc.)
- [ ] Status badges consistent: same color = same status everywhere
- [ ] Skeleton loader visible during day load

### Safety
- [ ] Only professional's own appointments shown (professional_id filter)
- [ ] Drawer submit disabled when no patient selected
- [ ] No console.log in production code
- [ ] All form fields retain values on submit failure
