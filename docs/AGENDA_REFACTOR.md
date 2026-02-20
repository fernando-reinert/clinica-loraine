# Refatoração Agenda (Calendar-first + Drawer + Recorrência)

## Objetivo

Tela de Agendamentos no estilo “Minha Agenda” / Google Calendar: visão do dia com grid de horários, criação/edição rápida por clique no horário ou no evento, duração tabelada e recorrência, mantendo o tema glass/neon/cosmic e a gestão completa (lista/histórico + status + integração Google Calendar).

## Arquivos criados

| Arquivo | Motivo |
|---------|--------|
| `supabase/migrations/20260213000000_appointments_recurrence_group.sql` | Adiciona coluna `recurrence_group_id` (uuid) em `appointments` para identificar série de recorrência; índice para buscas. |
| `src/components/appointments/DayCalendarView.tsx` | Componente de visão do dia: coluna de horários (7h–20h), slots clicáveis, blocos de eventos posicionados por início/duração. |
| `src/components/appointments/AppointmentDrawer.tsx` | Modal/drawer create/edit: data e horário, duração (dropdown 5 min–12h), profissional, cliente (autocomplete min 2 chars, debounce 280ms), serviços do catálogo, repetir (semanal/dias/meses/anual), Salvar. |
| `src/components/appointments/appointmentDrawerUtils.ts` | Opções de duração (5–55 min, 1h05–12h) e de recorrência (semanal 1–4, dias 15/20/25, meses 1/2/3/6, anual 1) + helper `getRecurrenceRule`. |
| `docs/AGENDA_REFACTOR.md` | Este documento. |

## Arquivos alterados

| Arquivo | Alterações |
|---------|------------|
| `src/services/appointments/appointmentService.ts` | `listAppointmentsByDay(day)` para buscar apenas o dia (range início/fim do dia); `CreateAppointmentPayload` com `professionalId` e `recurrenceGroupId`; tipo `RecurrenceRule`; `createRecurringAppointments(basePayload, rule, durationMinutes, professionalId)` — cria base + ocorrências (limite 12 ou 1 ano), GCal best-effort por ocorrência, `recurrence_group_id` em todas. |
| `src/utils/dateUtils.ts` | `buildEndTimeFromDurationMinutes(startIso, durationMinutes)` para calcular `end_time` a partir da duração (uso no drawer). |
| `src/screens/AppointmentsScreen.tsx` | Refatorado para calendar-first: estado do dia selecionado, navegação anterior/próximo/hoje, `DayCalendarView` como conteúdo principal, `AppointmentDrawer` para create (clique no slot) e edit (clique no evento ou na lista). Removido botão “Novo Agendamento” do header; histórico em accordion abaixo. Mantidos: exclusão, alteração de status, link para atendimento. |
| `src/types/db.ts` | Inclusão de `recurrence_group_id?: string | null` na interface `Appointment`. |

## Comportamento

- **Dia:** Padrão = hoje; navegação por setas e “Hoje”.
- **Clique em horário vazio:** Abre o drawer em modo create com data/hora do slot.
- **Clique em evento:** Abre o drawer em modo edit.
- **Histórico:** Aba/accordion com filtros (Próximos / Passados / Todos) e ordenação; editar abre o mesmo drawer em edit.
- **Duração:** Dropdown com 5, 10, … 55 min e 1h05 até 12h (incrementos de 5 min).
- **Repetir:** Semanal (1–4), a cada 15/20/25 dias, mensal (1–6 meses), anual. Ao salvar com repetição: cria o primeiro agendamento e gera até 12 ocorrências ou 1 ano; todas com o mesmo `recurrence_group_id`; GCal por ocorrência em best-effort (erro não impede o save, grava `gcal_status`/`gcal_last_error`).

## Compatibilidade

- Fluxo completo em `AppointmentCreateScreen` (procedimentos + pagamento + financeiro + GCal) permanece; a rota e o uso existentes não foram alterados.
- `AppointmentDetailsForm` continua disponível para outros contextos; a tela de Agendamentos passou a usar apenas o `AppointmentDrawer` para create/edit na própria tela.

## Timezone

- `listAppointmentsByDay` usa início e fim do dia em horário local (JavaScript `Date`), adequado para uso no Brasil.
