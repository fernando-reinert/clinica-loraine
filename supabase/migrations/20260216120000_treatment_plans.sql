-- Treatment Plans (Plano de Tratamento / Proposta)
-- Multi-tenant by user_id; no public links or payments in this migration.

-- Plans header
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Plano de Tratamento',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired')),
  total_price_cents integer NOT NULL DEFAULT 0 CHECK (total_price_cents >= 0),
  notes text,
  validity_days integer NOT NULL DEFAULT 15 CHECK (validity_days > 0 AND validity_days <= 365),
  mask_patient_name_on_share boolean NOT NULL DEFAULT false,
  issued_at date DEFAULT (current_date),
  share_image_path text,
  share_image_generated_at timestamptz,
  share_template_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_user_id ON public.treatment_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_id ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_status ON public.treatment_plans(status);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_issued_at ON public.treatment_plans(issued_at DESC);

-- Plan items (procedure snapshots)
CREATE TABLE IF NOT EXISTS public.treatment_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id uuid NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  procedure_catalog_id uuid REFERENCES public.procedure_catalog(id) ON DELETE SET NULL,
  procedure_name_snapshot text NOT NULL,
  procedure_description_snapshot text,
  unit_price_cents integer NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0 AND quantity <= 999),
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_plan_id ON public.treatment_plan_items(treatment_plan_id);

-- RLS
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treatment_plans_select_own" ON public.treatment_plans;
CREATE POLICY "treatment_plans_select_own" ON public.treatment_plans
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "treatment_plans_insert_own" ON public.treatment_plans;
CREATE POLICY "treatment_plans_insert_own" ON public.treatment_plans
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "treatment_plans_update_own" ON public.treatment_plans;
CREATE POLICY "treatment_plans_update_own" ON public.treatment_plans
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "treatment_plans_delete_own" ON public.treatment_plans;
CREATE POLICY "treatment_plans_delete_own" ON public.treatment_plans
  FOR DELETE USING (user_id = auth.uid());

-- Items: allow access only if user owns the plan
DROP POLICY IF EXISTS "treatment_plan_items_select_own" ON public.treatment_plan_items;
CREATE POLICY "treatment_plan_items_select_own" ON public.treatment_plan_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.treatment_plans p WHERE p.id = treatment_plan_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "treatment_plan_items_insert_own" ON public.treatment_plan_items;
CREATE POLICY "treatment_plan_items_insert_own" ON public.treatment_plan_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.treatment_plans p WHERE p.id = treatment_plan_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "treatment_plan_items_update_own" ON public.treatment_plan_items;
CREATE POLICY "treatment_plan_items_update_own" ON public.treatment_plan_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.treatment_plans p WHERE p.id = treatment_plan_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "treatment_plan_items_delete_own" ON public.treatment_plan_items;
CREATE POLICY "treatment_plan_items_delete_own" ON public.treatment_plan_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.treatment_plans p WHERE p.id = treatment_plan_id AND p.user_id = auth.uid())
  );
