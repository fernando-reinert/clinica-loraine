-- Partial payments per procedure: allows abating an arbitrary amount from a
-- procedure's pending installments (oldest due date first), without requiring
-- the amount to match any single installment exactly.

ALTER TABLE installments
  ADD COLUMN IF NOT EXISTS amount_paid numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS installment_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  installment_id uuid NOT NULL REFERENCES installments(id) ON DELETE CASCADE,
  procedure_id uuid NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  patient_id uuid,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  payment_date date NOT NULL,
  fee_percent numeric NOT NULL DEFAULT 0,
  fee_amount numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS installment_payments_procedure_idx ON installment_payments (procedure_id);
CREATE INDEX IF NOT EXISTS installment_payments_installment_idx ON installment_payments (installment_id);
CREATE INDEX IF NOT EXISTS installment_payments_patient_idx ON installment_payments (patient_id);

-- Applies p_amount against a single procedure's pending installments, oldest
-- due_date first. Rejects if p_amount exceeds the procedure's total pending
-- (fails closed rather than silently creating an unrequested credit balance).
-- Runs atomically (single transaction, row locks via FOR UPDATE) so concurrent
-- calls for the same procedure can't double-allocate the same balance.
CREATE OR REPLACE FUNCTION public.register_procedure_payment(
  p_procedure_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  installment_id uuid,
  amount_applied numeric,
  fully_paid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_patient_id uuid;
  v_total_installments int;
  v_remaining_to_allocate numeric := p_amount;
  v_total_pending numeric;
  v_provider text;
  v_fee_percent numeric := 0;
  v_inst record;
  v_allocate numeric;
  v_new_amount_paid numeric;
  v_fee_amount numeric;
  v_net_amount numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  SELECT patient_id, total_installments INTO v_patient_id, v_total_installments
  FROM procedures WHERE id = p_procedure_id;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'Procedimento não encontrado';
  END IF;

  SELECT COALESCE(SUM(installment_value - amount_paid), 0) INTO v_total_pending
  FROM installments
  WHERE procedure_id = p_procedure_id AND status = 'pendente';

  IF p_amount > v_total_pending + 0.01 THEN
    RAISE EXCEPTION 'Valor informado (%) excede o total pendente deste procedimento (%)', p_amount, v_total_pending;
  END IF;

  v_provider := CASE WHEN p_payment_method IN ('credit_card','debit_card','infinit_tag') THEN 'infinitypay' ELSE NULL END;

  IF v_provider IS NOT NULL THEN
    SELECT fee_percent INTO v_fee_percent
    FROM payment_fee_rules
    WHERE provider = v_provider
      AND payment_method = p_payment_method
      AND is_active = true
      AND (
        (p_payment_method = 'debit_card' AND installments IS NULL)
        OR (p_payment_method IN ('credit_card','infinit_tag') AND installments = LEAST(GREATEST(COALESCE(v_total_installments,1),1),12))
      )
    LIMIT 1;
    v_fee_percent := COALESCE(v_fee_percent, 0);
  END IF;

  FOR v_inst IN
    SELECT id, installment_value, amount_paid
    FROM installments
    WHERE procedure_id = p_procedure_id AND status = 'pendente'
    ORDER BY due_date ASC, installment_number ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining_to_allocate <= 0;

    v_allocate := LEAST(v_inst.installment_value - v_inst.amount_paid, v_remaining_to_allocate);
    IF v_allocate <= 0 THEN
      CONTINUE;
    END IF;

    v_new_amount_paid := v_inst.amount_paid + v_allocate;
    v_fee_amount := ROUND(v_allocate * v_fee_percent / 100, 2);
    v_net_amount := ROUND(v_allocate - v_fee_amount, 2);

    INSERT INTO installment_payments (
      installment_id, procedure_id, patient_id, amount, payment_method, payment_date,
      fee_percent, fee_amount, net_amount
    ) VALUES (
      v_inst.id, p_procedure_id, v_patient_id, v_allocate, p_payment_method, p_payment_date,
      v_fee_percent, v_fee_amount, v_net_amount
    );

    IF v_new_amount_paid >= v_inst.installment_value - 0.001 THEN
      UPDATE installments
      SET amount_paid = v_inst.installment_value,
          status = 'pago',
          paid_date = p_payment_date,
          payment_method = p_payment_method,
          fee_percent_applied = v_fee_percent,
          fee_amount = v_fee_amount,
          net_amount = v_net_amount,
          paid_at = now(),
          payment_provider = v_provider,
          updated_at = now()
      WHERE id = v_inst.id;

      installment_id := v_inst.id;
      amount_applied := v_allocate;
      fully_paid := true;
      RETURN NEXT;
    ELSE
      UPDATE installments
      SET amount_paid = v_new_amount_paid,
          updated_at = now()
      WHERE id = v_inst.id;

      installment_id := v_inst.id;
      amount_applied := v_allocate;
      fully_paid := false;
      RETURN NEXT;
    END IF;

    v_remaining_to_allocate := v_remaining_to_allocate - v_allocate;
  END LOOP;
END;
$function$;
