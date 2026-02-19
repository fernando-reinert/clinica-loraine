# Configuração Supabase e Deploy (Hostinger)

## 1. Variáveis de ambiente no deploy (Hostinger)

No painel da Hostinger (ou no build de produção), defina **antes do build**:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase | `https://xxxxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima (anon public) do Supabase | (copie em Settings > API) |

- As variáveis precisam existir **no momento do build** (ex.: `npm run build`), pois o Vite as embute em `import.meta.env`.
- Se estiverem vazias ou ausentes, a aplicação pode exibir "Supabase não configurado" e a página Financeiro do Paciente pode falhar com CORS/502.

## 2. Supabase Dashboard – URL Configuration (Auth)

Em **Authentication** > **URL Configuration**:

- **Site URL:** `https://clinica-aurea.com` (ou seu domínio de produção)
- **Redirect URLs** – inclua:
  - `https://clinica-aurea.com/**`
  - `http://localhost:5173/**`
  - `http://192.168.1.118:5173/**` (ou o IP que usar em rede local)

Assim o login e callbacks funcionam em produção, local e em dev na rede.

## 3. Supabase Dashboard – CORS / Allowed Origins (API)

Em **Project Settings** > **API** (ou onde houver configuração de CORS / Allowed Origins), adicione as origens permitidas:

- `https://clinica-aurea.com`
- `http://localhost:5173`
- `http://192.168.1.118:5173`

Isso evita erro de CORS ("No 'Access-Control-Allow-Origin' header") ao acessar a API do Supabase a partir do navegador.

## 4. Resumo

1. **Hostinger / build:** definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. **Supabase Auth:** Site URL + Redirect URLs com produção, localhost e IP local.
3. **Supabase API:** CORS/Allowed Origins com os mesmos domínios.

Se a página Financeiro do Paciente ficar em loading infinito ou aparecer 502/CORS, confira estes três pontos.
