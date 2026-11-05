CREATE OR REPLACE FUNCTION cc_internal.reserve_verified_payment_receipt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$

