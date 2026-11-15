CREATE OR REPLACE FUNCTION cc_internal.reconcile_lemon_notice(p_event uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare e cc_internal.recharge_mail_events%rowtype;r cc_internal.recharge_registry%rowtype;q public.cc_manual_recharge_requests%rowtype;o public.cc_real_topup_orders%rowtype;n integer;candidate_id uuid;tx text;pn text;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Solo servicio' using errcode='42501';end if;
 select * into e from cc_internal.recharge_mail_events where id=p_event for update;
 if not found then return jsonb_build_object('status','NOT_FOUND');end if;
 if e.status<>'UNIDENTIFIED' or e.linked_rec_id is not null then return jsonb_build_object('status','ALREADY_HANDLED');end if;
 tx:=lower(btrim(coalesce(e.transaction_hint,'')));
 pn:=upper(regexp_replace(translate(btrim(coalesce(e.payer_name_hint,'')),'áéíóúÁÉÍÓÚñÑ','aeiouAEIOUnN'),'[[:space:]]+',' ','g'));
 if e.provider_hint<>'LEMON' or e.sender_authenticated is distinct from true or e.currency_hint<>'PEN' or e.amount_hint is null or e.amount_hint<=0 or tx !~ '^[a-z0-9_-]{8,120}$' or length(pn)<8 or e.received_at is null then
  return jsonb_build_object('status','REVIEW_REQUIRED');
 end if;
 if exists(select 1 from cc_internal.cc_verified_payment_receipts where transaction_reference=tx) then return jsonb_build_object('status','TRANSACTION_USED');end if;
 select count(*),min(rr.id::text)::uuid into n,candidate_id from cc_internal.recharge_registry rr
 join public.cc_user_details d on d.user_id=rr.user_id
 join public.cc_manual_recharge_requests m on m.order_id=rr.origin_id and m.user_id=rr.user_id
 where rr.origin='TOPUP' and rr.receiver='LEMON_DALE' and rr.status='PENDING'
 and rr.requested_pen=e.amount_hint and rr.created_at<=e.received_at and e.received_at<=rr.expires_at
 and upper(regexp_replace(translate(btrim(d.full_name),'áéíóúÁÉÍÓÚñÑ','aeiouAEIOUnN'),'[[:space:]]+',' ','g'))=pn

 and (e.rec_hint is null or e.rec_hint=rr.rec_code);
 if n<>1 then return jsonb_build_object('status',case when n=0 then 'NO_MATCH' else 'AMBIGUOUS' end,'candidates',n);end if;
 select * into r from cc_internal.recharge_registry where id=candidate_id for update;
 if r.status<>'PENDING' then return jsonb_build_object('status','CHANGED');end if;
 select * into q from public.cc_manual_recharge_requests where order_id=r.origin_id and user_id=r.user_id for update;
 select * into o from public.cc_real_topup_orders where id=r.origin_id and user_id=r.user_id for update;
 if q.status<>'PENDING' or o.status<>'PENDING' or o.provider<>'LEMON_DALE' or o.service<>'STREAM_BULLS' or o.currency<>'PEN' or o.payment_currency<>'PEN' or o.payment_amount<>r.requested_pen or o.amount_pen<>r.requested_pen then return jsonb_build_object('status','ORDER_MISMATCH');end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC:RECEIPT:LEMON:'||tx,0));
 if exists(select 1 from cc_internal.cc_verified_payment_receipts where transaction_reference=tx) then return jsonb_build_object('status','TRANSACTION_USED');end if;
 insert into public.cc_real_wallet_ledger(user_id,service,order_id,provider,provider_transaction_id,amount_pen,source_bank)
 values(r.user_id,o.service,o.id,'LEMON_DALE',tx,r.requested_pen,'LEMON');
 perform pg_catalog.set_config('cc_audit.kind','AUTOMATIC_VERIFIED_RECHARGE',true);
 perform pg_catalog.set_config('cc_audit.concept','Recarga Lemon por aviso autenticado y pagador coincidente',true);
 perform pg_catalog.set_config('cc_audit.reference',r.rec_code,true);
 perform pg_catalog.set_config('cc_audit.payment','LEMON_DALE-'||tx,true);
 perform pg_catalog.set_config('cc_audit.reason','Conciliación automática con correo autenticado, pagador, monto, plazo y referencia única',true);
 insert into public.cc_real_service_wallets(user_id,service,balance_pen) values(r.user_id,o.service,r.requested_pen)
 on conflict(user_id,service) do update set balance_pen=public.cc_real_service_wallets.balance_pen+excluded.balance_pen,updated_at=now();
 update public.cc_real_topup_orders set status='CREDITED',provider_transaction_id=tx,verified_at=now(),credited_at=now() where id=o.id;
 update public.cc_manual_recharge_requests set status='APPROVED',bank_transaction_id=tx,source_bank='LEMON',reviewed_at=now() where id=q.id;
 update cc_internal.recharge_registry set status='CREDITED',provider_reference=tx,confirmed_at=now(),credited_at=now() where id=r.id;
 update cc_internal.recharge_mail_events set status='LINKED',linked_rec_id=r.id,note='Conciliación automática verificada' where id=e.id;
 insert into cc_internal.recharge_audit(rec_id,action,details) values(r.id,'LEMON_AUTO_CREDIT',jsonb_build_object('event_id',e.id,'transaction_reference',tx,'amount_pen',r.requested_pen));
 insert into cc_internal.recharge_notifications(rec_id,user_id,event,message) values(r.id,r.user_id,'CREDITED',r.rec_code||': recarga Lemon acreditada automáticamente') on conflict(rec_id,event) do nothing;
 return jsonb_build_object('status','CREDITED','rec_code',r.rec_code);
end $function$

