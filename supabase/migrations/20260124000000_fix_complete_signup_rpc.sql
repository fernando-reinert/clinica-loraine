-- ============================================
-- Migration: Fix Complete Patient Signup RPC
-- Objetivo: Garantir que o RPC complete_patient_signup_form existe e está correto
-- ============================================

-- ============================================
-- 1. RECRIAR RPC: Completar cadastro (upsert paciente + criar anamnese)
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
-- 2. PERMISSÕES: Permitir execução anônima
-- ============================================
GRANT EXECUTE ON FUNCTION complete_patient_signup_form(uuid, jsonb) TO anon;

-- ============================================
-- 3. COMENTÁRIO
-- ============================================
COMMENT ON FUNCTION complete_patient_signup_form(uuid, jsonb) IS 'Completa cadastro público: upsert paciente por CPF, marca form como completed, cria anamnese e retorna token';
