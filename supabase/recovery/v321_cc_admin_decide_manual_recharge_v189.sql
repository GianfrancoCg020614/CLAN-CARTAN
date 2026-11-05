CREATE OR REPLACE FUNCTION public.cc_admin_decide_manual_recharge_v189(p_request uuid, p_approve boolean, p_bank_tx text DEFAULT NULL::text, p_bank text DEFAULT NULL::text, p_confirmed_received boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$

