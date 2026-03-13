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
