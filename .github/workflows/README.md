# GitHub Actions - Deploy para Hostinger

Dois workflows publicam por FTP na Hostinger quando há push na `main` (ou rodando manualmente em
**Actions > escolher o workflow > Run workflow**).

| Workflow | Arquivo | Quando roda | Destino (relativo à pasta pessoal da conta FTP) |
|---|---|---|---|
| Deploy App | `deploy.yml` | push na `main` (ignora `landing/**` e docs) | `./domains/clinica-aurea.com/public_html/app/` -> app.clinica-aurea.com |
| Deploy Landing | `deploy-landing.yml` | push na `main` que altere `landing/**` | `./domains/clinica-aurea.com/public_html/` -> clinica-aurea.com |

Os dois rodam em fila (um por vez cada) e **não usam "clean-slate"**: o action só remove arquivos que ele
mesmo enviou antes (arquivo de estado `.ftp-deploy-sync-state*.json` na pasta de destino). Assim, a landing
nunca apaga a pasta `app/`.

## Secrets (Settings > Secrets and variables > Actions)

| Secret | Para que serve |
|---|---|
| `FTP_SERVER` | Host/IP do FTP (hPanel > Arquivos > Contas FTP) |
| `FTP_USERNAME` | Usuário do FTP |
| `FTP_PASSWORD` | Senha do FTP |
| `FTP_PORT` | Porta (21) |
| `VITE_SUPABASE_URL` | URL do Supabase, **usada no build do app** |
| `VITE_SUPABASE_ANON_KEY` | Chave anon do Supabase, **usada no build do app** |

Sem `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` o app é gerado apontando para um Supabase falso e
fica quebrado. O workflow do app falha de propósito (antes de publicar) se esses dois secrets não existirem.

## Antes de mexer

- Faça backup da pasta `app/` pelo Gerenciador de Arquivos antes do primeiro deploy automático.
- Os arquivos antigos com hash (`assets/index-XXXX.js`) enviados manualmente não são apagados pelo action.
- O build no GitHub roda `npm version patch` só na máquina do runner: o `package.json` do repositório não muda.

## Problemas comuns

- **Falha de conexão FTP**: confirme `FTP_SERVER`, `FTP_PORT` e se a conta FTP está ativa.
- **App abre em branco / erro de Supabase**: confira os secrets `VITE_SUPABASE_*`.
- **Arquivo no lugar errado**: o login FTP entra na pasta pessoal da conta (onde ficam `domains/`, `.logs/`). O site fica em `domains/clinica-aurea.com/public_html/`. Se o site não mudar após um deploy verde, procure o arquivo `.ftp-deploy-sync-state*.json` em `public_html` no Gerenciador de Arquivos; se não estiver lá, o caminho está errado.
- **Secrets com espaço**: cole o valor sem espaço nem quebra de linha no fim (isso já causou erro 530 de login).
