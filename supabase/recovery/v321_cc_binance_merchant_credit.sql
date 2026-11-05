CREATE OR REPLACE FUNCTION public.cc_binance_merchant_credit(p_trade_no text, p_merchant_id text, p_prepay_id text, p_transaction_id text, p_usdt numeric, p_paid_at timestamp with time zone)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.cc_binance_merchant_orders%rowtype;
begin
 if p_trade_no is null or p_transaction_id is null or
 p_transaction_id !~ '^[A-Za-z0-9_-]{8,128}$' or
 p_merchant_id is null or p_usdt is null or p_usdt<=0
 or p_usdt<>round(p_usdt,8) or p_paid_at is null
 then raise exception 'Pago verificado incompleto'; end if;
 select * into v from public.cc_binance_merchant_orders
 where merchant_trade_no=p_trade_no for update;
 if not found then raise exception 'Orden no existente'; end if;
 if v.status='CREDITED' then
   if v.provider_transaction_id=p_transaction_id then return false; end if;
   raise exception 'Orden ya acreditada con otra transaccion';
 end if;
 if v.status<>'READY' then raise exception 'Orden no apta para acreditar'; end if;
 if v.merchant_id<>p_merchant_id or v.prepay_id<>p_prepay_id or v.expected_usdt<>p_usdt then
   raise exception 'Merchant o importe USDT no coincide'; end if;
 if p_paid_at < v.created_at-interval '1 minute'
 or p_paid_at > v.expires_at+interval '1 minute'
 then raise exception 'Pago fuera de vigencia'; end if;
 insert into public.cc_binance_merchant_credits(order_id,user_id,service,transaction_id,usdt_paid,amount_pen)
 values(v.id,v.user_id,v.service,p_transaction_id,p_usdt,v.amount_pen);
 insert into public.cc_real_service_wallets(user_id,service,balance_pen)
 values(v.user_id,v.service,v.amount_pen)
 on conflict (user_id,service) do update set
 balance_pen=public.cc_real_service_wallets.balance_pen+excluded.balance_pen,
 updated_at=now();
 update public.cc_binance_merchant_orders
 set status='CREDITED',provider_transaction_id=p_transaction_id,credited_at=now()
 where id=v.id;
 return true;
end $function$

