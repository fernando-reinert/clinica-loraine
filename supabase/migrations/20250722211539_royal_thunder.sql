/*
  # Schema inicial da Clínica Loraine Vilela

  1. Novas Tabelas
    - `professionals` - Dados dos profissionais/médicos
    - `patients` - Cadastro de pacientes
    - `aesthetic_procedures` - Catálogo de procedimentos estéticos
    - `clinical_records` - Fichas clínicas completas
    - `appointments` - Sistema de agendamentos
    - `before_after_photos` - Fotos antes/depois dos procedimentos

  2. Segurança
    - Habilitar RLS em todas as tabelas
    - Políticas de acesso baseadas no usuário autenticado
    - Proteção de dados sensíveis

  3. Storage
    - Buckets para fotos de pacientes, assinaturas e comparações
*/

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabela de profissionais
CREATE TABLE IF NOT EXISTS professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  specialty text NOT NULL DEFAULT 'Medicina Estética',
  license_number text NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de pacientes
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  cpf text NOT NULL,
  birth_date date NOT NULL,
  address text,
  photo_url text,
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de procedimentos estéticos
CREATE TABLE IF NOT EXISTS aesthetic_procedures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL,
  default_units integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Tabela de fichas clínicas
CREATE TABLE IF NOT EXISTS clinical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  procedures jsonb NOT NULL DEFAULT '[]',
  treated_regions jsonb NOT NULL DEFAULT '[]',
  observations text,
  signature_url text,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES professionals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
  google_event_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de fotos antes/depois
CREATE TABLE IF NOT EXISTS before_after_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  clinical_record_id uuid REFERENCES clinical_records(id) ON DELETE SET NULL,
  procedure_name text NOT NULL,
  photo_type text NOT NULL CHECK (photo_type IN ('before', 'after')),
  photo_url text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE aesthetic_procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE before_after_photos ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para professionals
CREATE POLICY "Professionals can read own data"
  ON professionals
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id::text);

CREATE POLICY "Professionals can update own data"
  ON professionals
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id::text);

-- Políticas de segurança para patients
CREATE POLICY "Professionals can manage their patients"
  ON patients
  FOR ALL
  TO authenticated
  USING (professional_id = auth.uid());

-- Políticas de segurança para aesthetic_procedures
CREATE POLICY "Anyone can read procedures"
  ON aesthetic_procedures
  FOR SELECT
  TO authenticated
  USING (true);

-- Políticas de segurança para clinical_records
CREATE POLICY "Professionals can manage their clinical records"
  ON clinical_records
  FOR ALL
  TO authenticated
  USING (professional_id = auth.uid());

-- Políticas de segurança para appointments
CREATE POLICY "Professionals can manage their appointments"
  ON appointments
  FOR ALL
  TO authenticated
  USING (professional_id = auth.uid());

-- Políticas de segurança para before_after_photos
CREATE POLICY "Professionals can manage photos of their patients"
  ON before_after_photos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = before_after_photos.patient_id 
      AND patients.professional_id = auth.uid()
    )
  );

-- Inserir procedimentos padrão
INSERT INTO aesthetic_procedures (name, description, category, default_units) VALUES
('Botox Frontal', 'Aplicação de toxina botulínica na região frontal', 'Toxina Botulínica', 20),
('Botox Glabela', 'Aplicação de toxina botulínica na glabela', 'Toxina Botulínica', 15),
('Botox Pés de Galinha', 'Aplicação de toxina botulínica nos pés de galinha', 'Toxina Botulínica', 12),
('Preenchimento Labial', 'Preenchimento com ácido hialurônico nos lábios', 'Ácido Hialurônico', 1),
('Preenchimento Bigode Chinês', 'Preenchimento do sulco nasogeniano', 'Ácido Hialurônico', 1),
('Bioestimulador Facial', 'Aplicação de bioestimulador de colágeno', 'Bioestimuladores', 2),
('Peeling Químico', 'Peeling químico facial', 'Peelings', 1),
('Microagulhamento', 'Procedimento de microagulhamento', 'Procedimentos', 1),
('Harmonização Facial', 'Procedimento completo de harmonização', 'Harmonização', 1),
('Limpeza de Pele', 'Limpeza de pele profunda', 'Procedimentos', 1);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON professionals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinical_records_updated_at BEFORE UPDATE ON clinical_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();