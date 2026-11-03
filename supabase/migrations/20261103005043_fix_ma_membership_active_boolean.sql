CREATE OR REPLACE FUNCTION public.ma_ensure_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE u uuid:=auth.uid();a public.ma_accounts%rowtype;
 admin_role boolean;verified_balance numeric;v_clan text;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
 INSERT INTO public.ma_accounts(user_id) VALUES(u) ON CONFLICT(user_id) DO NOTHING;
 INSERT INTO public.ma_wallets(user_id) VALUES(u) ON CONFLICT(user_id) DO NOTHING;
 SELECT * INTO a FROM public.ma_accounts WHERE user_id=u;
 SELECT c.code INTO v_clan FROM public.cc_clan_codes c WHERE c.user_id=u;
 IF v_clan IS NULL THEN RAISE EXCEPTION 'Tu código CLAN no está disponible'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.cc_admins WHERE user_id=u) INTO admin_role;
 INSERT INTO public.cc_real_service_wallets(user_id,service,balance_pen)
 VALUES(u,'MI_ALQUILER',0) ON CONFLICT(user_id,service) DO NOTHING;
 SELECT balance_pen INTO verified_balance FROM public.cc_real_service_wallets WHERE user_id=u AND service='MI_ALQUILER';
 RETURN jsonb_build_object('invite_code',v_clan,'suspended',a.suspended,
 'subscription_until',a.subscription_until,
 'role',CASE WHEN admin_role THEN 'ADMIN' ELSE 'RESELLER' END,
 'active',coalesce(admin_role OR (NOT a.suspended AND a.subscription_until>now()),false),
 'bonus_pen',a.bonus_pen,'real_verified_pen',coalesce(verified_balance,0));
END $function$
