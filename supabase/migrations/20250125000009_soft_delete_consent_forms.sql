/*
  # Migration: Soft Delete para consent_forms
  
  Adiciona colunas para soft delete (deleted_at, deleted_by)
  Se as colunas já existirem (da migration anterior), não faz nada (idempotente)
*/

-- Adicionar colunas de soft delete se não existirem
ALTER TABLE public.consent_forms
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Comentários
COMMENT ON COLUMN public.consent_forms.deleted_at IS 'Data/hora da exclusão (soft delete)';
COMMENT ON COLUMN public.consent_forms.deleted_by IS 'ID do usuário que excluiu';

-- Índice para filtrar excluídos (queries mais comuns)
CREATE INDEX IF NOT EXISTS idx_consent_forms_deleted_at 
  ON public.consent_forms(deleted_at) 
  WHERE deleted_at IS NULL;

-- Índice para buscar por patient_id excluindo deletados
CREATE INDEX IF NOT EXISTS idx_consent_forms_patient_active 
  ON public.consent_forms(patient_id, signed_at DESC) 
  WHERE deleted_at IS NULL;
