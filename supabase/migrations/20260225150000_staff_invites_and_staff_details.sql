-- ============================================
-- Staff invite by link: staff_invites, staff_details.
-- user_profiles: ensure role in ('owner','viewer','staff','admin').
-- Does NOT alter public.profiles (that table is for other data and has no role column).
-- Idempotent: safe to run multiple times.
-- ============================================

-- 1. staff_invites (code stored as SHA-256 hash only)
CREATE TABLE IF NOT EXISTS public.staff_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_email text NOT NULL,
  invite_email_normalized text NOT NULL,
  code_hash text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('viewer', 'staff', 'admin')),
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_invites_tenant_expires
  ON public.staff_invites(tenant_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_staff_invites_email_norm
  ON public.staff_invites(invite_email_normalized);

-- One active invite per email per tenant is enforced in Edge Function logic (no partial unique index: now() is not immutable).

COMMENT ON TABLE public.staff_invites IS 'Convites por link para staff; código só em hash; single-use, email-locked.';

-- 2. staff_details (extra profile data for staff signup)
CREATE TABLE IF NOT EXISTS public.staff_details (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  birth_date date NULL,
  cpf text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.staff_details IS 'Dados extras do cadastro staff (nome, nascimento, CPF).';

-- 3. user_profiles only: ensure role supports ('owner','viewer','staff','admin')
-- (public.profiles is a different table and is not modified here.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
    ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
    ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check
      CHECK (role IN ('owner', 'viewer', 'staff', 'admin'));
  END IF;
END $$;

-- 4. RLS: staff_invites and staff_details are only written by Edge Functions (service role).
ALTER TABLE public.staff_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_invites_no_client" ON public.staff_invites;
CREATE POLICY "staff_invites_no_client" ON public.staff_invites FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "staff_details_no_client" ON public.staff_details;
CREATE POLICY "staff_details_no_client" ON public.staff_details FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Service role bypasses RLS by default.
