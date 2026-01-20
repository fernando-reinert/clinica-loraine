# 🚀 Guia de Deploy - Hostinger via GitHub Actions

## ✅ Checklist de Configuração

### 1. Secrets do GitHub (Obrigatórios)

Configure estes secrets em **GitHub → Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `HOSTINGER_HOST` | Hostname ou IP do servidor | `ftp.exemplo.com` ou `123.456.789.0` |
| `HOSTINGER_USER` | Usuário FTP/SFTP | `u123456789` |
| `HOSTINGER_PASSWORD` | Senha FTP/SFTP | `sua_senha_segura` |

### 2. Secrets Opcionais

| Secret | Descrição | Padrão |
|--------|-----------|--------|
| `HOSTINGER_PORT` | Porta FTP (21) ou SFTP (22) | `21` |
| `HOSTINGER_PATH` | Caminho do diretório público | `/public_html/` |

### 3. Como Encontrar as Credenciais na Hostinger

1. Acesse o **hPanel** da Hostinger
2. Vá em **FTP** → **Gerenciar Contas FTP**
3. Use as credenciais da conta FTP principal ou crie uma nova
4. O caminho padrão é `/public_html/` para o domínio principal

## 📋 Arquivos Criados/Atualizados

### ✅ Workflow do GitHub Actions
- **Arquivo**: `.github/workflows/deploy.yml`
- **Trigger**: Push em `main` ou `master`
- **Ações**:
  1. Instala dependências (`npm ci`)
  2. Build do projeto (`npm run build`)
  3. Copia `.htaccess` para `dist/`
  4. Deploy via SFTP/FTP para Hostinger

### ✅ Arquivo .htaccess
- **Arquivo**: `public/.htaccess`
- **Atualizado**: Adicionada verificação de diretório para SPA routing
- **Função**: Garante que rotas do React Router funcionem sem 404

### ✅ Configuração do Vite
- **Arquivo**: `vite.config.ts`
- **Base**: `/` (deploy no root do domínio) ✅

## 🔄 Fluxo do Deploy

```
Push na branch main/master
    ↓
GitHub Actions inicia
    ↓
Checkout do código
    ↓
Setup Node.js 18+
    ↓
npm ci (instala dependências)
    ↓
npm run build (compila projeto)
    ↓
Copia .htaccess para dist/
    ↓
Deploy via SFTP/FTP
    ↓
Limpa arquivos antigos
    ↓
Site atualizado! 🎉
```

## 🎯 Caminho de Deploy Esperado

**Padrão**: `/public_html/`

Se seu domínio estiver em subpasta ou subdomínio, ajuste o secret `HOSTINGER_PATH`:
- Subpasta: `/public_html/clinica/`
- Subdomínio: `/public_html/subdominio/`

## 🔧 Troubleshooting

### Erro: "Connection refused"
- Verifique `HOSTINGER_HOST` e `HOSTINGER_PORT`
- Confirme se o firewall permite conexões FTP/SFTP

### Erro: "Authentication failed"
- Verifique `HOSTINGER_USER` e `HOSTINGER_PASSWORD`
- Confirme se a conta FTP está ativa no hPanel

### Rotas retornam 404
- Verifique se o `.htaccess` foi copiado (está no workflow)
- Confirme se o Apache está ativo e `mod_rewrite` habilitado

### Build falha
- Verifique se `package-lock.json` está commitado
- Confirme se todas as dependências estão no `package.json`

## 📝 Próximos Passos

1. ✅ Configure os secrets no GitHub
2. ✅ Faça push na branch `main` ou `master`
3. ✅ Verifique o deploy em **Actions** no GitHub
4. ✅ Acesse seu site e teste as rotas SPA

## 🔒 Segurança

- ⚠️ **Nunca** commite senhas ou credenciais no código
- ✅ Use sempre GitHub Secrets para dados sensíveis
- ✅ O workflow usa `npm ci` (lock file) para builds reproduzíveis
