-- V193: contratación interna con saldo real previamente acreditado. Sin habilitar pasarelas externas.
do $rewrite$
declare
 v_original text;
 v_old text:=E' select enabled into v_enabled from public.cc_cobra_real_payment_settings where id=true;\n if coalesce(v_enabled,false)=false then\n  raise exception ''Suscripciones comerciales no habilitadas: falta validar cobros reales'';\n end if;';
 v_replacement text:=E' -- Pago voluntario desde SALDO REAL verificado, no desde una pasarela Lemon/DALE.\n -- La habilitación comercial de proveedores externos permanece desactivada.';
begin
 select pg_get_functiondef('public.cc_pay_cobra_subscription_real()'::regprocedure) into v_original;
 if position(v_old in v_original)=0 then
  raise exception 'La función COBRA YA cambió. No se aplicó la modificación de activación.';
 end if;
 execute replace(v_original,v_old,v_replacement);
end
$rewrite$;

create or replace function public.mc_activate_real_wallet_v193(p_request uuid)
returns timestamptz
language plpgsql security definer set search_path=''
as $body$
declare
 v_uid uuid:=(select auth.uid());
 v_acct public.mc_accounts%rowtype;
 v_existing public.mc_subscription_events%rowtype;
 v_until timestamptz;
begin
 if v_uid is null or p_request is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 perform public.mc_ensure_account();
 select * into v_existing from public.mc_subscription_events where request_id=p_request for update;
 if found then
  if v_existing.reseller_id<>v_uid or v_existing.paid_with<>'VERIFIED_REAL' or v_existing.amount_pen<>15 then
   raise exception 'Referencia de operación ya utilizada por otra suscripción';
  end if;
  return v_existing.active_until;
 end if;
 select * into v_acct from public.mc_accounts where user_id=v_uid for update;
 if not found or v_acct.suspended then raise exception 'Cuenta no habilitada o suspendida';end if;
 perform cc_internal.cc_wallet_prepare_service(v_uid,'MI_COCHERA',15);
 perform pg_catalog.set_config('cc_audit.kind','SUBSCRIPTION',true);
 perform pg_catalog.set_config('cc_audit.concept','Activación MI COCHERA · 30 días',true);
 perform pg_catalog.set_config('cc_audit.reference','MC-SUB-'||p_request::text,true);
 perform pg_catalog.set_config('cc_audit.payment','MC-SUB-'||p_request::text,true);
 update public.cc_real_service_wallets
 set balance_pen=balance_pen-15,updated_at=now()
 where user_id=v_uid and service='MI_COCHERA' and balance_pen>=15;
 if not found then raise exception 'Saldo real insuficiente: se necesitan S/ 15';end if;
 v_until:=greatest(now(),coalesce(v_acct.subscription_until,now()))+interval '30 days';
 insert into public.cc_real_wallet_spends(user_id,service,kind,amount_pen,reference,description)
 values(v_uid,'MI_COCHERA','SUBSCRIPTION',15,'MC-SUB-'||p_request::text,'Activación o renovación de MI COCHERA por 30 días');
 update public.mc_accounts set subscription_until=v_until where user_id=v_uid;
 insert into public.mc_subscription_events(request_id,reseller_id,paid_with,amount_pen,active_until)
 values(p_request,v_uid,'VERIFIED_REAL',15,v_until);
 return v_until;
end
$body$;

create or replace function public.cc_portal_activate_business_real_v193(
 p_service text,p_request uuid,p_expected_amount_pen numeric
)
returns jsonb
language plpgsql security definer set search_path=''
as $body$
declare
 v_user uuid:=(select auth.uid());
 v_until timestamptz;
 v_period uuid;
begin
 if v_user is null then raise exception 'Inicia sesión antes de activar una membresía' using errcode='42501';end if;
 if p_service not in ('COBRA_YA','MI_COCHERA','MI_ALQUILER') or p_request is null
   or p_expected_amount_pen is distinct from 15 then
  raise exception 'Servicio, solicitud o precio inválidos' using errcode='22023';
 end if;
 if p_service='COBRA_YA' then
  -- Lógica consolidada: vigencia, saldo, auditoría, membresía y referidos.
  v_period:=public.cc_pay_cobra_subscription_real();
  select period_end into v_until from public.cc_cobra_real_access_periods
   where id=v_period and user_id=v_user and status='ACTIVE';
 elsif p_service='MI_COCHERA' then
  v_until:=public.mc_activate_real_wallet_v193(p_request);
 else
  v_until:=public.ma_activate_real_wallet(p_request);
 end if;
 if v_until is null then raise exception 'La activación no fue confirmada';end if;
 return jsonb_build_object('service',p_service,'amount_pen',15,'active_until',v_until,'payment','REAL_WALLET');
end
$body$;

revoke all on function public.mc_activate_real_wallet_v193(uuid) from public,anon;
grant execute on function public.mc_activate_real_wallet_v193(uuid) to authenticated;
revoke all on function public.cc_portal_activate_business_real_v193(text,uuid,numeric) from public,anon;
grant execute on function public.cc_portal_activate_business_real_v193(text,uuid,numeric) to authenticated;
