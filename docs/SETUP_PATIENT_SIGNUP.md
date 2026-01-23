# 🚀 Setup: Cadastro Público de Pacientes

## ⚠️ IMPORTANTE: Execute a Migration no Supabase

Para que o fluxo de cadastro público funcione, você **DEVE** executar a migration no Supabase Dashboard.

### Passo a passo:

1. **Acesse o Supabase Dashboard**
   - Vá para: https://app.supabase.com
   - Selecione seu projeto

2. **Abra o SQL Editor**
   - No menu lateral, clique em **SQL Editor**
   - Clique em **New query**

3. **Execute a Migration**
   - Abra o arquivo: `supabase/migrations/20260123000000_patient_signup_forms.sql`
   - Copie **TODO** o conteúdo do arquivo
   - Cole no SQL Editor do Supabase
   - Clique em **Run** (ou pressione Ctrl+Enter)

4. **Verifique o Sucesso**
   - Deve aparecer: "Success. No rows returned"
   - Se houver erros, leia as mensagens e corrija

### O que a migration cria:

✅ **Tabela**: `patient_signup_forms`
- Armazena formulários de cadastro público

✅ **RPCs (Funções)**:
- `create_patient_signup_form` - Cria formulário e gera token
- `get_signup_form_by_token` - Busca formulário por token
- `update_signup_form_answers` - Salva progresso do preenchimento
- `complete_patient_signup_form` - Completa cadastro (cria/atualiza paciente + cria anamnese)
- `create_patient_anamnese_form` - Cria formulário de anamnese

✅ **Permissões**:
- Permite execução anônima dos RPCs (necessário para formulários públicos)

### Verificação:

Após executar a migration, teste:

1. Vá para a tela **Novo Paciente**
2. Clique em **"Enviar Cadastro"**
3. Deve gerar um link e copiar automaticamente
4. Abra o link em uma aba anônima
5. Preencha e clique em **"Finalizar Cadastro"**
6. Deve redirecionar para a anamnese

### Erro PGRST202?

Se você ainda ver o erro `PGRST202: Could not find the function`, significa que:

1. ❌ A migration não foi executada
2. ❌ A migration foi executada com erros
3. ❌ Você está usando um projeto Supabase diferente

**Solução:**
- Execute a migration novamente
- Verifique se está no projeto correto (confira `VITE_SUPABASE_URL` no `.env`)
- Reinicie o projeto Supabase (pode ajudar a atualizar o schema cache)

### Troubleshooting:

**Erro: "relation patient_signup_forms does not exist"**
→ Execute a migration completa

**Erro: "permission denied for function"**
→ Os GRANTs não foram executados. Execute a seção de permissões da migration

**Erro: "function does not exist"**
→ O RPC não foi criado. Verifique se a migration foi executada completamente
