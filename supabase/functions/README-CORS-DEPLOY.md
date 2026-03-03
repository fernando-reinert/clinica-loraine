# CORS e deploy das Edge Functions (listTenantUsers, inviteUser)

## Problema

O preflight (OPTIONS) não envia o header `Authorization`. Se a função exigir JWT na porta do Supabase, o OPTIONS recebe **401** antes do seu código rodar e o navegador bloqueia por CORS ("Response to preflight request doesn't pass access control check: It does not have HTTP ok status").

## Solução

As funções **listTenantUsers** e **inviteUser** precisam aceitar OPTIONS **sem** JWT. O JWT continua sendo validado **dentro** da função para requisições POST (via `getCallerProfile(req, true)`).

### 1. Config no `supabase/config.toml` (já feito)

```toml
[functions.listTenantUsers]
verify_jwt = false

[functions.inviteUser]
verify_jwt = false
```

Isso vale para **Supabase local** (`supabase start`). Para o **projeto hospedado** (supabase.co), use um dos passos abaixo.

### 2. Deploy no projeto hospedado

Redeploy das funções garantindo `verify_jwt = false`:

```bash
cd /caminho/do/projeto
supabase functions deploy listTenantUsers --no-verify-jwt
supabase functions deploy inviteUser --no-verify-jwt
```

Se o seu CLI aplicar o `config.toml` no deploy, basta:

```bash
supabase functions deploy listTenantUsers
supabase functions deploy inviteUser
```

### 3. Alternativa pelo Dashboard

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard) → seu projeto.
2. **Project Settings** (ícone de engrenagem) → **Edge Functions**.
3. Para **listTenantUsers** e **inviteUser**: desative **"Enforce JWT verification"** (ou **"Verify JWT"**).
4. Salve.

Depois disso, o preflight OPTIONS passa (200) e o POST com `Authorization: Bearer <token>` continua validado dentro da função.

---

**Cuponomia / ext-cdn.cuponomia.com.br**  
Esse erro vem de **extensão do navegador** (Cuponomia), não do seu app. Pode ignorar ou desativar a extensão para testar.
