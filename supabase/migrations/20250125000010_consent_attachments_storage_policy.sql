-- Migration: Storage Policy para consent-attachments
-- Permite que usuários autenticados leiam objetos no bucket consent-attachments

-- PASSO 5: Criar policy para leitura de objetos no bucket consent-attachments
-- Isso permite que createSignedUrl funcione corretamente

-- Policy para SELECT (leitura) de objetos
CREATE POLICY IF NOT EXISTS "Authenticated users can read consent attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'consent-attachments' AND
  auth.role() = 'authenticated'
);

-- Policy para INSERT (upload) de objetos
CREATE POLICY IF NOT EXISTS "Authenticated users can upload consent attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'consent-attachments' AND
  auth.role() = 'authenticated'
);

-- Policy para DELETE (exclusão) de objetos (opcional - apenas se necessário)
CREATE POLICY IF NOT EXISTS "Authenticated users can delete their consent attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'consent-attachments' AND
  auth.role() = 'authenticated'
);

-- Nota: Se o bucket for público, essas policies podem não ser necessárias
-- Mas é recomendado manter privado + policies para segurança
