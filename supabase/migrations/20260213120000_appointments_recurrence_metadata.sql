-- Recurrence metadata for auditing, debugging and future "cancel series" logic.
-- recurrence_count = total occurrences in series (including first).
-- recurrence_index = 1-based index in series.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS recurrence_count integer,
  ADD COLUMN IF NOT EXISTS recurrence_index integer,
  ADD COLUMN IF NOT EXISTS recurrence_rule jsonb;

CREATE INDEX IF NOT EXISTS idx_appointments_recurrence_group_idx
  ON appointments(recurrence_group_id, recurrence_index)
  WHERE recurrence_group_id IS NOT NULL;

COMMENT ON COLUMN appointments.recurrence_count IS 'Total de ocorrências na série (inclui a primeira).';
COMMENT ON COLUMN appointments.recurrence_index IS 'Índice da ocorrência na série (1..recurrence_count).';
COMMENT ON COLUMN appointments.recurrence_rule IS 'Regra de recorrência (intervalo/tipo) usada para gerar a série.';
