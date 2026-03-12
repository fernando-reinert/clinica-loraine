-- Migration: WhatsApp automation flags and reminders log
-- Adds tracking columns to appointments and creates deduplication log table.

-- Flags on appointments to prevent duplicate sends
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS whatsapp_confirmation_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent boolean NOT NULL DEFAULT false;

-- Log table for reminder deduplication (used by whatsapp-reminder-cron)
CREATE TABLE IF NOT EXISTS whatsapp_reminders_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid    NOT NULL,
  type       text        NOT NULL, -- 'confirmation' | 'reminder_1h'
  phone      text        NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id, type)
);

CREATE INDEX IF NOT EXISTS whatsapp_reminders_log_appointment_idx
  ON whatsapp_reminders_log (appointment_id);
