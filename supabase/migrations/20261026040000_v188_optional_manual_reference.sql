-- V188: referencia y banco opcionales; conserva verificación, permisos y atomicidad.
-- Un ID interno evita repetir la solicitud; sin referencia bancaria no identifica
-- un mismo depósito presentado en solicitudes diferentes. ADMIN debe cotejarlo.
begin;
create or replace function public.cc_admin_decide_manual_recharge(
 p_request uuid,p_approve boolean,p_bank_tx text default null,p_bank text default null,
 p_confirmed_received boolean default false
) returns boolean
language plpgsql security definer set search_path=''
as $$
declare v_admin uuid:=auth.uid();v_req public.cc_manual_recharge_requests%rowtype;
 v_order public.cc_real_topup_orders%rowtype;v_tx text:=trim(coalesce(p_bank_tx,''));
 v_bank text:=nullif(trim(coalesce(p_bank,'')),'');
 v_ready boolean;
begin
 if v_admin is null or not exists(select 1 from public.cc_admins where user_id=v_admin)
 then raise exception 'Solo ADMIN'; end if;
 if p_request is null or p_approve is null then raise exception 'Solicitud inválida'; end if;
 select * into v_req from public.cc_manual_recharge_requests
 where id=p_request for update;
 if not found then raise exception 'Solicitud no encontrada'; end if;
 if v_req.status<>'PENDING' then return false; end if;
 if v_req.user_id=v_admin and p_approve then raise exception 'No puedes aprobar tu propia recarga'; end if;
 select * into v_order from public.cc_real_topup_orders where id=v_req.order_id for update;
 if not found or v_order.status<>'PENDING' or v_order.amount_pen<>v_req.amount_pen
 or v_order.user_id<>v_req.user_id or v_order.service<>v_req.service
 then raise exception 'La orden original no está pendiente o no coincide'; end if;

 if not p_approve then
  update public.cc_manual_recharge_requests set status='REJECTED',
   reviewed_by=v_admin,reviewed_at=now() where id=v_req.id;
  update public.cc_real_topup_orders set status='REJECTED' where id=v_order.id;
  return true;
 end if;

 select (collection_enabled and merchant_permission_verified) into v_ready
 from public.cc_manual_recharge_settings where id=1;
 if coalesce(v_ready,false) is not true
 then raise exception 'No existe autorización comercial Lemon para recibir fondos'; end if;
 if p_confirmed_received is not true then raise exception 'Debes verificar el depósito en la cuenta real'; end if;
 -- Sin referencia bancaria, usar un identificador INTERNO por solicitud, no un recibo del banco.
 if v_tx='' then v_tx:='MANUAL:'||v_req.id::text; end if;
 if length(v_tx) not between 8 and 120 or length(coalesce(v_bank,''))>64
 then raise exception 'Referencia bancaria y banco inválidos'; end if;
 if v_order.expires_at<now() then raise exception 'Solicitud vencida. Investiga el pago antes de proceder'; end if;
 perform pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('CC:RECEIPT:LEMON:'||v_tx,0));
 if exists(select 1 from public.cc_real_wallet_ledger
           where provider='LEMON_DALE' and provider_transaction_id=v_tx)
 then raise exception 'Depósito ya usado para otra recarga'; end if;

 insert into public.cc_real_service_wallets(user_id,service,balance_pen)
 values(v_req.user_id,v_req.service,v_req.amount_pen)
 on conflict(user_id,service) do update set
 balance_pen=public.cc_real_service_wallets.balance_pen+excluded.balance_pen,updated_at=now();
 insert into public.cc_real_wallet_ledger(
  user_id,service,order_id,provider,provider_transaction_id,amount_pen,source_bank)
 values(v_req.user_id,v_req.service,v_req.order_id,'LEMON_DALE',v_tx,v_req.amount_pen,v_bank);
 update public.cc_real_topup_orders set status='CREDITED',
 provider_transaction_id=v_tx,verified_at=now(),credited_at=now()
 where id=v_order.id;
 update public.cc_manual_recharge_requests set status='APPROVED',
 bank_transaction_id=v_tx,source_bank=v_bank,reviewed_by=v_admin,reviewed_at=now()
 where id=v_req.id;
 return true;
end $$;
revoke all on function public.cc_admin_decide_manual_recharge(uuid,boolean,text,text,boolean)
 from public,anon;
grant execute on function public.cc_admin_decide_manual_recharge(uuid,boolean,text,text,boolean)
 to authenticated,service_role;

commit;
