-- Monjaro: adicionar competence_date (data real) para entradas; manter competence_month (backward compatible).

alter table public.monjaro_ledger
  add column if not exists competence_date date null;

-- Backfill: entradas antigas usam competence_month como competence_date
update public.monjaro_ledger
set competence_date = competence_month
where kind = 'in' and competence_month is not null and competence_date is null;

-- Constraint atualizada: kind='in' exige competence_date; kind='out' exige competence_date null
alter table public.monjaro_ledger
  drop constraint if exists monjaro_ledger_in_requires_patient;

alter table public.monjaro_ledger
  add constraint monjaro_ledger_in_requires_patient check (
    (kind = 'in' and patient_id is not null and competence_date is not null and payment_method is not null)
    or
    (kind = 'out' and patient_id is null and competence_month is null and payment_method is null and competence_date is null)
  );

create index if not exists idx_monjaro_ledger_user_competence_date
  on public.monjaro_ledger (user_id, competence_date);
