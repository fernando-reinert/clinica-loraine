/*
  # RLS Policies para consent_forms
  
  Políticas de Row Level Security para permitir que usuários autenticados
  possam gerenciar seus próprios termos de consentimento.
  
  ⚠️ IMPORTANTE: Verifique se as políticas já existem antes de executar.
  Se já existirem, apenas documente e não execute novamente.
*/

-- Habilitar RLS (se ainda não estiver habilitado)
ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS
-- ============================================

-- SELECT: Usuários autenticados podem ver termos de seus pacientes
-- (assumindo que professional_id corresponde ao user_id do profissional)
DROP POLICY IF EXISTS "Professionals can view their consent forms" ON public.consent_forms;
CREATE POLICY "Professionals can view their consent forms"
  ON public.consent_forms
  FOR SELECT
  TO authenticated
  USING (
    -- Profissional pode ver termos onde ele é o professional_id
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
    OR
    -- Ou se criou o termo (created_by = auth.uid(), se coluna existir)
    (EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'consent_forms' 
      AND column_name = 'created_by'
    ) AND created_by = auth.uid())
  );

-- INSERT: Usuários autenticados podem criar termos
DROP POLICY IF EXISTS "Professionals can create consent forms" ON public.consent_forms;
CREATE POLICY "Professionals can create consent forms"
  ON public.consent_forms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Profissional deve ser o professional_id do termo
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- UPDATE: Usuários autenticados podem atualizar termos que criaram
DROP POLICY IF EXISTS "Professionals can update their consent forms" ON public.consent_forms;
CREATE POLICY "Professionals can update their consent forms"
  ON public.consent_forms
  FOR UPDATE
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- DELETE: Usuários autenticados podem fazer soft delete de termos que criaram
-- (soft delete = update deleted_at, não delete físico)
DROP POLICY IF EXISTS "Professionals can delete their consent forms" ON public.consent_forms;
CREATE POLICY "Professionals can delete their consent forms"
  ON public.consent_forms
  FOR UPDATE -- Soft delete é um UPDATE, não DELETE
  TO authenticated
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- NOTAS
-- ============================================
-- 
-- Se o projeto usa created_by diretamente (não via professionals.user_id),
-- ajustar as políticas para usar created_by = auth.uid().
--
-- Para admin/superuser, pode adicionar política adicional:
-- USING (auth.jwt() ->> 'role' = 'admin')
--
-- Se precisar de acesso mais restrito, ajustar conforme necessário.
