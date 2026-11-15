CREATE OR REPLACE FUNCTION public.cc_recharge_create(p_request uuid, p_amount_pen numeric, p_receiver text DEFAULT 'MANUAL_BANK'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare u uuid:=auth.uid();r cc_internal.recharge_registry%rowtype;req uuid;oid uuid;full_name text;
begin
 if u is null or p_request is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 if p_receiver not in ('MANUAL_BANK','LEMON_DALE','BINANCE_PERSONAL') then raise exception 'Medio no válido';end if;
 if p_receiver='LEMON_DALE' and not exists(select 1 from cc_internal.lemon_assisted_settings a join public.cc_manual_recharge_settings s on s.id=a.id where a.enabled and s.qr_asset_url is not null) then raise exception 'Lemon asistido no disponible';end if;
 if p_amount_pen is null or p_amount_pen<5 or p_amount_pen>1000 or p_amount_pen<>round(p_amount_pen,2) then raise exception 'Importe inválido';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC-REC:'||u::text,0));
 select * into r from cc_internal.recharge_registry where client_request=p_request;
 if found then
  if r.user_id<>u or r.requested_pen<>p_amount_pen or r.receiver<>p_receiver then raise exception 'Referencia utilizada con otros datos' using errcode='42501';end if;
  return jsonb_build_object('id',r.id,'rec_code',r.rec_code,'amount_pen',r.requested_pen,'receiver',r.receiver,'status',r.status,'expires_at',r.expires_at);
 end if;
 select d.full_name into full_name from public.cc_user_details d where user_id=u;
 req:=public.cc_submit_manual_recharge('STREAM_BULLS',p_amount_pen,full_name,null);
 select order_id into oid from public.cc_manual_recharge_requests where id=req and user_id=u;
 update cc_internal.recharge_registry set client_request=p_request,receiver=p_receiver,expires_at=case when p_receiver in ('LEMON_DALE','BINANCE_PERSONAL') then created_at+interval '15 minutes' else expires_at end where origin='TOPUP' and origin_id=oid and user_id=u returning * into r;
 if r.id is null then raise exception 'No se confirmó la solicitud REC';end if;
 return jsonb_build_object('id',r.id,'rec_code',r.rec_code,'request_id',req,'amount_pen',r.requested_pen,'receiver',r.receiver,'status',r.status,'expires_at',r.expires_at);
end;$function$

