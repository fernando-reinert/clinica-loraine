/*
  # Tabela para anexos de consultas (fotos de produtos utilizados)
  
  Esta tabela armazena fotos de etiquetas/lotes de produtos utilizados em consultas,
  servindo como comprovação clínica e legal dos produtos aplicados no paciente.
*/

-- ============================================
-- CONSULTATION_ATTACHMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS consultation_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id uuid NOT NULL,
  patient_id uuid NOT NULL,
  attachment_type text DEFAULT 'product_photo' CHECK (attachment_type IN ('product_photo', 'document', 'other')),
  file_url text NOT NULL,
  file_path text NOT NULL, -- Path no storage para signed URLs
  file_name text,
  file_size integer,
  mime_type text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Foreign Keys
DO $$
BEGIN
  -- FK para consultations (se existir)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consultations') THEN
    ALTER TABLE consultation_attachments 
    ADD CONSTRAINT IF NOT EXISTS fk_consultation_attachments_consultation 
    FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE;
  END IF;
  
  -- FK para patients
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
    ALTER TABLE consultation_attachments 
    ADD CONSTRAINT IF NOT EXISTS fk_consultation_attachments_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_consultation_attachments_consultation_id ON consultation_attachments(consultation_id);
CREATE INDEX IF NOT EXISTS idx_consultation_attachments_patient_id ON consultation_attachments(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultation_attachments_created_at ON consultation_attachments(created_at);

-- Habilitar RLS
ALTER TABLE consultation_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (permitir acesso aos profissionais autenticados)
CREATE POLICY "Professionals can view consultation attachments"
  ON consultation_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can insert consultation attachments"
  ON consultation_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can delete consultation attachments"
  ON consultation_attachments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM professionals p
      WHERE p.user_id = auth.uid()
    )
  );
