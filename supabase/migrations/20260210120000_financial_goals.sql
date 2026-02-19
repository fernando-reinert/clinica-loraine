-- ============================================
-- Migration: Metas financeiras mensais (Meta Mensal)
-- ============================================

CREATE TABLE IF NOT EXISTS financial_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL,
  target_gross numeric(12, 2) NOT NULL DEFAULT 0,
  target_net numeric(12, 2) NOT NULL DEFAULT 0,
  target_profit numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_financial_goals_month_year
  ON financial_goals(month_year);

COMMENT ON TABLE financial_goals IS 'Metas mensais de receita bruta, líquida e lucro (YYYY-MM)';

ALTER TABLE financial_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage financial_goals"
  ON financial_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);
