-- ============================================
-- RLS user_profiles: owner pode ler todos do mesmo tenant SEM recursão.
-- Usa função SECURITY DEFINER para evitar subquery na mesma tabela na policy.
-- ============================================

-- Função: retorna true se auth.uid() é owner ativo do tenant (usa definer, sem RLS na leitura).
CREATE OR REPLACE FUNCTION public.current_user_is_owner_of_tenant(check_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.tenant_id = check_tenant_id
      AND up.role = 'owner'
      AND up.is_active = true
  );
$$;

-- Comentário para documentar
COMMENT ON FUNCTION public.current_user_is_owner_of_tenant(uuid) IS
  'Usado na policy SELECT de user_profiles para permitir owner ler mesmo tenant sem recursão.';

-- Remover policy antiga (só próprio ou a que causava recursão)
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_own_or_owner_tenant" ON public.user_profiles;
DROP POLICY IF EXISTS "profiles_select_own_or_owner_tenant" ON public.user_profiles;

-- Nova policy: próprio perfil OU owner do mesmo tenant (via função, sem subquery na tabela)
CREATE POLICY "user_profiles_select_own_or_owner_tenant"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_is_owner_of_tenant(tenant_id)
  );
