import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';  // Se você tiver tipos personalizados

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
