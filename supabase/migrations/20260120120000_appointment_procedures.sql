-- Tabela de itens de agendamento (procedimentos por agendamento)
CREATE TABLE IF NOT EXISTS appointment_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  procedure_catalog_id uuid NOT NULL REFERENCES procedure_catalog(id) ON DELETE RESTRICT,
  procedure_name_snapshot text NOT NULL,
  final_price numeric(10, 2) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  discount numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Se a tabela já existe com procedure_id, migrar para procedure_catalog_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointment_procedures' 
    AND column_name = 'procedure_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointment_procedures' 
    AND column_name = 'procedure_catalog_id'
  ) THEN
    -- Adicionar nova coluna
    ALTER TABLE appointment_procedures 
    ADD COLUMN procedure_catalog_id uuid REFERENCES procedure_catalog(id) ON DELETE RESTRICT;
    
    -- Copiar dados de procedure_id para procedure_catalog_id
    UPDATE appointment_procedures 
    SET procedure_catalog_id = procedure_id 
    WHERE procedure_id IS NOT NULL;
    
    -- Tornar NOT NULL
    ALTER TABLE appointment_procedures 
    ALTER COLUMN procedure_catalog_id SET NOT NULL;
    
    -- Remover coluna antiga
    ALTER TABLE appointment_procedures 
    DROP COLUMN procedure_id;
  END IF;
END $$;

ALTER TABLE appointment_procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their appointment procedures"
  ON appointment_procedures
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_appointment_procedures_updated_at
BEFORE UPDATE ON appointment_procedures
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_appointment_procedures_appointment_id
  ON appointment_procedures(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_procedures_user_id
  ON appointment_procedures(user_id);

