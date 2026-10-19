-- CLAN CARTAN V139: ampliación variable (+1 a +12 meses) en UNA transacción.
-- Nunca modifica capital, intereses, pagos, billeteras ni IDs de préstamos.
-- Conserva RPC anterior de +1 mes para compatibilidad.
CREATE OR REPLACE FUNCTION public.cy_extend_loan_months(
  p_loan_id uuid,
  p_added_months integer,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(old_due_on date, new_due_on date, previous_months integer, total_months integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_loan public.cy_loans%rowtype;
  v_last public.cy_installments%rowtype;
  v_old_months integer;
  v_new_due date;
  v_due numeric;
  v_paid numeric;
BEGIN
  IF v_user IS NULL OR NOT cc_internal.can_manage_cy(v_user) THEN
    RAISE EXCEPTION 'Suscripción COBRA YA no vigente';
  END IF;
  IF p_added_months IS NULL OR p_added_months < 1 OR p_added_months > 12 THEN
    RAISE EXCEPTION 'Ampliación permitida: entre 1 y 12 meses';
  END IF;
  IF length(coalesce(p_reason,'')) > 500 THEN
    RAISE EXCEPTION 'Motivo demasiado largo';
  END IF;

  SELECT * INTO v_loan FROM public.cy_loans
  WHERE id=p_loan_id AND owner_id=v_user FOR UPDATE;
  IF NOT FOUND OR v_loan.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'Préstamo no disponible para ampliar';
  END IF;

  SELECT * INTO v_last FROM public.cy_installments
  WHERE loan_id=p_loan_id
  ORDER BY due_on DESC, installment_number DESC, id DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No existe cronograma'; END IF;

  SELECT coalesce((SELECT corr.total_due
      FROM public.cy_loan_corrections corr
      WHERE corr.loan_id=p_loan_id
      ORDER BY corr.created_at DESC,corr.id DESC LIMIT 1),v_loan.total_due)
  INTO v_due;
  SELECT coalesce(sum(amount),0) INTO v_paid
  FROM public.cy_payments WHERE loan_id=p_loan_id;
  IF v_due IS NULL OR v_paid >= v_due - 0.005 THEN
    RAISE EXCEPTION 'El préstamo ya está pagado o su importe es inválido';
  END IF;

  v_old_months := coalesce(v_loan.duration_months,1);
  IF v_old_months < 1 OR v_old_months + p_added_months > 120 THEN
    RAISE EXCEPTION 'El plazo total no puede superar 120 meses';
  END IF;
  -- Se suman meses calendario a la fecha de vencimiento vigente.
  -- PostgreSQL ajusta el último día del mes cuando corresponde.
  v_new_due := (v_last.due_on + pg_catalog.make_interval(months => p_added_months))::date;

  UPDATE public.cy_installments
  SET due_on=v_new_due
  WHERE id=v_last.id;
  UPDATE public.cy_loans
  SET duration_months=v_old_months+p_added_months,
      first_due_on=CASE WHEN term_installments=1 THEN v_new_due ELSE first_due_on END
  WHERE id=p_loan_id AND owner_id=v_user;
  INSERT INTO public.cy_loan_extensions(
    loan_id,owner_id,old_due_on,new_due_on,old_months,new_months,reason
  ) VALUES (
    p_loan_id,v_user,v_last.due_on,v_new_due,
    v_old_months,v_old_months+p_added_months,left(coalesce(p_reason,''),500)
  );
  RETURN QUERY SELECT v_last.due_on,v_new_due,v_old_months,v_old_months+p_added_months;
END
$function$;
REVOKE ALL ON FUNCTION public.cy_extend_loan_months(uuid,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cy_extend_loan_months(uuid,integer,text) TO authenticated, service_role;
