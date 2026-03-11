# WhatsApp Integration — Evolution API

Documentação da integração WhatsApp da Clínica Áurea via [Evolution API](https://doc.evolution-api.com).

---

## Arquitetura

```
Frontend (Vite/React)
  └── src/services/whatsapp/
        ├── evolutionApiClient.ts      ← HTTP client tipado
        ├── whatsappService.ts         ← Envio de mensagens
        └── whatsappInstanceService.ts ← Gerenciamento de instâncias

  └── src/modules/whatsapp/
        └── whatsapp.types.ts          ← Tipos TypeScript

Evolution API (Docker local — porta 8080)
  └── docker-compose.evolution.yml
  └── .env.evolution (NÃO commitado)

Supabase Edge Function
  └── supabase/functions/whatsapp-webhook/index.ts ← Recebe eventos
```

---

## Setup inicial

### 1. Configurar variáveis de ambiente

```bash
# Copie o template
cp .env.evolution.example .env.evolution

# Edite com seus valores reais
nano .env.evolution
```

Campos obrigatórios no `.env.evolution`:

| Campo | Descrição |
|-------|-----------|
| `AUTHENTICATION_API_KEY` | Chave de API global (mín. 32 chars, troque o exemplo) |
| `DATABASE_CONNECTION_URI` | URI do Postgres local (já configurada para o container) |
| `WEBHOOK_GLOBAL_URL` | URL da Edge Function Supabase (ver seção Webhook) |
| `EVOLUTION_POSTGRES_PASSWORD` | Senha do Postgres local |

### 2. Variáveis no `.env` do projeto Vite

Adicione ao seu `.env` local:

```env
VITE_EVOLUTION_API_URL=http://localhost:8080
VITE_EVOLUTION_API_KEY=SUA_CHAVE_AQUI   # igual ao AUTHENTICATION_API_KEY acima
```

### 3. Subir a infraestrutura

```bash
npm run evolution:start
```

Aguarde alguns segundos e verifique:

```bash
npm run evolution:logs
```

A API estará disponível em `http://localhost:8080`.

---

## Gerenciamento de instâncias

Cada profissional/clínica pode ter sua própria instância WhatsApp.

### Criar instância

```typescript
import { createInstance } from '@/services/whatsapp/whatsappInstanceService'

const res = await createInstance({
  instanceName: 'clinica-principal',  // único por tenant
  qrcode: true,
})
// res.qrcode.base64 → imagem QR para escanear
```

### Obter QR Code

```typescript
import { getInstanceQRCode } from '@/services/whatsapp/whatsappInstanceService'

const { qrcode } = await getInstanceQRCode('clinica-principal')
// Renderize qrcode.base64 como <img src={qrcode.base64} />
```

### Verificar estado de conexão

```typescript
import { getConnectionState } from '@/services/whatsapp/whatsappInstanceService'

const { instance } = await getConnectionState('clinica-principal')
// instance.state: 'open' | 'close' | 'connecting'
```

---

## Envio de mensagens

### Lembrete de consulta (helper pronto)

```typescript
import { sendAppointmentReminder } from '@/services/whatsapp/whatsappService'

await sendAppointmentReminder(
  'clinica-principal',        // instanceName
  '(11) 99988-7766',          // telefone do paciente (qualquer formato)
  'Maria da Silva',
  'quinta-feira, 12/03 às 14:00',
  'Dra. Loraine Souza',
)
```

### Texto livre

```typescript
import { sendTextMessage } from '@/services/whatsapp/whatsappService'

await sendTextMessage('clinica-principal', '11999887766', 'Olá!')
```

### Imagem / Documento

```typescript
import { sendImageMessage, sendDocumentMessage } from '@/services/whatsapp/whatsappService'

await sendImageMessage('clinica-principal', '11999887766', 'https://...url-publica.png', 'Sua receita')
await sendDocumentMessage('clinica-principal', '11999887766', 'https://...receita.pdf', 'receita.pdf')
```

---

## Webhook (recebimento de eventos)

A Edge Function `whatsapp-webhook` recebe eventos da Evolution API.

### Deploy

```bash
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

> `--no-verify-jwt` é necessário porque Evolution API não usa JWT Supabase.

### Configurar segredo na Edge Function

```bash
supabase secrets set EVOLUTION_API_KEY=SUA_CHAVE_AQUI
```

### URL do webhook

Após deploy, configure no `.env.evolution`:

```env
WEBHOOK_GLOBAL_URL=https://[PROJECT_REF].supabase.co/functions/v1/whatsapp-webhook
```

### Eventos processados

| Evento | Ação |
|--------|------|
| `CONNECTION_UPDATE` | Atualiza `whatsapp_instances` no Supabase |
| `MESSAGES_UPSERT` | Salva mensagens recebidas em `whatsapp_messages` |
| `QRCODE_UPDATED` | Log (futuro: notificar frontend via Realtime) |
| outros | Log sem ação |

---

## Migrations necessárias

Para persistir estado de instâncias e mensagens, aplique as migrations:

```sql
-- whatsapp_instances: estado de cada instância
CREATE TABLE whatsapp_instances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name   text NOT NULL UNIQUE,
  status          text NOT NULL DEFAULT 'close',
  wuid            text,
  profile_name    text,
  profile_pic_url text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- whatsapp_messages: mensagens recebidas
CREATE TABLE whatsapp_messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name     text NOT NULL,
  message_id        text,
  remote_jid        text NOT NULL,
  from_me           boolean NOT NULL DEFAULT false,
  push_name         text,
  message_type      text,
  message_timestamp bigint,
  status            text,
  raw_payload       jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON whatsapp_messages (instance_name, remote_jid);
CREATE INDEX ON whatsapp_messages (created_at DESC);
```

> Adapte com `tenant_id` e RLS conforme o padrão multi-tenant do projeto.

---

## Scripts npm

| Comando | Descrição |
|---------|-----------|
| `npm run evolution:start` | Sobe containers (PostgreSQL + Redis + API) |
| `npm run evolution:stop`  | Para e remove os containers |
| `npm run evolution:logs`  | Acompanha logs em tempo real |
| `npm run evolution:reset` | Para + remove volumes (⚠️ apaga dados locais) |

---

## Solução de problemas

**API não responde em localhost:8080**
```bash
npm run evolution:logs  # verifique erros de startup
docker ps               # confirme que clinica_evolution_api está rodando
```

**QR Code não aparece**
- Confirme que `AUTHENTICATION_API_KEY` no `.env.evolution` é igual ao `VITE_EVOLUTION_API_KEY`
- Confirme que a instância existe: `GET /instance/fetchInstances`

**Webhook não recebe eventos**
- Verifique se a Edge Function foi deployada: `supabase functions list`
- Verifique se `EVOLUTION_API_KEY` foi configurado como secret: `supabase secrets list`
- Teste manualmente: `curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/whatsapp-webhook`
