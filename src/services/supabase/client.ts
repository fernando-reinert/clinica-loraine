import { createClient } from '@supabase/supabase-js'
import { Database } from '../../types/database'

const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const supabaseUrl = envUrl?.trim() || ''
const supabaseAnonKey = envKey?.trim() || ''

export const SUPABASE_CONFIGURED = Boolean(supabaseUrl && supabaseAnonKey)

const effectiveUrl = SUPABASE_CONFIGURED ? supabaseUrl : 'https://placeholder.supabase.co'
const effectiveKey = SUPABASE_CONFIGURED ? supabaseAnonKey : 'placeholder-key'

export const SUPABASE_URL = effectiveUrl

export interface SupabaseEnvStatus {
  configured: boolean
  urlPresent: boolean
  urlFormat: 'ok' | 'empty' | 'invalid'
  anonKeyPresent: boolean
}

export function getSupabaseEnvStatus(): SupabaseEnvStatus {
  const urlPresent = Boolean(envUrl?.trim())
  const anonKeyPresent = Boolean(envKey?.trim())
  let urlFormat: 'ok' | 'empty' | 'invalid' = 'empty'
  if (urlPresent) {
    try {
      const u = new URL(envUrl!.trim())
      urlFormat = u.protocol === 'https:' && u.hostname.endsWith('.supabase.co') ? 'ok' : 'invalid'
    } catch {
      urlFormat = 'invalid'
    }
  }
  return {
    configured: SUPABASE_CONFIGURED,
    urlPresent,
    urlFormat,
    anonKeyPresent,
  }
}

export function maskAnonKey(key: string | undefined): string {
  if (!key || key.length < 8) return '(vazio ou inválido)'
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}

export const supabase = createClient<Database>(effectiveUrl, effectiveKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Storage buckets constants
export const STORAGE_BUCKETS = {
  PATIENT_PHOTOS: 'patient-photos',
  SIGNATURES: 'signatures',
  BEFORE_AFTER: 'before_after'
} as const
