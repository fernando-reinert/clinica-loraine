-- ============================================
-- Migration: Fluxo /cadastro (link público único por acesso)
-- Objetivo: /cadastro cria novo form e redireciona para /cadastro/:public_code
-- ============================================

-- ============================================
-- 1. COLUNA source (opcional: ?src=whatsapp)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patient_signup_forms'
      AND column_name = 'source'
  ) THEN
    ALTER TABLE patient_signup_forms
    ADD COLUMN source text;
  END IF;
END $$;

COMMENT ON COLUMN patient_signup_forms.source IS 'Origem do acesso (ex: whatsapp) via ?src=';

-- ============================================
-- 2. RPC create_patient_signup_form: aceitar p_source
-- ============================================
CREATE OR REPLACE FUNCTION create_patient_signup_form(
  p_expires_in_hours int DEFAULT 48,
  p_source text DEFAULT NULL
)
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
  v_token := gen_random_uuid();
  v_expires_at := now() + (p_expires_in_hours || ' hours')::interval;

  INSERT INTO patient_signup_forms (
    share_token,
    status,
    share_expires_at,
    created_by,
    payload,
    source
  )
  VALUES (
    v_token,
    'sent',
    v_expires_at,
    auth.uid(),
    '{}'::jsonb,
    NULLIF(trim(p_source), '')
  )
  RETURNING id INTO v_form_id;

  v_result := jsonb_build_object(
    'success', true,
    'share_token', v_token,
    'share_expires_at', v_expires_at,
    'id', v_form_id
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION create_patient_signup_form(int, text) TO anon;
GRANT EXECUTE ON FUNCTION create_patient_signup_form(int, text) TO authenticated;

COMMENT ON FUNCTION create_patient_signup_form(int, text) IS 'Cria novo formulário de cadastro (um por acesso). Aceita source opcional (?src=).';
