-- chore(db): add Google Calendar tracking columns to appointments
-- Persistência de eventId/link/status para integração com Google Calendar (Edge Functions).

-- Colunas para sincronização com Google Calendar
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS gcal_event_id text,
  ADD COLUMN IF NOT EXISTS gcal_event_link text,
  ADD COLUMN IF NOT EXISTS gcal_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS gcal_last_error text,
  ADD COLUMN IF NOT EXISTS gcal_updated_at timestamptz;

-- Backfill gcal_event_id a partir de google_event_id (se existir)
UPDATE appointments
SET gcal_event_id = google_event_id
WHERE google_event_id IS NOT NULL AND (gcal_event_id IS NULL OR gcal_event_id = '');

-- Índice para buscas por eventId (idempotência / lookup)
CREATE INDEX IF NOT EXISTS idx_appointments_gcal_event_id ON appointments(gcal_event_id)
  WHERE gcal_event_id IS NOT NULL;

COMMENT ON COLUMN appointments.gcal_event_id IS 'Google Calendar event ID (idempotência create/update)';
COMMENT ON COLUMN appointments.gcal_status IS 'pending | synced | error | cancelled';
