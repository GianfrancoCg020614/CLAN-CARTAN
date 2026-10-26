-- V189: aprobación manual real por ADMIN sin fingir autorización de pasarela comercial.
-- Nunca habilita la recaudación comercial Lemon/DALE; no acredita solicitudes automáticamente.
-- Mantiene las referencias únicas, autorización administrativa y auditoría de saldo.
alter table public.cc_real_topup_orders drop constraint cc_real_topup_orders_provider_check;
alter table public.cc_real_topup_orders add constraint cc_real_topup_orders_provider_check
 check (provider in ('LEMON_DALE','BINANCE','MANUAL_ADMIN'));

alter table public.cc_real_topup_orders drop constraint cc_fx125_order_rate_components;
alter table public.cc_real_topup_orders add constraint cc_fx125_order_rate_components
 check (
  provider in ('LEMON_DALE','MANUAL_ADMIN') or
  (provider='BINANCE' and quote_market_rate_pen_per_usdt>0
   and quote_conversion_cost_pct between 0 and 15
   and quote_protection_margin_pct between 2 and 20
   and quote_available_usdt>=payment_amount
   and quote_rate_pen_per_usdt=round(
     (quote_market_rate_pen_per_usdt*(100-quote_conversion_cost_pct-quote_protection_margin_pct))/100,6))
 );

alter table public.cc_real_topup_orders drop constraint cc_real_topup_payment_currency_check;
alter table public.cc_real_topup_orders add constraint cc_real_topup_payment_currency_check
 check (
  (provider in ('LEMON_DALE','MANUAL_ADMIN') and payment_currency='PEN'
   and payment_amount=amount_pen and quote_rate_pen_per_usdt is null)
  or
  (provider='BINANCE' and payment_currency='USDT' and payment_amount>0
   and quote_rate_pen_per_usdt>0
   and amount_pen=round(payment_amount*quote_rate_pen_per_usdt,2)
   and quote_valid_until is not null and quote_source is not null)
 );

alter table public.cc_real_topup_orders drop constraint cc_real_topup_payment_required_check;
alter table public.cc_real_topup_orders add constraint cc_real_topup_payment_required_check
 check (
  payment_amount is not null and (
   (provider in ('LEMON_DALE','MANUAL_ADMIN') and payment_currency='PEN'
    and payment_amount=amount_pen and quote_rate_pen_per_usdt is null)
   or
   (provider='BINANCE' and payment_currency='USDT'
    and quote_rate_pen_per_usdt is not null and quote_source is not null
    and quote_valid_until is not null and amount_pen=round(payment_amount*quote_rate_pen_per_usdt,2))
  )
 );

alter table public.cc_real_wallet_ledger drop constraint cc_real_wallet_ledger_provider_check;
alter table public.cc_real_wallet_ledger add constraint cc_real_wallet_ledger_provider_check
 check (provider in ('LEMON_DALE','BINANCE','MANUAL_ADMIN'));

alter table cc_internal.cc_verified_payment_receipts drop constraint cc_verified_payment_receipts_provider_family_check;
alter table cc_internal.cc_verified_payment_receipts add constraint cc_verified_payment_receipts_provider_family_check
 check (provider_family in ('LEMON_DALE','BINANCE','MANUAL_ADMIN'));
alter table cc_internal.cc_verified_payment_receipts drop constraint cc_verified_payment_receipts_service_check;
alter table cc_internal.cc_verified_payment_receipts add constraint cc_verified_payment_receipts_service_check
 check (service in ('COBRA_YA','STREAM_BULLS','MI_COCHERA','MI_ALQUILER'));

-- Una referencia acreditada no puede volver a acreditarse por otro canal.
create unique index if not exists cc_verified_receipt_reference_unique_global
 on cc_internal.cc_verified_payment_receipts(transaction_reference);

create or replace function cc_internal.reserve_verified_payment_receipt()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare
 v_family text;
 v_reference text;
 v_user uuid;
 v_service text;
 v_amount numeric(14,2);
begin
 if tg_table_schema<>'public' then
  raise exception 'Origen no autorizado para verificar recibos';
 end if;
 if tg_table_name='cc_real_wallet_ledger' then
  v_family:=case when new.provider='LEMON_DALE' then 'LEMON_DALE'
                 when new.provider='BINANCE' then 'BINANCE'
                 when new.provider='MANUAL_ADMIN' then 'MANUAL_ADMIN' else null end;
  v_reference:=lower(btrim(new.provider_transaction_id));
  v_user:=new.user_id;v_service:=new.service;v_amount:=new.amount_pen;
 elsif tg_table_name='cc_admin_verified_personal_topups' then
  v_family:=case when new.provider='LEMON_DALE_PERSONAL' then 'LEMON_DALE'
                 when new.provider='BINANCE_PERSONAL' then 'BINANCE' else null end;
  v_reference:=lower(btrim(new.provider_transaction_id));
  v_user:=new.recipient_id;v_service:=new.service;v_amount:=new.credited_pen;
 elsif tg_table_name='cc_binance_merchant_credits' then
  v_family:='BINANCE';v_reference:=lower(btrim(new.transaction_id));
  v_user:=new.user_id;v_service:=new.service;v_amount:=new.amount_pen;
 else
  raise exception 'Origen no autorizado para verificar recibos';
 end if;
 if v_family is null or v_reference is null or char_length(v_reference) not between 8 and 128 then
  raise exception 'Referencia verificada inválida';
 end if;
 insert into cc_internal.cc_verified_payment_receipts
  (provider_family,transaction_reference,source_table,source_id,user_id,service,amount_pen)
 values(v_family,v_reference,tg_table_name,new.id,v_user,v_service,v_amount);
 return new;
exception when unique_violation then
 raise exception using errcode='23505',
 message='Referencia de pago ya acreditada por alguna vía de recarga';
end;
$function$;

-- Solo ADMIN autenticado puede conocer la disponibilidad de acreditación manual.
create or replace function public.cc_admin_manual_recharge_status_v189()
returns table(enabled boolean, method text, message text)
language plpgsql stable security definer set search_path=''
as $function$
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.cc_admins where user_id=(select auth.uid())
 ) then
  raise exception 'Solo ADMIN puede verificar recargas' using errcode='42501';
 end if;
 return query select true,'MANUAL_ADMIN'::text,
  'Acreditación manual disponible: ADMIN debe comprobar el ingreso real y aportar referencia bancaria única.'::text;
end;
$function$;

-- Transacción única: bloquear solicitud y orden; reservar recibo; registrar ledger;
-- acreditar wallet; actualizar orden/solicitud. Cualquier fallo deshace todo.
create or replace function public.cc_admin_decide_manual_recharge_v189(
 p_request uuid,p_approve boolean,p_bank_tx text default null,
 p_bank text default null,p_confirmed_received boolean default false
) returns boolean
language plpgsql security definer set search_path=''
as $function$
declare
 v_admin uuid:=(select auth.uid());
 v_req public.cc_manual_recharge_requests%rowtype;
 v_order public.cc_real_topup_orders%rowtype;
 v_tx text:=lower(btrim(coalesce(p_bank_tx,'')));
 v_bank text:=nullif(btrim(coalesce(p_bank,'')),'');
begin
 if v_admin is null or not exists(select 1 from public.cc_admins where user_id=v_admin) then
  raise exception 'Solo ADMIN puede aprobar recargas' using errcode='42501';
 end if;
 if p_request is null or p_approve is null then
  raise exception 'Solicitud inválida' using errcode='22023';
 end if;
 select * into v_req from public.cc_manual_recharge_requests
  where id=p_request for update;
 if not found then raise exception 'Solicitud no encontrada' using errcode='22023'; end if;
 if v_req.status<>'PENDING' then return false; end if;
 if p_approve and v_req.user_id=v_admin then
  raise exception 'No puedes acreditar tu propia cuenta' using errcode='42501';
 end if;
 select * into v_order from public.cc_real_topup_orders
  where id=v_req.order_id for update;
 if not found or v_order.status<>'PENDING'
    or v_order.user_id<>v_req.user_id or v_order.service<>v_req.service
    or v_order.amount_pen<>v_req.amount_pen
    or v_order.currency<>'PEN' or v_order.payment_currency<>'PEN'
    or v_order.payment_amount<>v_req.amount_pen
    or v_order.provider<>'LEMON_DALE'
 then
  raise exception 'La orden original no está pendiente o sus datos no coinciden';
 end if;
 if not p_approve then
  update public.cc_manual_recharge_requests set status='REJECTED',
   reviewed_by=v_admin, reviewed_at=now() where id=v_req.id;
  update public.cc_real_topup_orders set status='REJECTED'
   where id=v_order.id;
  return true;
 end if;
 if p_confirmed_received is distinct from true then
  raise exception 'Debes comprobar el dinero REALMENTE recibido antes de acreditar';
 end if;
 if length(v_tx) not between 8 and 120 or v_tx~'[<>[:cntrl:]]'
    or length(coalesce(v_bank,''))>64 or coalesce(v_bank,'')~'[<>[:cntrl:]]' then
  raise exception 'Referencia bancaria o banco inválidos' using errcode='22023';
 end if;
 if v_order.expires_at<now() then
  raise exception 'La orden venció. No acredites sin reconciliar primero';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('CC:RECEIPT:MANUAL_ADMIN:'||v_tx,0));
 if exists(select 1 from cc_internal.cc_verified_payment_receipts
           where transaction_reference=v_tx) then
  raise exception 'Este ingreso ya fue acreditado con la misma referencia';
 end if;
 -- El disparador de ledger reserva la referencia frente a todos los canales.
 insert into public.cc_real_wallet_ledger
 (user_id,service,order_id,provider,provider_transaction_id,amount_pen,source_bank)
 values(v_req.user_id,v_req.service,v_req.order_id,
        'MANUAL_ADMIN',v_tx,v_req.amount_pen,v_bank);

 perform pg_catalog.set_config('cc_audit.kind','MANUAL_VERIFIED_RECHARGE',true);
 perform pg_catalog.set_config('cc_audit.concept',
  'Recarga manual verificada por ADMIN (depósito real)',true);
 perform pg_catalog.set_config('cc_audit.reference','MANUAL-REQ-'||v_req.id::text,true);
 perform pg_catalog.set_config('cc_audit.payment','MANUAL_ADMIN-'||v_tx,true);
 perform pg_catalog.set_config('cc_audit.reason',
  'Ingreso cotejado por ADMIN. Banco/medio: '||coalesce(v_bank,'no indicado'),true);
 insert into public.cc_real_service_wallets(user_id,service,balance_pen)
 values(v_req.user_id,v_req.service,v_req.amount_pen)
 on conflict(user_id,service) do update
 set balance_pen=public.cc_real_service_wallets.balance_pen+excluded.balance_pen,
     updated_at=now();

 update public.cc_real_topup_orders set
  provider='MANUAL_ADMIN',status='CREDITED',
  provider_transaction_id=v_tx,verified_at=now(),credited_at=now()
  where id=v_order.id;
 update public.cc_manual_recharge_requests set
  status='APPROVED',bank_transaction_id=v_tx,source_bank=v_bank,
  reviewed_by=v_admin,reviewed_at=now()
  where id=v_req.id;
 return true;
end;
$function$;

revoke all on function public.cc_admin_manual_recharge_status_v189() from public,anon;
revoke all on function public.cc_admin_decide_manual_recharge_v189(uuid,boolean,text,text,boolean) from public,anon;
grant execute on function public.cc_admin_manual_recharge_status_v189() to authenticated;
grant execute on function public.cc_admin_decide_manual_recharge_v189(uuid,boolean,text,text,boolean) to authenticated;
