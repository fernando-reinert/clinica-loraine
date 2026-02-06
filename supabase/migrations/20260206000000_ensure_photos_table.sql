/*
  # Garantir tabela photos para Galeria de Pacientes
  
  Esta migration garante que a tabela `photos` existe com a estrutura necessária
  para a galeria de fotos por paciente.
  
  Se a tabela já existir, apenas adiciona colunas/índices faltantes.
*/

-- Criar tabela photos se não existir (compatível com before_after_photos)
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  procedure_name text NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('before', 'after')),
  photo_url text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Adicionar coluna patient_id se não existir (para tabelas antigas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'photos' AND column_name = 'patient_id'
  ) THEN
    ALTER TABLE photos ADD COLUMN patient_id uuid REFERENCES patients(id) ON DELETE CASCADE;
    
    -- Se houver registros sem patient_id, marcar como NULL (será tratado pela UI)
    UPDATE photos SET patient_id = NULL WHERE patient_id IS NULL;
    
    -- Tornar NOT NULL apenas depois que a UI garantir que sempre salva patient_id
    -- Por enquanto deixamos nullable para não quebrar dados existentes
  END IF;
END $$;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_photos_patient_id ON photos(patient_id);
CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_patient_created ON photos(patient_id, created_at DESC);

-- Habilitar RLS
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para photos (acesso apenas aos profissionais autenticados)
-- Permitir SELECT apenas para fotos de pacientes do profissional autenticado
DROP POLICY IF EXISTS "Professionals can view their patient photos" ON photos;
CREATE POLICY "Professionals can view their patient photos"
  ON photos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = photos.patient_id 
      AND patients.professional_id = auth.uid()
    )
  );

-- Permitir INSERT apenas para pacientes do profissional autenticado
DROP POLICY IF EXISTS "Professionals can insert patient photos" ON photos;
CREATE POLICY "Professionals can insert patient photos"
  ON photos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = photos.patient_id 
      AND patients.professional_id = auth.uid()
    )
  );

-- Permitir UPDATE apenas para fotos de pacientes do profissional autenticado
DROP POLICY IF EXISTS "Professionals can update their patient photos" ON photos;
CREATE POLICY "Professionals can update their patient photos"
  ON photos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = photos.patient_id 
      AND patients.professional_id = auth.uid()
    )
  );

-- Permitir DELETE apenas para fotos de pacientes do profissional autenticado
DROP POLICY IF EXISTS "Professionals can delete their patient photos" ON photos;
CREATE POLICY "Professionals can delete their patient photos"
  ON photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = photos.patient_id 
      AND patients.professional_id = auth.uid()
    )
  );
