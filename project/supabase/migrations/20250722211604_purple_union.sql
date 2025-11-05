/*
  # Configuração dos buckets de storage

  1. Buckets
    - `patient_photos` - Fotos de perfil dos pacientes
    - `signatures` - Assinaturas digitais das fichas
    - `before_after` - Fotos de antes e depois dos procedimentos

  2. Políticas de Storage
    - Acesso restrito aos profissionais autenticados
    - Upload e download baseado na propriedade dos dados
*/

-- Criar buckets de storage
INSERT INTO storage.buckets (id, name, public) VALUES 
('patient_photos', 'patient_photos', false),
('signatures', 'signatures', false),
('before_after', 'before_after', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas para patient_photos bucket
CREATE POLICY "Professionals can upload patient photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'patient_photos' AND
  EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id::text = (storage.foldername(name))[1]
    AND patients.professional_id = auth.uid()
  )
);

CREATE POLICY "Professionals can view their patient photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'patient_photos' AND
  EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id::text = (storage.foldername(name))[1]
    AND patients.professional_id = auth.uid()
  )
);

CREATE POLICY "Professionals can update their patient photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'patient_photos' AND
  EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id::text = (storage.foldername(name))[1]
    AND patients.professional_id = auth.uid()
  )
);

CREATE POLICY "Professionals can delete their patient photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'patient_photos' AND
  EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id::text = (storage.foldername(name))[1]
    AND patients.professional_id = auth.uid()
  )
);

-- Políticas para signatures bucket
CREATE POLICY "Professionals can upload signatures"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'signatures');

CREATE POLICY "Professionals can view signatures"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'signatures');

CREATE POLICY "Professionals can update signatures"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'signatures');

CREATE POLICY "Professionals can delete signatures"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'signatures');

-- Políticas para before_after bucket
CREATE POLICY "Professionals can upload before/after photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'before_after' AND
  EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id::text = (storage.foldername(name))[1]
    AND patients.professional_id = auth.uid()
  )
);

CREATE POLICY "Professionals can view before/after photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'before_after' AND
  EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id::text = (storage.foldername(name))[1]
    AND patients.professional_id = auth.uid()
  )
);

CREATE POLICY "Professionals can update before/after photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'before_after' AND
  EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id::text = (storage.foldername(name))[1]
    AND patients.professional_id = auth.uid()
  )
);

CREATE POLICY "Professionals can delete before/after photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'before_after' AND
  EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id::text = (storage.foldername(name))[1]
    AND patients.professional_id = auth.uid()
  )
);