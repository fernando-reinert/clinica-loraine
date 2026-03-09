-- ============================================
-- Migration: Pagamentos Manuais / Avulsos
-- Objetivo: Registrar entradas financeiras que não estão vinculadas a
--           procedimentos/atendimentos (ex.: PIX recebido fora do fluxo)
-- ============================================

CREATE TABLE IF NOT EXISTS manual_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  patient_name_snapshot text NOT NULL,
  payment_method text NOT NULL,
  payment_date date NOT NULL,
  total_amount numeric(12, 2) NOT NULL CHECK (total_amount > 0),
  description text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pago' CHECK (status IN ('pago', 'cancelado')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_payments_user_id ON manual_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_patient_id ON manual_payments(patient_id);
CREATE INDEX IF NOT EXISTS idx_manual_payments_payment_date ON manual_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_manual_payments_created_at ON manual_payments(created_at DESC);

ALTER TABLE manual_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their manual payments" ON manual_payments;
CREATE POLICY "Users can manage their manual payments"
  ON manual_payments
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

COMMENT ON TABLE manual_payments IS 'Pagamentos avulsos/manuais não vinculados a procedimentos ou parcelas';
