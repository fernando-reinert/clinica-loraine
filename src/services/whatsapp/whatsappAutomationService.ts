// src/services/whatsapp/whatsappAutomationService.ts
// Automação WhatsApp: confirmação ao agendar.
// Chama Evolution API diretamente do browser (funciona com localhost:8080 no ambiente local).
// Não bloqueia o fluxo principal em caso de falha.

import { supabase } from '../supabase/client'
import { sendTextMessage } from './whatsappService'
import logger from '../../utils/logger'

const INSTANCE_NAME = import.meta.env.VITE_EVOLUTION_INSTANCE ?? 'clinica_loraine'

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

/**
 * Envia mensagem de confirmação ao criar um agendamento.
 * Atualiza whatsapp_confirmation_sent = true após envio.
 * Não lança exceção — falhas são apenas logadas.
 */
export async function sendConfirmationOnCreate(
  appointmentId: string,
  patientName: string,
  patientPhone: string,
  startTimeIso: string,
  title?: string,
): Promise<void> {
  if (!patientPhone) {
    logger.warn('[whatsappAutomation] Confirmação ignorada: sem telefone', { appointmentId })
    return
  }

  const firstName = patientName.split(' ')[0]
  const date = formatDate(startTimeIso)
  const time = formatTime(startTimeIso)
  const service = title?.trim() || 'consulta'

  const message = [
    `Olá ${firstName}! 👋`,
    ``,
    `Seu agendamento na *Clínica Loraine* foi confirmado.`,
    ``,
    `🩺 Serviço: *${service}*`,
    `📅 Data: ${date}`,
    `⏰ Horário: ${time}`,
    ``,
    `Chegue com 10 minutos de antecedência.`,
    `Se precisar reagendar, entre em contato conosco.`,
    ``,
    `Até logo! ✨`,
  ].join('\n')

  try {
    await sendTextMessage(INSTANCE_NAME, patientPhone, message)

    await supabase
      .from('appointments')
      .update({ whatsapp_confirmation_sent: true })
      .eq('id', appointmentId)

    logger.info('[whatsappAutomation] Confirmação enviada', { appointmentId })
  } catch (err: any) {
    logger.error('[whatsappAutomation] Falha ao enviar confirmação (não bloqueante)', {
      appointmentId,
      error: err?.message ?? String(err),
    })
  }
}
