// src/services/whatsapp/evolutionApiClient.ts
// Cliente HTTP tipado para Evolution API
// Lê VITE_EVOLUTION_API_URL e VITE_EVOLUTION_API_KEY do ambiente Vite.

import type { EvolutionApiError } from '../../modules/whatsapp/whatsapp.types'
import logger from '../../utils/logger'

const BASE_URL = (import.meta.env.VITE_EVOLUTION_API_URL ?? 'http://localhost:8080').replace(/\/$/, '')
const API_KEY  = import.meta.env.VITE_EVOLUTION_API_KEY ?? ''

class EvolutionApiClientError extends Error {
  readonly status: number
  readonly body: EvolutionApiError

  constructor(status: number, body: EvolutionApiError) {
    super(`Evolution API ${status}: ${body.message ?? body.error}`)
    this.name = 'EvolutionApiClientError'
    this.status = status
    this.body = body
  }
}

async function request<T>(
  method: 'GET' | 'POST' | 'DELETE' | 'PUT',
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BASE_URL}${path}`

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: API_KEY,
    },
  }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }

  let res: Response
  try {
    res = await fetch(url, init)
  } catch (err) {
    logger.error('[EvolutionApiClient] network error', { url, err })
    throw new Error(`Falha de rede ao conectar à Evolution API: ${(err as Error).message}`)
  }

  if (!res.ok) {
    let errBody: EvolutionApiError
    try {
      errBody = await res.json()
    } catch {
      errBody = { status: res.status, error: res.statusText, message: res.statusText }
    }
    logger.error('[EvolutionApiClient] request failed', { url, status: res.status, errBody })
    throw new EvolutionApiClientError(res.status, errBody)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export const evolutionApiClient = {
  get:    <T>(path: string)               => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown) => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown) => request<T>('PUT',    path, body),
  delete: <T>(path: string)               => request<T>('DELETE',  path),
}

export { EvolutionApiClientError }
