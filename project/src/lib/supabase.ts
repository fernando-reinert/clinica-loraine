import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database'


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Use placeholder values if environment variables are not configured
const defaultUrl = 'https://placeholder.supabase.co'
const defaultKey = 'placeholder-anon-key'

const finalUrl = supabaseUrl && supabaseUrl !== 'https://your-project-ref.supabase.co' ? supabaseUrl : defaultUrl
const finalKey = supabaseAnonKey && supabaseAnonKey !== 'your-anon-key-here' ? supabaseAnonKey : defaultKey

// Check if we're using placeholder values
const isUsingPlaceholders = finalUrl === defaultUrl || finalKey === defaultKey

if (isUsingPlaceholders) {
  console.warn('⚠️ Using placeholder Supabase credentials. Please configure your actual Supabase project.')
}

export const supabase = createClient<Database>(finalUrl, finalKey, {
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

// Export flag to check if using placeholders
export const isSupabaseConfigured = !isUsingPlaceholders

// Storage buckets
export const STORAGE_BUCKETS = {
  PATIENT_PHOTOS: 'patient_photos',
  SIGNATURES: 'signatures',
  BEFORE_AFTER: 'before_after'
} as const