-- ============================================
-- Migration: Public code for patient signup links
-- Objetivo: URL amigável /patient-signup/novopaciente/:code (code 8-10 chars)
-- ============================================

-- ============================================
-- 1. COLUNA public_code na patient_signup_forms
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patient_signup_forms'
      AND column_name = 'public_code'
  ) THEN
    ALTER TABLE patient_signup_forms
    ADD COLUMN public_code text UNIQUE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_patient_signup_forms_public_code
ON patient_signup_forms(public_code) WHERE public_code IS NOT NULL;

COMMENT ON COLUMN patient_signup_forms.public_code IS 'Código curto único (base62) para URL amigável; ex: /patient-signup/novopaciente/:code';

-- ============================================
-- 2. RPC: Definir public_code após criação (retry em colisão no app)
-- ============================================
CREATE OR REPLACE FUNCTION set_signup_form_public_code(
  p_share_token uuid,
  p_public_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form patient_signup_forms%ROWTYPE;
BEGIN
  IF p_public_code IS NULL OR trim(p_public_code) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'public_code obrigatório');
  END IF;

  UPDATE patient_signup_forms
  SET public_code = trim(p_public_code),
      updated_at = now()
  WHERE share_token = p_share_token
    AND (public_code IS NULL OR public_code = '')
  RETURNING * INTO v_form;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Formulário não encontrado ou já possui public_code');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'public_code', v_form.public_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION set_signup_form_public_code(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION set_signup_form_public_code(uuid, text) TO authenticated;

-- ============================================
-- 3. RPC: Buscar formulário por public_code (mesmo retorno que get_signup_form_by_token)
-- ============================================
CREATE OR REPLACE FUNCTION get_signup_form_by_public_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form patient_signup_forms%ROWTYPE;
  v_code text;
BEGIN
  v_code := trim(lower(p_code));
  IF v_code = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_form
  FROM patient_signup_forms
  WHERE public_code = v_code
    AND share_expires_at > now()
    AND status = 'sent';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_form.id,
    'share_token', v_form.share_token,
    'public_code', v_form.public_code,
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

GRANT EXECUTE ON FUNCTION get_signup_form_by_public_code(text) TO anon;

COMMENT ON FUNCTION get_signup_form_by_public_code(text) IS 'Busca formulário de cadastro pelo código público (URL amigável)';

-- ============================================
-- 4. get_signup_form_by_token: incluir public_code no retorno (compatibilidade)
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
    'public_code', v_form.public_code,
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
