-- chore(db): add recurrence_group_id to appointments for recurring series
-- Permite identificar série de recorrência e ações futuras (ex.: cancelar só esta vs cancelar série).

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS recurrence_group_id uuid;

CREATE INDEX IF NOT EXISTS idx_appointments_recurrence_group_id
  ON appointments(recurrence_group_id)
  WHERE recurrence_group_id IS NOT NULL;

COMMENT ON COLUMN appointments.recurrence_group_id IS 'UUID da série de recorrência; null = agendamento único';
