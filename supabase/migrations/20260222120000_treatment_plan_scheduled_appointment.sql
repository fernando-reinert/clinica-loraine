-- Link treatment plan to appointment when "Confirmar procedimento" creates an appointment

-- 1) Add columns to treatment_plans
ALTER TABLE public.treatment_plans
  ADD COLUMN IF NOT EXISTS scheduled_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- 2) Expand status to include 'scheduled' (drop and recreate check if exists)
ALTER TABLE public.treatment_plans
  DROP CONSTRAINT IF EXISTS treatment_plans_status_check;

ALTER TABLE public.treatment_plans
  ADD CONSTRAINT treatment_plans_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'expired', 'revoked', 'scheduled'));

-- 3) Index for lookups by scheduled appointment
CREATE INDEX IF NOT EXISTS idx_treatment_plans_scheduled_appointment_id
  ON public.treatment_plans(scheduled_appointment_id)
  WHERE scheduled_appointment_id IS NOT NULL;

COMMENT ON COLUMN public.treatment_plans.scheduled_appointment_id IS 'Appointment created from "Confirmar procedimento"';
COMMENT ON COLUMN public.treatment_plans.confirmed_at IS 'When the plan was confirmed (appointment created)';
