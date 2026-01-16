/*
  # Ajuste: Permitir visit_procedure_id NULL em consent_forms
  
  Permite criar termos de consentimento diretamente no prontuário
  sem necessariamente ter um visit_procedure vinculado.
*/

-- Tornar visit_procedure_id nullable
ALTER TABLE consent_forms 
ALTER COLUMN visit_procedure_id DROP NOT NULL;

-- Adicionar índice para consultas por patient_id (já deve existir, mas garantimos)
CREATE INDEX IF NOT EXISTS idx_consent_forms_patient_id_signed_at 
ON consent_forms(patient_id, signed_at DESC);
