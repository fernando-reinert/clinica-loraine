-- Public tokenized read-only treatment plan viewer
-- Security: NO public select on treatment_plans. Access only via RPC by token.

-- 1) Add columns to treatment_plans
ALTER TABLE public.treatment_plans
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS public_link_generated_at timestamptz;

-- 2) Add revoked to status; drop and recreate check
ALTER TABLE public.treatment_plans
  DROP CONSTRAINT IF EXISTS treatment_plans_status_check;
ALTER TABLE public.treatment_plans
  ADD CONSTRAINT treatment_plans_status_check
  CHECK (status IN ('draft', 'sent', 'accepted', 'expired', 'revoked'));

-- 3) Index for token lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_treatment_plans_public_token
  ON public.treatment_plans(public_token)
  WHERE public_token IS NOT NULL;

-- 4) RPC: get_public_treatment_plan(token)
-- SECURITY DEFINER: runs with owner privileges, bypasses RLS
-- Returns public DTO only if token valid, status=sent, and not expired/revoked
CREATE OR REPLACE FUNCTION public.get_public_treatment_plan(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan record;
  v_items jsonb;
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  SELECT
    tp.id,
    tp.patient_id,
    tp.title,
    tp.status,
    tp.total_price_cents,
    tp.notes,
    tp.validity_days,
    tp.mask_patient_name_on_share,
    tp.issued_at,
    tp.expires_at,
    tp.public_token
  INTO v_plan
  FROM public.treatment_plans tp
  WHERE tp.public_token = trim(p_token)
  LIMIT 1;

  IF v_plan.id IS NULL THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  IF v_plan.status != 'sent' AND v_plan.status != 'accepted' THEN
    RETURN jsonb_build_object('error', 'revoked_or_invalid');
  END IF;

  IF v_plan.expires_at IS NOT NULL AND v_plan.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  -- Increment view_count and set first_viewed_at on first access
  UPDATE public.treatment_plans
  SET
    view_count = view_count + 1,
    first_viewed_at = COALESCE(first_viewed_at, now()),
    updated_at = now()
  WHERE id = v_plan.id;

  -- Fetch items (snapshots)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ti.id,
      'procedure_name_snapshot', ti.procedure_name_snapshot,
      'procedure_description_snapshot', ti.procedure_description_snapshot,
      'unit_price_cents', ti.unit_price_cents,
      'quantity', ti.quantity,
      'line_total_cents', ti.unit_price_cents * ti.quantity
    )
    ORDER BY ti.sort_order, ti.id
  )
  INTO v_items
  FROM public.treatment_plan_items ti
  WHERE ti.treatment_plan_id = v_plan.id;

  IF v_items IS NULL THEN
    v_items := '[]'::jsonb;
  END IF;

  v_result := jsonb_build_object(
    'plan', jsonb_build_object(
      'title', v_plan.title,
      'total_price_cents', v_plan.total_price_cents,
      'notes', v_plan.notes,
      'validity_days', v_plan.validity_days,
      'mask_patient_name_on_share', v_plan.mask_patient_name_on_share,
      'patient_display_name', COALESCE(
        (SELECT CASE
          WHEN v_plan.mask_patient_name_on_share THEN 'Paciente'
          ELSE NULLIF(split_part(p.name, ' ', 1), '')
        END
        FROM public.patients p
        WHERE p.id = v_plan.patient_id),
        'Paciente'
      ),
      'issued_at', v_plan.issued_at,
      'expires_at', v_plan.expires_at
    ),
    'items', v_items
  );

  RETURN v_result;
END;
$$;

-- 5) Grant execute to anon and authenticated (public link uses anon)
GRANT EXECUTE ON FUNCTION public.get_public_treatment_plan(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_treatment_plan(text) TO authenticated;

COMMENT ON FUNCTION public.get_public_treatment_plan(text) IS
  'Returns public treatment plan DTO by token. Only sent/accepted, not expired. No user_id or internal data.';
