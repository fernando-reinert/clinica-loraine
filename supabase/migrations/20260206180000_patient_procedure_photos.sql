/*
  # Tabela patient_procedure_photos — 1 linha por PROCEDIMENTO (antes/depois em pares)
  
  Galeria por procedimento: before_url, before_path, after_url, after_path na mesma linha.
*/

CREATE TABLE IF NOT EXISTS patient_procedure_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  procedure_name text NOT NULL,
  procedure_date date NOT NULL,
  before_url text,
  before_path text,
  after_url text,
  after_path text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_procedure_photos_patient_id ON patient_procedure_photos(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_procedure_photos_created_at ON patient_procedure_photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_procedure_photos_patient_created ON patient_procedure_photos(patient_id, created_at DESC);

ALTER TABLE patient_procedure_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals can view patient_procedure_photos" ON patient_procedure_photos;
CREATE POLICY "Professionals can view patient_procedure_photos"
  ON patient_procedure_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_procedure_photos.patient_id
      AND patients.professional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Professionals can insert patient_procedure_photos" ON patient_procedure_photos;
CREATE POLICY "Professionals can insert patient_procedure_photos"
  ON patient_procedure_photos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_procedure_photos.patient_id
      AND patients.professional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Professionals can update patient_procedure_photos" ON patient_procedure_photos;
CREATE POLICY "Professionals can update patient_procedure_photos"
  ON patient_procedure_photos FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_procedure_photos.patient_id
      AND patients.professional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Professionals can delete patient_procedure_photos" ON patient_procedure_photos;
CREATE POLICY "Professionals can delete patient_procedure_photos"
  ON patient_procedure_photos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_procedure_photos.patient_id
      AND patients.professional_id = auth.uid()
    )
  );
