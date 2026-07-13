-- WhatsApp notification preferences per appointment (opt-in).
-- Previously: confirmation trigger fired unconditionally for every appointment,
-- and the reminder cron sent a fixed 1h-before reminder for every scheduled/confirmed
-- appointment, with no way to opt out. This migration makes both opt-in per appointment.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS whatsapp_notify_on_create boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_minutes_before integer DEFAULT 120,
  ADD COLUMN IF NOT EXISTS whatsapp_reminder_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_confirmation_sent boolean DEFAULT false;

-- Gate the existing confirmation trigger behind whatsapp_notify_on_create,
-- and switch the message to the simplified template used by the opt-in flow.
CREATE OR REPLACE FUNCTION public.notify_appointment_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_phone text;
  v_message text;
  v_first_name text;
  v_month_name text;
  v_local_ts timestamp;
BEGIN
  -- Só notifica quando o agendamento optou por "avisar agora"
  IF (NEW.whatsapp_notify_on_create IS NOT TRUE) THEN
    RETURN NEW;
  END IF;

  -- Só roda em INSERT ou quando horário/status muda
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.start_time = NEW.start_time AND OLD.status = NEW.status) THEN
      RETURN NEW;
    END IF;
    IF (NEW.whatsapp_confirmation_sent = true AND OLD.start_time = NEW.start_time) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Pega o telefone do paciente
  v_phone := NEW.patient_phone;

  IF v_phone IS NULL OR v_phone = '' OR v_phone = 'null' THEN
    SELECT phone INTO v_phone FROM public.patients WHERE id = NEW.patient_id;
  END IF;

  IF v_phone IS NULL OR v_phone = '' THEN
    RETURN NEW;
  END IF;

  v_local_ts := NEW.start_time AT TIME ZONE 'America/Sao_Paulo';
  v_first_name := split_part(NEW.patient_name, ' ', 1);
  v_month_name := (ARRAY['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'])[extract(month from v_local_ts)::int];

  v_message := 'Olá ' || v_first_name || E'! Seu agendamento na Clínica Loraine foi confirmado para o dia '
    || to_char(v_local_ts, 'DD') || ' de ' || v_month_name || ' de ' || to_char(v_local_ts, 'YYYY')
    || ' às ' || to_char(v_local_ts, 'HH24:MI') || E'. Até lá! 😊';

  PERFORM net.http_post(
    url := 'https://vwmzyfjqprutlaevmsjk.supabase.co/functions/v1/whatsapp-send',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := json_build_object('phone', v_phone, 'message', v_message)::jsonb
  );

  NEW.whatsapp_confirmation_sent := true;
  NEW.whatsapp_confirmation_sent_at := now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'WhatsApp trigger error: %', SQLERRM;
  RETURN NEW;
END;
$function$;
