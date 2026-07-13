-- Allows abating a single amount against a patient's total pending balance,
-- spread automatically across ALL of that patient's procedures (oldest due
-- date first, across procedures), not just one procedure at a time.
-- Complements register_procedure_payment (kept for a possible future
-- "pay just this procedure" flow) with a patient-scoped version.

CREATE OR REPLACE FUNCTION public.register_patient_payment(
  p_patient_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_payment_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  installment_id uuid,
  procedure_id uuid,
  amount_applied numeric,
  fully_paid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_remaining_to_allocate numeric := p_amount;
  v_total_pending numeric;
  v_provider text;
  v_inst record;
  v_allocate numeric;
  v_new_amount_paid numeric;
  v_fee_percent numeric;
  v_fee_amount numeric;
  v_net_amount numeric;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  SELECT COALESCE(SUM(i.installment_value - i.amount_paid), 0) INTO v_total_pending
  FROM installments i
  JOIN procedures p ON p.id = i.procedure_id
  WHERE p.patient_id = p_patient_id AND i.status = 'pendente';

  IF v_total_pending <= 0 THEN
    RAISE EXCEPTION 'Este paciente não possui parcelas pendentes';
  END IF;

  IF p_amount > v_total_pending + 0.01 THEN
    RAISE EXCEPTION 'Valor informado (%) excede o total pendente do paciente (%)', p_amount, v_total_pending;
  END IF;

  v_provider := CASE WHEN p_payment_method IN ('credit_card','debit_card','infinit_tag') THEN 'infinitypay' ELSE NULL END;

  FOR v_inst IN
    SELECT i.id, i.procedure_id, i.installment_value, i.amount_paid, p.total_installments
    FROM installments i
    JOIN procedures p ON p.id = i.procedure_id
    WHERE p.patient_id = p_patient_id AND i.status = 'pendente'
    ORDER BY i.due_date ASC, i.installment_number ASC
    FOR UPDATE OF i
  LOOP
    EXIT WHEN v_remaining_to_allocate <= 0;

    v_allocate := LEAST(v_inst.installment_value - v_inst.amount_paid, v_remaining_to_allocate);
    IF v_allocate <= 0 THEN
      CONTINUE;
    END IF;

    -- Fee percent é calculado por parcela (não uma vez só), pois cada
    -- procedimento pode ter total_installments diferente (afeta a faixa de taxa).
    v_fee_percent := 0;
    IF v_provider IS NOT NULL THEN
      SELECT fee_percent INTO v_fee_percent
      FROM payment_fee_rules
      WHERE provider = v_provider
        AND payment_method = p_payment_method
        AND is_active = true
        AND (
          (p_payment_method = 'debit_card' AND installments IS NULL)
          OR (p_payment_method IN ('credit_card','infinit_tag') AND installments = LEAST(GREATEST(COALESCE(v_inst.total_installments,1),1),12))
        )
      LIMIT 1;
      v_fee_percent := COALESCE(v_fee_percent, 0);
    END IF;

    v_new_amount_paid := v_inst.amount_paid + v_allocate;
    v_fee_amount := ROUND(v_allocate * v_fee_percent / 100, 2);
    v_net_amount := ROUND(v_allocate - v_fee_amount, 2);

    INSERT INTO installment_payments (
      installment_id, procedure_id, patient_id, amount, payment_method, payment_date,
      fee_percent, fee_amount, net_amount
    ) VALUES (
      v_inst.id, v_inst.procedure_id, p_patient_id, v_allocate, p_payment_method, p_payment_date,
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
      procedure_id := v_inst.procedure_id;
      amount_applied := v_allocate;
      fully_paid := true;
      RETURN NEXT;
    ELSE
      UPDATE installments
      SET amount_paid = v_new_amount_paid, updated_at = now()
      WHERE id = v_inst.id;

      installment_id := v_inst.id;
      procedure_id := v_inst.procedure_id;
      amount_applied := v_allocate;
      fully_paid := false;
      RETURN NEXT;
    END IF;

    v_remaining_to_allocate := v_remaining_to_allocate - v_allocate;
  END LOOP;
END;
$function$;
