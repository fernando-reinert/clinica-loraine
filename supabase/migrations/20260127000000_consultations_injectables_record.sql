-- Adiciona campo JSON para registro de injetáveis na tabela de consultas
ALTER TABLE consultations
ADD COLUMN IF NOT EXISTS injectables_record jsonb;

