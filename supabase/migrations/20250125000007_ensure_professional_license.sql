/*
  # Garantir coluna license_number na tabela professionals
  
  Garante que a coluna license_number existe e pode ser atualizada
*/

-- Verificar se license_number existe (já deve existir, mas garantimos)
DO $$
BEGIN
  -- Se license_number não existir, criar (improvável, mas seguro)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'professionals' 
    AND column_name = 'license_number'
  ) THEN
    ALTER TABLE professionals 
    ADD COLUMN license_number text;
  END IF;
END $$;

-- Garantir que RLS permite INSERT/UPDATE para authenticated users no próprio registro
-- (As policies já devem existir, mas garantimos)

-- Policy para INSERT (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'professionals' 
    AND policyname = 'Professionals can insert own data'
  ) THEN
    CREATE POLICY "Professionals can insert own data"
      ON professionals
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Policy para UPDATE (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'professionals' 
    AND policyname = 'Professionals can update own data'
  ) THEN
    CREATE POLICY "Professionals can update own data"
      ON professionals
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Policy para SELECT (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'professionals' 
    AND policyname = 'Professionals can read own data'
  ) THEN
    CREATE POLICY "Professionals can read own data"
      ON professionals
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
