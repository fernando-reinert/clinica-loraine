/*
  # Correção: Criar tabelas faltantes para módulo de consentimentos
  
  Este migration cria todas as tabelas necessárias que o código está tentando acessar:
  - visits (principal - causa do erro 404)
  - visit_procedures
  - consent_forms
  - procedure_attachments
  - procedures (se não existir)
  - consent_templates (se não existir)
  
  SQL idempotente: usa IF NOT EXISTS onde possível
*/

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROCEDURES (Catálogo de Procedimentos)
-- ============================================
CREATE TABLE IF NOT EXISTS procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  consent_template_id uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. CONSENT_TEMPLATES (Templates de Termos)
-- ============================================
CREATE TABLE IF NOT EXISTS consent_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_name text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  version integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Adicionar FK se procedures existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'procedures') THEN
    ALTER TABLE procedures 
    ADD CONSTRAINT IF NOT EXISTS fk_consent_template 
    FOREIGN KEY (consent_template_id) REFERENCES consent_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 3. VISITS (Atendimentos/Visitas) - PRINCIPAL
-- ============================================
CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid,
  patient_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  visit_date timestamptz NOT NULL DEFAULT now(),
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_appointment_visit UNIQUE (appointment_id)
);

-- Foreign Keys para visits
DO $$
BEGIN
  -- FK para patients
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
    ALTER TABLE visits 
    ADD CONSTRAINT IF NOT EXISTS fk_visits_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
  END IF;
  
  -- FK para professionals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'professionals') THEN
    ALTER TABLE visits 
    ADD CONSTRAINT IF NOT EXISTS fk_visits_professional 
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;
  END IF;
  
  -- FK para appointments (opcional)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    ALTER TABLE visits 
    ADD CONSTRAINT IF NOT EXISTS fk_visits_appointment 
    FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 4. VISIT_PROCEDURES (Procedimentos Realizados)
-- ============================================
CREATE TABLE IF NOT EXISTS visit_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  procedure_id uuid,
  procedure_name text NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  professional_id uuid NOT NULL,
  units integer DEFAULT 1,
  lot_number text,
  brand text,
  observations text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Foreign Keys para visit_procedures
DO $$
BEGIN
  -- FK para visits
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visits') THEN
    ALTER TABLE visit_procedures 
    ADD CONSTRAINT IF NOT EXISTS fk_visit_procedures_visit 
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE;
  END IF;
  
  -- FK para procedures (opcional)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'procedures') THEN
    ALTER TABLE visit_procedures 
    ADD CONSTRAINT IF NOT EXISTS fk_visit_procedures_procedure 
    FOREIGN KEY (procedure_id) REFERENCES procedures(id) ON DELETE SET NULL;
  END IF;
  
  -- FK para professionals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'professionals') THEN
    ALTER TABLE visit_procedures 
    ADD CONSTRAINT IF NOT EXISTS fk_visit_procedures_professional 
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 5. CONSENT_FORMS (Termos Assinados)
-- ============================================
CREATE TABLE IF NOT EXISTS consent_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_procedure_id uuid NOT NULL,
  template_id uuid,
  filled_content text NOT NULL,
  patient_signature_url text,
  professional_signature_url text,
  image_authorization boolean NOT NULL DEFAULT false,
  signed_location text NOT NULL,
  signed_at timestamptz NOT NULL DEFAULT now(),
  patient_id uuid NOT NULL,
  professional_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Foreign Keys para consent_forms
DO $$
BEGIN
  -- FK para visit_procedures
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visit_procedures') THEN
    ALTER TABLE consent_forms 
    ADD CONSTRAINT IF NOT EXISTS fk_consent_forms_visit_procedure 
    FOREIGN KEY (visit_procedure_id) REFERENCES visit_procedures(id) ON DELETE CASCADE;
  END IF;
  
  -- FK para consent_templates (opcional)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'consent_templates') THEN
    ALTER TABLE consent_forms 
    ADD CONSTRAINT IF NOT EXISTS fk_consent_forms_template 
    FOREIGN KEY (template_id) REFERENCES consent_templates(id) ON DELETE SET NULL;
  END IF;
  
  -- FK para patients
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
    ALTER TABLE consent_forms 
    ADD CONSTRAINT IF NOT EXISTS fk_consent_forms_patient 
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;
  END IF;
  
  -- FK para professionals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'professionals') THEN
    ALTER TABLE consent_forms 
    ADD CONSTRAINT IF NOT EXISTS fk_consent_forms_professional 
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 6. PROCEDURE_ATTACHMENTS (Fotos de Adesivos)
-- ============================================
CREATE TABLE IF NOT EXISTS procedure_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_procedure_id uuid NOT NULL,
  attachment_type text DEFAULT 'sticker' CHECK (attachment_type IN ('sticker', 'photo', 'document')),
  file_url text NOT NULL,
  file_name text,
  file_size integer,
  mime_type text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Foreign Key para procedure_attachments
DO $$
BEGIN
  -- FK para visit_procedures
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visit_procedures') THEN
    ALTER TABLE procedure_attachments 
    ADD CONSTRAINT IF NOT EXISTS fk_procedure_attachments_visit_procedure 
    FOREIGN KEY (visit_procedure_id) REFERENCES visit_procedures(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
-- Visits
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_appointment_id ON visits(appointment_id);
CREATE INDEX IF NOT EXISTS idx_visits_professional_id ON visits(professional_id);
CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);

-- Visit Procedures
CREATE INDEX IF NOT EXISTS idx_visit_procedures_visit_id ON visit_procedures(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_procedures_procedure_id ON visit_procedures(procedure_id);
CREATE INDEX IF NOT EXISTS idx_visit_procedures_professional_id ON visit_procedures(professional_id);
CREATE INDEX IF NOT EXISTS idx_visit_procedures_performed_at ON visit_procedures(performed_at);

-- Consent Forms
CREATE INDEX IF NOT EXISTS idx_consent_forms_visit_procedure_id ON consent_forms(visit_procedure_id);
CREATE INDEX IF NOT EXISTS idx_consent_forms_patient_id ON consent_forms(patient_id);
CREATE INDEX IF NOT EXISTS idx_consent_forms_professional_id ON consent_forms(professional_id);
CREATE INDEX IF NOT EXISTS idx_consent_forms_signed_at ON consent_forms(signed_at);

-- Procedure Attachments
CREATE INDEX IF NOT EXISTS idx_procedure_attachments_visit_procedure_id ON procedure_attachments(visit_procedure_id);

-- Procedures
CREATE INDEX IF NOT EXISTS idx_procedures_consent_template_id ON procedures(consent_template_id);
CREATE INDEX IF NOT EXISTS idx_procedures_is_active ON procedures(is_active);

-- Consent Templates
CREATE INDEX IF NOT EXISTS idx_consent_templates_procedure_name ON consent_templates(procedure_name);
CREATE INDEX IF NOT EXISTS idx_consent_templates_is_active ON consent_templates(is_active);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_templates ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- Visits: profissionais só veem seus próprios atendimentos
DROP POLICY IF EXISTS "Professionals can manage their visits" ON visits;
CREATE POLICY "Professionals can manage their visits"
  ON visits
  FOR ALL
  TO authenticated
  USING (professional_id = auth.uid());

-- Visit Procedures: profissionais só veem procedimentos de seus atendimentos
DROP POLICY IF EXISTS "Professionals can manage their visit procedures" ON visit_procedures;
CREATE POLICY "Professionals can manage their visit procedures"
  ON visit_procedures
  FOR ALL
  TO authenticated
  USING (
    professional_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM visits
      WHERE visits.id = visit_procedures.visit_id
      AND visits.professional_id = auth.uid()
    )
  );

-- Consent Forms: profissionais só veem termos de seus pacientes
DROP POLICY IF EXISTS "Professionals can manage their consent forms" ON consent_forms;
CREATE POLICY "Professionals can manage their consent forms"
  ON consent_forms
  FOR ALL
  TO authenticated
  USING (professional_id = auth.uid());

-- Procedure Attachments: profissionais só veem anexos de seus procedimentos
DROP POLICY IF EXISTS "Professionals can manage their procedure attachments" ON procedure_attachments;
CREATE POLICY "Professionals can manage their procedure attachments"
  ON procedure_attachments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM visit_procedures vp
      JOIN visits v ON v.id = vp.visit_id
      WHERE vp.id = procedure_attachments.visit_procedure_id
      AND v.professional_id = auth.uid()
    )
  );

-- Procedures: profissionais autenticados podem ler todos
DROP POLICY IF EXISTS "Professionals can read procedures" ON procedures;
CREATE POLICY "Professionals can read procedures"
  ON procedures
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Professionals can manage procedures" ON procedures;
CREATE POLICY "Professionals can manage procedures"
  ON procedures
  FOR ALL
  TO authenticated
  USING (true);

-- Consent Templates: profissionais autenticados podem ler todos
DROP POLICY IF EXISTS "Professionals can read consent templates" ON consent_templates;
CREATE POLICY "Professionals can read consent templates"
  ON consent_templates
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Professionals can manage consent templates" ON consent_templates;
CREATE POLICY "Professionals can manage consent templates"
  ON consent_templates
  FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- TRIGGERS PARA updated_at
-- ============================================
-- Função para atualizar updated_at (já deve existir, mas garantimos)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_visits_updated_at ON visits;
CREATE TRIGGER update_visits_updated_at 
  BEFORE UPDATE ON visits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_visit_procedures_updated_at ON visit_procedures;
CREATE TRIGGER update_visit_procedures_updated_at 
  BEFORE UPDATE ON visit_procedures 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_consent_forms_updated_at ON consent_forms;
CREATE TRIGGER update_consent_forms_updated_at 
  BEFORE UPDATE ON consent_forms 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_procedures_updated_at ON procedures;
CREATE TRIGGER update_procedures_updated_at 
  BEFORE UPDATE ON procedures 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_consent_templates_updated_at ON consent_templates;
CREATE TRIGGER update_consent_templates_updated_at 
  BEFORE UPDATE ON consent_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- DADOS INICIAIS (Opcional - apenas se não existirem)
-- ============================================
-- Inserir templates básicos se não existirem
INSERT INTO consent_templates (procedure_name, title, content, version, is_active)
SELECT 
  'Botox',
  'Termo de Consentimento - Aplicação de Toxina Botulínica',
  'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de aplicação de toxina botulínica (Botox).

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
Registro: {{professional_license}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:
- O procedimento consiste na aplicação de toxina botulínica tipo A
- Os efeitos são temporários, geralmente durando de 3 a 6 meses
- Podem ocorrer efeitos colaterais como dor local, hematomas, ptose palpebral
- O resultado pode variar de acordo com cada paciente

AUTORIZAÇÃO DE USO DE IMAGEM:
Autorizo o uso de minhas imagens para fins de documentação clínica e divulgação científica: {{image_authorization}}

Local e Data: {{signed_at_location_date}}

Assinatura do Paciente: _________________________
Assinatura do Profissional: _________________________
',
  1,
  true
WHERE NOT EXISTS (SELECT 1 FROM consent_templates WHERE procedure_name = 'Botox' AND version = 1);

INSERT INTO consent_templates (procedure_name, title, content, version, is_active)
SELECT 
  'Preenchimento Labial',
  'Termo de Consentimento - Preenchimento Labial com Ácido Hialurônico',
  'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de preenchimento labial com ácido hialurônico.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
Registro: {{professional_license}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:
- O procedimento utiliza ácido hialurônico de alta qualidade
- Os resultados são visíveis imediatamente após o procedimento
- Podem ocorrer inchaço, hematomas e sensibilidade nos primeiros dias
- O material é biodegradável e pode ser dissolvido se necessário

AUTORIZAÇÃO DE USO DE IMAGEM:
Autorizo o uso de minhas imagens para fins de documentação clínica e divulgação científica: {{image_authorization}}

Local e Data: {{signed_at_location_date}}

Assinatura do Paciente: _________________________
Assinatura do Profissional: _________________________
',
  1,
  true
WHERE NOT EXISTS (SELECT 1 FROM consent_templates WHERE procedure_name = 'Preenchimento Labial' AND version = 1);

-- Popular procedures básicos (se não existirem)
INSERT INTO procedures (name, description, category, consent_template_id, is_active)
SELECT 
  'Botox',
  'Aplicação de toxina botulínica',
  'Toxina Botulínica',
  (SELECT id FROM consent_templates WHERE procedure_name = 'Botox' LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM procedures WHERE name = 'Botox');

INSERT INTO procedures (name, description, category, consent_template_id, is_active)
SELECT 
  'Preenchimento Labial',
  'Preenchimento com ácido hialurônico',
  'Ácido Hialurônico',
  (SELECT id FROM consent_templates WHERE procedure_name = 'Preenchimento Labial' LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM procedures WHERE name = 'Preenchimento Labial');
