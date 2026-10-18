-- CLAN CARTAN V113: el descuento del saldo ficticio activa COBRA YA sin aprobación ADMIN.
-- La transacción completa falla y revierte si algún paso no termina.
CREATE OR REPLACE FUNCTION public.cy_pay_subscription_test()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_business uuid;
  v_price numeric(14,2) := 15.00;
  v_id uuid;
  v_balance numeric;
  v_status text;
  v_role text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || ':CY_MONTHLY_V113',0));
  SELECT id INTO STRICT v_business FROM public.cc_businesses WHERE code='COBRA_YA';
  SELECT m.status,m.role INTO v_status,v_role
    FROM public.cc_memberships m
    WHERE m.user_id=v_user AND m.business_id=v_business
    FOR UPDATE;
  IF v_status='SUSPENDED' THEN
    RAISE EXCEPTION 'Acceso suspendido. Contacta al soporte.';
  END IF;
  IF v_status IS NOT NULL AND v_role <> 'RESELLER' THEN
    RAISE EXCEPTION 'La membresía COBRA YA no corresponde al rol RESELLER.';
  END IF;
  IF EXISTS(SELECT 1 FROM public.cy_access_periods p
       WHERE p.user_id=v_user AND p.starts_at<=now() AND p.ends_at>now()) THEN
    RAISE EXCEPTION 'Tu plan ya está activo; no se realizó otro descuento.';
  END IF;
  INSERT INTO public.cc_service_wallets(user_id,service,balance_test)
    VALUES(v_user,'COBRA_YA',0)
    ON CONFLICT(user_id,service) DO NOTHING;
  SELECT balance_test INTO v_balance FROM public.cc_service_wallets
    WHERE user_id=v_user AND service='COBRA_YA' FOR UPDATE;
  IF v_balance < v_price THEN
    RAISE EXCEPTION 'Saldo insuficiente. Recarga o transfiere saldo a COBRA YA.';
  END IF;
  IF v_status IS NULL THEN
    INSERT INTO public.cc_memberships(user_id,business_id,role,status)
    VALUES(v_user,v_business,'RESELLER','PENDING');
  END IF;
  UPDATE public.cc_service_wallets
    SET balance_test=balance_test-v_price,updated_at=now()
    WHERE user_id=v_user AND service='COBRA_YA';
  INSERT INTO public.cc_wallets(user_id,balance_test)
    VALUES(v_user,v_balance-v_price)
    ON CONFLICT(user_id) DO UPDATE
      SET balance_test=EXCLUDED.balance_test,updated_at=now();
  INSERT INTO public.cy_access_periods(user_id,starts_at,ends_at,price_test)
    VALUES(v_user,now(),now()+interval '30 days',v_price) RETURNING id INTO v_id;
  INSERT INTO public.cc_wallet_test_ledger(user_id,amount,reason,subscription_id)
    VALUES(v_user,-v_price,'COBRA_SUBSCRIPTION',v_id);
  UPDATE public.cc_memberships
    SET status='ACTIVE',activated_at=now()
    WHERE user_id=v_user AND business_id=v_business AND status IN ('PENDING','EXPIRED');
  IF NOT EXISTS(SELECT 1 FROM public.cc_memberships
    WHERE user_id=v_user AND business_id=v_business AND status='ACTIVE' AND role='RESELLER') THEN
    RAISE EXCEPTION 'No se pudo habilitar el servicio; descuento revertido.';
  END IF;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.cy_pay_subscription_test() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cy_pay_subscription_test() TO authenticated;
