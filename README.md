# 🏥 Clínica Loraine - Sistema de Gestão

Sistema completo para gerenciamento de clínica estética

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase

## 🚀 Instalação

1. Clone o repositório
2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (veja `ENV_SETUP.md`)

4. Execute o projeto:
```bash
npm run dev
```

## 🗄️ Configuração do Supabase

### Supabase CLI no Windows (Scoop)

No Windows, **não use** `npm install -g supabase` — o pacote npm global não é suportado. Use o **Scoop**:

1. Abra o PowerShell (não precisa ser Admin) e permita scripts:
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. Instale o Scoop (se ainda não tiver):
   ```powershell
   irm get.scoop.sh | iex
   ```

3. Adicione o bucket do Supabase e instale o CLI:
   ```powershell
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

4. Confirme a instalação:
   ```powershell
   supabase --version
   ```

Também é possível usar o script de setup: `.\scripts\setup-supabase-windows.ps1` (veja [Script de setup](#script-de-setup-windows) mais abaixo).

### Deploy da Edge Function createStaffInvite

1. Login no Supabase (abre o navegador):
   ```powershell
   supabase login
   ```

2. Vincule o projeto (use o **Project ref** do Dashboard → Settings → General):
   ```powershell
   supabase link --project-ref vwmzyfjqprutlaevmsjk
   ```

3. Se a função ainda não existir localmente (pasta `supabase/functions/createStaffInvite`):
   ```powershell
   supabase functions new createStaffInvite
   ```
   *(Se a pasta já existir com `index.ts`, pule este passo.)*

4. Faça o deploy:
   ```powershell
   supabase functions deploy createStaffInvite
   ```

Para outras funções (ex.: `acceptStaffInvite`): `supabase functions deploy acceptStaffInvite`.

### Testar CORS (preflight OPTIONS)

Substitua `vwmzyfjqprutlaevmsjk` e a URL se o seu projeto for outro.

**PowerShell (Invoke-WebRequest):**
```powershell
Invoke-WebRequest -Method OPTIONS -Uri "https://vwmzyfjqprutlaevmsjk.supabase.co/functions/v1/createStaffInvite" -Headers @{ "Origin" = "http://localhost:5173" } -UseBasicParsing | Select-Object StatusCode, Headers
```

Esperado: `StatusCode: 200` e headers como `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`.

**curl (PowerShell ou CMD):**
```powershell
curl.exe -X OPTIONS "https://vwmzyfjqprutlaevmsjk.supabase.co/functions/v1/createStaffInvite" -H "Origin: http://localhost:5173" -v
```

Esperado: resposta `HTTP/2 200` e na saída os headers CORS.

### 1. Banco de Dados

Execute as migrations SQL na ordem:
1. `supabase/migrations/20250722211539_royal_thunder.sql` - Schema inicial
2. `supabase/migrations/20250125000001_fix_visits_tables.sql` - Tabelas de visitas
3. `supabase/migrations/20250125000002_allow_null_visit_procedure.sql` - Permitir termos sem visit_procedure
4. `supabase/migrations/20250125000004_add_user_id_to_professionals.sql` - Adicionar user_id aos profissionais
5. `supabase/migrations/20250125000005_add_procedure_key_to_templates.sql` - Adicionar procedure_key aos templates

### 2. Storage Buckets

**IMPORTANTE**: Os seguintes buckets devem existir no Supabase Storage:

#### Buckets Necessários

O sistema usa os seguintes buckets existentes:

- **`signatures`** (privado) - Armazena assinaturas de termos de consentimento
  - Path: `{patient_id}/consents/{visitId}/patient-{timestamp}.png`
  - Path: `{patient_id}/consents/{visitId}/professional-{timestamp}.png`

- **`before_after`** (privado) - Armazena fotos de adesivos de produtos
  - Path: `{patient_id}/consents/{visitId}/stickers/{procedure}-{timestamp}.jpg`

- **`patient-photos`** (opcional) - Fotos de perfil dos pacientes

**Verificação:**

1. Acesse **Supabase Dashboard** → **Storage**
2. Verifique se os buckets `signatures` e `before_after` existem
3. Se não existirem, crie-os:
   - **Name**: `signatures` ou `before_after`
   - **Public**: `false` (privado)
   - **File size limit**: `50 MB` (opcional)

**Políticas de Storage:**

Os buckets devem ter políticas RLS configuradas para permitir acesso autenticado. Verifique as políticas existentes ou consulte `supabase/migrations/STORAGE_POLICIES.md` para exemplos.

## Script de setup (Windows)

O script `scripts/setup-supabase-windows.ps1` instala o Supabase CLI via Scoop e opcionalmente faz login, link e deploy da função `createStaffInvite`. Execute no PowerShell (na raiz do projeto):

```powershell
.\scripts\setup-supabase-windows.ps1
```

Para só instalar o CLI (sem login/link/deploy), use o parâmetro `-InstallOnly`.

## 📚 Documentação Adicional

- `ENV_SETUP.md` - Configuração de variáveis de ambiente
- `supabase/migrations/STORAGE_POLICIES.md` - Políticas de Storage detalhadas
- `INSTRUCOES_APLICAR_SQL.md` - Instruções para aplicar migrations

## 🐛 Troubleshooting

### Erro: "Bucket not found"

Se você receber o erro "Bucket not found" ao salvar termos:

1. Verifique se o bucket `signatures` existe no Supabase Storage
2. Verifique se o bucket `before_after` existe (para fotos de adesivos)
3. Se não existirem, crie-os via Dashboard ou SQL
4. Verifique se as políticas RLS estão configuradas corretamente

### Erro: "Dados do profissional incompletos"

Se a tela crashar ao gerar termo:

1. Configure seu perfil profissional (modal aparecerá automaticamente)
2. Preencha nome e registro profissional
3. Salve e tente novamente

## 🧪 Testes

Após configurar tudo:

1. Execute `npm run dev`
2. Faça login
3. Configure perfil profissional (se necessário)
4. Acesse um paciente → Prontuário → Aba "Termos"
5. Clique em "Gerar Termo"
6. Selecione um procedimento
7. Preencha e assine o termo
8. Salve

## 📝 Licença

Proprietário - Clínica Loraine Vilela
