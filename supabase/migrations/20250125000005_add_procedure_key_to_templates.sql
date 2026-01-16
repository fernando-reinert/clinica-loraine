/*
  # Adicionar procedure_key aos consent_templates
  
  Adiciona coluna procedure_key (slug) para vincular templates aos procedimentos
*/

-- Adicionar coluna procedure_key se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'consent_templates' 
    AND column_name = 'procedure_key'
  ) THEN
    ALTER TABLE consent_templates 
    ADD COLUMN procedure_key text;
    
    -- Criar índice
    CREATE INDEX IF NOT EXISTS idx_consent_templates_procedure_key 
    ON consent_templates(procedure_key);
    
    -- Atualizar templates existentes com procedure_key baseado em procedure_name
    -- (usar função slugify se disponível, ou fazer manualmente)
    UPDATE consent_templates 
    SET procedure_key = LOWER(REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(procedure_name, '[áàâãä]', 'a', 'gi'),
          '[éèêë]', 'e', 'gi'
        ),
        '[íìîï]', 'i', 'gi'
      ),
      '[^a-z0-9]+', '-', 'g'
    ))
    WHERE procedure_key IS NULL;
  END IF;
END $$;
