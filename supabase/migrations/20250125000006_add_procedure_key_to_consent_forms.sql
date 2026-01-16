/*
  # Adicionar procedure_key aos consent_forms
  
  Adiciona coluna procedure_key (slug) para vincular termos aos procedimentos
  mesmo quando não há visit_procedure vinculado.
*/

-- Adicionar coluna procedure_key se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consent_forms' 
    AND column_name = 'procedure_key'
  ) THEN
    -- Adicionar coluna com DEFAULT temporário para permitir adicionar em tabela existente
    ALTER TABLE consent_forms 
    ADD COLUMN procedure_key text NOT NULL DEFAULT '';
    
    -- Atualizar registros existentes com valor padrão (se houver)
    UPDATE consent_forms 
    SET procedure_key = '' 
    WHERE procedure_key IS NULL OR procedure_key = '';
    
    -- Remover DEFAULT após popular dados existentes
    ALTER TABLE consent_forms 
    ALTER COLUMN procedure_key DROP DEFAULT;
    
    -- Criar índice
    CREATE INDEX IF NOT EXISTS idx_consent_forms_procedure_key 
    ON consent_forms(procedure_key);
  END IF;
END $$;
