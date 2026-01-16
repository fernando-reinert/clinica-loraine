/*
  # Migration: Assinaturas JSON + Soft Delete + Controle de Edição
  
  Objetivo:
  1. Adicionar colunas JSONB para armazenar strokes de assinatura (fonte da verdade)
  2. Remover obrigatoriedade de PNG (URLs opcionais)
  3. Adicionar controle de edição/exclusão (soft delete)
*/

-- ============================================
-- 1. ADICIONAR COLUNAS JSONB PARA ASSINATURAS
-- ============================================
ALTER TABLE public.consent_forms
  ADD COLUMN IF NOT EXISTS patient_signature_data jsonb,
  ADD COLUMN IF NOT EXISTS professional_signature_data jsonb;

-- Comentários para documentação
COMMENT ON COLUMN public.consent_forms.patient_signature_data IS 'Strokes/paths da assinatura do paciente em JSON (fonte da verdade)';
COMMENT ON COLUMN public.consent_forms.professional_signature_data IS 'Strokes/paths da assinatura do profissional em JSON (fonte da verdade)';

-- ============================================
-- 2. REMOVER OBRIGATORIEDADE DE PNG (URLs)
-- ============================================
-- Verificar se as colunas existem e têm NOT NULL antes de alterar
DO $$
BEGIN
  -- patient_signature_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'consent_forms' 
    AND column_name = 'patient_signature_url'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.consent_forms
      ALTER COLUMN patient_signature_url DROP NOT NULL;
  END IF;

  -- professional_signature_url
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'consent_forms' 
    AND column_name = 'professional_signature_url'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.consent_forms
      ALTER COLUMN professional_signature_url DROP NOT NULL;
  END IF;
END $$;

-- ============================================
-- 3. ADICIONAR CONTROLE DE EDIÇÃO/EXCLUSÃO
-- ============================================
ALTER TABLE public.consent_forms
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_by uuid;

-- Comentários
COMMENT ON COLUMN public.consent_forms.deleted_at IS 'Data/hora da exclusão (soft delete)';
COMMENT ON COLUMN public.consent_forms.deleted_by IS 'ID do usuário que excluiu';
COMMENT ON COLUMN public.consent_forms.edited_at IS 'Data/hora da última edição';
COMMENT ON COLUMN public.consent_forms.edited_by IS 'ID do usuário que editou';

-- ============================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================
-- Índice para filtrar termos não excluídos (queries mais comuns)
CREATE INDEX IF NOT EXISTS idx_consent_forms_deleted_at 
  ON public.consent_forms(deleted_at) 
  WHERE deleted_at IS NULL;

-- Índice para buscar por patient_id excluindo deletados
CREATE INDEX IF NOT EXISTS idx_consent_forms_patient_active 
  ON public.consent_forms(patient_id, signed_at DESC) 
  WHERE deleted_at IS NULL;

-- ============================================
-- 5. TRIGGER PARA updated_at
-- ============================================
-- Garantir que updated_at seja atualizado automaticamente
CREATE OR REPLACE FUNCTION update_consent_forms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_consent_forms_updated_at ON public.consent_forms;
CREATE TRIGGER trigger_update_consent_forms_updated_at
  BEFORE UPDATE ON public.consent_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_consent_forms_updated_at();

-- ============================================
-- 6. VALIDAÇÃO: Garantir que pelo menos uma forma de assinatura existe
-- ============================================
-- Constraint opcional: se não houver signature_data, deve haver signature_url (fallback)
-- NOTA: Não vamos criar constraint porque pode haver casos legítimos sem nenhuma (durante criação)
-- A validação será feita no código da aplicação
