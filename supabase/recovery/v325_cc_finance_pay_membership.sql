CREATE OR REPLACE FUNCTION public.cc_finance_pay_membership(p_service text, p_request uuid, p_expected_amount_pen numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
declare u uuid:=auth.uid();old cc_internal.finance_membership_payments%rowtype;rate cc_internal.finance_rates%rowtype;biz uuid;member uuid;plan uuid;
 untilv timestamptz;starts timestamptz;finishes timestamptz;parts jsonb;sub uuid;access uuid;spend uuid;pid uuid;inviter uuid;kind text;result jsonb;
begin
 if u is null or p_request is null then raise exception 'Inicia sesión y confirma el pago' using errcode='42501';end if;
 if p_service not in ('COBRA_YA','MI_COCHERA','MI_ALQUILER','STREAM_BULLS') then raise exception 'Servicio inválido';end if;
 perform pg_advisory_xact_lock(hashtextextended('CC-FINANCE-V320',0));
 select * into old from cc_internal.finance_membership_payments where request_id=p_request;
 if found then
  if old.user_id<>u or old.service<>p_service or old.amount_pen is distinct from p_expected_amount_pen then raise exception 'Referencia utilizada con otros datos' using errcode='42501';end if;
  return jsonb_build_object('payment_id',old.id,'service',old.service,'amount_pen',old.amount_pen,'active_until',old.period_end,'status',old.status,'already_processed',true);
 end if;
 if exists(select 1 from public.cc_portal_stream_memberships_paid where checkout_key=p_request) then
  if p_service<>'STREAM_BULLS' or not exists(select 1 from public.cc_portal_stream_memberships_paid where checkout_key=p_request and user_id=u and amount_pen=p_expected_amount_pen) then raise exception 'Referencia anual histórica ya utilizada' using errcode='42501';end if;
  return (select jsonb_build_object('service','STREAM_BULLS','amount_pen',amount_pen,'active_until',ends_at,'membership_id',membership_id,'subscription_id',subscription_id,'already_processed',true) from public.cc_portal_stream_memberships_paid where checkout_key=p_request);
 end if;
 select * into rate from cc_internal.finance_rates where service=p_service order by id desc limit 1 for share;
 if rate.amount_pen is distinct from p_expected_amount_pen then raise exception 'La tarifa cambió. Actualiza y confirma de nuevo';end if;
 select id into strict biz from public.cc_businesses where code=p_service;
 select id into member from public.cc_memberships where user_id=u and business_id=biz for update;
 if exists(select 1 from public.cc_memberships where id=member and status='SUSPENDED') then raise exception 'Membresía suspendida';end if;
 if p_service='MI_COCHERA' then
  insert into public.mc_accounts(user_id) values(u) on conflict(user_id) do nothing;
  select subscription_until into untilv from public.mc_accounts where user_id=u and not suspended for update;
  if not found then raise exception 'Cuenta suspendida';end if;
 elsif p_service='MI_ALQUILER' then
  insert into public.ma_accounts(user_id) values(u) on conflict(user_id) do nothing;
  select subscription_until into untilv from public.ma_accounts where user_id=u and not suspended for update;
  if not found then raise exception 'Cuenta suspendida';end if;
 elsif p_service='COBRA_YA' then
  select max(period_end) into untilv from public.cc_cobra_real_access_periods where user_id=u and status='ACTIVE';
 else
  select max(end_at) into untilv from public.cc_subscriptions where membership_id=member and status='ACTIVE';
 end if;
 starts:=greatest(now(),coalesce(untilv,now()));finishes:=((starts at time zone 'America/Lima')+case when p_service='STREAM_BULLS' then interval '1 year' else interval '1 month' end) at time zone 'America/Lima';
 kind:=case when untilv is null then 'ACTIVATION' else 'RENEWAL' end;
 perform cc_internal.finance_collect_debt(u);
 parts:=cc_internal.cc_portal_charge_unified(u,rate.amount_pen,'SUBSCRIPTION','MONTH-'||p_request::text,(case when p_service='STREAM_BULLS' then 'Membresía anual ' else 'Membresía mensual ' end)||p_service);
 select id into spend from public.cc_real_wallet_spends where reference like 'PORTAL-MONTH-'||p_request::text||'-%' order by id limit 1;
 if member is null then
  insert into public.cc_memberships(user_id,business_id,role,status,activated_at) values(u,biz,'RESELLER','ACTIVE',now()) returning id into member;
 else
  update public.cc_memberships set status='ACTIVE',role=case when role='AFFILIATE' then 'RESELLER' else role end,activated_at=coalesce(activated_at,now()) where id=member;
 end if;
 if p_service='STREAM_BULLS' then
  select id into plan from public.cc_plans where business_id=biz and code='STREAM_365';
  insert into public.cc_subscriptions(membership_id,plan_id,status,start_at,end_at) values(member,plan,'ACTIVE',starts,finishes) returning id into sub;
 elsif p_service='COBRA_YA' then
  insert into public.cc_cobra_real_access_periods(user_id,spend_id,kind,period_start,period_end,amount_pen)
  values(u,spend,case when kind='ACTIVATION' then 'INITIAL' else 'RENEWAL' end,starts,finishes,rate.amount_pen) returning id into access;
 elsif p_service='MI_COCHERA' then
  update public.mc_accounts set subscription_until=finishes where user_id=u;
  insert into public.mc_subscription_events(request_id,reseller_id,paid_with,amount_pen,active_until) values(p_request,u,'VERIFIED_REAL',rate.amount_pen,finishes);
 else
  update public.ma_accounts set subscription_until=finishes where user_id=u;
  insert into public.ma_subscription_events(request_id,reseller_id,funding,amount_pen,active_until) values(p_request,u,'REAL_WALLET',rate.amount_pen,finishes);
 end if;
 insert into cc_internal.finance_membership_payments(request_id,user_id,service,rate_id,amount_pen,kind,period_start,period_end,previous_until,subscription_id,access_id,wallet_parts)
 values(p_request,u,p_service,rate.id,rate.amount_pen,kind,starts,finishes,untilv,sub,access,parts) returning id into pid;
 -- Atribución CLAN existente y única: no concede bonos al registrarse o recargar.
 select a.inviter_user_id into inviter from public.cc_clan_attributions a join auth.users au on au.id=a.inviter_user_id
 where a.referred_user_id=u and a.inviter_user_id<>u
 and not exists(select 1 from public.cc_memberships m where m.user_id=a.inviter_user_id and m.status='SUSPENDED');
 if inviter is not null then
  insert into cc_internal.finance_referral_bonuses(payment_id,beneficiary_id,referred_id) values(pid,inviter,u);
  insert into public.cc_real_service_wallets(user_id,service,balance_pen) values(inviter,'STREAM_BULLS',0) on conflict(user_id,service) do nothing;
  perform cc_internal.finance_set_audit('BONUS','Bono recurrente por mensualidad de referido','V320-BONUS-'||pid::text,'MONTH-'||p_request::text,u,null,null);
  update public.cc_real_service_wallets set balance_pen=balance_pen+5,updated_at=now() where user_id=inviter and service='STREAM_BULLS';
  insert into cc_internal.finance_events(actor_id,user_id,event,reference,amount_pen,details) values(u,inviter,'REFERRAL_BONUS',pid::text,5,jsonb_build_object('service',p_service,'referred_id',u,'kind',kind));
  perform cc_internal.finance_collect_debt(inviter);
 end if;
 insert into cc_internal.finance_events(actor_id,user_id,event,reference,amount_pen,details) values(u,u,'MEMBERSHIP_PAYMENT',pid::text,rate.amount_pen,jsonb_build_object('service',p_service,'kind',kind));
 perform cc_internal.finance_audit_clear();
 return jsonb_build_object('payment_id',pid,'service',p_service,'amount_pen',rate.amount_pen,'active_until',finishes,'membership_id',member,'subscription_id',sub,'already_processed',false);
end;$function$
