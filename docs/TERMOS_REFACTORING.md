# Refatoração do Módulo de Termos de Consentimento

## Arquivos Criados

### `src/termos/`
Módulo isolado e organizado para gerenciar termos de consentimento.

1. **`types.ts`** - Contratos TypeScript
   - `TermoContext` - Contexto necessário para renderizar
   - `TermoRenderResult` - Resultado da renderização
   - `TermoDefinition` - Contrato que cada termo implementa
   - `MissingField` - Tipos de campos faltantes

2. **`utils.ts`** - Funções utilitárias
   - `formatCPF()` - Formatação de CPF (xxx.xxx.xxx-xx)
   - `formatDateBR()` - Formatação de data (dd/MM/yyyy)
   - `formatBirthDate()` - Formatação de data de nascimento
   - `parseLicenseSiglaNumero()` - Extrai sigla e número de licença
   - `formatProfessionalLicense()` - Formata COREN/CRM (ex: "COREN: 344168")
   - `applyImageAuthorizationMark()` - Marca checkboxes de autorização
   - `removeUnnecessarySections()` - Remove campos manuais de assinatura
   - `validateContext()` - Valida campos obrigatórios
   - `replaceAllPlaceholders()` - Substitui todos os placeholders

3. **`base.ts`** - Classe base
   - `createTermoDefinition()` - Factory para criar definições de termos

4. **`registry.ts`** - Registry central
   - `getTermo()` - Obter termo por procedureKey
   - `getTermByProcedureKey()` - Alias mais claro (nova função)
   - `hasTermo()` - Verificar se existe termo
   - `renderTermo()` - Renderizar termo completo
   - `getAllTermos()` - Listar todos os termos
   - `listProcedureKeys()` - Listar todas as chaves

5. **Termos individuais** (11 arquivos):
   - `toxina-botulinica.ts`
   - `preenchimento-facial.ts`
   - `bioestimuladores-colageno.ts`
   - `otomodelacao.ts`
   - `preenchimento-gluteo.ts`
   - `bioestimulador-gluteo.ts`
   - `microagulhamento.ts`
   - `peeling-quimico.ts`
   - `preenchimento-intimo.ts`
   - `endermoterapia-vacuoterapia.ts`
   - `intradermoterapia.ts`

## Arquivos Modificados

### `src/screens/MedicalRecordScreen.tsx`

**Funções Novas:**
- `loadConsentTerm(procedureKey: string)` - Carrega termo usando APENAS novo sistema
- `updateTermoPreview(imageAuth: boolean | null)` - Atualiza preview quando autorização muda

**Funções Modificadas:**
- `handleSaveConsentForm()` - Refatorada para usar novo sistema
  - Remove toda lógica de montagem manual de texto
  - Usa `getTermByProcedureKey()` e `termo.render(ctx)`
  - Valida `missingFields` e bloqueia salvamento se faltar algo
  - Salva `content_snapshot` com texto completo renderizado

- `loadConsentTemplate()` - REMOVIDA (substituída por `loadConsentTerm()`)

- `handleSaveProfessionalConfig()` - Atualizada para recarregar termo após salvar profissional

- `handleCreateTemplate()` - Atualizada para verificar se termo existe no novo sistema primeiro

**Removido:**
- Lógica de montagem manual de texto
- Logs desnecessários `[CONSENT]` e `[DEBUG]`
- Dependência de templates do banco (agora é fallback apenas)

### `src/services/consents/consentService.ts`

**Modificações:**
- `fillConsentTemplate()` - Atualizada para usar novo sistema primeiro
  - Tenta usar `renderTermo()` do novo sistema
  - Fallback para template do banco apenas se não houver termo no registry
  - Mantém compatibilidade com código existente

**Importações:**
- Adicionado: `import { renderTermo } from '../../termos/registry'`
- Adicionado: `import type { TermoContext } from '../../termos/types'`
- Removido: `import { getFullConsentTemplate, hasFullConsentTemplate } from './consentTemplatesFull'`

### `src/components/ConsentFormViewer.tsx`

**Modificações:**
- Prioriza `content_snapshot` quando em modo readOnly
- Não reprocessa template antigo se snapshot existir
- Mantém fallback para compatibilidade

## Fluxo Atualizado

### 1. Seleção de Procedimento
```typescript
// Usuário seleciona procedimento
onSelectionChange={(keys) => {
  setSelectedProcedureForConsent(keys[0]);
  loadConsentTerm(keys[0]); // ← Novo sistema
}}
```

### 2. Carregamento do Termo
```typescript
const termo = getTermByProcedureKey(procedureKey);
const termoContext: TermoContext = { patient, professional, signedAt, procedureLabel, imageAuthorization };
const result = termo.render(termoContext);
// result.title, result.content, result.missingFields
```

### 3. Salvamento
```typescript
// Gerar termo final
const termoResult = termo.render(termoContext);

// Validar campos faltantes
if (termoResult.missingFields.length > 0) {
  toast.error(`Campos faltando: ${missingLabels.join(', ')}`);
  return;
}

// Salvar snapshot completo
await supabase.from('consent_forms').insert({
  procedure_key: selectedProcedureForConsent,
  content_snapshot: termoResult.content, // ← Texto completo
  // ... outros campos
});
```

### 4. Visualização
```typescript
// ConsentFormViewer sempre usa content_snapshot se disponível
if (readOnly && initialData?.content_snapshot) {
  setFilledContent(initialData.content_snapshot); // ← Sem reprocessar
}
```

## Benefícios

1. **Isolamento**: Módulo `src/termos/` é independente e fácil de manter
2. **Textos Completos**: Cada termo tem seu texto longo completo
3. **Sem Montagem Manual**: Não há mais concatenação de strings no código
4. **Validação Clara**: `missingFields` indica exatamente o que falta
5. **Formatação Automática**: COREN/CRM, CPF, datas formatados automaticamente
6. **Checkboxes Automáticos**: Autorização de imagem marcada automaticamente
7. **Snapshot Completo**: `content_snapshot` sempre tem texto final completo
8. **Viewer Otimizado**: Não reprocessa template, usa snapshot salvo

## Próximos Passos (Opcional)

Para adicionar novos termos:
1. Criar arquivo em `src/termos/` (ex: `novo-procedimento.ts`)
2. Usar `createTermoDefinition()` com texto completo
3. Registrar no `registry.ts`
