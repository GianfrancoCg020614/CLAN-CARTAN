CREATE OR REPLACE FUNCTION public.cc_binance_merchant_reserve(p_user_id uuid, p_service text, p_amount_pen numeric, p_trade_no text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
 if p_user_id is null or not exists(select 1 from auth.users where id=p_user_id)
 or p_service not in ('COBRA_YA','STREAM_BULLS')
 or p_amount_pen is null or p_amount_pen < 1 or p_amount_pen > 10
 or p_amount_pen<>round(p_amount_pen,2)
 or p_trade_no is null or p_trade_no !~ '^[0-9a-f]{32}$'
 then raise exception 'Orden de recarga invalida'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text||':BINANCE_MERCHANT',0));
 if (select count(*) from public.cc_binance_merchant_orders
     where user_id=p_user_id and created_at > now()-interval '24 hours') >= 3
 then raise exception 'Limite diario de solicitudes'; end if;
 if exists(select 1 from public.cc_binance_merchant_orders
     where user_id=p_user_id and status in ('CREATING','READY') and expires_at>now())
 then raise exception 'Otra orden aun vigente'; end if;
 insert into public.cc_binance_merchant_orders(user_id,service,amount_pen,merchant_trade_no)
 values(p_user_id,p_service,p_amount_pen,p_trade_no) returning id into v_id;
 return v_id;
end $function$

