-- ============================================
-- Migration: Patient Signup Forms
-- Objetivo: Criar tabela e RPCs para cadastro público de pacientes via link
-- ============================================

-- ============================================
-- 1. CRIAR TABELA patient_signup_forms
-- ============================================
CREATE TABLE IF NOT EXISTS patient_signup_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token uuid UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'completed', 'expired')),
  payload jsonb DEFAULT '{}'::jsonb,
  share_expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- ============================================
-- 2. ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_patient_signup_forms_share_token ON patient_signup_forms(share_token);
CREATE INDEX IF NOT EXISTS idx_patient_signup_forms_status ON patient_signup_forms(status);
CREATE INDEX IF NOT EXISTS idx_patient_signup_forms_created_by ON patient_signup_forms(created_by);
CREATE INDEX IF NOT EXISTS idx_patient_signup_forms_patient_id ON patient_signup_forms(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_signup_forms_share_expires_at ON patient_signup_forms(share_expires_at);

-- ============================================
-- 3. DESABILITAR RLS (acesso público via token)
-- ============================================
ALTER TABLE patient_signup_forms DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RPC: Criar formulário de cadastro (server-side token generation)
-- ============================================
CREATE OR REPLACE FUNCTION create_patient_signup_form(p_expires_in_hours int DEFAULT 48)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
  v_form_id uuid;
  v_expires_at timestamptz;
  v_result jsonb;
BEGIN
  -- Gerar token UUID server-side
  v_token := gen_random_uuid();
  
  -- Calcular data de expiração
  v_expires_at := now() + (p_expires_in_hours || ' hours')::interval;

  -- Inserir formulário
  INSERT INTO patient_signup_forms (
    share_token,
    status,
    share_expires_at,
    created_by,
    payload
  )
  VALUES (
    v_token,
    'sent',
    v_expires_at,
    auth.uid(),
    '{}'::jsonb
  )
  RETURNING id INTO v_form_id;

  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'share_token', v_token,
    'share_expires_at', v_expires_at,
    'id', v_form_id
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- 5. RPC: Buscar formulário de cadastro por token
-- ============================================
CREATE OR REPLACE FUNCTION get_signup_form_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form patient_signup_forms%ROWTYPE;
BEGIN
  SELECT * INTO v_form
  FROM patient_signup_forms
  WHERE share_token = p_token
    AND share_expires_at > now()
    AND status = 'sent';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_form.id,
    'share_token', v_form.share_token,
    'status', v_form.status,
    'payload', v_form.payload,
    'share_expires_at', v_form.share_expires_at,
    'created_by', v_form.created_by,
    'patient_id', v_form.patient_id,
    'created_at', v_form.created_at,
    'updated_at', v_form.updated_at
  );
END;
$$;

-- ============================================
-- 6. RPC: Atualizar respostas do formulário de cadastro
-- ============================================
CREATE OR REPLACE FUNCTION update_signup_form_answers(
  p_token uuid,
  p_answers jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form_exists boolean;
BEGIN
  -- Verificar se o formulário existe e não expirou
  SELECT EXISTS(
    SELECT 1 FROM patient_signup_forms
    WHERE share_token = p_token
      AND share_expires_at > now()
      AND status = 'sent'
  ) INTO v_form_exists;

  IF NOT v_form_exists THEN
    RETURN false;
  END IF;

  -- Atualizar respostas (usar payload ao invés de answers)
  UPDATE patient_signup_forms
  SET 
    payload = p_answers,
    updated_at = now()
  WHERE share_token = p_token
    AND share_expires_at > now()
    AND status = 'sent';

  RETURN true;
END;
$$;

-- ============================================
-- 7. RPC: Completar cadastro (upsert paciente + criar anamnese)
-- ============================================
CREATE OR REPLACE FUNCTION complete_patient_signup_form(
  p_share_token uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup_form patient_signup_forms%ROWTYPE;
  v_patient_id uuid;
  v_patient_exists boolean;
  v_anamnese_token uuid;
  v_anamnese_form_id uuid;
  v_result jsonb;
  v_name text;
  v_phone text;
  v_cpf text;
  v_birth_date date;
  v_email text;
  v_address text;
  v_photo_url text;
BEGIN
  -- Extrair dados do payload
  v_name := p_payload->>'name';
  v_phone := p_payload->>'phone';
  v_cpf := p_payload->>'cpf';
  v_birth_date := (p_payload->>'birth_date')::date;
  v_email := p_payload->>'email';
  v_address := p_payload->>'address';
  v_photo_url := p_payload->>'photo_url';

  -- Buscar formulário de cadastro
  SELECT * INTO v_signup_form
  FROM patient_signup_forms
  WHERE share_token = p_share_token
    AND share_expires_at > now()
    AND status = 'sent';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Formulário não encontrado ou expirado'
    );
  END IF;

  -- Validar campos obrigatórios
  IF v_name IS NULL OR v_name = '' OR
     v_phone IS NULL OR v_phone = '' OR
     v_cpf IS NULL OR v_cpf = '' OR
     v_birth_date IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Campos obrigatórios não preenchidos'
    );
  END IF;

  -- Verificar se paciente já existe por CPF
  SELECT EXISTS(
    SELECT 1 FROM patients
    WHERE cpf = v_cpf
  ) INTO v_patient_exists;

  IF v_patient_exists THEN
    -- UPDATE paciente existente
    UPDATE patients
    SET 
      name = v_name,
      phone = v_phone,
      email = COALESCE(v_email, email),
      birth_date = v_birth_date,
      address = COALESCE(v_address, address),
      photo_url = COALESCE(v_photo_url, photo_url),
      updated_at = now()
    WHERE cpf = v_cpf
    RETURNING id INTO v_patient_id;
  ELSE
    -- INSERT novo paciente
    -- Tentar usar professional_id do created_by, senão usar o primeiro profissional
    INSERT INTO patients (
      name,
      phone,
      email,
      cpf,
      birth_date,
      address,
      photo_url,
      professional_id
    )
    SELECT 
      v_name,
      v_phone,
      v_email,
      v_cpf,
      v_birth_date,
      v_address,
      v_photo_url,
      COALESCE(
        (SELECT p.id FROM professionals p WHERE p.user_id = v_signup_form.created_by LIMIT 1),
        (SELECT id FROM professionals LIMIT 1)
      )
    RETURNING id INTO v_patient_id;
  END IF;

  -- Marcar formulário de cadastro como completo
  UPDATE patient_signup_forms
  SET 
    status = 'completed',
    patient_id = v_patient_id,
    completed_at = now(),
    updated_at = now()
  WHERE share_token = p_share_token;

  -- Criar anamnese usando RPC
  SELECT create_patient_anamnese_form(v_patient_id, 30) INTO v_anamnese_token;

  -- Retornar resultado
  v_result := jsonb_build_object(
    'success', true,
    'patient_id', v_patient_id,
    'anamnese_token', v_anamnese_token
  );

  RETURN v_result;
END;
$$;

-- ============================================
-- 8. RPC: Criar formulário de anamnese para paciente
-- ============================================
CREATE OR REPLACE FUNCTION create_patient_anamnese_form(
  p_patient_id uuid,
  p_expires_in_days int DEFAULT 30
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_anamnese_token uuid;
  v_anamnese_form_id uuid;
BEGIN
  -- Verificar se já existe patient_forms "sent" e não expirado para este paciente
  SELECT share_token INTO v_anamnese_token
  FROM patient_forms
  WHERE patient_id = p_patient_id
    AND status = 'sent'
    AND (share_expires_at IS NULL OR share_expires_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  -- Se não existe, criar novo patient_forms
  IF v_anamnese_token IS NULL THEN
    v_anamnese_token := gen_random_uuid();
    
    INSERT INTO patient_forms (
      patient_id,
      title,
      status,
      share_token,
      share_expires_at
    )
    VALUES (
      p_patient_id,
      'Formulário de Anamnese Estética',
      'sent',
      v_anamnese_token,
      now() + (p_expires_in_days || ' days')::interval
    )
    RETURNING id INTO v_anamnese_form_id;
  END IF;

  RETURN v_anamnese_token;
END;
$$;

-- ============================================
-- 7. COMENTÁRIOS (documentação)
-- ============================================
COMMENT ON TABLE patient_signup_forms IS 'Formulários de cadastro público de pacientes via link';
COMMENT ON COLUMN patient_signup_forms.share_token IS 'Token UUID único para acesso público ao formulário (gerado server-side)';
COMMENT ON COLUMN patient_signup_forms.status IS 'Status: sent (enviado), completed (concluído) ou expired (expirado)';
COMMENT ON COLUMN patient_signup_forms.payload IS 'Dados do formulário em JSONB (salvas durante preenchimento)';
COMMENT ON COLUMN patient_signup_forms.share_expires_at IS 'Data de expiração do link';
COMMENT ON COLUMN patient_signup_forms.created_by IS 'ID do usuário que criou o link (pode ser NULL)';
COMMENT ON COLUMN patient_signup_forms.patient_id IS 'ID do paciente após cadastro ser completado';
COMMENT ON COLUMN patient_signup_forms.completed_at IS 'Data de conclusão do cadastro';
