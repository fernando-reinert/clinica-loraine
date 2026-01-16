// src/types/index.ts

// Tipos para formulário de anamnese
export interface Question {
  id: number;
  category: string;
  type: 'boolean' | 'text' | 'select';
  question: string;
  field: string;
  options?: string[];
  showIf?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface AnamneseFormData {
  id?: string;
  patient_id: string;
  title: string;
  status: 'draft' | 'sent' | 'completed' | 'signed';
  share_token?: string;
  share_expires_at?: string;
  patient_signature?: string;
  patient_signature_date?: string;
  completed_at?: string;
  answers: { [key: string]: any };
  created_at?: string;
  updated_at?: string;
  _local?: boolean;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

// Tipos para autenticação
export interface User {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
  };
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Tipos para Supabase
export interface SupabaseContextType {
  supabase: any;
  isOnline: boolean;
}

// Tipos para offline
export interface OfflineContextType {
  isOnline: boolean;
  syncPendingData: () => Promise<void>;
}