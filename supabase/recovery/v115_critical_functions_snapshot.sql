-- CLAN CARTAN: copia de definiciones críticas consultadas en Supabase, 2026-10-18.
-- SOLO ESQUEMA, funciones sin datos privados. Snapshot de recuperación V115.
-- Se conserva con fines de auditoría: NO ejecutar directamente en producción sin evaluación.

-- cc_internal.can_manage_cy(p_user uuid)
CREATE OR REPLACE FUNCTION cc_internal.can_manage_cy(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select p_user=auth.uid() and (
(select cc_internal.is_admin()) or
(select cc_internal.cobra_entitled(p_user))
);
$function$


-- cc_internal.cobra_entitled(p_user uuid)
CREATE OR REPLACE FUNCTION cc_internal.cobra_entitled(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select exists(select 1 from public.cc_memberships m join public.cc_businesses b on b.id=m.business_id
where m.user_id=p_user and b.code='COBRA_YA' and m.status='ACTIVE')
and exists(select 1 from public.cy_access_periods p where p.user_id=p_user and p.starts_at<=now() and p.ends_at>now());
$function$


-- cc_internal.issue_user_invitation_on_signup()
CREATE OR REPLACE FUNCTION cc_internal.issue_user_invitation_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_choice text;
  v_business_id uuid;
  v_code text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.cc_invitation_codes WHERE owner_user_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  v_choice := upper(btrim(coalesce(NEW.raw_user_meta_data->>'invite_business','')));
  IF v_choice NOT IN ('COBRA_YA','STREAM_BULLS') THEN
    v_choice := CASE WHEN upper(coalesce(NEW.raw_user_meta_data->>'invitation_code','')) LIKE 'BULL%'
                     THEN 'STREAM_BULLS' ELSE 'COBRA_YA' END;
  END IF;
  SELECT b.id INTO STRICT v_business_id FROM public.cc_businesses b WHERE b.code = v_choice;
  v_code := CASE WHEN v_choice='STREAM_BULLS'
            THEN 'BULL'||nextval('public.cc_invitation_bull_seq'::regclass)::text
            ELSE 'COBRA'||nextval('public.cc_invitation_cobra_seq'::regclass)::text END;
  INSERT INTO public.cc_invitation_codes(business_id,owner_user_id,code,role_at_issue)
  VALUES(v_business_id,NEW.id,v_code,'USER')
  ON CONFLICT (owner_user_id) DO NOTHING;
  RETURN NEW;
END;
$function$


-- cc_internal.record_signup_invitation()
CREATE OR REPLACE FUNCTION cc_internal.record_signup_invitation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_code text; v_inv record;
BEGIN
  v_code := upper(btrim(coalesce(NEW.raw_user_meta_data->>'invitation_code','')));
  IF v_code !~ '^(COBRA|BULL)[1-9][0-9]{0,11}$' THEN RETURN NEW; END IF;
  SELECT c.id,c.owner_user_id,c.business_id,c.code INTO v_inv
  FROM public.cc_invitation_codes c
  JOIN auth.users inviter ON inviter.id=c.owner_user_id
  WHERE c.code=v_code AND c.owner_user_id<>NEW.id LIMIT 1;
  IF FOUND THEN
    INSERT INTO public.cc_invitation_attributions
      (registered_user_id,code_id,inviter_user_id,business_id,code_snapshot)
    VALUES(NEW.id,v_inv.id,v_inv.owner_user_id,v_inv.business_id,v_inv.code)
    ON CONFLICT (registered_user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$


-- cc_internal.require_cobra_payment_for_approval()
CREATE OR REPLACE FUNCTION cc_internal.require_cobra_payment_for_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if new.status='ACTIVE' and old.status is distinct from 'ACTIVE'
 and exists(select 1 from public.cc_businesses b where b.id=new.business_id and b.code='COBRA_YA')
 and not exists(select 1 from public.cy_access_periods p where p.user_id=new.user_id and p.starts_at<=now() and p.ends_at>now())
 then raise exception 'No se puede aprobar: el usuario aun no ha pagado una mensualidad de prueba vigente';
 end if;
 return new;
end; $function$


-- public.cc_admin_review_test_topup(p_request uuid, p_approve boolean)
CREATE OR REPLACE FUNCTION public.cc_admin_review_test_topup(p_request uuid, p_approve boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v record;
begin
 if auth.uid() is null or not exists(select 1 from public.cc_admins where user_id=auth.uid()) then raise exception 'Solo ADMIN';end if;
 select * into v from public.cc_test_topup_requests where id=p_request for update;
 if not found or v.status<>'PENDING' then raise exception 'Solicitud ya procesada o inexistente';end if;
 update public.cc_test_topup_requests set status=case when p_approve then 'APPROVED' else 'REJECTED' end,reviewed_at=now(),reviewed_by=auth.uid() where id=p_request;
 if p_approve then
 insert into public.cc_service_wallets(user_id,service,balance_test) values(v.user_id,v.service,v.amount) on conflict(user_id,service) do update set balance_test=public.cc_service_wallets.balance_test+excluded.balance_test,updated_at=now();
 end if;
end $function$


-- public.cc_my_invitation_codes()
CREATE OR REPLACE FUNCTION public.cc_my_invitation_codes()
 RETURNS TABLE(code text, business text, affiliate_role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT c.code::text,
    CASE b.code WHEN 'COBRA_YA' THEN 'COBRA YA'
                WHEN 'STREAM_BULLS' THEN 'STREAM BULL''S' ELSE '' END::text,
    coalesce(m.role,'USUARIO')::text
  FROM public.cc_invitation_codes c
  JOIN public.cc_businesses b ON b.id=c.business_id
  LEFT JOIN LATERAL (
    SELECT m.role FROM public.cc_memberships m
    WHERE m.user_id=c.owner_user_id AND m.business_id=c.business_id
      AND m.status='ACTIVE'
    ORDER BY m.created_at DESC LIMIT 1
  ) m ON true
  WHERE c.owner_user_id=auth.uid()
  ORDER BY c.created_at;
$function$


-- public.cc_my_test_wallets()
CREATE OR REPLACE FUNCTION public.cc_my_test_wallets()
 RETURNS TABLE(service text, balance_test numeric)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
select x.service,coalesce(w.balance_test,0) from (values('COBRA_YA'::text),('STREAM_BULLS'::text)) x(service) left join public.cc_service_wallets w on w.service=x.service and w.user_id=auth.uid() where auth.uid() is not null;$function$


-- public.cc_request_test_topup(p_service text, p_amount numeric)
CREATE OR REPLACE FUNCTION public.cc_request_test_topup(p_service text, p_amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;v_u uuid:=auth.uid();
begin
 if v_u is null then raise exception 'Inicia sesión';end if;
 if p_service is null or p_service not in ('STREAM_BULLS','COBRA_YA') or p_amount is null or p_amount<1 or p_amount>1000 or p_amount<>round(p_amount,2) then raise exception 'Importe inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_u::text||p_service||':TOPUP',0));
 if exists(select 1 from public.cc_test_topup_requests where user_id=v_u and service=p_service and status='PENDING') then raise exception 'Ya tienes una recarga pendiente en esta billetera';end if;
 if (select count(*) from public.cc_test_topup_requests where user_id=v_u and created_at>now()-interval '24 hours') >= 5 then raise exception 'Límite de solicitudes de prueba por 24 horas';end if;
 insert into public.cc_test_topup_requests(user_id,service,amount) values(v_u,p_service,p_amount) returning id into v_id;
 return v_id;
end $function$


-- public.cc_transfer_test_balance(p_from text, p_to text, p_amount numeric)
CREATE OR REPLACE FUNCTION public.cc_transfer_test_balance(p_from text, p_to text, p_amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_id uuid;v_balance numeric;
begin
if v_user is null then raise exception 'Inicia sesión';end if;
if p_from not in ('COBRA_YA','STREAM_BULLS') or p_to not in ('COBRA_YA','STREAM_BULLS') or p_from=p_to then raise exception 'Billeteras inválidas';end if;
if p_amount is null or p_amount<=0 or p_amount>100000 or p_amount<>round(p_amount,2) then raise exception 'Monto inválido';end if;
insert into public.cc_service_wallets(user_id,service) values(v_user,'COBRA_YA'),(v_user,'STREAM_BULLS') on conflict do nothing;
perform 1 from public.cc_service_wallets where user_id=v_user order by service for update;
select balance_test into v_balance from public.cc_service_wallets where user_id=v_user and service=p_from;
if v_balance<p_amount then raise exception 'Saldo insuficiente';end if;
update public.cc_service_wallets set balance_test=balance_test-p_amount,updated_at=now() where user_id=v_user and service=p_from;
update public.cc_service_wallets set balance_test=balance_test+p_amount,updated_at=now() where user_id=v_user and service=p_to;
insert into public.cc_service_wallet_transfers(user_id,from_service,to_service,amount) values(v_user,p_from,p_to,p_amount) returning id into v_id;
return v_id;
end $function$


-- public.cc_validate_invitation_code(p_code text)
CREATE OR REPLACE FUNCTION public.cc_validate_invitation_code(p_code text)
 RETURNS TABLE(valid boolean, business text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF p_code IS NULL OR upper(btrim(p_code)) !~ '^(COBRA|BULL)[1-9][0-9]{0,11}$' THEN
    RETURN QUERY SELECT false,''::text;
    RETURN;
  END IF;
  RETURN QUERY
    SELECT true,
      CASE b.code WHEN 'COBRA_YA' THEN 'COBRA YA'
                  WHEN 'STREAM_BULLS' THEN 'STREAM BULL''S' ELSE '' END::text
    FROM public.cc_invitation_codes c
    JOIN public.cc_businesses b ON b.id=c.business_id
    JOIN auth.users u ON u.id=c.owner_user_id
    WHERE c.code = upper(btrim(p_code))
    LIMIT 1;
  IF NOT FOUND THEN RETURN QUERY SELECT false,''::text; END IF;
END;
$function$


-- public.cy_pay_subscription_test()
CREATE OR REPLACE FUNCTION public.cy_pay_subscription_test()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
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
  -- Serializa los pagos del mismo usuario contra dobles cargos y carreras.
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
  -- Si no existe membresía, el pago confirmado crea RESELLER, sin cola ADMIN.
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
  -- El trigger existente exige una vigencia ya registrada para pasar a ACTIVE.
  UPDATE public.cc_memberships
    SET status='ACTIVE',activated_at=now()
    WHERE user_id=v_user AND business_id=v_business AND status IN ('PENDING','EXPIRED');
  IF NOT EXISTS(SELECT 1 FROM public.cc_memberships
    WHERE user_id=v_user AND business_id=v_business AND status='ACTIVE' AND role='RESELLER') THEN
    RAISE EXCEPTION 'No se pudo habilitar el servicio; descuento revertido.';
  END IF;
  RETURN v_id;
END;
$function$


-- public.cy_subscription_status()
CREATE OR REPLACE FUNCTION public.cy_subscription_status()
 RETURNS TABLE(authorized boolean, active boolean, balance_test numeric, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
select
 exists (
   select 1 from public.cc_memberships m
   join public.cc_businesses b on b.id=m.business_id
   where m.user_id=auth.uid() and m.status='ACTIVE' and b.code='COBRA_YA'
 ),
 exists (
   select 1 from public.cy_access_periods p
   where p.user_id=auth.uid() and p.starts_at<=now() and p.ends_at>now()
 ),
 coalesce((
   select w.balance_test from public.cc_service_wallets w
   where w.user_id=auth.uid() and w.service='COBRA_YA'
 ),0)::numeric,
 (select max(p.ends_at) from public.cy_access_periods p where p.user_id=auth.uid());
$function$


-- public.sb_pay_affiliation_test()
CREATE OR REPLACE FUNCTION public.sb_pay_affiliation_test()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_balance numeric; v_id uuid; v_business uuid;v_status text;
begin
if v_uid is null then raise exception 'Inicia sesión en CLAN CARTAN';end if;
select id into v_business from public.cc_businesses where code='STREAM_BULLS';
if v_business is null then raise exception 'Stream Bull''s no está configurado';end if;
perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':STREAM_BULLS_AFFILIATION',0));
if exists(select 1 from public.sb_affiliations where user_id=v_uid) then raise exception 'Tu afiliación ya está activada; no se cobra nuevamente';end if;
select status into v_status from public.cc_memberships where user_id=v_uid and business_id=v_business;
if v_status in ('SUSPENDED','BLOCKED','REJECTED') then raise exception 'Cuenta restringida: contacta a soporte';end if;
insert into public.cc_service_wallets(user_id,service,balance_test) values(v_uid,'STREAM_BULLS',0) on conflict do nothing;
select balance_test into v_balance from public.cc_service_wallets where user_id=v_uid and service='STREAM_BULLS' for update;
if v_balance < 20 then raise exception 'Saldo ficticio insuficiente en Stream Bull''s';end if;
update public.cc_service_wallets set balance_test=balance_test-20,updated_at=now() where user_id=v_uid and service='STREAM_BULLS';
insert into public.sb_affiliations(user_id) values(v_uid) returning id into v_id;
insert into public.cc_memberships(user_id,business_id,role,status,activated_at) values(v_uid,v_business,'AFFILIATE','ACTIVE',now()) on conflict(user_id,business_id) do update set status='ACTIVE',activated_at=now() where public.cc_memberships.status not in ('SUSPENDED','BLOCKED','REJECTED');
return v_id;
end $function$


