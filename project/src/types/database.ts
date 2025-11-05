export interface Database {
  public: {
    Tables: {
      professionals: {
        Row: {
          id: string
          email: string
          name: string
          specialty: string
          license_number: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          specialty: string
          license_number: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          specialty?: string
          license_number?: string
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