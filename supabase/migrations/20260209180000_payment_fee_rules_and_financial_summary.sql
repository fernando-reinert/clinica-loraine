-- ============================================
-- Migration: Regras de taxa de pagamento (InfinityPay) + colunas em installments + view resumo financeiro por paciente
-- ============================================

-- ============================================
-- A) TABELA payment_fee_rules
-- ============================================
CREATE TABLE IF NOT EXISTS payment_fee_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  payment_method text NOT NULL,
  installments int NULL,
  fee_percent numeric(6,2) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  active_from timestamptz NOT NULL DEFAULT now(),
  active_to timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_fee_rules_provider_method_inst_active
  ON payment_fee_rules(provider, payment_method, installments, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_fee_rules_provider_method_installments_from
  ON payment_fee_rules(provider, payment_method, COALESCE(installments, -1), active_from);

COMMENT ON TABLE payment_fee_rules IS 'Regras de taxa por provedor/método/parcelas (ex: InfinityPay)';

ALTER TABLE payment_fee_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read payment_fee_rules"
  ON payment_fee_rules FOR SELECT TO authenticated USING (true);

-- Seed InfinityPay (apenas se ainda não existir)
-- credit_card e infinit_tag: regras por parcela (1..12). debit_card: única taxa (installments NULL).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM payment_fee_rules WHERE provider = 'infinitypay' LIMIT 1) THEN
    INSERT INTO payment_fee_rules (provider, payment_method, installments, fee_percent) VALUES
      ('infinitypay', 'credit_card', 1, 3.15),
      ('infinitypay', 'credit_card', 2, 5.39),
      ('infinitypay', 'credit_card', 3, 6.12),
      ('infinitypay', 'credit_card', 4, 6.85),
      ('infinitypay', 'credit_card', 5, 7.57),
      ('infinitypay', 'credit_card', 6, 8.28),
      ('infinitypay', 'credit_card', 7, 8.99),
      ('infinitypay', 'credit_card', 8, 9.69),
      ('infinitypay', 'credit_card', 9, 10.38),
      ('infinitypay', 'credit_card', 10, 11.06),
      ('infinitypay', 'credit_card', 11, 11.74),
      ('infinitypay', 'credit_card', 12, 12.40),
      ('infinitypay', 'debit_card', NULL, 1.37),
      ('infinitypay', 'infinit_tag', 1, 3.15),
      ('infinitypay', 'infinit_tag', 2, 5.39),
      ('infinitypay', 'infinit_tag', 3, 6.12),
      ('infinitypay', 'infinit_tag', 4, 6.85),
      ('infinitypay', 'infinit_tag', 5, 7.57),
      ('infinitypay', 'infinit_tag', 6, 8.28),
      ('infinitypay', 'infinit_tag', 7, 8.99),
      ('infinitypay', 'infinit_tag', 8, 9.69),
      ('infinitypay', 'infinit_tag', 9, 10.38),
      ('infinitypay', 'infinit_tag', 10, 11.06),
      ('infinitypay', 'infinit_tag', 11, 11.74),
      ('infinitypay', 'infinit_tag', 12, 12.40);
  END IF;
END $$;

-- ============================================
-- B) ALTER TABLE installments - novas colunas
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'installments' AND column_name = 'fee_percent_applied') THEN
    ALTER TABLE installments ADD COLUMN fee_percent_applied numeric(6,2) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'installments' AND column_name = 'fee_amount') THEN
    ALTER TABLE installments ADD COLUMN fee_amount numeric(12,2) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'installments' AND column_name = 'net_amount') THEN
    ALTER TABLE installments ADD COLUMN net_amount numeric(12,2) NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'installments' AND column_name = 'payment_provider') THEN
    ALTER TABLE installments ADD COLUMN payment_provider text NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'installments' AND column_name = 'paid_at') THEN
    ALTER TABLE installments ADD COLUMN paid_at timestamptz NULL;
  END IF;
END $$;

-- ============================================
-- C) VIEW patient_financial_summary
-- Data de hoje em America/Sao_Paulo para atraso
-- ============================================
CREATE OR REPLACE VIEW patient_financial_summary AS
SELECT
  p.patient_id,
  COUNT(*) FILTER (WHERE i.status = 'pendente' AND (i.due_date::date) < ((now() AT TIME ZONE 'America/Sao_Paulo')::date)) AS overdue_installments_count,
  COALESCE(SUM(i.installment_value) FILTER (WHERE i.status = 'pendente' AND (i.due_date::date) < ((now() AT TIME ZONE 'America/Sao_Paulo')::date)), 0) AS overdue_total,
  COALESCE(SUM(i.installment_value) FILTER (WHERE i.status = 'pendente'), 0) AS pending_total,
  COALESCE(SUM(i.installment_value) FILTER (WHERE i.status = 'pago'), 0) AS paid_total,
  MAX(
    CASE WHEN i.status = 'pago' THEN
      COALESCE(i.paid_at, (i.paid_date::timestamptz) AT TIME ZONE 'America/Sao_Paulo')
    ELSE NULL END
  ) AS last_paid_at
FROM procedures p
JOIN installments i ON i.procedure_id = p.id
WHERE p.patient_id IS NOT NULL
GROUP BY p.patient_id;

COMMENT ON VIEW patient_financial_summary IS 'Resumo financeiro por paciente: atrasados, pendentes e pagos (evita agregação pesada no cliente)';
