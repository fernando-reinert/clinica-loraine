# 🔧 Configuração de Variáveis de Ambiente

## Variáveis Necessárias

Este projeto requer as seguintes variáveis de ambiente para funcionar corretamente:

### Supabase

Crie um arquivo `.env` na raiz do projeto (`project/.env`) com o seguinte conteúdo:

```env
# URL do seu projeto Supabase
# Exemplo: https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_URL=sua_url_aqui

# Chave anônima (anon/public key) do Supabase
# Encontre em: Settings > API > Project API keys > anon public
VITE_SUPABASE_ANON_KEY=sua_chave_aqui

# URL pública do app (para links de WhatsApp / "Enviar cadastro")
# Exemplo: https://clinica-aurea.com — evita usar IP/localhost ao copiar link
VITE_PUBLIC_APP_URL=https://seu-dominio.com
```

## Como Obter as Credenciais

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Settings** > **API**
4. Copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

## Importante

- ⚠️ **NUNCA** commite o arquivo `.env` no Git (já está no .gitignore)
- ✅ O arquivo `.env` deve estar na raiz do diretório `project/`
- ✅ As variáveis devem começar com `VITE_` para funcionar com Vite
- ✅ Reinicie o servidor de desenvolvimento após criar/alterar o `.env`

## Verificação

Após configurar, execute:

```bash
npm run dev
```

Se as variáveis estiverem corretas, o servidor iniciará sem erros. Caso contrário, você verá uma mensagem de erro clara indicando qual variável está faltando.
