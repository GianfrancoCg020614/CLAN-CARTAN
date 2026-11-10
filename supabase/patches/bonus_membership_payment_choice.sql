-- Bonus-only membership activation. No real wallet writes.
-- Deploy together with the client selection; do not enable without reviewing existing grants.
create table if not exists public.cc_bonus_membership_payments (
 request_id uuid primary key,
 user_id uuid not null references auth.users(id),
 service text not null check (service in ('COBRA_YA','MI_COCHERA','MI_ALQUILER')),
 amount_pen numeric(12,2) not null check(amount_pen>0),
 period_start timestamptz not null,
 period_end timestamptz not null,
 created_at timestamptz not null default now(),
 unique(user_id,service,request_id)
);
alter table public.cc_bonus_membership_payments enable row level security;
revoke all on public.cc_bonus_membership_payments from anon,authenticated;
create or replace function public.cc_bonus_membership_balance()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'Inicia sesión' using errcode='42501'; end if;
 return jsonb_build_object(
 'COBRA_YA',(select coalesce(balance_pen,0) from public.cc_cobra_welcome_bonus_wallets where user_id=u),
 'MI_COCHERA',(select coalesce(bonus_pen,0) from public.mc_accounts where user_id=u),
 'MI_ALQUILER',(select coalesce(bonus_pen,0) from public.ma_accounts where user_id=u));
end $$;
revoke all on function public.cc_bonus_membership_balance() from public,anon;
grant execute on function public.cc_bonus_membership_balance() to authenticated;

create or replace function public.cc_bonus_activate_membership(
 p_service text,p_request uuid,p_expected_amount_pen numeric,p_recipient uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();u uuid; rate numeric; biz uuid; member uuid; previous_end timestamptz; starts timestamptz; finishes timestamptz; previous public.cc_bonus_membership_payments%rowtype; remaining numeric; is_admin boolean;
begin
 if actor is null or p_request is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 is_admin:=exists(select 1 from public.cc_admins where user_id=actor);
 u:=coalesce(p_recipient,actor);
 if u<>actor and not is_admin then raise exception 'No autorizado' using errcode='42501';end if;
 if p_service not in ('COBRA_YA','MI_COCHERA','MI_ALQUILER') or p_expected_amount_pen is null or p_expected_amount_pen<=0 then raise exception 'Servicio inválido';end if;
 -- Serialize with all real-money membership activations and renewals.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC-FINANCE-V320',0));
 select * into previous from public.cc_bonus_membership_payments where request_id=p_request;
 if found then
  if previous.user_id<>u or previous.service<>p_service or previous.amount_pen<>p_expected_amount_pen then raise exception 'Referencia reutilizada' using errcode='42501';end if;
  return jsonb_build_object('service',p_service,'amount_pen',previous.amount_pen,'active_until',previous.period_end,'already_processed',true,'funding','BONUS');
 end if;
 if exists(select 1 from cc_internal.finance_membership_payments where request_id=p_request) or exists(select 1 from public.cc_portal_stream_memberships_paid where checkout_key=p_request) then raise exception 'Referencia utilizada en otro pago';end if;
 select amount_pen into rate from cc_internal.finance_rates where service=p_service order by id desc limit 1;
 if rate is null or rate is distinct from p_expected_amount_pen then raise exception 'La tarifa cambió. Actualiza la página';end if;
 select id into biz from public.cc_businesses where code=p_service;
 if biz is null then raise exception 'Negocio inexistente';end if;
 select id into member from public.cc_memberships where user_id=u and business_id=biz for update;
 if exists(select 1 from public.cc_memberships where id=member and status='SUSPENDED') then raise exception 'Membresía suspendida';end if;
 if p_service='MI_COCHERA' then
  insert into public.mc_accounts(user_id) values(u) on conflict(user_id) do nothing;
  select subscription_until,bonus_pen into previous_end,remaining from public.mc_accounts where user_id=u and not suspended for update;
  if not found then raise exception 'Cuenta suspendida';end if;
 elsif p_service='MI_ALQUILER' then
  insert into public.ma_accounts(user_id) values(u) on conflict(user_id) do nothing;
  select subscription_until,bonus_pen into previous_end,remaining from public.ma_accounts where user_id=u and not suspended for update;
  if not found then raise exception 'Cuenta suspendida';end if;
 else
  insert into public.cc_cobra_welcome_bonus_wallets(user_id,balance_pen) values(u,0) on conflict(user_id) do nothing;
  select balance_pen into remaining from public.cc_cobra_welcome_bonus_wallets where user_id=u for update;
  select max(period_end) into previous_end from public.cc_cobra_real_access_periods where user_id=u and status='ACTIVE';
  previous_end:=greatest(previous_end,(select max(period_end) from public.cc_cobra_welcome_bonus_activations where user_id=u));
 end if;
 if coalesce(remaining,0)<rate then raise exception 'Bono insuficiente';end if;
 starts:=greatest(pg_catalog.clock_timestamp(),coalesce(previous_end,pg_catalog.clock_timestamp()));
 finishes:=((starts at time zone 'America/Lima')+interval '1 month') at time zone 'America/Lima';
 if p_service='MI_COCHERA' then
  update public.mc_accounts set bonus_pen=bonus_pen-rate,subscription_until=finishes where user_id=u;
  insert into public.mc_subscription_events(request_id,reseller_id,paid_with,amount_pen,active_until) values(p_request,u,'BONUS',rate,finishes);
 elsif p_service='MI_ALQUILER' then
  update public.ma_accounts set bonus_pen=bonus_pen-rate,subscription_until=finishes where user_id=u;
  insert into public.ma_subscription_events(request_id,reseller_id,funding,amount_pen,active_until) values(p_request,u,'BONUS',rate,finishes);
 else
  update public.cc_cobra_welcome_bonus_wallets set balance_pen=balance_pen-rate,updated_at=now() where user_id=u;
  insert into public.cc_cobra_welcome_bonus_activations(user_id,amount_pen,period_start,period_end) values(u,rate,starts,finishes);
 end if;
 if member is null then
  insert into public.cc_memberships(user_id,business_id,role,status,activated_at) values(u,biz,'RESELLER','ACTIVE',now());
 else
  update public.cc_memberships set status='ACTIVE',role=case when role='AFFILIATE' then 'RESELLER' else role end,activated_at=coalesce(activated_at,now()) where id=member;
 end if;
 insert into public.cc_bonus_membership_payments(request_id,user_id,service,amount_pen,period_start,period_end) values(p_request,u,p_service,rate,starts,finishes);
 return jsonb_build_object('service',p_service,'amount_pen',rate,'active_until',finishes,'already_processed',false,'funding','BONUS');
end $$;
revoke all on function public.cc_bonus_activate_membership(text,uuid,numeric,uuid) from public,anon;
grant execute on function public.cc_bonus_activate_membership(text,uuid,numeric,uuid) to authenticated;
