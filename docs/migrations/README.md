# Migrations SQL - Termos de Consentimento

## 📋 Migrations Disponíveis

### 1. `20250125000009_soft_delete_consent_forms.sql`

**Objetivo**: Adicionar suporte a soft delete em `consent_forms`

**O que faz**:
- Adiciona coluna `deleted_at` (timestamptz)
- Adiciona coluna `deleted_by` (uuid)
- Cria índices para performance

**Como aplicar**:
1. Abrir Supabase Dashboard > SQL Editor
2. Copiar conteúdo do arquivo
3. Executar SQL
4. Verificar se colunas foram criadas: `SELECT column_name FROM information_schema.columns WHERE table_name = 'consent_forms' AND column_name IN ('deleted_at', 'deleted_by');`

**Status**: ✅ Idempotente (pode executar múltiplas vezes)

---

### 2. `20250125000008_consent_signatures_json.sql`

**Objetivo**: Adicionar suporte a assinaturas JSON (strokes)

**O que faz**:
- Adiciona colunas `patient_signature_data` e `professional_signature_data` (jsonb)
- Remove obrigatoriedade de PNG (URLs opcionais)
- Adiciona controle de edição/exclusão

**Status**: ✅ Já aplicado (seguindo implementação anterior)

---

## 🔒 RLS Policies

### `docs/rls/consent_forms_policies.sql`

**Objetivo**: Políticas de Row Level Security para `consent_forms`

**O que faz**:
- Permite SELECT para profissionais autenticados (seus próprios termos)
- Permite INSERT para profissionais autenticados
- Permite UPDATE (soft delete) para profissionais autenticados

**Como aplicar**:
1. Verificar se RLS já está habilitado: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'consent_forms';`
2. Se `rowsecurity = false`, executar: `ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;`
3. Executar políticas do arquivo SQL

**Status**: ⚠️ Verificar se já existem antes de executar

---

## 📦 Storage Buckets

### Bucket: `consent-attachments`

**Tipo**: Private (public=false)

**Estrutura de paths**:
```
{patientId}/consents/{visitId}/patient-{timestamp}.png
{patientId}/consents/{visitId}/professional-{timestamp}.png
```

**Policies** (criar no Supabase Dashboard > Storage > Policies):
- **SELECT**: Authenticated users can read files from their patients
- **INSERT**: Authenticated users can upload to their patient folders
- **UPDATE**: Authenticated users can update files from their patients
- **DELETE**: Authenticated users can delete files from their patients

**Como criar**:
1. Supabase Dashboard > Storage
2. Criar bucket `consent-attachments` (Private)
3. Adicionar policies conforme acima

---

## ✅ Checklist de Aplicação

- [ ] Migration `20250125000009_soft_delete_consent_forms.sql` aplicada
- [ ] RLS habilitado em `consent_forms`
- [ ] Policies RLS aplicadas (se necessário)
- [ ] Bucket `consent-attachments` criado (Private)
- [ ] Policies de Storage configuradas
- [ ] Testar: criar termo → ver assinaturas → excluir termo

---

**Última atualização**: 2025-01-25
