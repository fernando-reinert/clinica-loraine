// src/services/whatsapp/whatsappAutomationService.ts
// Automação WhatsApp: confirmação ao agendar e lembrete 1h antes.
// Não bloqueia o fluxo principal em caso de falha.

import { supabase } from '../supabase/client'
import { sendTextMessage } from './whatsappService'
import logger from '../../utils/logger'

const INSTANCE_NAME = import.meta.env.VITE_EVOLUTION_INSTANCE ?? 'clinica_loraine'

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('pt-BR', {
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
): Promise<void> {
  if (!patientPhone) {
    logger.warn('[whatsappAutomation] Confirmação ignorada: sem telefone', { appointmentId })
    return
  }

  const firstName = patientName.split(' ')[0]
  const date = formatDate(startTimeIso)
  const time = formatTime(startTimeIso)

  const message = [
    `Olá ${firstName}, sua consulta na Clínica Loraine foi agendada.`,
    ``,
    `Data: ${date}`,
    `Horário: ${time}`,
    ``,
    `Se precisar reagendar entre em contato.`,
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
