// src/services/whatsapp/whatsappInstanceService.ts
// Gerenciamento de instâncias WhatsApp (criar, conectar, QR code, status, deletar)

import { evolutionApiClient } from './evolutionApiClient'
import type {
  CreateInstancePayload,
  CreateInstanceResponse,
  ConnectionStateResponse,
  QRCodeResponse,
  WhatsAppInstance,
} from '../../modules/whatsapp/whatsapp.types'
import logger from '../../utils/logger'

/**
 * Cria uma nova instância WhatsApp.
 * O nome da instância deve ser único por tenant — use o tenant_id ou profissional_id como prefixo.
 */
export async function createInstance(
  payload: CreateInstancePayload,
): Promise<CreateInstanceResponse> {
  logger.info('[whatsappInstanceService] createInstance', { instanceName: payload.instanceName })
  return evolutionApiClient.post<CreateInstanceResponse>('/instance/create', payload)
}

/**
 * Busca o QR Code para escanear e conectar a instância.
 * Disponível apenas quando a instância está no estado 'close'.
 */
export async function getInstanceQRCode(instanceName: string): Promise<QRCodeResponse> {
  logger.info('[whatsappInstanceService] getInstanceQRCode', { instanceName })
  return evolutionApiClient.get<QRCodeResponse>(`/instance/connect/${instanceName}`)
}

/**
 * Retorna o estado de conexão atual da instância.
 */
export async function getConnectionState(
  instanceName: string,
): Promise<ConnectionStateResponse> {
  return evolutionApiClient.get<ConnectionStateResponse>(
    `/instance/connectionState/${instanceName}`,
  )
}

/**
 * Lista todas as instâncias cadastradas na API.
 */
export async function listInstances(): Promise<WhatsAppInstance[]> {
  const res = await evolutionApiClient.get<WhatsAppInstance[]>('/instance/fetchInstances')
  return res ?? []
}

/**
 * Desconecta a instância (logout do WhatsApp), mantendo o registro.
 */
export async function logoutInstance(instanceName: string): Promise<void> {
  logger.info('[whatsappInstanceService] logoutInstance', { instanceName })
  await evolutionApiClient.delete(`/instance/logout/${instanceName}`)
}

/**
 * Remove completamente a instância (logout + exclusão do registro).
 */
export async function deleteInstance(instanceName: string): Promise<void> {
  logger.info('[whatsappInstanceService] deleteInstance', { instanceName })
  await evolutionApiClient.delete(`/instance/delete/${instanceName}`)
}

/**
 * Reinicia a instância (útil para resolver falhas de conexão).
 */
export async function restartInstance(instanceName: string): Promise<{ error: false; message: string }> {
  logger.info('[whatsappInstanceService] restartInstance', { instanceName })
  return evolutionApiClient.put(`/instance/restart/${instanceName}`, {})
}
