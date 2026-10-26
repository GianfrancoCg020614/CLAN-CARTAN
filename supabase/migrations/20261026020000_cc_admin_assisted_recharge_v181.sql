-- V181: ADMIN crea solicitudes de recarga para usuarios existentes, sin pedir su nombre otra vez.
-- La solicitud NO acredita saldo. El depósito real se valida con cc_admin_decide_manual_recharge,
-- que exige autorización bancaria, confirma dinero real y bloquea referencias repetidas.
create or replace function public.cc_admin_create_manual_recharge_for_user(
 p_target uuid,p_service text,p_amount numeric,p_request uuid,p_payer_reference text default null
) returns uuid language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=auth.uid();orderid uuid;existing public.cc_manual_recharge_requests%rowtype;
 nam text;ref text:=nullif(trim(coalesce(p_payer_reference,'')),'');
begin
 if actor is null or not exists(select 1 from public.cc_admins where user_id=actor)
 then raise exception 'Solo ADMIN puede registrar recargas asistidas' using errcode='42501';end if;
 if p_target is null or p_target=actor or not exists(select 1 from auth.users where id=p_target)
  or exists(select 1 from public.cc_admins where user_id=p_target)
 then raise exception 'Destinatario no válido';end if;
 if p_request is null or p_service not in ('STREAM_BULLS','COBRA_YA','MI_ALQUILER')
  or p_amount is null or p_amount<1 or p_amount>1000 or p_amount<>round(p_amount,2)
  or (ref is not null and length(ref) not between 4 and 120)
 then raise exception 'Datos de recarga incorrectos';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC:ADMIN:MANUAL:'||p_target::text||':'||p_service,0));
 select * into existing from public.cc_manual_recharge_requests where id=p_request;
 if found then
  if existing.user_id<>p_target or existing.service<>p_service or existing.amount_pen<>p_amount
  then raise exception 'Referencia reutilizada con datos diferentes';end if;
  return existing.id;
 end if;
 if (select count(*) from public.cc_manual_recharge_requests
     where user_id=p_target and created_at>now()-interval '24 hours')>=3
 then raise exception 'Este usuario alcanzó el límite diario de solicitudes';end if;
 if exists(select 1 from public.cc_manual_recharge_requests
     where user_id=p_target and service=p_service and status='PENDING')
 then raise exception 'Este usuario ya tiene una recarga pendiente para esta billetera';end if;
 select coalesce(nullif(trim(d.full_name),''),
                 nullif(trim(r.display_alias),''),
                 nullif(trim(p.display_name),''),
                 split_part(u.email,'@',1))
 into nam from auth.users u
 left join public.cc_user_details d on d.user_id=u.id
 left join public.cc_portal_user_registry r on r.user_id=u.id
 left join public.cc_profiles p on p.user_id=u.id
 where u.id=p_target;
 if nam is null then raise exception 'Cuenta sin identidad registrada';end if;
 insert into public.cc_real_topup_orders(
   user_id,service,amount_pen,currency,provider,status,payment_currency,payment_amount,expires_at
 ) values(p_target,p_service,p_amount,'PEN','LEMON_DALE','PENDING','PEN',p_amount,now()+interval '72 hours')
 returning id into orderid;
 insert into public.cc_manual_recharge_requests(
   id,order_id,user_id,service,amount_pen,payer_name,payer_reference
 ) values(p_request,orderid,p_target,p_service,p_amount,nam,ref);
 return p_request;
end;
$fn$;
revoke all on function public.cc_admin_create_manual_recharge_for_user(uuid,text,numeric,uuid,text) from public,anon;
grant execute on function public.cc_admin_create_manual_recharge_for_user(uuid,text,numeric,uuid,text) to authenticated;