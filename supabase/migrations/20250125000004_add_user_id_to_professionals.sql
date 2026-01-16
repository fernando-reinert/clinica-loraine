/*
  # Adicionar user_id à tabela professionals
  
  Adiciona coluna user_id para vincular profissional ao usuário autenticado (auth.uid())
*/

-- Adicionar coluna user_id se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'professionals' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE professionals 
    ADD COLUMN user_id uuid UNIQUE NOT NULL DEFAULT gen_random_uuid();
    
    -- Criar índice
    CREATE INDEX IF NOT EXISTS idx_professionals_user_id ON professionals(user_id);
    
    -- Atualizar RLS policy para usar user_id
    DROP POLICY IF EXISTS "Professionals can read own data" ON professionals;
    DROP POLICY IF EXISTS "Professionals can update own data" ON professionals;
    
    CREATE POLICY "Professionals can read own data"
      ON professionals
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
    
    CREATE POLICY "Professionals can update own data"
      ON professionals
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid());
    
    -- Permitir insert para authenticated
    CREATE POLICY "Professionals can insert own data"
      ON professionals
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
