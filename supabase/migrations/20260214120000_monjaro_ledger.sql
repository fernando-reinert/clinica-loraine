-- Monjaro Ledger (cash in/out) - production-grade schema
-- Requires pgcrypto for gen_random_uuid (Supabase geralmente já tem). Se não tiver:
-- create extension if not exists pgcrypto;

create table if not exists public.monjaro_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  kind text not null check (kind in ('in','out')),

  patient_id uuid null references public.patients(id) on delete set null,

  -- store competence as first day of month (YYYY-MM-01) for monthly payments
  competence_month date null,

  amount_cents integer not null check (amount_cents > 0),

  -- only for 'in'
  payment_method text null check (payment_method in ('cash','pix','card')),

  note text null,

  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  -- Guardrails (kind-specific requirements)
  constraint monjaro_ledger_in_requires_patient
    check (
      (kind = 'in' and patient_id is not null and competence_month is not null and payment_method is not null)
      or
      (kind = 'out' and patient_id is null and competence_month is null and payment_method is null)
    )
);

-- Indexes
create index if not exists idx_monjaro_ledger_user_occurred_at
  on public.monjaro_ledger (user_id, occurred_at desc);

create index if not exists idx_monjaro_ledger_user_competence
  on public.monjaro_ledger (user_id, competence_month);

create index if not exists idx_monjaro_ledger_user_kind
  on public.monjaro_ledger (user_id, kind);

create index if not exists idx_monjaro_ledger_user_patient
  on public.monjaro_ledger (user_id, patient_id);

-- One entry per patient per month (only for kind='in')
create unique index if not exists monjaro_ledger_unique_in_per_patient_month
  on public.monjaro_ledger (user_id, patient_id, competence_month)
  where kind = 'in';

-- RLS
alter table public.monjaro_ledger enable row level security;

drop policy if exists "monjaro_ledger_select_own" on public.monjaro_ledger;
create policy "monjaro_ledger_select_own"
on public.monjaro_ledger
for select
using (user_id = auth.uid());

drop policy if exists "monjaro_ledger_insert_own" on public.monjaro_ledger;
create policy "monjaro_ledger_insert_own"
on public.monjaro_ledger
for insert
with check (user_id = auth.uid());

drop policy if exists "monjaro_ledger_update_own" on public.monjaro_ledger;
create policy "monjaro_ledger_update_own"
on public.monjaro_ledger
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "monjaro_ledger_delete_own" on public.monjaro_ledger;
create policy "monjaro_ledger_delete_own"
on public.monjaro_ledger
for delete
using (user_id = auth.uid());
