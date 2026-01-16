# Políticas de Storage para Consent Attachments

## Bucket: `consent-attachments`

Execute estas políticas no Supabase SQL Editor após criar o bucket manualmente.

### 1. Criar o Bucket (via Dashboard ou SQL)

```sql
-- Criar bucket (se não existir via Dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'consent-attachments',
  'consent-attachments',
  false, -- Privado
  52428800, -- 50MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;
```

### 2. Políticas de Storage

```sql
-- Política: Usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload consent attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'consent-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM patients WHERE professional_id = auth.uid()
  )
);

-- Política: Usuários autenticados podem ler arquivos de seus pacientes
CREATE POLICY "Authenticated users can read consent attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'consent-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM patients WHERE professional_id = auth.uid()
  )
);

-- Política: Usuários autenticados podem atualizar arquivos de seus pacientes
CREATE POLICY "Authenticated users can update consent attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'consent-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM patients WHERE professional_id = auth.uid()
  )
);

-- Política: Usuários autenticados podem deletar arquivos de seus pacientes
CREATE POLICY "Authenticated users can delete consent attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'consent-attachments' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM patients WHERE professional_id = auth.uid()
  )
);
```

### 3. Estrutura de Pastas

Os arquivos devem ser salvos na seguinte estrutura:
```
consent-attachments/
  {patient_id}/
    {visit_id}/
      signatures/
        patient-{timestamp}.png
        professional-{timestamp}.png
      stickers/
        {procedure_name}-{timestamp}.jpg
```

### 4. Verificação

Após aplicar, teste com:
```sql
-- Verificar bucket
SELECT * FROM storage.buckets WHERE id = 'consent-attachments';

-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%consent%';
```
