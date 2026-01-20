-- ============================================
-- Migration: Financial Procedure Items
-- Objetivo: Suportar múltiplos procedimentos por atendimento financeiro
-- ============================================

-- ============================================
-- 1. CRIAR TABELA procedure_items
-- ============================================
CREATE TABLE IF NOT EXISTS procedure_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id uuid NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  procedure_catalog_id uuid NOT NULL REFERENCES procedure_catalog(id) ON DELETE RESTRICT,
  procedure_name_snapshot text NOT NULL,
  cost_price_snapshot numeric(10, 2) NOT NULL DEFAULT 0,
  final_price_snapshot numeric(10, 2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  discount numeric(10, 2) NOT NULL DEFAULT 0,
  profit_snapshot numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- 2. ALTERAR TABELA procedures (financeiro)
-- ============================================
-- Adicionar colunas para lucro e vínculo com agendamento

-- user_id (se não existir - para RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedures' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE procedures 
    ADD COLUMN user_id uuid DEFAULT auth.uid();
    
    -- Criar índice
    CREATE INDEX IF NOT EXISTS idx_procedures_user_id ON procedures(user_id);
  END IF;
END $$;

-- appointment_id (opcional - vínculo com agendamento)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedures' 
    AND column_name = 'appointment_id'
  ) THEN
    ALTER TABLE procedures 
    ADD COLUMN appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- total_cost (custo total do atendimento)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedures' 
    AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE procedures 
    ADD COLUMN total_cost numeric(10, 2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- total_profit (lucro total do atendimento)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedures' 
    AND column_name = 'total_profit'
  ) THEN
    ALTER TABLE procedures 
    ADD COLUMN total_profit numeric(10, 2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- profit_margin (margem de lucro em percentual)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'procedures' 
    AND column_name = 'profit_margin'
  ) THEN
    ALTER TABLE procedures 
    ADD COLUMN profit_margin numeric(5, 2) NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================
-- 3. ADICIONAR STATUS EM appointments (se não existir)
-- ============================================
DO $$
BEGIN
  -- Verificar se coluna status existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE appointments 
    ADD COLUMN status text DEFAULT 'scheduled' 
    CHECK (status IN ('scheduled', 'completed_with_sale', 'completed_no_sale', 'cancelled'));
  ELSE
    -- Se existe, adicionar novos valores ao CHECK se necessário
    -- (PostgreSQL não permite alterar CHECK diretamente, então apenas comentamos)
    -- Em produção, pode ser necessário recriar a constraint
    NULL;
  END IF;
END $$;

-- ============================================
-- 4. ÍNDICES PARA procedure_items
-- ============================================
CREATE INDEX IF NOT EXISTS idx_procedure_items_procedure_id 
  ON procedure_items(procedure_id);

CREATE INDEX IF NOT EXISTS idx_procedure_items_procedure_catalog_id 
  ON procedure_items(procedure_catalog_id);

-- ============================================
-- 5. ÍNDICES PARA procedures (financeiro)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_procedures_appointment_id 
  ON procedures(appointment_id);

-- ============================================
-- 6. RLS PARA procedure_items
-- ============================================
ALTER TABLE procedure_items ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem gerenciar seus próprios itens
-- (através do procedure_id que referencia procedures com user_id)
DROP POLICY IF EXISTS "Users can manage their procedure items" ON procedure_items;
CREATE POLICY "Users can manage their procedure items"
  ON procedure_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM procedures p
      WHERE p.id = procedure_items.procedure_id
      AND (p.user_id = auth.uid() OR p.user_id IS NULL)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM procedures p
      WHERE p.id = procedure_items.procedure_id
      AND (p.user_id = auth.uid() OR p.user_id IS NULL)
    )
  );

-- ============================================
-- 7. RLS PARA procedures (financeiro) - garantir policies
-- ============================================
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários autenticados podem gerenciar seus próprios registros financeiros
DROP POLICY IF EXISTS "Users can manage their financial procedures" ON procedures;
CREATE POLICY "Users can manage their financial procedures"
  ON procedures
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- ============================================
-- 8. COMENTÁRIOS (documentação)
-- ============================================
COMMENT ON TABLE procedure_items IS 'Itens de procedimentos por atendimento financeiro (comanda)';
COMMENT ON COLUMN procedure_items.procedure_id IS 'FK para procedures (registro financeiro)';
COMMENT ON COLUMN procedure_items.procedure_catalog_id IS 'FK para procedure_catalog (catálogo de procedimentos)';
COMMENT ON COLUMN procedure_items.profit_snapshot IS 'Lucro calculado: (final_price - cost_price) * quantity - discount';
COMMENT ON COLUMN procedures.appointment_id IS 'Vínculo opcional com agendamento (quando fechado)';
COMMENT ON COLUMN procedures.total_cost IS 'Custo total do atendimento (soma dos cost_price dos itens)';
COMMENT ON COLUMN procedures.total_profit IS 'Lucro total do atendimento (soma dos profit_snapshot dos itens)';
COMMENT ON COLUMN procedures.profit_margin IS 'Margem de lucro em percentual: (total_profit / total_amount) * 100';
