-- ============================================
-- Admin access: tenants, profiles, admin_access_challenges + RLS
-- Não altera tabelas existentes (professionals permanece).
-- Primeiro owner/tenant pode ser criado via seed ou dashboard.
-- ============================================

-- 1. tenants (se não existir)
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 2. profiles (se não existir)
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'staff')),
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 3. admin_access_challenges
CREATE TABLE IF NOT EXISTS public.admin_access_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id_role ON public.profiles(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_admin_access_challenges_user_expires
  ON public.admin_access_challenges(user_id, expires_at DESC);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_challenges ENABLE ROW LEVEL SECURITY;

-- profiles: select — usuário lê próprio perfil; owner lê todos do mesmo tenant
DROP POLICY IF EXISTS "profiles_select_own_or_owner_tenant" ON public.profiles;
CREATE POLICY "profiles_select_own_or_owner_tenant"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    (user_id = auth.uid())
    OR
    (EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.user_id = auth.uid() AND p2.role = 'owner' AND p2.tenant_id = profiles.tenant_id
    ))
  );

-- profiles: update — owner pode atualizar is_active/role de outros no mesmo tenant (exceto rebaixar a si mesmo)
DROP POLICY IF EXISTS "profiles_update_owner_same_tenant" ON public.profiles;
CREATE POLICY "profiles_update_owner_same_tenant"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.user_id = auth.uid() AND p2.role = 'owner' AND p2.tenant_id = profiles.tenant_id
    )
  )
  WITH CHECK (
    -- não permitir owner rebaixar a si mesmo (só pode alterar se for outro usuário)
    (user_id <> auth.uid())
    OR
    (user_id = auth.uid() AND role = 'owner')
  );

-- profiles: insert — bloqueado para client; apenas service role / Edge Function
DROP POLICY IF EXISTS "profiles_insert_block_client" ON public.profiles;
CREATE POLICY "profiles_insert_block_client"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (false);

-- admin_access_challenges: apenas o próprio user_id (auth.uid())
DROP POLICY IF EXISTS "admin_challenges_own_only" ON public.admin_access_challenges;
CREATE POLICY "admin_challenges_own_only"
  ON public.admin_access_challenges FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.tenants IS 'Tenants (clínicas); owner_user_id = primeiro owner';
COMMENT ON TABLE public.profiles IS 'Perfis por tenant; role owner/staff; insert apenas via Edge Function';
COMMENT ON TABLE public.admin_access_challenges IS 'OTP step-up para painel admin; código só em hash';
