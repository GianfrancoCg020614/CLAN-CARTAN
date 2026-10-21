-- MI ALQUILER V162.1: cuarta billetera. Fondos reales, bonos separados.
alter table public.cc_real_service_wallets drop constraint cc_real_service_wallets_service_check;
alter table public.cc_real_service_wallets add constraint cc_real_service_wallets_service_check check (service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA','MI_ALQUILER'));
alter table public.cc_real_wallet_transfers drop constraint cc_real_wallet_transfers_from_service_check;
alter table public.cc_real_wallet_transfers add constraint cc_real_wallet_transfers_from_service_check check (from_service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA','MI_ALQUILER'));
alter table public.cc_real_wallet_transfers drop constraint cc_real_wallet_transfers_to_service_check;
alter table public.cc_real_wallet_transfers add constraint cc_real_wallet_transfers_to_service_check check (to_service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA','MI_ALQUILER'));
alter table public.cc_real_topup_orders drop constraint cc_real_topup_orders_service_check;
alter table public.cc_real_topup_orders add constraint cc_real_topup_orders_service_check check (service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA','MI_ALQUILER'));
alter table public.cc_real_wallet_ledger drop constraint cc_real_wallet_ledger_service_check;
alter table public.cc_real_wallet_ledger add constraint cc_real_wallet_ledger_service_check check (service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA','MI_ALQUILER'));
alter table public.cc_manual_recharge_requests drop constraint cc_manual_recharge_requests_service_check;
alter table public.cc_manual_recharge_requests add constraint cc_manual_recharge_requests_service_check check (service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA','MI_ALQUILER'));
alter table public.cc_manual_payment_notifications drop constraint cc_manual_payment_notifications_service_check;
alter table public.cc_manual_payment_notifications add constraint cc_manual_payment_notifications_service_check check (service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA','MI_ALQUILER'));
alter table public.cc_real_wallet_spends drop constraint cc_real_wallet_spends_service_check;
alter table public.cc_real_wallet_spends add constraint cc_real_wallet_spends_service_check check (service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA','MI_ALQUILER'));
alter table public.ma_subscription_events drop constraint ma_subscription_events_funding_check;
alter table public.ma_subscription_events add constraint ma_subscription_events_funding_check check(funding in ('BONUS','REAL_WALLET'));
CREATE OR REPLACE FUNCTION public.ma_ensure_account()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();a public.ma_accounts%rowtype;admin_role boolean;verified_balance numeric;
begin
 if u is null then raise exception 'Inicia sesión';end if;
 insert into public.ma_accounts(user_id) values(u) on conflict(user_id) do nothing;
 insert into public.ma_wallets(user_id) values(u) on conflict(user_id) do nothing;
 select * into a from public.ma_accounts where user_id=u;
 select exists(select 1 from public.cc_admins where user_id=u) into admin_role;
 insert into public.cc_real_service_wallets(user_id,service,balance_pen) values(u,'MI_ALQUILER',0) on conflict(user_id,service) do nothing;
 select balance_pen into verified_balance from public.cc_real_service_wallets where user_id=u and service='MI_ALQUILER';
 return jsonb_build_object('invite_code',a.invite_code,'suspended',a.suspended,'subscription_until',a.subscription_until,
  'role',case when admin_role then 'ADMIN' else 'RESELLER' end,
  'active',admin_role or (not a.suspended and a.subscription_until>now()),
  'bonus_pen',a.bonus_pen,'real_verified_pen',coalesce(verified_balance,0));
end $function$;

CREATE OR REPLACE FUNCTION public.ma_transfer_real_balance(p_from text, p_to text, p_amount numeric, p_request uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 uid uuid:=auth.uid();
 source_amount numeric;
 old public.mc_real_transfer_requests%rowtype;
 new_id uuid;
begin
 if uid is null then raise exception 'Requiere iniciar sesion';end if;
 if p_request is null or p_amount is null or p_amount<0.01 or p_amount>100000 or p_amount<>round(p_amount,2) then raise exception 'Monto o referencia incorrectos';end if;
 if p_from not in ('MI_COCHERA','COBRA_YA','STREAM_BULLS','MI_ALQUILER') or
    p_to not in ('MI_COCHERA','COBRA_YA','STREAM_BULLS','MI_ALQUILER') or
    p_from=p_to then
    raise exception 'Solo puedes transferir entre tus cuatro billeteras reales del mismo titular';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text||':CC_REAL_WALLET_TRANSFER',0));
 select * into old from public.mc_real_transfer_requests where request_id=p_request;
 if found then
  if old.user_id<>uid or old.from_service<>p_from or old.to_service<>p_to or old.amount_pen<>p_amount then raise exception 'Referencia ya utilizada por otra operacion';end if;
  return old.transfer_id;
 end if;
 insert into public.cc_real_service_wallets(user_id,service,balance_pen)
 values(uid,'COBRA_YA',0),(uid,'STREAM_BULLS',0),(uid,'MI_COCHERA',0),(uid,'MI_ALQUILER',0)
 on conflict(user_id,service) do nothing;
 perform 1 from public.cc_real_service_wallets
 where user_id=uid and service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA','MI_ALQUILER') order by service for update;
 select balance_pen into source_amount from public.cc_real_service_wallets where user_id=uid and service=p_from;
 if coalesce(source_amount,0)<p_amount then raise exception 'Saldo real verificado insuficiente (bonos no transferibles)';end if;
 update public.cc_real_service_wallets set balance_pen=balance_pen-p_amount,updated_at=now()
 where user_id=uid and service=p_from;
 update public.cc_real_service_wallets set balance_pen=balance_pen+p_amount,updated_at=now()
 where user_id=uid and service=p_to;
 insert into public.cc_real_wallet_transfers(user_id,from_service,to_service,amount_pen)
 values(uid,p_from,p_to,p_amount) returning id into new_id;
 insert into public.mc_real_transfer_requests(request_id,user_id,from_service,to_service,amount_pen,transfer_id)
 values(p_request,uid,p_from,p_to,p_amount,new_id);
 return new_id;
end $function$;

revoke all on function public.ma_transfer_real_balance(text,text,numeric,uuid) from public,anon,authenticated;
grant execute on function public.ma_transfer_real_balance(text,text,numeric,uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.cc_submit_manual_recharge(p_service text, p_amount numeric, p_payer_name text, p_payer_reference text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_id uuid;v_order uuid;v_name text:=trim(regexp_replace(coalesce(p_payer_name,''),'[[:space:]]+',' ','g'));
 v_ref text:=nullif(trim(coalesce(p_payer_reference,'')),'');
begin
 if v_user is null then raise exception 'Inicia sesión'; end if;
 if p_service not in ('COBRA_YA','STREAM_BULLS','MI_ALQUILER') or p_amount is null
    or p_amount<1 or p_amount>1000 or p_amount<>round(p_amount,2)
    or length(v_name) not between 5 and 120 or v_name !~ ' '
    or (v_ref is not null and length(v_ref) not between 4 and 120)
 then raise exception 'Datos de recarga inválidos'; end if;
 if p_service='MI_ALQUILER' then perform public.ma_ensure_account();end if;
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('CC:MANUAL:USER:'||v_user::text||':'||p_service,0));
 if (select count(*) from public.cc_manual_recharge_requests
   where user_id=v_user and created_at>now()-interval '24 hours')>=3
 then raise exception 'Máximo tres solicitudes manuales cada 24 horas'; end if;
 if exists(select 1 from public.cc_manual_recharge_requests
   where user_id=v_user and service=p_service and status='PENDING')
 then raise exception 'Ya tienes una solicitud manual pendiente para esta billetera'; end if;
 insert into public.cc_real_topup_orders(
  user_id,service,amount_pen,currency,provider,status,payment_currency,payment_amount,expires_at
 ) values (
  v_user,p_service,p_amount,'PEN','LEMON_DALE','PENDING','PEN',p_amount,now()+interval '72 hours'
 ) returning id into v_order;
 insert into public.cc_manual_recharge_requests(
  order_id,user_id,service,amount_pen,payer_name,payer_reference
 ) values(v_order,v_user,p_service,p_amount,v_name,v_ref) returning id into v_id;
 return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.cc_notify_manual_payment(p_service text, p_method text, p_amount numeric, p_operation text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_id uuid;v_op text:=upper(trim(coalesce(p_operation,'')));
begin
 if v_user is null then raise exception 'Inicia sesión'; end if;
 if p_service not in ('COBRA_YA','STREAM_BULLS','MI_ALQUILER') or p_method not in ('YAPE','PLIN','TRANSFERENCIA') then raise exception 'Método o servicio inválido';end if;
 if p_service='MI_ALQUILER' then perform public.ma_ensure_account();end if;
 if p_amount is null or p_amount<1 or p_amount>1000 or round(p_amount,2)<>p_amount then raise exception 'Monto inválido';end if;
 if length(v_op) not between 5 and 120 or v_op ~ '[<>]' then raise exception 'Número de operación inválido';end if;
 if (select count(*) from public.cc_manual_payment_notifications where user_id=v_user and created_at>now()-interval '24 hours')>=6 then raise exception 'Máximo seis notificaciones cada 24 horas';end if;
 insert into public.cc_manual_payment_notifications(user_id,service,method,amount_pen,operation_number)
 values(v_user,p_service,p_method,p_amount,v_op) returning id into v_id;
 return v_id;
exception when unique_violation then raise exception 'Esta operación ya fue registrada'; 
end $function$;

CREATE OR REPLACE FUNCTION public.cc_notify_binance_personal_usdt(p_service text, p_received_usdt numeric, p_operation text)
 RETURNS TABLE(request_id uuid, estimated_pen numeric, net_rate_pen_per_usdt numeric, rate_source text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_id uuid;v_usdt numeric;v_pen numeric;v_op text:=upper(btrim(coalesce(p_operation,'')));
 q public.cc_usdt_pen_reference_rates%rowtype;
begin
 if v_user is null then raise exception 'Inicia sesión';end if;
 if not coalesce((select commercial_authorized from public.cc_binance_personal_policy where id=true),false)
 then raise exception 'Binance personal todavía no está autorizado para cobros comerciales';end if;
 if p_service not in ('COBRA_YA','STREAM_BULLS','MI_ALQUILER') then raise exception 'Servicio inválido';end if;
 if p_service='MI_ALQUILER' then perform public.ma_ensure_account();end if;
 if p_received_usdt is null or p_received_usdt<=0 or p_received_usdt>1000
 or p_received_usdt<>round(p_received_usdt,8) then raise exception 'Importe USDT inválido';end if;
 if length(v_op) not between 8 and 120 or v_op~'[<>]' then raise exception 'Referencia de Binance inválida';end if;
 select * into q from public.cc_usdt_pen_reference_rates
 where valid_until>now()+interval '10 seconds'
 and observed_at>now()-interval '2 minutes'
 and observed_at<=now()+interval '15 seconds'
 order by observed_at desc,id desc limit 1;
 if not found or p_received_usdt>q.available_usdt then raise exception 'No hay cotización de mercado vigente para ese volumen';end if;
 v_usdt:=p_received_usdt;v_pen:=trunc(v_usdt*q.rate_pen_per_usdt,2);
 if v_pen<1 or v_pen>1000 then raise exception 'Saldo referencial PEN fuera de rango';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('BINANCE:NOTIFY:'||v_user::text,0));
 if (select count(*) from public.cc_manual_payment_notifications
  where user_id=v_user and created_at>now()-interval '24 hours')>=6
 then raise exception 'Máximo seis notificaciones por 24 horas';end if;
 insert into public.cc_manual_payment_notifications
 (user_id,service,method,amount_pen,operation_number,received_usdt,quote_id,quote_rate_pen_per_usdt)
 values (v_user,p_service,'BINANCE',v_pen,v_op,v_usdt,q.id,q.rate_pen_per_usdt)
 returning id into v_id;
 return query select v_id,v_pen,q.rate_pen_per_usdt,q.source;
exception when unique_violation then
 raise exception 'Esta operación Binance ya fue declarada';
end $function$;

create or replace function public.ma_activate_real_wallet(p_request uuid)
returns timestamptz language plpgsql security definer set search_path='' as $ma$
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
end $ma$;
revoke all on function public.ma_activate_real_wallet(uuid) from public,anon,authenticated;
grant execute on function public.ma_activate_real_wallet(uuid) to authenticated;
