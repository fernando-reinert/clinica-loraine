# 🔧 Migration: Patient Signup Forms

## ⚠️ IMPORTANTE: Execute esta migration no Supabase

Para que o fluxo de cadastro público funcione, você **DEVE** executar a migration no Supabase Dashboard.

### Como executar:

1. Acesse o **Supabase Dashboard** → **SQL Editor**
2. Copie o conteúdo completo do arquivo: `supabase/migrations/20260123000000_patient_signup_forms.sql`
3. Cole no SQL Editor e execute
4. Aguarde a confirmação de sucesso

### O que a migration cria:

- ✅ Tabela `patient_signup_forms`
- ✅ RPC `create_patient_signup_form` (gera token server-side)
- ✅ RPC `get_signup_form_by_token` (busca formulário)
- ✅ RPC `update_signup_form_answers` (salva progresso)
- ✅ RPC `complete_patient_signup_form` (completa cadastro)
- ✅ RPC `create_patient_anamnese_form` (cria anamnese)

### Verificação:

Após executar, teste criando um link de cadastro na tela "Novo Paciente". Se funcionar, a migration foi executada com sucesso.

### Erro PGRST202:

Se você ainda ver o erro `PGRST202: Could not find the function`, significa que a migration não foi executada ou houve algum problema. Verifique:

1. Se a migration foi executada completamente (sem erros)
2. Se você está usando o projeto Supabase correto (verifique VITE_SUPABASE_URL)
3. Tente recarregar o schema cache do PostgREST (reiniciar o projeto Supabase)
