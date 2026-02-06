/*
  # Tabela patient_photos — 1 registro = 1 foto
  
  Galeria do paciente: cada foto é independente (antes/depois separados).
  Sem before_url/after_url, sem agrupamento.
*/

CREATE TABLE IF NOT EXISTS patient_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  procedure_name text NOT NULL,
  procedure_date date NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('antes', 'depois')),
  file_url text NOT NULL,
  file_path text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patient_photos_patient_id ON patient_photos(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_photos_created_at ON patient_photos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_photos_patient_created ON patient_photos(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_photos_photo_type ON patient_photos(patient_id, photo_type);

ALTER TABLE patient_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals can view patient_photos" ON patient_photos;
CREATE POLICY "Professionals can view patient_photos"
  ON patient_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_photos.patient_id
      AND patients.professional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Professionals can insert patient_photos" ON patient_photos;
CREATE POLICY "Professionals can insert patient_photos"
  ON patient_photos FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_photos.patient_id
      AND patients.professional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Professionals can update patient_photos" ON patient_photos;
CREATE POLICY "Professionals can update patient_photos"
  ON patient_photos FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_photos.patient_id
      AND patients.professional_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Professionals can delete patient_photos" ON patient_photos;
CREATE POLICY "Professionals can delete patient_photos"
  ON patient_photos FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_photos.patient_id
      AND patients.professional_id = auth.uid()
    )
  );
