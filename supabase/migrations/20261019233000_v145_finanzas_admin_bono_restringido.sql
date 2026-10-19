-- V145 - reconstrucción de reglas comerciales y panel ADMIN desde esquema V142.
-- No acredita saldos ni toca registros existentes. Ejecutar después de migraciones V142.
create table if not exists public.cc_admin_promo_grants (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 admin_id uuid not null references auth.users(id),
 recipient_id uuid not null references auth.users(id),
 service text not null check(service in ('COBRA_YA','STREAM_BULLS')),
 amount_pen numeric(14,2) not null check(amount_pen>0 and amount_pen<=1000),
 reason text not null, created_at timestamptz not null default now()
);
create table if not exists public.cc_cobra_welcome_bonus_wallets(
 user_id uuid primary key references auth.users(id),
 balance_pen numeric(14,2) not null default 0 check(balance_pen>=0),
 updated_at timestamptz not null default now()
);
create table if not exists public.cc_cobra_welcome_bonus_activations(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),
 amount_pen numeric(14,2) not null check(amount_pen=15),
 period_start timestamptz not null,period_end timestamptz not null,
 created_at timestamptz not null default now()
);
alter table public.cc_admin_promo_grants enable row level security;
alter table public.cc_cobra_welcome_bonus_wallets enable row level security;
alter table public.cc_cobra_welcome_bonus_activations enable row level security;
revoke all on public.cc_admin_promo_grants,public.cc_cobra_welcome_bonus_wallets,public.cc_cobra_welcome_bonus_activations from public,anon,authenticated;
grant select on public.cc_admin_promo_grants,public.cc_cobra_welcome_bonus_wallets,public.cc_cobra_welcome_bonus_activations to authenticated;
drop policy if exists cc_promo_own_read on public.cc_admin_promo_grants;
create policy cc_promo_own_read on public.cc_admin_promo_grants for select to authenticated
using(recipient_id=(select auth.uid()) or exists(select 1 from public.cc_admins where user_id=(select auth.uid())));
drop policy if exists cc_cobra_welcome_balance_owner on public.cc_cobra_welcome_bonus_wallets;
create policy cc_cobra_welcome_balance_owner on public.cc_cobra_welcome_bonus_wallets for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists cc_welcome_activation_own on public.cc_cobra_welcome_bonus_activations;
create policy cc_welcome_activation_own on public.cc_cobra_welcome_bonus_activations for select to authenticated using(user_id=(select auth.uid()));

-- cc_internal.cobra_entitled
CREATE OR REPLACE FUNCTION cc_internal.cobra_entitled(p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select exists(select 1 from public.cc_memberships m join public.cc_businesses b on b.id=m.business_id where m.user_id=p_user and b.code='COBRA_YA' and m.status='ACTIVE')
and (
 exists(select 1 from public.cy_access_periods p where p.user_id=p_user and p.starts_at<=now() and p.ends_at>now())
 or exists(select 1 from public.cc_cobra_real_access_periods r where r.user_id=p_user and r.status='ACTIVE' and r.period_start<=now() and r.period_end>now())
 or exists(select 1 from public.cc_cobra_welcome_bonus_activations w where w.user_id=p_user and w.period_start<=now() and w.period_end>now())
);$function$
;

-- cc_internal.require_cobra_payment_for_approval
CREATE OR REPLACE FUNCTION cc_internal.require_cobra_payment_for_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if new.status='ACTIVE' and old.status is distinct from 'ACTIVE'
 and exists(select 1 from public.cc_businesses b where b.id=new.business_id and b.code='COBRA_YA')
 and not exists(select 1 from public.cy_access_periods p where p.user_id=new.user_id and p.starts_at<=now() and p.ends_at>now())
 and not exists(select 1 from public.cc_cobra_real_access_periods r where r.user_id=new.user_id and r.status='ACTIVE' and r.period_start<=now() and r.period_end>now())
 and not exists(select 1 from public.cc_cobra_welcome_bonus_activations a where a.user_id=new.user_id and a.period_start<=now() and a.period_end>now())
 then raise exception 'No se puede activar: no existe suscripción vigente'; end if;
 return new;
end $function$
;

-- public.cc_activate_cobra_welcome_bonus
CREATE OR REPLACE FUNCTION public.cc_activate_cobra_welcome_bonus()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_member public.cc_memberships%rowtype;v_business uuid;v_id uuid;v_enabled boolean;
begin
 if v_user is null then raise exception 'Inicia sesión';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text||':CY_MONTHLY_V113',0));
 select id into v_business from public.cc_businesses where code='COBRA_YA';
 select * into v_member from public.cc_memberships where user_id=v_user and business_id=v_business for update;
 if v_member.id is null or v_member.role<>'RESELLER' or v_member.status='SUSPENDED' then raise exception 'Se requiere RESELLER COBRA YA elegible';end if;
 if exists(select 1 from public.cy_access_periods where user_id=v_user and starts_at<=now() and ends_at>now())
 or exists(select 1 from public.cc_cobra_real_access_periods where user_id=v_user and status='ACTIVE' and period_start<=now() and period_end>now())
 or exists(select 1 from public.cc_cobra_welcome_bonus_activations where user_id=v_user and period_start<=now() and period_end>now())
 then raise exception 'Ya tienes una activación vigente';end if;
 update public.cc_cobra_welcome_bonus_wallets set balance_pen=balance_pen-15,updated_at=now()
 where user_id=v_user and balance_pen>=15;
 if not found then raise exception 'Bono disponible insuficiente: se requiere S/15';end if;
 insert into public.cc_cobra_welcome_bonus_activations(user_id,amount_pen,period_start,period_end)
 values(v_user,15,now(),now()+interval '30 days') returning id into v_id;
 update public.cc_memberships set status='ACTIVE',activated_at=coalesce(activated_at,now())
 where id=v_member.id and status in ('ACTIVE','PENDING','EXPIRED');
 return v_id;
end $function$
;

-- public.cc_admin_financial_events
CREATE OR REPLACE FUNCTION public.cc_admin_financial_events(p_before_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_limit integer DEFAULT 40)
 RETURNS TABLE(recorded_at timestamp with time zone, record_type text, service text, user_id uuid, amount_pen numeric, reference text, description text, operator_id uuid, status text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not exists(select 1 from public.cc_admins where cc_admins.user_id=auth.uid()) then
  raise exception 'Solo ADMIN';
 end if;
 return query
 select z.recorded_at,z.record_type,z.service,z.user_id,z.amount_pen,z.reference,z.description,z.operator_id,z.status
 from (
  select l.created_at recorded_at,'RECHARGE_VERIFIED'::text record_type,l.service,l.user_id,l.amount_pen,
         l.provider_transaction_id::text reference,('Recarga recibida · '||l.provider)::text description,
         null::uuid operator_id,'CONFIRMED'::text status
  from public.cc_real_wallet_ledger l
  union all
  select g.created_at,'WELCOME_BONUS',g.service,g.recipient_id,g.amount_pen,
         g.request_id::text,g.reason,g.admin_id,'GRANTED'
  from public.cc_admin_promo_grants g
  union all
  select a.created_at,'WELCOME_ACTIVATION','COBRA_YA',a.user_id,-a.amount_pen,
         a.id::text,'Activación con bono restringido',a.user_id,'CONSUMED'
  from public.cc_cobra_welcome_bonus_activations a
  union all
  select s.created_at,'SERVICE_CONSUMPTION',s.service,s.user_id,-s.amount_pen,
         s.reference,s.description,s.user_id,'CONFIRMED'
  from public.cc_real_wallet_spends s
  union all
  select f.created_at,'SERVICE_REFUND',f.service,f.user_id,f.amount_pen,
         f.reference,coalesce(f.reason,'Reembolso'),null::uuid,'REFUNDED'
  from public.cc_real_wallet_refunds f
 ) z
 where p_before_at is null or z.recorded_at<p_before_at
 order by z.recorded_at desc,z.reference desc
 limit least(greatest(coalesce(p_limit,40),1),100);
end $function$
;

-- public.cc_admin_financial_summary
CREATE OR REPLACE FUNCTION public.cc_admin_financial_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.cc_admins where user_id=auth.uid()) then raise exception 'Solo ADMIN'; end if;
 select jsonb_build_object(
  'cash_received_pen',coalesce((select sum(amount_pen) from public.cc_real_wallet_ledger),0),
  'free_bonus_granted_pen',coalesce((select sum(amount_pen) from public.cc_admin_promo_grants),0),
  'free_bonus_available_pen',coalesce((select sum(balance_pen) from public.cc_cobra_welcome_bonus_wallets),0),
  'free_bonus_consumed_pen',coalesce((select sum(amount_pen) from public.cc_cobra_welcome_bonus_activations),0),
  'paid_service_consumption_pen',coalesce((select sum(amount_pen) from public.cc_real_wallet_spends),0),
  'refunded_service_pen',coalesce((select sum(amount_pen) from public.cc_real_wallet_refunds),0),
  'real_wallet_liability_pen',coalesce((select sum(balance_pen) from public.cc_real_service_wallets),0),
  'explanation','Recargas verificadas son efectivo recibido, no ganancia neta. Bonos son promocionales; sin facturación tributaria automática.'
 ) into result;
 return result;
end $function$
;

-- public.cc_admin_grant_welcome_balance
CREATE OR REPLACE FUNCTION public.cc_admin_grant_welcome_balance(p_recipient_email text, p_service text, p_amount_pen numeric, p_request_id uuid, p_reason text DEFAULT 'Bono de bienvenida gratuito'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_admin uuid:=auth.uid(); v_recipient uuid; v_balance numeric; v_reason text:=trim(coalesce(p_reason,''));
begin
 if v_admin is null or not exists(select 1 from public.cc_admins where user_id=v_admin) then raise exception 'Solo ADMIN'; end if;
 if p_service is distinct from 'COBRA_YA' then raise exception 'Bono exclusivo de COBRA YA'; end if;
 if p_request_id is null or p_amount_pen is null or p_amount_pen<=0 or p_amount_pen>1000 or p_amount_pen<>round(p_amount_pen,2) then raise exception 'Solicitud inválida'; end if;
 if length(v_reason) not between 5 and 180 then raise exception 'Motivo obligatorio'; end if;
 select id into v_recipient from auth.users where lower(email)=lower(trim(p_recipient_email)) and email_confirmed_at is not null;
 if v_recipient is null or v_recipient=v_admin then raise exception 'Destinatario inválido'; end if;
 if not exists(select 1 from public.cc_memberships m join public.cc_businesses b on b.id=m.business_id where m.user_id=v_recipient and b.code='COBRA_YA' and m.role='RESELLER') then raise exception 'Solo RESELLER de COBRA YA'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC:PROMO:'||v_recipient::text,0));
 if exists(select 1 from public.cc_admin_promo_grants where request_id=p_request_id) then raise exception 'Referencia duplicada'; end if;
 insert into public.cc_admin_promo_grants(request_id,admin_id,recipient_id,service,amount_pen,reason) values(p_request_id,v_admin,v_recipient,'COBRA_YA',p_amount_pen,v_reason);
 insert into public.cc_cobra_welcome_bonus_wallets(user_id,balance_pen) values(v_recipient,p_amount_pen)
 on conflict(user_id) do update set balance_pen=public.cc_cobra_welcome_bonus_wallets.balance_pen+excluded.balance_pen,updated_at=now()
 returning balance_pen into v_balance;
 return v_balance;
end $function$
;

-- public.cc_admin_wallet_financial_audit
CREATE OR REPLACE FUNCTION public.cc_admin_wallet_financial_audit(p_before_id bigint DEFAULT NULL::bigint, p_limit integer DEFAULT 40)
 RETURNS SETOF cc_wallet_financial_audit
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.cc_admins a where a.user_id=auth.uid()) then
   raise exception 'Solo ADMIN';
 end if;
 return query
 select a.* from public.cc_wallet_financial_audit a
 where p_before_id is null or a.id<p_before_id
 order by a.id desc limit least(greatest(coalesce(p_limit,40),1),100);
end $function$
;

-- public.cc_cobra_checkout_status
CREATE OR REPLACE FUNCTION public.cc_cobra_checkout_status()
 RETURNS TABLE(enabled boolean, price_pen numeric, bonus_activation_pen numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(s.enabled,false),coalesce(s.subscription_pen,15.00),15::numeric
 from public.cc_cobra_real_payment_settings s
 where s.id=true and (select auth.uid()) is not null;
$function$
;

-- public.cy_subscription_status
CREATE OR REPLACE FUNCTION public.cy_subscription_status()
 RETURNS TABLE(authorized boolean, active boolean, balance_test numeric, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
select exists(select 1 from public.cc_memberships m join public.cc_businesses b on b.id=m.business_id where m.user_id=auth.uid() and m.status='ACTIVE' and b.code='COBRA_YA'),
 (exists(select 1 from public.cy_access_periods p where p.user_id=auth.uid() and p.starts_at<=now() and p.ends_at>now())
 or exists(select 1 from public.cc_cobra_real_access_periods r where r.user_id=auth.uid() and r.status='ACTIVE' and r.period_start<=now() and r.period_end>now())
 or exists(select 1 from public.cc_cobra_welcome_bonus_activations w where w.user_id=auth.uid() and w.period_start<=now() and w.period_end>now())),
 coalesce((select w.balance_test from public.cc_service_wallets w where w.user_id=auth.uid() and w.service='COBRA_YA'),0)::numeric,
 (select max(z.e) from (select ends_at as e from public.cy_access_periods where user_id=auth.uid() union all select period_end from public.cc_cobra_real_access_periods where user_id=auth.uid() and status='ACTIVE' union all select period_end from public.cc_cobra_welcome_bonus_activations where user_id=auth.uid()) z);
$function$
;

revoke all on function public.cc_admin_grant_welcome_balance(text,text,numeric,uuid,text) from public,anon;
grant execute on function public.cc_admin_grant_welcome_balance(text,text,numeric,uuid,text) to authenticated;
revoke all on function public.cc_activate_cobra_welcome_bonus() from public,anon;
grant execute on function public.cc_activate_cobra_welcome_bonus() to authenticated;
revoke all on function public.cc_admin_financial_summary() from public,anon;
grant execute on function public.cc_admin_financial_summary() to authenticated;
revoke all on function public.cc_admin_financial_events(timestamptz,integer) from public,anon;
grant execute on function public.cc_admin_financial_events(timestamptz,integer) to authenticated;
revoke all on function public.cc_admin_wallet_financial_audit(bigint,integer) from public,anon;
grant execute on function public.cc_admin_wallet_financial_audit(bigint,integer) to authenticated;
revoke all on function public.cc_cobra_checkout_status() from public,anon;
grant execute on function public.cc_cobra_checkout_status() to authenticated;
-- Los registros TEST anteriores se conservan; sus RPC económicas dejan de estar disponibles.
revoke all on function public.cy_pay_subscription_test() from public,anon,authenticated;
revoke all on function public.sb_pay_affiliation_test() from public,anon,authenticated;
revoke all on function public.cc_transfer_test_balance(text,text,numeric) from public,anon,authenticated;
revoke all on function public.cc_admin_test_credit(text,numeric,uuid) from public,anon,authenticated;
revoke all on function public.cc_request_test_topup(text,numeric) from public,anon,authenticated;
revoke all on function public.cc_admin_review_test_topup(uuid,boolean) from public,anon,authenticated;
-- No habilitar banderas de pagos de proveedor sin comprobación comercial.
