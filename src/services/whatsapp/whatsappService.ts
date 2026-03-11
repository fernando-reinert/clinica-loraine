// src/services/whatsapp/whatsappService.ts
// Envio de mensagens WhatsApp via Evolution API

import { evolutionApiClient } from './evolutionApiClient'
import { formatWhatsAppPhone } from '../../utils/whatsapp'
import type {
  SendTextPayload,
  SendMediaPayload,
  SendMessageResponse,
} from '../../modules/whatsapp/whatsapp.types'
import logger from '../../utils/logger'

/**
 * Envia mensagem de texto simples.
 *
 * @param instanceName  Nome da instância Evolution API
 * @param rawPhone      Número bruto do destinatário (ex: '(11) 99988-7766' ou '5511999887766')
 * @param text          Texto da mensagem
 * @param delay         Delay em ms antes do envio (simula digitação humana, padrão 1200ms)
 */
export async function sendTextMessage(
  instanceName: string,
  rawPhone: string,
  text: string,
  delay = 1200,
): Promise<SendMessageResponse> {
  const number = formatWhatsAppPhone(rawPhone)
  if (!number) {
    throw new Error(`Número de telefone inválido: "${rawPhone}"`)
  }

  const payload: SendTextPayload = { number, text, delay, linkPreview: false }
  logger.info('[whatsappService] sendTextMessage', { instanceName, number })
  return evolutionApiClient.post<SendMessageResponse>(
    `/message/sendText/${instanceName}`,
    payload,
  )
}

/**
 * Envia imagem com legenda opcional.
 *
 * @param instanceName  Nome da instância
 * @param rawPhone      Número do destinatário
 * @param imageUrl      URL pública da imagem
 * @param caption       Legenda opcional
 */
export async function sendImageMessage(
  instanceName: string,
  rawPhone: string,
  imageUrl: string,
  caption?: string,
): Promise<SendMessageResponse> {
  const number = formatWhatsAppPhone(rawPhone)
  if (!number) throw new Error(`Número de telefone inválido: "${rawPhone}"`)

  const payload: SendMediaPayload = {
    number,
    mediatype: 'image',
    media: imageUrl,
    caption,
  }
  logger.info('[whatsappService] sendImageMessage', { instanceName, number })
  return evolutionApiClient.post<SendMessageResponse>(
    `/message/sendMedia/${instanceName}`,
    payload,
  )
}

/**
 * Envia documento (PDF, etc.) com nome de arquivo.
 */
export async function sendDocumentMessage(
  instanceName: string,
  rawPhone: string,
  documentUrl: string,
  fileName: string,
  caption?: string,
): Promise<SendMessageResponse> {
  const number = formatWhatsAppPhone(rawPhone)
  if (!number) throw new Error(`Número de telefone inválido: "${rawPhone}"`)

  const payload: SendMediaPayload = {
    number,
    mediatype: 'document',
    media: documentUrl,
    fileName,
    caption,
  }
  logger.info('[whatsappService] sendDocumentMessage', { instanceName, number, fileName })
  return evolutionApiClient.post<SendMessageResponse>(
    `/message/sendMedia/${instanceName}`,
    payload,
  )
}

// ---------------------------------------------------------------------------
// Helpers de alto nível para casos de uso da clínica
// ---------------------------------------------------------------------------

/**
 * Envia lembrete de consulta no formato padrão da clínica.
 *
 * @param instanceName  Instância da clínica
 * @param rawPhone      Telefone do paciente
 * @param patientName   Nome do paciente
 * @param appointmentDate  Data/hora formatada (ex: 'quinta-feira, 12/03 às 14:00')
 * @param professionalName Nome do profissional
 */
export async function sendAppointmentReminder(
  instanceName: string,
  rawPhone: string,
  patientName: string,
  appointmentDate: string,
  professionalName: string,
): Promise<SendMessageResponse> {
  const firstName = patientName.split(' ')[0]
  const text = [
    `Olá, ${firstName}! 👋`,
    ``,
    `Lembramos do seu agendamento:`,
    `📅 *${appointmentDate}*`,
    `👩‍⚕️ ${professionalName}`,
    ``,
    `Confirme sua presença respondendo *SIM* ou entre em contato para reagendar.`,
  ].join('\n')

  return sendTextMessage(instanceName, rawPhone, text)
}

/**
 * Envia confirmação após criação de agendamento.
 */
export async function sendAppointmentConfirmation(
  instanceName: string,
  rawPhone: string,
  patientName: string,
  appointmentDate: string,
): Promise<SendMessageResponse> {
  const firstName = patientName.split(' ')[0]
  const text = [
    `Olá, ${firstName}! ✅`,
    ``,
    `Seu agendamento foi confirmado para:`,
    `📅 *${appointmentDate}*`,
    ``,
    `Qualquer dúvida, estamos à disposição!`,
  ].join('\n')

  return sendTextMessage(instanceName, rawPhone, text)
}
