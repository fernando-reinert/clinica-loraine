-- Fix timezone drift for consultations date-only fields.
-- Converts consultations.date (and next_appointment, if needed) to SQL DATE.

DO $$
DECLARE
  v_date_type text;
  v_next_type text;
BEGIN
  SELECT data_type
    INTO v_date_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'consultations'
    AND column_name = 'date';

  IF v_date_type = 'timestamp with time zone' THEN
    EXECUTE 'ALTER TABLE public.consultations ALTER COLUMN "date" TYPE date USING (("date" AT TIME ZONE ''America/Sao_Paulo'')::date)';
  ELSIF v_date_type = 'timestamp without time zone' THEN
    EXECUTE 'ALTER TABLE public.consultations ALTER COLUMN "date" TYPE date USING ("date"::date)';
  END IF;

  SELECT data_type
    INTO v_next_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'consultations'
    AND column_name = 'next_appointment';

  IF v_next_type = 'timestamp with time zone' THEN
    EXECUTE 'ALTER TABLE public.consultations ALTER COLUMN next_appointment TYPE date USING ((next_appointment AT TIME ZONE ''America/Sao_Paulo'')::date)';
  ELSIF v_next_type = 'timestamp without time zone' THEN
    EXECUTE 'ALTER TABLE public.consultations ALTER COLUMN next_appointment TYPE date USING (next_appointment::date)';
  END IF;
END $$;

COMMENT ON COLUMN public.consultations."date" IS 'Date-only field (YYYY-MM-DD), sem timezone';
COMMENT ON COLUMN public.consultations.next_appointment IS 'Date-only field (YYYY-MM-DD), sem timezone';
