# Migração: landing em `clinica-aurea.com` e sistema em `app.clinica-aurea.com`

## Estrutura
| Projeto | Pasta | Endereço | Deploy |
|---|---|---|---|
| Landing (Astro, HTML estático) | `landing/` | `https://clinica-aurea.com` | `.github/workflows/deploy-landing.yml` |
| Sistema (Vite/React) | raiz | `https://app.clinica-aurea.com` | `.github/workflows/deploy.yml` |

## Secrets do GitHub (Settings > Secrets > Actions)
- `HOSTINGER_HOST`, `HOSTINGER_USER`, `HOSTINGER_PASSWORD`, `HOSTINGER_PORT`: já existem.
- `HOSTINGER_APP_PATH`: pasta do subdomínio `app` (ex.: `/public_html/app/` ou a pasta que a Hostinger criar). **Novo.**
- `HOSTINGER_LANDING_PATH`: pasta da raiz (normalmente `/public_html/`). **Novo.**
- `deploy-hostinger.yml` (antigo, usa `FTP_*`) é uma duplicata do `deploy.yml`. Desativar ou apagar um dos dois. Se mantiver, `FTP_SERVER_DIR` precisa apontar para a pasta do app.

> O `deploy.yml` antigo usava `dangerous-clean-slate: true` em `/public_html/`. Isso foi removido: com ele, qualquer deploy na raiz apagaria a pasta do subdomínio.

## Ordem de publicação (sem derrubar o sistema)
1. Hostinger: criar o subdomínio `app.clinica-aurea.com` (SSL ativo). Anotar a pasta criada.
2. Criar os secrets `HOSTINGER_APP_PATH` e `HOSTINGER_LANDING_PATH`.
3. Publicar o **app** no subdomínio (merge na `main` ou "Run workflow" do `deploy.yml`). O app da raiz continua funcionando nesse momento.
4. Supabase:
   - Authentication > URL Configuration: Site URL = `https://app.clinica-aurea.com`; adicionar o mesmo endereço em Redirect URLs (manter o antigo até terminar).
   - Edge Functions: `supabase secrets set APP_PUBLIC_URL=https://app.clinica-aurea.com` e redeploy de `createStaffInvite` e das funções que usam `_shared/cors.ts` (o código já inclui o novo origin).
5. Testar no subdomínio: login, gerar link de anamnese, de cadastro, de plano e de convite de equipe; abrir cada um em aba anônima. O endereço deve ser `app.clinica-aurea.com/...`.
6. Publicar a **landing** na raiz (`deploy-landing.yml`). Isso substitui o app antigo na raiz.
7. Conferir `clinica-aurea.com`, `/sobre`, `/servicos`, `/servicos/peim`, `/clube-da-beleza`, `/contato`, `/robots.txt`, `/sitemap-index.xml`.
8. Avisar a Loraine: entrar por `app.clinica-aurea.com`, fazer login de novo e reinstalar o atalho (PWA) do celular.

## Rollback
- Landing: reverter o commit em `landing/` e publicar de novo, ou subir o `dist` anterior do app na raiz.
- App: o app antigo da raiz fica intacto até o passo 6.

## SEO (depois de no ar)
- Google Search Console: adicionar a propriedade `clinica-aurea.com` e enviar `sitemap-index.xml`.
- Google Meu Negócio com os mesmos nome, endereço e telefone do site.
- Trocar `landing/public/android-chrome-512x512.png` (usada como imagem de compartilhamento) por uma imagem própria 1200x630.
- Substituir os placeholders de foto (Loraine e equipe) e revisar os depoimentos (confirmar que são reais).
- O app usa `noindex` e `robots.txt` com `Disallow: /`.

## Pendências de teste
- O `.htaccess` da landing (URLs limpas, `www` e redirects) só pode ser validado no Apache da Hostinger. Testar `/sobre`, `/servicos`, `/servicos/` e `www.` logo após o deploy.
