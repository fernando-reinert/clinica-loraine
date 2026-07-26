-- Data em que cada procedimento (item) foi efetivamente realizado.
-- Opcional: um mesmo atendimento pode juntar procedimentos feitos em datas
-- diferentes, então a data fica por item em vez de reaproveitar a data do
-- primeiro pagamento (que é sobre cobrança, não sobre execução).

ALTER TABLE procedure_items
  ADD COLUMN IF NOT EXISTS procedure_date date;

COMMENT ON COLUMN procedure_items.procedure_date IS 'Data em que o procedimento foi efetivamente realizado (opcional).';
