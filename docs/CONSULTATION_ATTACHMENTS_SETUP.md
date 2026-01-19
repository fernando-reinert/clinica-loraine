# Configuração de Fotos de Procedimentos (Consultation Attachments)

## Visão Geral

Esta funcionalidade permite adicionar fotos de etiquetas/lotes de produtos utilizados em consultas, servindo como comprovação clínica e legal dos produtos aplicados no paciente.

## Configuração do Supabase Storage

### 1. Criar o Bucket

No Supabase Dashboard, vá em **Storage** e crie um novo bucket:

- **Nome do bucket**: `consultation-attachments`
- **Público**: `Não` (privado - recomendado para dados médicos)
- **File size limit**: `5MB` (ou conforme necessário)
- **Allowed MIME types**: `image/*` (ou tipos específicos como `image/jpeg,image/png`)

### 2. Configurar Políticas RLS (Row Level Security)

As políticas RLS já estão configuradas na migration `20250125000011_consultation_attachments.sql`, mas você pode verificar/adicionar políticas de storage no Supabase:

**Política de Upload (INSERT)**:
```sql
CREATE POLICY "Professionals can upload consultation attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'consultation-attachments' AND
  EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.user_id = auth.uid()
  )
);
```

**Política de Leitura (SELECT)**:
```sql
CREATE POLICY "Professionals can view consultation attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'consultation-attachments' AND
  EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.user_id = auth.uid()
  )
);
```

**Política de Exclusão (DELETE)**:
```sql
CREATE POLICY "Professionals can delete consultation attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'consultation-attachments' AND
  EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.user_id = auth.uid()
  )
);
```

## Estrutura de Armazenamento

As fotos são organizadas no storage da seguinte forma:

```
consultation-attachments/
  └── {patient_id}/
      └── consultations/
          └── {consultation_id}/
              └── {timestamp}-{filename}.{ext}
```

Exemplo:
```
consultation-attachments/
  └── 123e4567-e89b-12d3-a456-426614174000/
      └── consultations/
          └── 456e7890-e89b-12d3-a456-426614174001/
              └── 1704067200000-produto_toxina.jpg
```

## Tabela no Banco de Dados

A tabela `consultation_attachments` armazena os metadados das fotos:

- `id`: UUID único do anexo
- `consultation_id`: ID da consulta relacionada
- `patient_id`: ID do paciente
- `attachment_type`: Tipo do anexo ('product_photo', 'document', 'other')
- `file_url`: URL pública (se bucket for público) ou path
- `file_path`: Path no storage (usado para signed URLs)
- `file_name`: Nome original do arquivo
- `file_size`: Tamanho do arquivo em bytes
- `mime_type`: Tipo MIME do arquivo
- `metadata`: JSONB com metadados adicionais
- `created_at`: Data de criação

## Uso na Aplicação

### Adicionar Fotos

1. Na tela do Prontuário, vá para a aba **Consultas**
2. Preencha os dados da consulta
3. Logo abaixo do campo "Descrição do Procedimento", clique em **Adicionar Fotos**
4. Selecione uma ou múltiplas imagens (câmera ou galeria)
5. Visualize o preview em grid
6. Remova fotos antes de salvar se necessário
7. Clique em **Registrar Consulta** para salvar tudo

### Visualizar Fotos

As fotos salvas aparecem automaticamente abaixo de cada consulta no histórico, organizadas em um grid de 3 colunas.

## Segurança

- Bucket privado por padrão (recomendado)
- Políticas RLS garantem que apenas profissionais autenticados possam acessar
- Signed URLs temporárias (1 hora) para visualização
- Validação de tipo de arquivo (apenas imagens)
- Limite de tamanho de arquivo (5MB)

## Troubleshooting

### Erro: "Bucket not found"
- Verifique se o bucket `consultation-attachments` foi criado no Supabase Storage
- Confirme que o nome está exatamente como especificado

### Erro: "Permission denied"
- Verifique se as políticas RLS estão configuradas corretamente
- Confirme que o usuário está autenticado e tem perfil profissional

### Imagens não aparecem
- Verifique se as signed URLs estão sendo geradas corretamente
- Confirme que o `file_path` está sendo salvo no banco de dados
- Verifique os logs do console para erros de carregamento
