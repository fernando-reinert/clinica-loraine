-- ============================================
-- Fix RLS recursion: user_profiles SELECT = only own row.
-- Listagem do tenant é feita via Edge Function listTenantUsers (service role).
-- Aplicar no Supabase SQL Editor se a tabela for user_profiles.
-- ============================================

-- Se a tabela se chama user_profiles (não profiles):
DROP POLICY IF EXISTS "user_profiles_select_own_or_owner_tenant" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_owner_tenant" ON public.user_profiles;

CREATE POLICY "user_profiles_select_own"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Se a tabela se chama profiles (migration antiga):
-- DROP POLICY IF EXISTS "profiles_select_own_or_owner_tenant" ON public.profiles;
-- CREATE POLICY "profiles_select_own"
--   ON public.profiles FOR SELECT TO authenticated
--   USING (user_id = auth.uid());
