# Appointments Module Redesign — Design Spec
**Date:** 2026-03-13
**Status:** Approved
**Author:** Claude Code (brainstorming session with user)

---

## 1. Context & Goals

Redesign the `/appointments` module of clinica-loraine to reach enterprise SaaS standard. This is a **structural UX/UI improvement** with better component architecture and a scalable frontend structure.

### Non-negotiable constraints
- Do NOT break existing functionality
- Do NOT change backend contracts (`appointmentService.ts` is preserved as-is)
- Do NOT remove validations
- Do NOT introduce unnecessary dependencies
- Preserve business rules and data flow integrity

### Success criteria
- Module feels like a product you could charge monthly for
- All 3 device targets work well: desktop (primary), mobile (secondary), tablet (occasional)
- Every interaction state is intentional: loading, error, empty, hover, disabled
- Component architecture follows single-responsibility principle throughout

---

## 2. User Context

- **Users:** 2 people — clinic owner + professional (Loraine)
- **Devices:** Mix — desktop at reception, mobile for checking agenda, occasional tablet
- **Pain points (all confirmed):** form too complex, mobile bad, status unclear, no quick actions, visual noise, slow search

---

## 3. Layout Architecture

### Primary Layout: Hybrid (Calendar + List)

**Desktop (≥1024px):**
```
┌─────────────────────────────────────────────────┐
│ Header: title + search + filters + "+ Novo"     │
├──────────────────┬──────────────────────────────┤
│ CalendarPanel    │ DayPanel                     │
│ (260px fixed)    │ (flex 1)                     │
│                  │                              │
│ Mini calendar    │ Tab: Calendário | Lista geral│
│ Month nav        │                              │
│ Day indicators   │ Day header + stats           │
│                  │ AppointmentCard list         │
│ Today stats:     │ Empty state if no appts      │
│ count/confirmed/ │ Skeleton loader              │
│ pending/revenue  │                              │
└──────────────────┴──────────────────────────────┘
```

**Mobile (<768px):**
```
┌──────────────────────────────┐
│ Header: title + "+ Novo"     │
│ Horizontal date scroll strip │
│ Stats strip (3 cols)         │
├──────────────────────────────┤
│ AppointmentCard stack        │
│ (quick actions always shown) │
└──────────────────────────────┘
```

**Tablet (768px–1023px):**
```
CalendarPanel collapses to top date strip
DayPanel takes full width
Filters become collapsible
```

---

## 4. Component Architecture

### Layer: Screens (orchestration only)
| File | Responsibility |
|------|----------------|
| `AppointmentsScreen.tsx` | Mounts CalendarPanel + DayPanel, owns tab state, calls useAppointmentsPage() |
| `AppointmentTreatmentScreen.tsx` | Unchanged |

### Layer: Panels
| File | Responsibility |
|------|----------------|
| `CalendarPanel.tsx` | Mini monthly calendar, month nav, day dot indicators, today stats cards |
| `DayPanel.tsx` | Day header, appointment list, empty state, skeleton loader |
| `AppointmentFiltersBar.tsx` | Status filter chips, professional filter, patient search input |

### Layer: Components
| File | Responsibility |
|------|----------------|
| `AppointmentCard.tsx` | Single appointment card — time, patient, procedure, status badge, quick actions trigger |
| `AppointmentStatusBadge.tsx` | Pill badge with color by status. Variants: pill, dot, full |
| `AppointmentQuickActions.tsx` | Dropdown menu: Confirmar, Concluir, Remarcar, Cancelar, Editar. Context-aware per status |
| `AppointmentEmptyState.tsx` | Empty state with contextual message (no appts today vs filter returns nothing) |

### Layer: Form Sections (inside AppointmentDrawer)
| File | Responsibility |
|------|----------------|
| `form/PatientSelector.tsx` | Patient search input + dropdown results + selected state. Uses usePatientSearch() |
| `form/DateTimeSection.tsx` | Date picker, time picker, duration selector, recurrence |
| `form/ProcedurePlanSection.tsx` | Procedure search + plan items list + per-item price/discount/quantity |
| `form/PaymentSection.tsx` | Payment method selector, totals, conditional visibility |

### Layer: Refactored Components
| File | Change |
|------|--------|
| `AppointmentDrawer.tsx` | Decomposed — now composes the 4 form sections. State extracted to useAppointmentDrawer() |
| `DayCalendarView.tsx` | Kept for calendar grid visualization if needed, or removed if DayPanel replaces it |

### Layer: Hooks (new)
| Hook | Responsibility |
|------|----------------|
| `useAppointmentsPage.ts` | Selected day state, loadDayAppointments, loadAppointments, filter state, refresh trigger. Fixes missing professional_id filter |
| `useAppointmentDrawer.ts` | Form state (all useState extracted from drawer), submit logic, create vs edit mode |
| `usePatientSearch.ts` | Debounced patient search, results, selection, clear. Reusable across drawer and create screen |
| `useAppointmentActions.ts` | Confirm/cancel/complete/reschedule with confirmation dialogs. Calls service layer |

### Layer: Utilities (new)
| File | Responsibility |
|------|----------------|
| `utils/dateUtils.ts` | Centralize: toDatetimeLocal(), convertToSupabaseFormat(), combineDateWithTime(), buildEndTimeIso(). Replace 5 scattered implementations |

### Layer: Services (untouched)
`appointmentService.ts` — preserved as-is. All business logic and Supabase contracts intact.

**Actual method signatures used (do not rename):**
- `listAppointmentsByDay(day: Date)` — used by `useAppointmentsPage` for day view
- `listAppointmentsWithProcedures(daysBefore, daysAfter)` — used by `useAppointmentsPage` for general list view
- `createAppointmentWithProcedures(payload)` — used by `useAppointmentDrawer`
- `updateAppointmentWithProcedures(appointmentId, payload)` — used by `useAppointmentDrawer`
- `updateAppointmentStatus(appointmentId, status)` — used by `useAppointmentActions`
- `deleteAppointment(id)` — used by `useAppointmentActions`

---

## 5. UX Design Decisions

### 5.1 AppointmentCard
- Left colored border = status indicator (instant visual scan)
- Time + duration in compact column on left
- Patient name (bold) + procedure (muted) in center
- Status badge + `⋯` menu on right
- Mobile: quick action buttons always visible (no `⋯` needed on touch)
- Hover: subtle background lift + show full action menu
- Completed appointments: 70% opacity

### 5.2 Status System
| Status | Color | Border | Badge bg |
|--------|-------|--------|----------|
| scheduled | blue #3b82f6 | left-border | rgba(59,130,246,.15) |
| confirmed | green #10b981 | left-border | rgba(16,185,129,.15) |
| completed | purple #8b5cf6 | left-border | rgba(139,92,246,.15) |
| cancelled | red #ef4444 | left-border | rgba(239,68,68,.15) |
| no_show | orange #f97316 | left-border | rgba(249,115,22,.15) |
| rescheduled | amber #f59e0b | left-border | rgba(245,158,11,.15) |

### 5.3 Quick Actions
Context-aware menu items by current status:
- **scheduled** → Confirmar, Remarcar, Cancelar, Editar
- **confirmed** → Marcar como Realizado, Marcar Falta, Remarcar, Cancelar, Editar
- **completed** → Ver tratamento, Editar (readonly)
- **cancelled/no_show** → Reagendar, Editar (readonly)

All destructive actions (cancel, delete) require confirmation dialog before executing.

### 5.4 AppointmentDrawer Form
Sections displayed progressively:
1. **Paciente** (always visible, required first)
2. **Data e horário** (always visible)
3. **Procedimentos** (always visible, optional)
4. **Pagamento** (visible only when plan has items — current behavior preserved)
5. **Histórico** (collapsible, edit mode only)

Drawer width: `min(560px, 95vw)` — slightly wider than current for breathing room.
Mobile: full-screen bottom sheet with safe-area padding.

### 5.5 Loading States
- **Day list**: skeleton cards (3 placeholder cards during load)
- **Patient search**: spinner icon inside input
- **Procedure search**: spinner inside dropdown
- **Quick actions**: button shows spinner while mutation runs, then optimistic update
- **Drawer submit**: full submit button loading state

### 5.6 Error States
- **Day load failure**: inline error banner inside DayPanel with "Tentar novamente" button. Does not crash the whole screen.
- **Quick action failure**: toast.error with specific message. Button returns to normal state.
- **Drawer submit failure**: inline error message below form submit button. Form remains open with data preserved.
- **Patient search failure**: inline "Erro ao buscar pacientes" with retry option inside dropdown.
- **No network / Supabase down**: generic error state per component. Components degrade independently.

### 5.7 Empty States
- **No appointments today**: illustration placeholder + "Nenhum agendamento para hoje. Que tal criar um?" + CTA button
- **Filter returns nothing**: "Nenhum resultado para os filtros aplicados." + clear filters link
- **Day in the past with no appointments**: simplified, no CTA

### 5.8 Mobile-Specific
- Horizontal date strip (7-day scroll, today highlighted)
- Stats strip: 3 columns (total / confirmados / valor previsto)
- Cards have inline quick actions (3 buttons: Editar, primary action, Cancelar)
- Primary action changes by status: "Confirmar" for scheduled, "Concluir" for confirmed
- Min touch target: 44px height on all interactive elements
- Drawer becomes full-screen modal on mobile
- Safe area insets respected (`env(safe-area-inset-bottom)`)

---

## 6. Data Flow

```
AppointmentsScreen
  └── useAppointmentsPage()
        ├── selectedDay (state)
        ├── loadDayAppointments() → appointmentService.listAppointmentsByDay(day)
        │     + client-side filter by professional_id (RLS covers DB layer;
        │       hook filters results as extra safety since service has no param)
        ├── loadAppointments() → appointmentService.listAppointmentsWithProcedures()
        │     + client-side filter by professional_id (same rationale)
        └── filters (status, professionalId)

AppointmentCard
  └── useAppointmentActions()
        ├── confirmAppointment(id) → appointmentService.updateAppointmentStatus(id, 'confirmed')
        ├── completeAppointment(id) → appointmentService.updateAppointmentStatus(id, 'completed')
        ├── cancelAppointment(id) → appointmentService.updateAppointmentStatus(id, 'cancelled')
        └── onSuccess: triggers useAppointmentsPage refresh

AppointmentDrawer
  └── useAppointmentDrawer()
        ├── form state (patient, datetime, procedures, payment)
        ├── submit() → appointmentService.create() or appointmentService.update()
        └── PatientSelector → usePatientSearch()
```

---

## 7. Critical Bug Fix (in scope)

**Missing professional_id filter in AppointmentsScreen** — currently loads all appointments without scoping to the logged-in professional. RLS at the database layer provides the primary protection. `useAppointmentsPage` will add an explicit client-side filter on `professional_id` as defense-in-depth. The service methods are not modified (they rely on RLS). This is consistent with the service's existing pattern at line 948 of `appointmentService.ts`.

---

## 8. Out of Scope

- Changes to `appointmentService.ts`
- Changes to database schema
- Changes to `AppointmentTreatmentScreen`
- Multi-column calendar (not needed for 2-person team)
- Pagination (appointments volume doesn't warrant it yet — can add later)
- Bulk operations
- N+1 query fix in `listAppointmentsWithProcedures` (service layer — separate PR)

---

## 9. File Impact Summary

### New files (15)
- `src/components/appointments/AppointmentCard.tsx`
- `src/components/appointments/AppointmentStatusBadge.tsx`
- `src/components/appointments/AppointmentQuickActions.tsx`
- `src/components/appointments/AppointmentEmptyState.tsx`
- `src/components/appointments/CalendarPanel.tsx`
- `src/components/appointments/DayPanel.tsx`
- `src/components/appointments/AppointmentFiltersBar.tsx`
- `src/components/appointments/form/PatientSelector.tsx`
- `src/components/appointments/form/DateTimeSection.tsx`
- `src/components/appointments/form/ProcedurePlanSection.tsx`
- `src/components/appointments/form/PaymentSection.tsx`
- `src/hooks/useAppointmentsPage.ts`
- `src/hooks/useAppointmentDrawer.ts`
- `src/hooks/usePatientSearch.ts`
- `src/hooks/useAppointmentActions.ts`

### Extended files (1)
- `src/utils/dateUtils.ts` — already exists (used by appointmentService.ts). Extended with centralized date conversion functions currently scattered across components: `toDatetimeLocal()`, `convertToSupabaseFormat()`, `combineDateWithTime()`. Existing exports (`addMinutesToDate`, `convertToBrazilianFormat`, `isToday`) are preserved unchanged.

### Modified files (3)
- `src/screens/AppointmentsScreen.tsx` — refactored to use new panels + hook
- `src/components/appointments/AppointmentDrawer.tsx` — decomposed, uses form sections + useAppointmentDrawer
- `src/components/appointments/AppointmentDetailsForm.tsx` — replaced by form sections. **Callsite audit:** only imported by `AppointmentDrawer.tsx` (grep confirmed single consumer). Safe to replace inline; no other screens reference it.

### Status color reference
Section 5.2 uses hex values for illustration only. Implementation MUST use `AppointmentStatusConfig` from `src/constants/appointmentStatus.ts` as the single source of truth for colors, labels, and badge classes. No new color definitions.

### Untouched files
- `src/services/appointments/appointmentService.ts`
- `src/types/appointmentPlan.ts`
- `src/constants/appointmentStatus.ts`
- `src/screens/AppointmentCreateScreen.tsx` (separate refactor if needed)
- `src/screens/AppointmentTreatmentScreen.tsx`

---

## 10. QA Checklist

- [ ] Create appointment — all fields, with procedures and payment
- [ ] Edit appointment — change date, patient, procedures
- [ ] Confirm appointment via quick action
- [ ] Mark as completed via quick action
- [ ] Cancel appointment with confirmation dialog
- [ ] Reschedule — change date/time via drawer
- [ ] Filter by status — verify cards update
- [ ] Filter by patient name — search works
- [ ] Navigate calendar days — day list updates
- [ ] Empty state visible on day with no appointments
- [ ] Skeleton loader visible during day load
- [ ] Desktop layout — 2-column, no overflow
- [ ] Tablet layout — no overflow, readable density
- [ ] Mobile layout — date strip, stats, inline actions, 44px targets
- [ ] Mobile drawer — full screen, safe area respected
- [ ] Tenant isolation — only logged-in professional's appointments shown
- [ ] No console.log in production code
- [ ] Build passes (tsc + vite build)
- [ ] Error state shown when day fails to load
- [ ] Quick action failure shows toast and button recovers
- [ ] Drawer form preserved on submit failure
