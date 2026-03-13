// src/screens/AppointmentsScreen.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List } from 'lucide-react';
import ResponsiveAppLayout from '../components/Layout/ResponsiveAppLayout';
import AppointmentDrawer from '../components/appointments/AppointmentDrawer';
import type { DrawerAppointment } from '../components/appointments/AppointmentDrawer';
import CalendarPanel from '../components/appointments/CalendarPanel';
import DayPanel from '../components/appointments/DayPanel';
import ConfirmDialog from '../components/ConfirmDialog';
import { useAppointmentsPage } from '../hooks/useAppointmentsPage';
import { useAppointmentActions } from '../hooks/useAppointmentActions';
import type { DayAppointment } from '../hooks/useAppointmentsPage';
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

  // Actions adapter that intercepts cancel to show confirm dialog.
  // cancelAppointment must return Promise<void> to satisfy UseAppointmentActionsReturn.
  const actionsWithConfirm = useMemo(() => ({
    ...actions,
    cancelAppointment: (id: string): Promise<void> => {
      handleCancelRequested(id);
      return Promise.resolve();
    },
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

        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-800 flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-slate-100">Agendamentos</h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle (desktop only) */}
            <div className="hidden md:flex items-center gap-1 bg-slate-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => page.setFilters({ view: 'calendar' })}
                className={`p-1.5 rounded-md transition-colors ${page.filters.view === 'calendar' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
                aria-label="Visão calendário"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => page.setFilters({ view: 'list' })}
                className={`p-1.5 rounded-md transition-colors ${page.filters.view === 'list' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'}`}
                aria-label="Visão lista"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => page.openDrawerCreate()}
              className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold text-xs rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo agendamento</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        {/* ── Mobile: horizontal date strip ───────────────────────────── */}
        <div className="md:hidden flex-shrink-0 px-4 py-2 border-b border-slate-800">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - 3 + i);
              const dayNum = d.getDate();
              const isSelected =
                d.getFullYear() === page.selectedDay.getFullYear() &&
                d.getMonth() === page.selectedDay.getMonth() &&
                d.getDate() === page.selectedDay.getDate();
              const isT = d.toDateString() === new Date().toDateString();
              return (
                <button
                  key={i}
                  type="button"
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

        {/* ── Main content ─────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-hidden">

          {/* Desktop: 2-column hybrid layout */}
          <div className="hidden md:grid grid-cols-[260px_1fr] h-full">
            {/* Calendar panel */}
            <div className="border-r border-slate-800 overflow-y-auto">
              <CalendarPanel
                selectedDay={page.selectedDay}
                onSelectDay={page.setSelectedDay}
                allAppointments={page.appointments}
              />
            </div>

            {/* Day panel or list view */}
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
                        type="button"
                        onClick={() => togglePatientGroup(key)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
                      >
                        <span className="text-sm font-medium text-slate-200">{patientName}</span>
                        <span className="text-xs text-slate-500">{appointments.length} consulta{appointments.length !== 1 ? 's' : ''}</span>
                      </button>
                      {expandedPatientKeys.has(key) && (
                        <div className="divide-y divide-slate-700/30">
                          {appointments.map((a) => (
                            <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-300">{convertToBrazilianFormat(a.start_time)}</p>
                                <p className="text-xs text-slate-500 truncate">{a.title}</p>
                              </div>
                              <AppointmentStatusBadge status={a.status} variant="pill" />
                              <button
                                type="button"
                                onClick={() => navigate(`/appointments/${a.id}/treatment`)}
                                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                              >
                                Ver →
                              </button>
                            </div>
                          ))}
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

      {/* ── Drawer ─────────────────────────────────────────────────────── */}
      <AppointmentDrawer
        open={page.drawerOpen}
        onClose={page.closeDrawer}
        onSaved={page.handleDrawerSaved}
        mode={page.drawerMode}
        initialDate={page.drawerInitialDate}
        initialHour={page.drawerInitialHour}
        initialMinute={page.drawerInitialMinute}
        initialAppointment={page.drawerAppointment ? toDrawerAppt(page.drawerAppointment) : null}
        onDeleteRequested={() => setDeleteTarget(page.drawerAppointment)}
      />

      {/* ── Delete confirm dialog ───────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Excluir agendamento"
        message={`Tem certeza que deseja excluir o agendamento de ${deleteTarget?.patient_name ?? ''}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* ── Cancel confirm dialog ───────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        title="Cancelar agendamento"
        message={`Deseja cancelar o agendamento de ${cancelTarget?.patient_name ?? ''}?`}
        confirmLabel="Cancelar agendamento"
        confirmVariant="danger"
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </ResponsiveAppLayout>
  );
}
