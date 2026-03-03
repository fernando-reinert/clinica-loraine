-- Professional appointment status system + audit history
-- Status values: scheduled | confirmed | completed | cancelled | no_show | rescheduled
-- Timestamps: confirmed_at, completed_at, cancelled_at, no_show_at, rescheduled_at
-- Table: appointment_history with triggers; RLS

-- ============================================
-- 1) Expand appointments.status + add timestamp columns
-- ============================================

-- Drop existing status check (name may vary; try common variants)
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_fkey;

-- Normalize legacy status values to new enum
UPDATE public.appointments
SET status = 'completed'
WHERE status IN ('completed_with_sale', 'completed_no_sale', 'in_progress');

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'));

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS no_show_at timestamptz,
  ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz;

COMMENT ON COLUMN public.appointments.confirmed_at IS 'When clinic manually confirmed the appointment';
COMMENT ON COLUMN public.appointments.completed_at IS 'When appointment was marked completed';
COMMENT ON COLUMN public.appointments.cancelled_at IS 'When appointment was cancelled';
COMMENT ON COLUMN public.appointments.no_show_at IS 'When marked as patient no-show';
COMMENT ON COLUMN public.appointments.rescheduled_at IS 'When appointment was rescheduled to another time';

-- ============================================
-- 2) appointment_history table
-- ============================================

CREATE TABLE IF NOT EXISTS public.appointment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'created', 'updated', 'status_changed', 'deleted', 'google_sync_error'
  )),
  old_data jsonb,
  new_data jsonb,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_history_appointment_created
  ON public.appointment_history(appointment_id, created_at DESC);

COMMENT ON TABLE public.appointment_history IS 'Audit log of appointment changes (triggers + manual google_sync_error)';

-- ============================================
-- 3) Trigger function: record history on appointments change
-- ============================================

CREATE OR REPLACE FUNCTION public.appointment_history_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
    v_old := NULL;
    v_new := to_jsonb(NEW);
    INSERT INTO public.appointment_history (appointment_id, action_type, new_data, performed_by, created_at)
    VALUES (NEW.id, v_action, v_new, auth.uid(), now());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      v_action := 'status_changed';
    ELSE
      v_action := 'updated';
    END IF;
    INSERT INTO public.appointment_history (appointment_id, action_type, old_data, new_data, performed_by, created_at)
    VALUES (NEW.id, v_action, v_old, v_new, auth.uid(), now());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deleted';
    v_old := to_jsonb(OLD);
    INSERT INTO public.appointment_history (appointment_id, action_type, old_data, performed_by, created_at)
    VALUES (OLD.id, v_action, v_old, auth.uid(), now());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS appointment_history_trigger ON public.appointments;
CREATE TRIGGER appointment_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.appointment_history_trigger_fn();

-- ============================================
-- 4) RLS on appointment_history
-- ============================================

ALTER TABLE public.appointment_history ENABLE ROW LEVEL SECURITY;

-- SELECT/INSERT only when the appointment belongs to the same professional (appointments.professional_id = auth.uid())
-- No UPDATE or DELETE on history rows

DROP POLICY IF EXISTS "appointment_history_select_own" ON public.appointment_history;
CREATE POLICY "appointment_history_select_own"
  ON public.appointment_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_history.appointment_id
      AND a.professional_id = auth.uid()
    )
  );

-- Insert: only via trigger (trigger runs with SECURITY DEFINER) or from backend with same ownership check
-- Allow INSERT so that application can write google_sync_error rows; restrict to own appointments
DROP POLICY IF EXISTS "appointment_history_insert_own" ON public.appointment_history;
CREATE POLICY "appointment_history_insert_own"
  ON public.appointment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.appointments a
      WHERE a.id = appointment_history.appointment_id
      AND a.professional_id = auth.uid()
    )
  );

-- No UPDATE or DELETE policies => no one can update/delete history
