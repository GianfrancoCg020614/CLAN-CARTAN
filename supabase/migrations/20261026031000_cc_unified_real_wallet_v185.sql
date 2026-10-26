-- V185 · Un saldo real CLAN CARTAN: no se duplica por negocio.
-- Los registros contables históricos conservan su servicio de origen.
-- Antes de activar COBRA YA/MI ALQUILER, se usa el fondo global en transacción atómica.
create or replace function cc_internal.cc_wallet_prepare_service(
 p_user uuid,p_to_service text,p_amount numeric
) returns void language plpgsql security definer set search_path=''
as $function$
declare r record;needed numeric;move_amount numeric;total numeric;
begin
 if p_user is null or auth.uid() is distinct from p_user
   or p_to_service not in ('COBRA_YA','STREAM_BULLS','MI_COCHERA','MI_ALQUILER')
   or p_amount is null or p_amount<=0 or p_amount>10000
   or p_amount<>round(p_amount,2)
 then raise exception 'Movimiento no autorizado' using errcode='42501';end if;
 -- Misma cerradura por usuario utilizada en las compras STREAM BULL'S.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC-UNIFIED:'||p_user::text,0));
 insert into public.cc_real_service_wallets(user_id,service,balance_pen)
 values(p_user,p_to_service,0) on conflict(user_id,service) do nothing;
 -- Relectura con bloqueo evita doble gasto en solicitudes concurrentes.
 perform 1 from public.cc_real_service_wallets
 where user_id=p_user order by service for update;
 select coalesce(sum(balance_pen),0) into total from public.cc_real_service_wallets where user_id=p_user;
 if total<p_amount then raise exception 'Saldo real único insuficiente';end if;
 select greatest(p_amount-balance_pen,0) into needed
 from public.cc_real_service_wallets where user_id=p_user and service=p_to_service;
 if needed<=0 then return;end if;
 for r in
  select service,balance_pen from public.cc_real_service_wallets
  where user_id=p_user and service<>p_to_service and balance_pen>0 order by service
 loop
  exit when needed<=0;
  move_amount:=least(needed,r.balance_pen);
  update public.cc_real_service_wallets
   set balance_pen=balance_pen-move_amount,updated_at=now()
  where user_id=p_user and service=r.service and balance_pen>=move_amount;
  if not found then raise exception 'Saldo modificado simultáneamente';end if;
  update public.cc_real_service_wallets
   set balance_pen=balance_pen+move_amount,updated_at=now()
  where user_id=p_user and service=p_to_service;
  insert into public.cc_real_wallet_transfers(user_id,from_service,to_service,amount_pen)
   values(p_user,r.service,p_to_service,move_amount);
  needed:=needed-move_amount;
 end loop;
 if needed<>0 then raise exception 'No fue posible preparar el saldo único';end if;
end;
$function$;
revoke all on function cc_internal.cc_wallet_prepare_service(uuid,text,numeric) from public,anon,authenticated;
-- Solo otras funciones protegidas SECURITY DEFINER llaman esta rutina.

-- COBRA YA: usa el fondo unificado antes del cargo. Resto de reglas conservadas.
CREATE OR REPLACE FUNCTION public.cc_pay_cobra_subscription_real()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_user uuid:=auth.uid();
 v_enabled boolean;
 v_business uuid;
 v_member public.cc_memberships%rowtype;
 v_spend_id uuid;
 v_access_id uuid;
 v_payment_ref text;
 v_kind text;
 v_code_id uuid;
 v_inviter uuid;
 v_pending record;
 v_inviter_balance numeric(14,2);
 v_amount numeric(14,2):=15.00;
begin
 if v_user is null or auth.role()<>'authenticated' then
  raise exception 'Inicia sesión';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended(v_user::text||':CY_MONTHLY_V113',0));
 select enabled into v_enabled from public.cc_cobra_real_payment_settings where id=true;
 if coalesce(v_enabled,false)=false then
  raise exception 'Suscripciones comerciales no habilitadas: falta validar cobros reales';
 end if;
 select id into strict v_business from public.cc_businesses where code='COBRA_YA';
 select * into v_member from public.cc_memberships
  where user_id=v_user and business_id=v_business for update;
 if found and (v_member.status='SUSPENDED' or v_member.role<>'RESELLER') then
  raise exception 'Cuenta no elegible como RESELLER';
 end if;
 if exists(select 1 from public.cy_access_periods
   where user_id=v_user and starts_at<=now() and ends_at>now())
 or exists(select 1 from public.cc_cobra_real_access_periods
   where user_id=v_user and status='ACTIVE' and period_start<=now() and period_end>now()) then
  raise exception 'Suscripción vigente; no se descontó nuevamente';
 end if;
 -- Debe existir saldo REAL ya acreditado por el proveedor, nunca balance_test.
 insert into public.cc_real_service_wallets(user_id,service,balance_pen)
  values(v_user,'COBRA_YA',0) on conflict(user_id,service) do nothing;
 v_kind:=case when exists(select 1 from public.cc_cobra_real_access_periods
                         where user_id=v_user)
  then 'RENEWAL' else 'INITIAL' end;
 v_payment_ref:='CY-REAL-'||replace(gen_random_uuid()::text,'-','');
 -- Preparar automáticamente el saldo común (sin mover ni duplicar dinero).
 perform cc_internal.cc_wallet_prepare_service(v_user,'COBRA_YA',v_amount);
 perform pg_catalog.set_config('cc_audit.kind',
   case when v_kind='INITIAL' then 'SUBSCRIPTION' else 'RENEWAL' end,true);
 perform pg_catalog.set_config('cc_audit.concept',
   case when v_kind='INITIAL' then 'Pago por suscripción' else 'Pago por renovación' end,true);
 perform pg_catalog.set_config('cc_audit.reference',v_payment_ref,true);
 perform pg_catalog.set_config('cc_audit.payment',v_payment_ref,true);
 update public.cc_real_service_wallets
  set balance_pen=balance_pen-v_amount,updated_at=now()
  where user_id=v_user and service='COBRA_YA' and balance_pen>=v_amount;
 if not found then raise exception 'Saldo REAL insuficiente (S/15)'; end if;
 insert into public.cc_real_wallet_spends(user_id,service,kind,amount_pen,reference,description)
 values(v_user,'COBRA_YA','SUBSCRIPTION',v_amount,v_payment_ref,
  case when v_kind='INITIAL' then 'Pago real de suscripción COBRA YA'
       else 'Pago real de renovación COBRA YA' end)
 returning id into v_spend_id;
 insert into public.cc_cobra_real_access_periods(user_id,spend_id,kind,period_start,period_end,amount_pen)
 values(v_user,v_spend_id,v_kind,now(),now()+interval '30 days',v_amount)
 returning id into v_access_id;
 if v_member.id is null then
  insert into public.cc_memberships(user_id,business_id,role,status)
  values(v_user,v_business,'RESELLER','PENDING');
 end if;
 update public.cc_memberships set status='ACTIVE',activated_at=coalesce(activated_at,now())
 where user_id=v_user and business_id=v_business and status in ('PENDING','EXPIRED');
 if not exists(select 1 from public.cc_memberships
   where user_id=v_user and business_id=v_business and status='ACTIVE' and role='RESELLER') then
  raise exception 'No se pudo activar COBRA YA; operación revertida';
 end if;
 -- Atribución única capturada AL REGISTRARSE; solo COBRA, invitador RESELLER.
 select a.code_id,a.inviter_user_id into v_code_id,v_inviter
 from public.cc_invitation_attributions a
 join public.cc_invitation_codes code on code.id=a.code_id
 join public.cc_memberships m on m.user_id=a.inviter_user_id
   and m.business_id=v_business and m.role='RESELLER' and m.status<>'SUSPENDED'
 where a.registered_user_id=v_user and a.business_id=v_business
   and a.inviter_user_id<>v_user and code.owner_user_id=a.inviter_user_id
   and code.business_id=v_business and code.code=a.code_snapshot
   and code.code like 'COBRA%' limit 1;
 if v_inviter is not null then
  insert into public.cc_real_service_wallets(user_id,service,balance_pen)
  values(v_inviter,'COBRA_YA',0) on conflict(user_id,service) do nothing;
  perform pg_catalog.set_config('cc_audit.kind','BONUS',true);
  perform pg_catalog.set_config('cc_audit.concept',
   case when v_kind='INITIAL' then 'Bono por suscripción inicial del referido'
        else 'Bono por renovación del referido' end,true);
  perform pg_catalog.set_config('cc_audit.reference','BONUS-'||v_access_id::text,true);
  perform pg_catalog.set_config('cc_audit.payment',v_payment_ref,true);
  perform pg_catalog.set_config('cc_audit.referred',v_user::text,true);
  update public.cc_real_service_wallets set balance_pen=balance_pen+5.00,updated_at=now()
   where user_id=v_inviter and service='COBRA_YA';
  insert into public.cc_cobra_referral_bonuses
    (access_id,beneficiary_user_id,referred_user_id,code_id,amount_pen)
  values(v_access_id,v_inviter,v_user,v_code_id,5.00);
  -- Compensa reversiones pendientes SIN permitir billeteras negativas.
  for v_pending in
   select * from public.cc_cobra_referral_bonuses
   where beneficiary_user_id=v_inviter and status='REVERSAL_PENDING'
   order by credited_at,id for update
  loop
   select balance_pen into v_inviter_balance
   from public.cc_real_service_wallets where user_id=v_inviter
       and service='COBRA_YA' for update;
   if v_inviter_balance<5 then exit;end if;
   perform pg_catalog.set_config('cc_audit.kind','BONUS_REVERSAL',true);
   perform pg_catalog.set_config('cc_audit.concept',
      'Reembolso de bono por suscripción o renovación',true);
   perform pg_catalog.set_config('cc_audit.reference',v_pending.reversal_reference,true);
   perform pg_catalog.set_config('cc_audit.original','BONUS-'||v_pending.access_id::text,true);
   perform pg_catalog.set_config('cc_audit.reason',v_pending.reversal_reason,true);
   perform pg_catalog.set_config('cc_audit.payment','',true);
   perform pg_catalog.set_config('cc_audit.referred',v_pending.referred_user_id::text,true);
   update public.cc_real_service_wallets set balance_pen=balance_pen-5.00,updated_at=now()
   where user_id=v_inviter and service='COBRA_YA';
   update public.cc_cobra_referral_bonuses set status='REVERSED',reversed_at=now()
   where id=v_pending.id;
  end loop;
 end if;
 perform pg_catalog.set_config('cc_audit.kind','',true);
 perform pg_catalog.set_config('cc_audit.concept','',true);
 perform pg_catalog.set_config('cc_audit.reference','',true);
 perform pg_catalog.set_config('cc_audit.payment','',true);
 perform pg_catalog.set_config('cc_audit.referred','',true);
 perform pg_catalog.set_config('cc_audit.original','',true);
 perform pg_catalog.set_config('cc_audit.reason','',true);
 return v_access_id;
end
$function$
;
-- MI ALQUILER: misma billetera sin forzar recarga propia.
CREATE OR REPLACE FUNCTION public.ma_activate_real_wallet(p_request uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); acct public.ma_accounts%rowtype; existing public.ma_subscription_events%rowtype; untilv timestamptz;
begin
 if u is null or p_request is null then raise exception 'Inicia sesión';end if;
 perform public.ma_ensure_account();
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(u::text||':CC_REAL_WALLET_TRANSFER',0));
 select * into existing from public.ma_subscription_events where request_id=p_request;
 if found then
  if existing.reseller_id<>u or existing.funding<>'REAL_WALLET' or existing.amount_pen<>15 then raise exception 'Referencia reutilizada';end if;
  return existing.active_until;
 end if;
 select * into acct from public.ma_accounts where user_id=u for update;
 if acct.suspended then raise exception 'Membresía suspendida';end if;
 -- Aplicar saldo único CLAN CARTAN a esta activación.
 perform cc_internal.cc_wallet_prepare_service(u,'MI_ALQUILER',15);
 update public.cc_real_service_wallets set balance_pen=balance_pen-15,updated_at=now()
 where user_id=u and service='MI_ALQUILER' and balance_pen>=15;
 if not found then raise exception 'Saldo real verificado insuficiente';end if;
 untilv:=greatest(now(),coalesce(acct.subscription_until,now()))+interval '30 days';
 insert into public.cc_real_wallet_spends(user_id,service,kind,amount_pen,reference,description)
 values(u,'MI_ALQUILER','SUBSCRIPTION',15,'MA-SUB-'||p_request::text,'Renovación voluntaria MI ALQUILER por 30 días');
 update public.ma_accounts set subscription_until=untilv where user_id=u;
 insert into public.ma_subscription_events(request_id,reseller_id,funding,amount_pen,active_until)
 values(p_request,u,'REAL_WALLET',15,untilv);
 return untilv;
end $function$
;
