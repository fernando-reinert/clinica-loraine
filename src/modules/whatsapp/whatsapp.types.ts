// src/modules/whatsapp/whatsapp.types.ts
// Tipos centrais para integração com Evolution API

// ---------------------------------------------------------------------------
// Instância
// ---------------------------------------------------------------------------

export type ConnectionStatus = 'open' | 'close' | 'connecting'

export interface WhatsAppInstance {
  instanceName: string
  instanceId: string
  status: ConnectionStatus
  owner?: string | null
  profileName?: string | null
  profilePicUrl?: string | null
  integration?: string
}

export interface CreateInstancePayload {
  instanceName: string
  /** Número no formato internacional sem '+', ex: '5511999887766' */
  number?: string
  qrcode?: boolean
  integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS'
  webhookUrl?: string
  webhookByEvents?: boolean
  webhookBase64?: boolean
  webhookEvents?: string[]
  rejectCall?: boolean
  msgCall?: string
  groupsIgnore?: boolean
  alwaysOnline?: boolean
  readMessages?: boolean
  readStatus?: boolean
  syncFullHistory?: boolean
}

export interface CreateInstanceResponse {
  instance: WhatsAppInstance
  hash: { apikey: string }
  qrcode?: QRCodeData
  settings?: Record<string, unknown>
}

export interface ConnectionStateResponse {
  instance: {
    instanceName: string
    state: ConnectionStatus
  }
}

// ---------------------------------------------------------------------------
// QR Code
// ---------------------------------------------------------------------------

export interface QRCodeData {
  pairingCode: string | null
  code: string
  base64: string
  count: number
}

export interface QRCodeResponse {
  qrcode: QRCodeData
}

// ---------------------------------------------------------------------------
// Mensagens enviadas
// ---------------------------------------------------------------------------

export interface SendTextPayload {
  /** Número destino: '5511999887766' ou 'numero@s.whatsapp.net' */
  number: string
  text: string
  delay?: number
  linkPreview?: boolean
  mentionsEveryOne?: boolean
  mentioned?: string[]
}

export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'sticker'

export interface SendMediaPayload {
  number: string
  mediatype: MediaType
  mimetype?: string
  caption?: string
  media: string         // URL pública ou base64
  fileName?: string
  delay?: number
}

export interface SendTemplatePayload {
  number: string
  /** ID do template no WhatsApp Business */
  name: string
  language: string
  components?: unknown[]
}

export interface SendMessageResponse {
  key: {
    remoteJid: string
    fromMe: boolean
    id: string
  }
  message: Record<string, unknown>
  messageType: string
  messageTimestamp: number
  instanceId: string
  source: string
  pushName: string
  status: string
}

// ---------------------------------------------------------------------------
// Webhook payloads recebidos
// ---------------------------------------------------------------------------

export type WebhookEvent =
  | 'MESSAGES_UPSERT'
  | 'MESSAGES_UPDATE'
  | 'CONNECTION_UPDATE'
  | 'QRCODE_UPDATED'
  | 'CONTACTS_UPSERT'
  | 'CHATS_UPSERT'
  | 'GROUPS_UPSERT'
  | 'CALL'

export interface WebhookBasePayload {
  event: WebhookEvent
  instance: string
  destination: string
  date_time: string
  sender: string
  server_url: string
  apikey: string
}

export interface MessageWebhookPayload extends WebhookBasePayload {
  event: 'MESSAGES_UPSERT' | 'MESSAGES_UPDATE'
  data: {
    key: {
      remoteJid: string
      fromMe: boolean
      id: string
    }
    pushName?: string
    message?: Record<string, unknown>
    messageType?: string
    messageTimestamp?: number
    status?: string
    source?: string
  } | Array<{
    key: { remoteJid: string; fromMe: boolean; id: string }
    update: { status: string }
  }>
}

export interface ConnectionUpdatePayload extends WebhookBasePayload {
  event: 'CONNECTION_UPDATE'
  data: {
    instance: string
    wuid?: string
    profileName?: string
    profilePicUrl?: string
    state?: ConnectionStatus
    statusReason?: number
  }
}

export interface QRCodeWebhookPayload extends WebhookBasePayload {
  event: 'QRCODE_UPDATED'
  data: QRCodeData & { instance: string }
}

export type AnyWebhookPayload =
  | MessageWebhookPayload
  | ConnectionUpdatePayload
  | QRCodeWebhookPayload
  | WebhookBasePayload

// ---------------------------------------------------------------------------
// Erros
// ---------------------------------------------------------------------------

export interface EvolutionApiError {
  status: number
  error: string
  message: string
  response?: { message: string[] }
}
