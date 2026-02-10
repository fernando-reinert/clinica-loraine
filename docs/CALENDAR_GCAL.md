# Integração Google Calendar (Edge Functions)

Secrets no Supabase: `GCAL_CLIENT_EMAIL`, `GCAL_PRIVATE_KEY`, `GCAL_CALENDAR_ID`.

## Testes via PowerShell (Invoke-RestMethod)

Substitua `$SUPABASE_URL` (ex: `https://xxx.supabase.co`) e `$ANON_KEY` pelo anon key do projeto.

### 1) Create event

```powershell
$SUPABASE_URL = "https://SEU_PROJETO.supabase.co"
$ANON_KEY = "sua-anon-key"

$body = @{
  patientName = "Maria Silva"
  start       = "2025-02-15T14:00:00.000Z"
  end         = "2025-02-15T15:00:00.000Z"
  appointmentId = "opcional-uuid"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/functions/v1/create-gcal-event" `
  -Headers @{ "Authorization" = "Bearer $ANON_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Resposta esperada: `{ "ok": true, "eventId": "...", "htmlLink": "..." }`.

### 2) Update event

```powershell
$eventId = "EVENT_ID_RETORNADO_NO_CREATE"

$body = @{
  eventId    = $eventId
  patientName = "Maria Silva (remarcado)"
  start      = "2025-02-16T10:00:00.000Z"
  end        = "2025-02-16T11:00:00.000Z"
  notes      = "Observação opcional"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/functions/v1/update-gcal-event" `
  -Headers @{ "Authorization" = "Bearer $ANON_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Resposta esperada: `{ "ok": true, "eventId": "...", "htmlLink": "..." }`.

### 3) Cancel event

```powershell
$body = @{ eventId = $eventId } | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/functions/v1/cancel-gcal-event" `
  -Headers @{ "Authorization" = "Bearer $ANON_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Resposta esperada: `{ "ok": true }`.

---

- Timezone dos eventos: `America/Sao_Paulo` (-03:00).
- Datas em ISO 8601 (ex: `2025-02-15T14:00:00.000Z`).
- Se `eventId` não existir no update/cancel, a função retorna erro 400.

## Testes com acentos/emoji

Após o fix de encoding (função `latin1Safe` nas Edge Functions), teste:

### Create com acento

```powershell
$SUPABASE_URL = "https://SEU_PROJETO.supabase.co"
$ANON_KEY = "sua-anon-key"

$body = @{
  patientName  = "João da Silva"
  start        = "2025-02-20T14:00:00.000Z"
  end          = "2025-02-20T15:00:00.000Z"
  appointmentId = "teste-joao-acento"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/functions/v1/create-gcal-event" `
  -Headers @{ "Authorization" = "Bearer $ANON_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Esperado: resposta **não** deve ser 500; em sucesso, `{ ok = true; eventId = '...'; htmlLink = '...' }`.

### Update com emoji em notes

```powershell
$eventId = "EVENT_ID_RETORNADO_NO_CREATE"

$body = @{
  eventId    = $eventId
  patientName = "João da Silva"
  start      = "2025-02-20T16:00:00.000Z"
  end        = "2025-02-20T17:00:00.000Z"
  notes      = "Paciente feliz 😄 e sem dor."
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/functions/v1/update-gcal-event" `
  -Headers @{ "Authorization" = "Bearer $ANON_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Esperado: chamada não retorna 500. O Google Calendar pode mostrar título/descrição sem acentos/emoji (sanitizados), mas o app/banco continuam com o texto completo.

## Testes pós-polyfill btoa/atob (UTF-8)

Após o polyfill UTF-8 para `btoa`/`atob` nas Edge Functions (evitar erro "Latin1 range"), validar:

### Create com patientName ASCII e notes ASCII

```powershell
$body = @{
  patientName   = "Fernando"
  start        = "2025-02-22T14:00:00.000Z"
  end          = "2025-02-22T15:00:00.000Z"
  notes        = "Consulta rotina"
  appointmentId = "teste-fernando-ascii"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/functions/v1/create-gcal-event" `
  -Headers @{ "Authorization" = "Bearer $ANON_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Esperado: **não** retornar 500; resposta `{ ok = true; eventId = '...'; htmlLink = '...' }`.

### Create com acento e emoji no patientName

```powershell
$body = @{
  patientName   = "João 😄"
  start        = "2025-02-22T16:00:00.000Z"
  end          = "2025-02-22T17:00:00.000Z"
  appointmentId = "teste-joao-emoji"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "$SUPABASE_URL/functions/v1/create-gcal-event" `
  -Headers @{ "Authorization" = "Bearer $ANON_KEY"; "Content-Type" = "application/json" } `
  -Body $body
```

Esperado: **não** retornar 500; em sucesso, `{ ok = true; eventId = '...'; htmlLink = '...' }`.
