export interface Database {
  public: {
    Tables: {
      professionals: {
        Row: {
          id: string
          user_id: string
          email: string
          name: string
          profession: string
          license: string
          phone: string | null
          address: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email: string
          name: string
          profession: string
          license: string
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string
          name?: string
          profession?: string
          license?: string
          phone?: string | null
          address?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string
          cpf: string
          birth_date: string
          address: string | null
          photo_url: string | null
          professional_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone: string
          cpf: string
          birth_date: string
          address?: string | null
          photo_url?: string | null
          professional_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string
          cpf?: string
          birth_date?: string
          address?: string | null
          photo_url?: string | null
          professional_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      aesthetic_procedures: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          default_units: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          default_units?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          default_units?: number | null
          created_at?: string
        }
      }
      clinical_records: {
        Row: {
          id: string
          patient_id: string
          professional_id: string
          procedures: any[]
          treated_regions: any[]
          observations: string | null
          signature_url: string | null
          version: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          professional_id: string
          procedures: any[]
          treated_regions: any[]
          observations?: string | null
          signature_url?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          professional_id?: string
          procedures?: any[]
          treated_regions?: any[]
          observations?: string | null
          signature_url?: string | null
          version?: number
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          professional_id: string
          title: string
          description: string | null
          start_time: string
          end_time: string
          status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
          google_event_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          professional_id: string
          title: string
          description?: string | null
          start_time: string
          end_time: string
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
          google_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          professional_id?: string
          title?: string
          description?: string | null
          start_time?: string
          end_time?: string
          status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
          google_event_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      before_after_photos: {
        Row: {
          id: string
          patient_id: string
          clinical_record_id: string | null
          procedure_name: string
          photo_type: 'before' | 'after'
          photo_url: string
          metadata: any | null
          created_at: string
        }
        Insert: {
          id?: string
          patient_id: string
          clinical_record_id?: string | null
          procedure_name: string
          photo_type: 'before' | 'after'
          photo_url: string
          metadata?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          patient_id?: string
          clinical_record_id?: string | null
          procedure_name?: string
          photo_type?: 'before' | 'after'
          photo_url?: string
          metadata?: any | null
          created_at?: string
        }
      }
      procedures: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string
          consent_template_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category: string
          consent_template_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string
          consent_template_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      consent_templates: {
        Row: {
          id: string
          procedure_key: string
          title: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          procedure_key: string
          title: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          procedure_key?: string
          title?: string
          content?: string
          created_at?: string
        }
      }
      visits: {
        Row: {
          id: string
          appointment_id: string | null
          patient_id: string
          professional_id: string
          visit_date: string
          status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          appointment_id?: string | null
          patient_id: string
          professional_id: string
          visit_date?: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string | null
          patient_id?: string
          professional_id?: string
          visit_date?: string
          status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      visit_procedures: {
        Row: {
          id: string
          visit_id: string
          procedure_id: string | null
          procedure_name: string
          performed_at: string
          professional_id: string
          units: number
          lot_number: string | null
          brand: string | null
          observations: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          visit_id: string
          procedure_id?: string | null
          procedure_name: string
          performed_at?: string
          professional_id: string
          units?: number
          lot_number?: string | null
          brand?: string | null
          observations?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          visit_id?: string
          procedure_id?: string | null
          procedure_name?: string
          performed_at?: string
          professional_id?: string
          units?: number
          lot_number?: string | null
          brand?: string | null
          observations?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      consent_forms: {
        Row: {
          id: string
          visit_procedure_id: string | null
          procedure_key: string
          template_id: string | null
          content_snapshot: string
          filled_content?: string | null // Mantido por compatibilidade
          patient_signature_url: string | null
          professional_signature_url: string | null
          image_authorization: boolean
          signed_location: string
          signed_at: string
          patient_id: string
          professional_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          visit_procedure_id?: string | null
          procedure_key: string
          template_id?: string | null
          content_snapshot: string
          filled_content?: string | null // Mantido por compatibilidade
          patient_signature_url?: string | null
          professional_signature_url?: string | null
          image_authorization: boolean
          signed_location: string
          signed_at?: string
          patient_id: string
          professional_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          visit_procedure_id?: string | null
          procedure_key?: string
          template_id?: string | null
          content_snapshot?: string
          filled_content?: string | null // Mantido por compatibilidade
          patient_signature_url?: string | null
          professional_signature_url?: string | null
          image_authorization?: boolean
          signed_location?: string
          signed_at?: string
          patient_id?: string
          professional_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      procedure_attachments: {
        Row: {
          id: string
          visit_procedure_id: string
          attachment_type: 'sticker' | 'photo' | 'document'
          file_url: string
          file_name: string | null
          file_size: number | null
          mime_type: string | null
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string
          visit_procedure_id: string
          attachment_type?: 'sticker' | 'photo' | 'document'
          file_url: string
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
          metadata?: any
          created_at?: string
        }
        Update: {
          id?: string
          visit_procedure_id?: string
          attachment_type?: 'sticker' | 'photo' | 'document'
          file_url?: string
          file_name?: string | null
          file_size?: number | null
          mime_type?: string | null
          metadata?: any
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}