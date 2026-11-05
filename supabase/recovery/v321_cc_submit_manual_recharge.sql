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
end $function$

