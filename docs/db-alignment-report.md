# Relatório de Alinhamento: Código vs Schema Real do Banco

**Data**: 2025-01-25  
**Objetivo**: Identificar e corrigir conflitos entre código React/TypeScript e schema real do Supabase

---

## 📊 Tabelas Usadas no Código

### ✅ Tabelas Confirmadas no Schema

| Tabela | Uso no Código | Status |
|--------|---------------|--------|
| `patients` | ✅ Múltiplos serviços | OK |
| `professionals` | ✅ professionalService.ts | ⚠️ Verificar colunas |
| `appointments` | ✅ AppointmentsScreen, hooks | OK |
| `visits` | ✅ medicalRecordService.ts | OK |
| `visit_procedures` | ✅ medicalRecordService.ts | OK |
| `consent_templates` | ✅ consentService.ts | ⚠️ Verificar colunas |
| `consent_forms` | ✅ consentService.ts | ⚠️ Verificar colunas |
| `procedure_attachments` | ✅ medicalRecordService.ts | OK |
| `procedures` | ✅ consentService.ts, FinancialControl | ⚠️ Verificar colunas |
| `clinical_records` | ✅ ClinicalRecordScreen | OK |
| `patient_forms` | ✅ AnamneseScreen | OK |
| `photos` | ✅ GalleryScreen | OK |
| `before_after_photos` | ✅ database.ts | OK |
| `installments` | ✅ FinancialControl | OK |

---

## 🔍 Análise de Colunas por Tabela

### 1. `professionals`

**Schema Real** (baseado em migrations e database.ts):
- ✅ `id` (uuid)
- ✅ `user_id` (uuid)
- ✅ `email` (text)
- ✅ `name` (text)
- ✅ `profession` (text) ⚠️ **CÓDIGO USA `specialty`**
- ✅ `license` (text) ⚠️ **CÓDIGO USA `license_number`**
- ✅ `phone` (text | null)
- ✅ `address` (text | null)
- ✅ `created_at` (timestamptz)
- ✅ `updated_at` (timestamptz)

**Problemas Encontrados**:
- ❌ Código usa `specialty` → Deve ser `profession`
- ❌ Código usa `license_number` → Deve ser `license`
- ✅ `updateProfessional()` já corrigido para usar `id` ao invés de `user_id`

**Arquivos Afetados**:
- `src/services/professionals/professionalService.ts` - ✅ JÁ CORRIGIDO
- `src/types/database.ts` - ✅ JÁ CORRIGIDO
- `src/screens/MedicalRecordScreen.tsx` - ✅ JÁ CORRIGIDO
- `src/components/ProfessionalSetupModal.tsx` - ✅ JÁ CORRIGIDO

---

### 2. `consent_templates`

**Schema Real** (baseado em migrations):
- ✅ `id` (uuid)
- ✅ `procedure_key` (text) - Adicionado em migration 20250125000005
- ✅ `title` (text)
- ✅ `content` (text)
- ✅ `created_at` (timestamptz)

**Colunas NÃO Existentes** (remover do código):
- ❌ `procedure_name` - NÃO EXISTE (foi substituído por `procedure_key`)
- ❌ `version` - NÃO EXISTE
- ❌ `is_active` - NÃO EXISTE
- ❌ `updated_at` - NÃO EXISTE

**Problemas Encontrados**:
- ❌ Código pode estar tentando filtrar por `is_active` → Remover
- ❌ Código pode estar ordenando por `version` → Usar `created_at desc`
- ✅ `procedure_key` já está sendo usado corretamente

**Arquivos Afetados**:
- `src/services/consents/consentService.ts` - ⚠️ Verificar queries
- `src/types/database.ts` - ✅ JÁ CORRIGIDO

---

### 3. `consent_forms`

**Schema Real** (baseado em migrations e database.ts):
- ✅ `id` (uuid)
- ✅ `visit_procedure_id` (uuid | null) - Pode ser null
- ✅ `procedure_key` (text NOT NULL) - Adicionado em migration 20250125000006
- ✅ `template_id` (uuid | null)
- ✅ `content_snapshot` (text NOT NULL) - Campo principal
- ✅ `filled_content` (text | null) - Mantido por compatibilidade
- ✅ `patient_signature_url` (text | null)
- ✅ `professional_signature_url` (text | null)
- ✅ `image_authorization` (boolean NOT NULL)
- ✅ `signed_location` (text)
- ✅ `signed_at` (timestamptz NOT NULL)
- ✅ `patient_id` (uuid NOT NULL)
- ✅ `professional_id` (uuid NOT NULL)
- ✅ `created_at` (timestamptz)
- ✅ `updated_at` (timestamptz)

**Problemas Encontrados**:
- ✅ `procedure_key` já está sendo usado
- ✅ `content_snapshot` já está sendo usado
- ⚠️ Verificar se `filled_content` está sendo enviado (pode ser null)

**Arquivos Afetados**:
- `src/services/consents/consentService.ts` - ✅ JÁ CORRIGIDO
- `src/screens/MedicalRecordScreen.tsx` - ✅ JÁ CORRIGIDO

---

### 4. `procedures`

**Schema Real** (baseado em migrations):
- ✅ `id` (uuid)
- ✅ `name` (text) - ⚠️ **MAS O CÓDIGO USA `procedure_type`**
- ✅ `description` (text | null)
- ✅ `category` (text)
- ✅ `consent_template_id` (uuid | null)
- ✅ `is_active` (boolean)
- ✅ `created_at` (timestamptz)
- ✅ `updated_at` (timestamptz)

**PROBLEMA CRÍTICO**:
- ❌ Código busca `procedure_type` mas tabela tem `name`
- ❌ Tabela `procedures` é catálogo, mas código usa como histórico financeiro
- ⚠️ Verificar se existe outra tabela para histórico financeiro (ex: `financial_records`)

**Arquivos Afetados**:
- `src/services/consents/consentService.ts` - ⚠️ **PRECISA CORRIGIR**
- `src/screens/FinancialControl.tsx` - ⚠️ **PRECISA VERIFICAR**

---

### 5. `visits`

**Schema Real**:
- ✅ `id` (uuid)
- ✅ `appointment_id` (uuid | null)
- ✅ `patient_id` (uuid NOT NULL)
- ✅ `professional_id` (uuid NOT NULL)
- ✅ `visit_date` (timestamptz NOT NULL)
- ✅ `status` (text: 'scheduled' | 'in_progress' | 'completed' | 'cancelled')
- ✅ `notes` (text | null)
- ✅ `created_at` (timestamptz)
- ✅ `updated_at` (timestamptz)

**Status**: ✅ OK (código alinhado)

---

### 6. `visit_procedures`

**Schema Real**:
- ✅ `id` (uuid)
- ✅ `visit_id` (uuid NOT NULL)
- ✅ `procedure_id` (uuid | null)
- ✅ `procedure_name` (text NOT NULL) - Snapshot do nome
- ✅ `performed_at` (timestamptz NOT NULL)
- ✅ `professional_id` (uuid NOT NULL)
- ✅ `units` (integer)
- ✅ `lot_number` (text | null)
- ✅ `brand` (text | null)
- ✅ `observations` (text | null)
- ✅ `created_at` (timestamptz)
- ✅ `updated_at` (timestamptz)

**Status**: ✅ OK (código alinhado)

---

## 🚨 Problemas Críticos Identificados

### 1. `procedures.procedure_type` NÃO EXISTE

**Local**: `src/services/consents/consentService.ts:549`
```typescript
.select('procedure_type')  // ❌ ERRO: coluna não existe
```

**Schema Real**: Tabela `procedures` tem `name`, não `procedure_type`

**Ação**: 
- Opção A: Usar `procedures.name` ao invés de `procedure_type`
- Opção B: Verificar se existe tabela separada para histórico financeiro

---

### 2. `consent_templates.is_active` NÃO EXISTE

**Local**: Possíveis queries antigas (já corrigidas?)

**Ação**: Remover qualquer filtro `.eq('is_active', true)`

---

### 3. `consent_templates.version` NÃO EXISTE

**Local**: Possíveis queries antigas (já corrigidas?)

**Ação**: Usar `created_at desc` para pegar o mais recente

---

## 📝 Próximos Passos

1. ✅ Corrigir `procedures` para usar `name` ao invés de `procedure_type`
2. ✅ Verificar se `consent_templates` queries estão corretas
3. ✅ Criar `src/types/db.ts` baseado no schema real
4. ✅ Criar `src/utils/mappers.ts` para mapeamentos centralizados
5. ✅ Validar fluxo completo de termo

---

## ✅ Status das Correções

- [x] `professionals.license` (corrigido de `license_number`)
- [x] `professionals.profession` (corrigido de `specialty`)
- [x] `updateProfessional()` usa `id` (corrigido de `user_id`)
- [x] `consent_forms.procedure_key` (adicionado)
- [x] `consent_forms.content_snapshot` (corrigido)
- [ ] `procedures.procedure_type` → `procedures.name` (PENDENTE)
- [ ] Remover `consent_templates.is_active` de queries (VERIFICAR)
- [ ] Remover `consent_templates.version` de queries (VERIFICAR)

---

---

## 🚨 PROBLEMA CRÍTICO: `procedures` - Duas Tabelas Diferentes?

**Situação**:
- `consentService.ts` usa `procedures` como **catálogo** (espera `name`)
- `FinancialControl.tsx` usa `procedures` como **histórico financeiro** (espera `procedure_type`, `client_name`, `total_amount`, `patient_id`)

**Schema Real** (migrations):
- Tabela `procedures` criada tem: `id, name, description, category, consent_template_id, is_active, created_at, updated_at`
- **NÃO TEM**: `procedure_type`, `client_name`, `total_amount`, `patient_id`

**Ação Necessária**:
1. Verificar se existe tabela financeira separada (ex: `financial_procedures`)
2. Se não existir, criar migration para tabela financeira OU
3. Ajustar `FinancialControl.tsx` para usar tabela correta

**Arquivos Afetados**:
- `src/screens/FinancialControl.tsx` - ⚠️ **PRECISA CORRIGIR**
- `src/services/consents/consentService.ts` - ✅ JÁ CORRIGIDO (usa `name`)

---

**Última atualização**: 2025-01-25
