/**
 * src/types/db.ts
 * 
 * Tipos TypeScript baseados no SCHEMA REAL do banco de dados Supabase
 * 
 * FONTE DA VERDADE: Este arquivo define os tipos EXATOS conforme o banco
 * NÃO inventar colunas que não existem no schema real
 */

// ============================================
// PROFESSIONALS
// ============================================
export interface Professional {
  id: string;
  user_id: string;
  email: string;
  name: string;
  profession: string; // ⚠️ NÃO é "specialty"
  license: string; // ⚠️ NÃO é "license_number"
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// PATIENTS
// ============================================
export interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  cpf: string;
  birth_date: string; // date no banco
  address: string | null;
  photo_url: string | null;
  professional_id: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// PROCEDURES (Catálogo de Procedimentos)
// ============================================
// ⚠️ ATENÇÃO: Esta tabela é CATÁLOGO, não histórico financeiro
// Colunas principais:
// - id
// - name
// - description
// - category
// - duration_minutes
// - cost_price
// - sale_price
// - consent_template_id
// - is_active
// - created_at
// - updated_at
// ⚠️ NÃO TEM: procedure_type, client_name, total_amount, patient_id
export interface Procedure {
  id: string;
  name: string; // ⚠️ NÃO é "procedure_type"
  description: string | null;
  category: string;
  duration_minutes: number;
  cost_price: number;
  sale_price: number;
  consent_template_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// CONSENT_TEMPLATES
// ============================================
// Colunas: id, procedure_key, title, content, created_at
// ⚠️ NÃO TEM: procedure_name, version, is_active, updated_at
export interface ConsentTemplate {
  id: string;
  procedure_key: string; // ⚠️ NÃO é "procedure_name"
  title: string;
  content: string;
  created_at: string;
  // ⚠️ NÃO EXISTE: version, is_active, updated_at
}

// ============================================
// CONSENT_FORMS
// ============================================
export interface ConsentForm {
  id: string;
  visit_procedure_id: string | null; // Pode ser null
  procedure_key: string; // NOT NULL
  template_id: string | null;
  content_snapshot: string; // NOT NULL - campo principal
  filled_content: string | null; // Mantido por compatibilidade
  patient_signature_url: string | null;
  professional_signature_url: string | null;
  image_authorization: boolean; // NOT NULL
  signed_location: string;
  signed_at: string; // NOT NULL
  patient_id: string; // NOT NULL
  professional_id: string; // NOT NULL
  created_at: string;
  updated_at: string;
}

// ============================================
// VISITS
// ============================================
export interface Visit {
  id: string;
  appointment_id: string | null;
  patient_id: string;
  professional_id: string;
  visit_date: string; // timestamptz
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// VISIT_PROCEDURES
// ============================================
export interface VisitProcedure {
  id: string;
  visit_id: string;
  procedure_id: string | null;
  procedure_name: string; // Snapshot do nome
  performed_at: string;
  professional_id: string;
  units: number;
  lot_number: string | null;
  brand: string | null;
  observations: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// PROCEDURE_ATTACHMENTS
// ============================================
export interface ProcedureAttachment {
  id: string;
  visit_procedure_id: string;
  attachment_type: 'sticker' | 'photo' | 'document';
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  metadata: any;
  created_at: string;
}

// ============================================
// APPOINTMENTS
// ============================================
export interface Appointment {
  id: string;
  patient_id: string;
  professional_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  google_event_id: string | null;
  /** Google Calendar event ID (idempotência create/update) */
  gcal_event_id?: string | null;
  gcal_event_link?: string | null;
  gcal_status?: string | null;
  gcal_last_error?: string | null;
  gcal_updated_at?: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// AESTHETIC_PROCEDURES (Catálogo alternativo)
// ============================================
export interface AestheticProcedure {
  id: string;
  name: string;
  description: string | null;
  category: string;
  default_units: number | null;
  created_at: string;
}

// ============================================
// BEFORE_AFTER_PHOTOS
// ============================================
export interface BeforeAfterPhoto {
  id: string;
  patient_id: string;
  clinical_record_id: string | null;
  procedure_name: string;
  photo_type: 'before' | 'after';
  photo_url: string;
  metadata: any | null;
  created_at: string;
}

// ============================================
// CLINICAL_RECORDS
// ============================================
export interface ClinicalRecord {
  id: string;
  patient_id: string;
  professional_id: string;
  procedures: any[]; // jsonb
  treated_regions: any[]; // jsonb
  observations: string | null;
  signature_url: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}
