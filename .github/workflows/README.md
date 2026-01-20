# GitHub Actions - Deploy para Hostinger

Este workflow faz deploy automático do projeto React + Vite para a Hostinger a cada push na branch `main` ou `master`.

## Configuração dos Secrets

Configure os seguintes secrets no GitHub (Settings → Secrets and variables → Actions):

### Secrets Obrigatórios

1. **`HOSTINGER_HOST`**
   - Hostname ou IP do servidor Hostinger
   - Exemplo: `ftp.exemplo.com` ou `123.456.789.0`

2. **`HOSTINGER_USER`**
   - Usuário FTP/SFTP da Hostinger
   - Exemplo: `u123456789`

3. **`HOSTINGER_PASSWORD`**
   - Senha FTP/SFTP da Hostinger
   - ⚠️ **Nunca commite esta senha no código!**

### Secrets Opcionais

4. **`HOSTINGER_PORT`** (opcional)
   - Porta FTP (padrão: `21`)
   - Para SFTP, use `22`

5. **`HOSTINGER_PATH`** (opcional)
   - Caminho do diretório público no servidor
   - Padrão: `/public_html/`
   - Para subdomínios ou subpastas, ajuste conforme necessário
   - Exemplos:
     - Root: `/public_html/`
     - Subpasta: `/public_html/clinica/`
     - Subdomínio: `/public_html/subdominio/`

## Como Encontrar as Credenciais na Hostinger

1. Acesse o **hPanel** da Hostinger
2. Vá em **FTP** → **Gerenciar Contas FTP**
3. Use as credenciais da conta FTP principal ou crie uma nova conta
4. O caminho geralmente é `/public_html/` para o domínio principal

## Fluxo do Deploy

1. **Checkout**: Baixa o código do repositório
2. **Setup Node.js**: Configura Node.js 18+ com cache de npm
3. **Install**: Instala dependências com `npm ci` (lock file)
4. **Build**: Compila o projeto com `npm run build`
5. **Copy .htaccess**: Copia o `.htaccess` para `dist/` (SPA routing)
6. **Deploy**: Envia apenas o conteúdo de `dist/` para o servidor via SFTP/FTP

## SPA Routing

O arquivo `.htaccess` é copiado automaticamente para `dist/` durante o build, garantindo que rotas do React Router (ex: `/patients`, `/appointments/new`) funcionem corretamente sem retornar 404.

## Limpeza Automática

O workflow usa `dangerous-clean-slate: true` para:
- Remover arquivos antigos do build anterior
- Garantir que apenas os arquivos do build atual estejam no servidor
- Evitar lixo de builds anteriores

## Execução Manual

Você pode executar o workflow manualmente:
1. Vá em **Actions** no GitHub
2. Selecione **Deploy to Hostinger**
3. Clique em **Run workflow**

## Troubleshooting

### Erro: "Connection refused"
- Verifique se `HOSTINGER_HOST` está correto
- Confirme se a porta está correta (21 para FTP, 22 para SFTP)
- Verifique se o firewall permite conexões FTP/SFTP

### Erro: "Authentication failed"
- Verifique `HOSTINGER_USER` e `HOSTINGER_PASSWORD`
- Confirme se a conta FTP está ativa no hPanel

### Erro: "Path not found"
- Verifique `HOSTINGER_PATH`
- Confirme o caminho no hPanel → FTP → Gerenciar Contas FTP

### Rotas retornam 404
- Verifique se o `.htaccess` foi copiado para `dist/`
- Confirme se o servidor Apache está ativo
- Verifique se o módulo `mod_rewrite` está habilitado
