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
 -- Evitar que otra activación en la misma transacción reutilice la referencia de auditoría.
 perform pg_catalog.set_config('cc_audit.kind','',true);
 perform pg_catalog.set_config('cc_audit.concept','',true);
 perform pg_catalog.set_config('cc_audit.reference','',true);
 perform pg_catalog.set_config('cc_audit.payment','',true);
 return v_until;
end
$body$;

