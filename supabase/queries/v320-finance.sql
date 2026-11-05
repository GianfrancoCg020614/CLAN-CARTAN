-- V320: reglas nuevas sobre saldo y operaciones existentes. No migra ni duplica dinero.
create table cc_internal.finance_rates(
 id bigint generated always as identity primary key, service text not null check(service in ('COBRA_YA','MI_COCHERA','MI_ALQUILER','STREAM_BULLS')),
 amount_pen numeric(14,2) not null check(amount_pen>0 and amount_pen<=10000),
 actor_id uuid references auth.users(id),reason text not null,created_at timestamptz not null default now()
);
insert into cc_internal.finance_rates(service,amount_pen,reason) values
 ('COBRA_YA',20,'Tarifa mensual V320'),('MI_COCHERA',20,'Tarifa mensual V320'),('MI_ALQUILER',20,'Tarifa mensual V320'),('STREAM_BULLS',25,'Tarifa mensual V320');
create index finance_rates_service on cc_internal.finance_rates(service,id desc);
create table cc_internal.finance_membership_payments(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,user_id uuid not null references auth.users(id),
 service text not null,rate_id bigint not null references cc_internal.finance_rates(id),amount_pen numeric(14,2) not null check(amount_pen>0),
 kind text not null check(kind in ('ACTIVATION','RENEWAL')),period_start timestamptz not null,period_end timestamptz not null,
 previous_until timestamptz,subscription_id uuid references public.cc_subscriptions(id),access_id uuid,
 wallet_parts jsonb not null,status text not null default 'PAID' check(status in ('PAID','REFUNDED')),
 created_at timestamptz not null default now(),check(period_end>period_start)
);
create index finance_membership_user on cc_internal.finance_membership_payments(user_id,service,created_at desc);
create table cc_internal.finance_referral_bonuses(
 payment_id uuid primary key references cc_internal.finance_membership_payments(id),beneficiary_id uuid not null references auth.users(id),
 referred_id uuid not null references auth.users(id),amount_pen numeric(14,2) not null default 5 check(amount_pen=5),
 recovered_pen numeric(14,2) not null default 0 check(recovered_pen between 0 and 5),
 status text not null default 'CREDITED' check(status in ('CREDITED','REVERSED','REVERSAL_PENDING')),
 created_at timestamptz not null default now(),reversed_at timestamptz,check(beneficiary_id<>referred_id)
);
create index finance_bonus_beneficiary on cc_internal.finance_referral_bonuses(beneficiary_id,status,created_at desc);
create table cc_internal.finance_events(
 id bigint generated always as identity primary key,actor_id uuid references auth.users(id),user_id uuid references auth.users(id),
 event text not null,reference text not null,amount_pen numeric(14,2) not null default 0,details jsonb not null default '{}',created_at timestamptz not null default now()
);
create index finance_events_user on cc_internal.finance_events(user_id,id desc);
create table cc_internal.finance_order_adjustments(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,order_id uuid not null references public.cc_portal_stream_orders(id),
 amount_pen numeric(14,2) not null check(amount_pen>0),commission_pen numeric(14,2) not null check(commission_pen>=0),seller_pen numeric(14,2) not null check(seller_pen>=0),
 reason text not null,actor_id uuid not null references auth.users(id),created_at timestamptz not null default now(),check(amount_pen=commission_pen+seller_pen)
);
create index finance_order_adjustments_order on cc_internal.finance_order_adjustments(order_id);
create table cc_internal.finance_settlements(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,seller_id uuid not null references auth.users(id),
 starts_at timestamptz not null,ends_at timestamptz not null,amount_pen numeric(14,2) not null check(amount_pen>0),
 approved_by uuid not null references auth.users(id),status text not null default 'APPROVED' check(status in ('APPROVED','PARTIAL','PAID','CANCELLED')),
 created_at timestamptz not null default now(),check(ends_at>starts_at)
);
create index finance_settlements_seller on cc_internal.finance_settlements(seller_id,created_at desc);
create table cc_internal.finance_settlement_lines(
 settlement_id uuid not null references cc_internal.finance_settlements(id),order_id uuid not null references public.cc_portal_stream_orders(id),
 amount_pen numeric(14,2) not null check(amount_pen>0),primary key(settlement_id,order_id)
);
create index finance_settlement_lines_order on cc_internal.finance_settlement_lines(order_id);
create table cc_internal.finance_settlement_payments(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,settlement_id uuid not null references cc_internal.finance_settlements(id),
 amount_pen numeric(14,2) not null check(amount_pen>0),method text not null check(method in ('YAPE','PLIN','TRANSFERENCIA')),
 reference text not null,proof_path text not null,actor_id uuid not null references auth.users(id),created_at timestamptz not null default now(),
 unique(method,reference),unique(proof_path)
);
create table cc_internal.finance_membership_refunds(
 payment_id uuid primary key references cc_internal.finance_membership_payments(id),request_id uuid not null unique,
 reason text not null,actor_id uuid not null references auth.users(id),created_at timestamptz not null default now()
);
-- Privado: el navegador solamente llama RPC con identidad/rol comprobados.
do $$declare t text;begin foreach t in array array['finance_rates','finance_membership_payments','finance_referral_bonuses','finance_events','finance_order_adjustments','finance_settlements','finance_settlement_lines','finance_settlement_payments','finance_membership_refunds'] loop
 execute format('alter table cc_internal.%I enable row level security',t);
 execute format('revoke all on cc_internal.%I from public,anon,authenticated',t);
 execute format('create policy service_only on cc_internal.%I to service_role using(true) with check(true)',t);
end loop;end;$$;
create or replace function cc_internal.finance_audit_immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'Los asientos históricos no se editan ni eliminan';end;$$;
create trigger finance_events_immutable before update or delete on cc_internal.finance_events for each row execute function cc_internal.finance_audit_immutable();
create trigger finance_rates_immutable before update or delete on cc_internal.finance_rates for each row execute function cc_internal.finance_audit_immutable();
create trigger finance_adjustments_immutable before update or delete on cc_internal.finance_order_adjustments for each row execute function cc_internal.finance_audit_immutable();
create trigger finance_payments_immutable before update or delete on cc_internal.finance_settlement_payments for each row execute function cc_internal.finance_audit_immutable();
create or replace function cc_internal.finance_admin() returns boolean language sql stable set search_path='' as $$select (select auth.uid()) is not null and exists(select 1 from public.cc_admins where user_id=(select auth.uid()))$$;
create or replace function cc_internal.finance_collect_debt(p_user uuid) returns numeric language plpgsql set search_path='' as $$
#variable_conflict use_column
declare b cc_internal.finance_referral_bonuses%rowtype;w record;take numeric;remaining numeric;total numeric:=0;begin
 for b in select * from cc_internal.finance_referral_bonuses where beneficiary_id=p_user and status='REVERSAL_PENDING' order by created_at,payment_id for update loop
  remaining:=5-b.recovered_pen;
  for w in select * from public.cc_real_service_wallets where user_id=p_user and balance_pen>0 order by service for update loop
   exit when remaining<=0;take:=least(remaining,w.balance_pen);
   perform set_config('cc_audit.kind','BONUS_REVERSAL',true);perform set_config('cc_audit.reference','V320-BONUS-REV-'||b.payment_id::text,true);
   update public.cc_real_service_wallets set balance_pen=balance_pen-take,updated_at=now() where user_id=p_user and service=w.service;
   insert into cc_internal.finance_events(user_id,event,reference,amount_pen) values(p_user,'BONUS_REVERSAL',b.payment_id::text,-take);
   remaining:=remaining-take;total:=total+take;
  end loop;
  update cc_internal.finance_referral_bonuses set recovered_pen=5-remaining,status=case when remaining=0 then 'REVERSED' else 'REVERSAL_PENDING' end,reversed_at=case when remaining=0 then now() else null end where payment_id=b.payment_id;
 end loop;
 perform set_config('cc_audit.kind','',true);perform set_config('cc_audit.reference','',true);return total;
end;$$;
create or replace function public.cc_finance_rates() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 return (select jsonb_agg(to_jsonb(x)) from(select distinct on(service) service,amount_pen,id as rate_id from cc_internal.finance_rates order by service,id desc)x);
end;$$;
-- Amplía importes admisibles sin tocar los cobros históricos de S/15.
alter table public.cc_cobra_real_access_periods drop constraint cc_cobra_real_access_periods_amount_pen_check;
alter table public.cc_cobra_real_access_periods add constraint cc_cobra_real_access_periods_amount_pen_check check(amount_pen>0 and amount_pen<=10000);
alter table public.mc_subscription_events drop constraint mc_subscription_events_amount_pen_check;
alter table public.mc_subscription_events add constraint mc_subscription_events_amount_pen_check check(amount_pen>0 and amount_pen<=10000);
alter table public.ma_subscription_events drop constraint ma_subscription_events_amount_pen_check;
alter table public.ma_subscription_events add constraint ma_subscription_events_amount_pen_check check(amount_pen>0 and amount_pen<=10000);
insert into public.cc_plans(business_id,code,title,billing_type,price_pen,is_active)
select id,'STREAM_MONTHLY','STREAM BULL’S · mensual','MONTHLY',25,true from public.cc_businesses where code='STREAM_BULLS'
on conflict(business_id,code) do nothing;
create or replace function public.cc_finance_pay_membership(p_service text,p_request uuid,p_expected_amount_pen numeric)
returns jsonb language plpgsql security definer set search_path='' as $$
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
 starts:=greatest(now(),coalesce(untilv,now()));finishes:=starts+interval '1 month';
 kind:=case when untilv is null then 'ACTIVATION' else 'RENEWAL' end;
 perform cc_internal.finance_collect_debt(u);
 parts:=cc_internal.cc_portal_charge_unified(u,rate.amount_pen,'SUBSCRIPTION','MONTH-'||p_request::text,'Membresía mensual '||p_service);
 select id into spend from public.cc_real_wallet_spends where reference like 'PORTAL-MONTH-'||p_request::text||'-%' order by id limit 1;
 if member is null then
  insert into public.cc_memberships(user_id,business_id,role,status,activated_at) values(u,biz,'RESELLER','ACTIVE',now()) returning id into member;
 else
  update public.cc_memberships set status='ACTIVE',role=case when role='AFFILIATE' then 'RESELLER' else role end,activated_at=coalesce(activated_at,now()) where id=member;
 end if;
 if p_service='STREAM_BULLS' then
  select id into plan from public.cc_plans where business_id=biz and code='STREAM_MONTHLY';
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
  perform set_config('cc_audit.kind','BONUS',true);perform set_config('cc_audit.reference','V320-BONUS-'||pid::text,true);perform set_config('cc_audit.referred',u::text,true);
  update public.cc_real_service_wallets set balance_pen=balance_pen+5,updated_at=now() where user_id=inviter and service='STREAM_BULLS';
  insert into cc_internal.finance_events(actor_id,user_id,event,reference,amount_pen,details) values(u,inviter,'REFERRAL_BONUS',pid::text,5,jsonb_build_object('service',p_service,'referred_id',u,'kind',kind));
  perform cc_internal.finance_collect_debt(inviter);
 end if;
 insert into cc_internal.finance_events(actor_id,user_id,event,reference,amount_pen,details) values(u,u,'MEMBERSHIP_PAYMENT',pid::text,rate.amount_pen,jsonb_build_object('service',p_service,'kind',kind));
 perform set_config('cc_audit.kind','',true);perform set_config('cc_audit.reference','',true);perform set_config('cc_audit.referred','',true);
 return jsonb_build_object('payment_id',pid,'service',p_service,'amount_pen',rate.amount_pen,'active_until',finishes,'membership_id',member,'subscription_id',sub,'already_processed',false);
end;$$;
-- Compatibilidad: entradas anteriores pasan por la misma operación mensual.
create or replace function public.cc_portal_activate_business_real_v193(p_service text,p_request uuid,p_expected_amount_pen numeric) returns jsonb language sql security definer set search_path='' as $$select public.cc_finance_pay_membership(p_service,p_request,p_expected_amount_pen)$$;
create or replace function public.cc_portal_buy_stream_membership(p_checkout_key uuid,p_expected_amount_pen numeric) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 if exists(select 1 from public.cc_portal_stream_memberships_paid where checkout_key=p_checkout_key and user_id=auth.uid() and amount_pen=p_expected_amount_pen) then
  return (select jsonb_build_object('membership_id',membership_id,'subscription_id',subscription_id,'ends_at',ends_at,'amount_pen',amount_pen,'already_processed',true) from public.cc_portal_stream_memberships_paid where checkout_key=p_checkout_key and user_id=auth.uid());
 end if;
 raise exception 'El plan futuro es mensual. Actualiza el panel y confirma su precio y duración antes de pagar';end;$$;
create or replace function public.mc_activate_real_wallet_v193(p_request uuid) returns timestamptz language plpgsql security definer set search_path='' as $$begin raise exception 'Abre Negocios en el panel actualizado y confirma la tarifa mensual vigente';end;$$;
create or replace function public.ma_activate_real_wallet(p_request uuid) returns timestamptz language plpgsql security definer set search_path='' as $$begin raise exception 'Abre Negocios en el panel actualizado y confirma la tarifa mensual vigente';end;$$;
-- La entrada COBRA antigua carece de idempotencia/precio autorizado: no debe seguir cobrando S/15.
create or replace function public.cc_pay_cobra_subscription_real() returns uuid language plpgsql security definer set search_path='' as $$begin raise exception 'Actualiza el panel y confirma el precio mensual antes de pagar';end;$$;
-- Se conservan los planes anuales y periodos ya pagados; se añade reconocimiento del mensual.
do $$declare f record;d text;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','cc_internal') and p.proname in('cc_portal_admin_set_super_reseller','cc_portal_admin_accounts_v2','cc_business_access_v316','sb_delivery_is_seller') loop
  d:=pg_get_functiondef(f.oid);d:=regexp_replace(d,'([a-z_]+\.code)\s*=\s*''STREAM_365''','\1 in (''STREAM_365'',''STREAM_MONTHLY'')','g');d:=replace(d,'Primero debe pagar y activar el plan anual STREAM_365','Primero debe pagar una membresía STREAM BULL’S vigente');execute d;
 end loop;
end;$$;
create or replace function cc_internal.finance_commission_history() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='INSERT' or new.admin_percent is distinct from old.admin_percent then
 insert into cc_internal.finance_events(actor_id,user_id,event,reference,details) values(auth.uid(),new.user_id,'COMMISSION_CHANGED',new.user_id::text,jsonb_build_object('before',case when tg_op='UPDATE' then old.admin_percent else null end,'after',new.admin_percent));end if;return new;end;$$;
create trigger finance_commission_changed after insert or update of admin_percent on public.cc_portal_super_resellers for each row execute function cc_internal.finance_commission_history();
-- Snapshot del descuento: no se inventan precios originales para pedidos históricos.
alter table public.cc_portal_stream_orders add column listed_price_pen numeric(14,2),add column discount_pen numeric(14,2);
create or replace function cc_internal.finance_order_price_snapshot() returns trigger language plpgsql security definer set search_path='' as $$begin
 select greatest(price_pen,new.price_pen) into new.listed_price_pen from public.cc_portal_stream_products where id=new.product_id;
 new.discount_pen:=greatest(coalesce(new.listed_price_pen,new.price_pen)-new.price_pen,0);return new;end;$$;
create trigger finance_order_price before insert on public.cc_portal_stream_orders for each row execute function cc_internal.finance_order_price_snapshot();
revoke all on function cc_internal.finance_order_price_snapshot() from public,anon,authenticated;

-- Informe único; las recargas no participan en ventas ni en liquidaciones.
create or replace function cc_internal.finance_sales(p_seller uuid,p_from timestamptz,p_to timestamptz) returns jsonb language sql stable set search_path='' as $$
 with adjustments as(select order_id,sum(amount_pen) refund,sum(commission_pen) fee,sum(seller_pen) supplier from cc_internal.finance_order_adjustments group by order_id),
 batches as(select b.id,b.status,b.amount_pen,coalesce((select sum(p.amount_pen) from cc_internal.finance_settlement_payments p where p.settlement_id=b.id),0) paid from cc_internal.finance_settlements b where b.seller_id=p_seller and b.status<>'CANCELLED'),
 allocated as(select l.order_id,l.amount_pen,least(l.amount_pen,greatest(b.paid-coalesce(sum(l.amount_pen) over(partition by b.id order by l.order_id rows between unbounded preceding and 1 preceding),0),0)) paid from cc_internal.finance_settlement_lines l join batches b on b.id=l.settlement_id),
 allocations as(select order_id,sum(amount_pen) reserved,sum(paid) paid from allocated group by order_id),
 sales as(select o.*,coalesce(a.refund,0) refund,coalesce(a.fee,0) refunded_fee,coalesce(a.supplier,0) refunded_supplier,coalesce(l.reserved,0) reserved,coalesce(l.paid,0) paid,
  case when o.status in('FULFILLED','PAID_AWAITING_DELIVERY') then o.seller_payable_pen-coalesce(a.supplier,0) else 0 end net_supplier,
  case when o.status in('FULFILLED','PAID_AWAITING_DELIVERY') then o.admin_fee_pen-coalesce(a.fee,0) else 0 end net_fee
  from public.cc_portal_stream_orders o left join adjustments a on a.order_id=o.id left join allocations l on l.order_id=o.id where o.seller_id=p_seller),
 ranged as(select * from sales where created_at>=p_from and created_at<p_to)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'created_at',s.created_at,'order_code',s.order_code,'seller',coalesce(sc.code,'CLAN pendiente'),'buyer',coalesce(bc.code,'CLAN pendiente'),'title',s.title,'price_pen',s.price_pen,'listed_price_pen',s.listed_price_pen,'discount_pen',s.discount_pen,'adjustments_pen',s.refund,'net_pen',case when s.status in('REFUNDED','DISPUTED') then 0 else s.price_pen-s.refund end,'admin_percent',s.admin_percent,'commission_pen',s.net_fee,'supplier_pen',s.net_supplier,'status',s.status,'paid_pen',round(s.paid,2),'pending_pen',round(s.net_supplier-s.paid,2),'settlement_status',case when s.net_supplier<=s.paid then 'PAID' when s.paid>0 then 'PARTIAL' when s.reserved>0 then 'APPROVED' else 'PENDING' end) order by s.created_at,s.id) from ranged s left join public.cc_clan_codes sc on sc.user_id=s.seller_id left join public.cc_clan_codes bc on bc.user_id=s.buyer_id),'[]'),
 'totals',jsonb_build_object('sold_pen',coalesce((select sum(price_pen) from ranged),0),'commission_pen',coalesce((select sum(net_fee) from ranged),0),'adjustments_pen',coalesce((select sum(refund) from ranged),0),'supplier_pen',coalesce((select sum(net_supplier) from ranged),0),'paid_pen',round(coalesce((select sum(paid) from ranged),0),2),'pending_pen',round(coalesce((select sum(net_supplier-paid) from ranged),0),2)),
 'approval_available_pen',least(greatest(coalesce((select sum(net_supplier-reserved) from ranged where status='FULFILLED'),0),0),greatest(coalesce((select sum(net_supplier-reserved) from sales),0),0)),
 'global_pending_pen',round(coalesce((select sum(net_supplier-paid) from sales),0),2));
$$;
create or replace function public.cc_finance_report(p_seller uuid,p_from timestamptz,p_to timestamptz) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not cc_internal.finance_admin() then raise exception 'Solo ADMIN' using errcode='42501';end if;
 if p_seller is null or p_from is null or p_to is null or p_to<=p_from or p_to>p_from+interval '366 days' then raise exception 'Selecciona proveedor y un rango de hasta 366 días';end if;
 return cc_internal.finance_sales(p_seller,p_from,p_to);end;$$;
-- Bonos propios y legado COBRA; sin datos privados de otros compradores.
create or replace function public.cc_finance_my_referrals() returns jsonb language plpgsql stable security definer set search_path='' as $$declare u uuid:=auth.uid();begin
 if u is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 return jsonb_build_object('code',(select code from public.cc_clan_codes where user_id=u),'people',(select count(*) from public.cc_clan_attributions where inviter_user_id=u),
 'activations',(select count(*) from cc_internal.finance_referral_bonuses b join cc_internal.finance_membership_payments p on p.id=b.payment_id where b.beneficiary_id=u and p.kind='ACTIVATION'),
 'renewals',(select count(*) from cc_internal.finance_referral_bonuses b join cc_internal.finance_membership_payments p on p.id=b.payment_id where b.beneficiary_id=u and p.kind='RENEWAL'),
 'credited_pen',coalesce((select sum(amount_pen) from cc_internal.finance_referral_bonuses where beneficiary_id=u),0),
 'reversed_pen',coalesce((select sum(recovered_pen) from cc_internal.finance_referral_bonuses where beneficiary_id=u),0),
 'pending_reversal_pen',coalesce((select sum(5-recovered_pen) from cc_internal.finance_referral_bonuses where beneficiary_id=u and status='REVERSAL_PENDING'),0),
 'legacy_cobra_bonus_pen',coalesce((select sum(amount_pen) from public.cc_cobra_referral_bonuses where beneficiary_user_id=u and status='CREDITED'),0),
 'history',coalesce((select jsonb_agg(x order by x.created_at desc) from(select p.id,p.service,p.kind,p.period_start,p.period_end,b.amount_pen,b.status,b.recovered_pen,b.created_at,coalesce(c.code,'CLAN pendiente') referred from cc_internal.finance_referral_bonuses b join cc_internal.finance_membership_payments p on p.id=b.payment_id left join public.cc_clan_codes c on c.user_id=b.referred_id where b.beneficiary_id=u order by b.created_at desc limit 500)x),'[]'));
end;$$;
create or replace function public.cc_finance_admin(p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_column
declare actor uuid:=auth.uid();seller uuid;req uuid;amount numeric;rate numeric;method text;ref text;proof text;reason text;
 payment cc_internal.finance_membership_payments%rowtype;o public.cc_portal_stream_orders%rowtype;b cc_internal.finance_settlements%rowtype;
 r record;sp record;remain numeric;take numeric;fee numeric;beforefee numeric;refundtotal numeric;pid uuid;bid uuid;since timestamptz;untilv timestamptz;report jsonb;line record;result jsonb;inviter uuid;
begin
 if not cc_internal.finance_admin() then raise exception 'Solo ADMIN' using errcode='42501';end if;
 if p_action='overview' then
  return jsonb_build_object('rates',public.cc_finance_rates(),
  'sellers',coalesce((select jsonb_agg(jsonb_build_object('id',r.user_id,'code',coalesce(c.code,'CLAN pendiente'),'admin_percent',r.admin_percent,'enabled',r.enabled) order by c.code) from public.cc_portal_super_resellers r left join public.cc_clan_codes c on c.user_id=r.user_id),'[]'),
  'settlements',coalesce((select jsonb_agg(x order by x.created_at desc) from(select b.*,coalesce((select sum(amount_pen) from cc_internal.finance_settlement_payments where settlement_id=b.id),0) paid_pen from cc_internal.finance_settlements b order by created_at desc limit 200)x),'[]'),
  'payments',coalesce((select jsonb_agg(x order by x.created_at desc) from(select * from cc_internal.finance_settlement_payments order by created_at desc limit 200)x),'[]'),
  'membership_payments',coalesce((select jsonb_agg(x order by x.created_at desc) from(select p.id,c.code,p.service,p.kind,p.amount_pen,p.period_start,p.period_end,p.status,p.created_at from cc_internal.finance_membership_payments p left join public.cc_clan_codes c on c.user_id=p.user_id order by p.created_at desc limit 200)x),'[]'),
  'referrals',coalesce((select jsonb_agg(jsonb_build_object('referrer',ci.code,'referred',cr.code,'recorded_at',a.recorded_at)) from public.cc_clan_attributions a left join public.cc_clan_codes ci on ci.user_id=a.inviter_user_id left join public.cc_clan_codes cr on cr.user_id=a.referred_user_id),'[]'),
  'events',coalesce((select jsonb_agg(x order by x.id desc) from(select * from cc_internal.finance_events order by id desc limit 500)x),'[]'),
  'rate_history',coalesce((select jsonb_agg(x order by x.id desc) from(select * from cc_internal.finance_rates order by id desc limit 100)x),'[]'),
  'summary',jsonb_build_object(
   'recharges_pen',coalesce((select sum(amount_pen) from public.cc_real_wallet_ledger),0)+coalesce((select sum(credited_pen) from public.cc_admin_verified_personal_topups),0),
   'wallet_liability_pen',coalesce((select sum(balance_pen) from public.cc_real_service_wallets),0),
   'audit_balance_difference_pen',(select coalesce(sum(w.balance_pen-coalesce(a.balance_after,0)),0) from public.cc_real_service_wallets w left join lateral(select balance_after from public.cc_wallet_financial_audit where user_id=w.user_id and service=w.service and affects_balance order by id desc limit 1)a on true),
   'membership_income_pen',coalesce((select sum(amount_pen) from cc_internal.finance_membership_payments where status='PAID'),0),
   'legacy_subscription_spends_pen',coalesce((select sum(s.amount_pen) from public.cc_real_wallet_spends s where s.kind='SUBSCRIPTION' and s.reference not like 'PORTAL-MONTH-%'),0),
   'referral_bonuses_pen',coalesce((select sum(amount_pen-recovered_pen) from cc_internal.finance_referral_bonuses),0),
   'pending_bonus_reversals_pen',coalesce((select sum(5-recovered_pen) from cc_internal.finance_referral_bonuses where status='REVERSAL_PENDING'),0),
   'marketplace_sales_pen',coalesce((select sum(price_pen) from public.cc_portal_stream_orders where status in('FULFILLED','PAID_AWAITING_DELIVERY')),0),
   'marketplace_commission_pen',coalesce((select sum(admin_fee_pen) from public.cc_portal_stream_orders where status in('FULFILLED','PAID_AWAITING_DELIVERY')),0)-coalesce((select sum(a.commission_pen) from cc_internal.finance_order_adjustments a join public.cc_portal_stream_orders o on o.id=a.order_id where o.status in('FULFILLED','PAID_AWAITING_DELIVERY')),0),
   'supplier_pending_pen',coalesce((select sum(seller_payable_pen) from public.cc_portal_stream_orders where status in('FULFILLED','PAID_AWAITING_DELIVERY')),0)-coalesce((select sum(a.seller_pen) from cc_internal.finance_order_adjustments a join public.cc_portal_stream_orders o on o.id=a.order_id where o.status in('FULFILLED','PAID_AWAITING_DELIVERY')),0)-coalesce((select sum(amount_pen) from cc_internal.finance_settlement_payments),0),
   'settled_pen',coalesce((select sum(amount_pen) from cc_internal.finance_settlement_payments),0),
   'refunds_pen',coalesce((select sum(amount_pen) from public.cc_real_wallet_refunds),0),
   'membership_bonus_cost_pen',coalesce((select sum(amount_pen) from cc_internal.finance_referral_bonuses where status='CREDITED'),0)));
 end if;
 perform pg_advisory_xact_lock(hashtextextended('CC-FINANCE-V320',0));
 req:=nullif(p_data->>'request_id','')::uuid;
 reason:=trim(coalesce(p_data->>'reason',''));
 if p_action='set_rate' then
  if p_data->>'service' not in('COBRA_YA','MI_COCHERA','MI_ALQUILER','STREAM_BULLS') or length(reason) not between 3 and 160 then raise exception 'Servicio y motivo obligatorios';end if;
  amount:=(p_data->>'amount_pen')::numeric;if amount is null or amount<>round(amount,2) or amount<=0 or amount>10000 then raise exception 'Tarifa inválida';end if;
  insert into cc_internal.finance_rates(service,amount_pen,actor_id,reason) values(p_data->>'service',amount,actor,reason);
  if p_data->>'service'='STREAM_BULLS' then update public.cc_plans set price_pen=amount where code='STREAM_MONTHLY';end if;
  return jsonb_build_object('saved',true);
 elsif p_action='set_commission' then
  seller:=(p_data->>'seller_id')::uuid;rate:=(p_data->>'admin_percent')::numeric;
  if rate is null or rate<0 or rate>100 or rate<>round(rate,2) or length(reason) not between 3 and 160 then raise exception 'Comisión y motivo inválidos';end if;
  update public.cc_portal_super_resellers set admin_percent=rate where user_id=seller;
  if not found then raise exception 'Proveedor no registrado';end if;
  insert into cc_internal.finance_events(actor_id,user_id,event,reference,details) values(actor,seller,'COMMISSION_REASON',seller::text,jsonb_build_object('reason',reason));
  return jsonb_build_object('saved',true);
 elsif p_action='refund_membership' then
  if req is null or length(reason) not between 3 and 160 then raise exception 'Referencia y motivo obligatorios';end if;
  select * into payment from cc_internal.finance_membership_payments where id=(p_data->>'payment_id')::uuid for update;
  if not found then raise exception 'Pago mensual no encontrado';end if;
  if exists(select 1 from cc_internal.finance_membership_refunds where request_id=req and payment_id<>payment.id) then raise exception 'Referencia utilizada';end if;
  if payment.status='REFUNDED' then return jsonb_build_object('already_processed',true);end if;
  -- Evita recortar una renovación posterior: primero devuelve los periodos más recientes.
  if exists(select 1 from cc_internal.finance_membership_payments where user_id=payment.user_id and service=payment.service and status='PAID' and period_end>payment.period_end) then raise exception 'Devuelve primero las renovaciones posteriores';end if;
  for sp in select * from public.cc_real_wallet_spends where user_id=payment.user_id and reference like 'PORTAL-MONTH-'||payment.request_id::text||'-%' order by service for update loop
   if exists(select 1 from public.cc_real_wallet_refunds where spend_id=sp.id) then raise exception 'Pago con devolución previa; requiere conciliación';end if;
   perform set_config('cc_audit.kind','REFUND',true);perform set_config('cc_audit.reference','V320-REF-'||req::text,true);
   update public.cc_real_service_wallets set balance_pen=balance_pen+sp.amount_pen,updated_at=now() where user_id=sp.user_id and service=sp.service;
   insert into public.cc_real_wallet_refunds(spend_id,user_id,service,amount_pen,reference,reason) values(sp.id,sp.user_id,sp.service,sp.amount_pen,'V320-REF-'||req::text||'-'||sp.service,reason);
  end loop;
  if payment.service='STREAM_BULLS' then update public.cc_subscriptions set status='CANCELLED' where id=payment.subscription_id;
  elsif payment.service='COBRA_YA' then update public.cc_cobra_real_access_periods set status='REFUNDED' where id=payment.access_id;
  elsif payment.service='MI_COCHERA' then update public.mc_accounts set subscription_until=payment.previous_until where user_id=payment.user_id;
  else update public.ma_accounts set subscription_until=payment.previous_until where user_id=payment.user_id;end if;
  update cc_internal.finance_membership_payments set status='REFUNDED' where id=payment.id;
  insert into cc_internal.finance_membership_refunds(payment_id,request_id,reason,actor_id) values(payment.id,req,reason,actor);
  update cc_internal.finance_referral_bonuses set status='REVERSAL_PENDING' where payment_id=payment.id and status='CREDITED' returning beneficiary_id into inviter;
  if inviter is not null then perform cc_internal.finance_collect_debt(inviter);end if;
  insert into cc_internal.finance_events(actor_id,user_id,event,reference,amount_pen,details) values(actor,payment.user_id,'MEMBERSHIP_REFUND',payment.id::text,payment.amount_pen,jsonb_build_object('reason',reason,'request_id',req));
  perform set_config('cc_audit.kind','',true);perform set_config('cc_audit.reference','',true);
  return jsonb_build_object('saved',true);
 elsif p_action='refund_order' then
  if req is null or length(reason) not between 3 and 160 then raise exception 'Referencia y motivo obligatorios';end if;
  select * into o from public.cc_portal_stream_orders where order_code=upper(trim(p_data->>'order_code')) for update;
  if not found then raise exception 'Pedido no encontrado';end if;
  amount:=(p_data->>'amount_pen')::numeric;
  select * into r from cc_internal.finance_order_adjustments where request_id=req;
  if found then
   if r.order_id<>o.id or r.amount_pen is distinct from amount or r.reason<>reason then raise exception 'Referencia utilizada con otros datos';end if;
   return jsonb_build_object('already_processed',true);
  end if;
  if o.status not in('FULFILLED','PAID_AWAITING_DELIVERY') or amount is null or amount<=0 or amount<>round(amount,2) then raise exception 'Pedido o importe no reembolsable';end if;
  if exists(select 1 from cc_internal.finance_settlement_lines l join cc_internal.finance_settlements b on b.id=l.settlement_id where l.order_id=o.id and b.status in('APPROVED','PARTIAL')) then raise exception 'Cancela primero la liquidación pendiente del pedido';end if;
  select coalesce(sum(amount_pen),0),coalesce(sum(commission_pen),0) into refundtotal,beforefee from cc_internal.finance_order_adjustments where order_id=o.id;
  if refundtotal+amount>o.price_pen then raise exception 'El reembolso supera el precio pagado';end if;
  fee:=round((refundtotal+amount)*o.admin_percent/100,2)-beforefee;
  remain:=amount;
  for sp in select s.*,s.amount_pen-coalesce((select sum(amount_pen) from public.cc_real_wallet_refunds where spend_id=s.id),0) available from public.cc_real_wallet_spends s where user_id=o.buyer_id and reference like 'PORTAL-BUY-'||o.checkout_key::text||'-%' order by service for update loop
   exit when remain<=0;take:=least(remain,sp.available);if take<=0 then continue;end if;
   perform set_config('cc_audit.kind','REFUND',true);perform set_config('cc_audit.reference','V320-ORDER-REF-'||req::text,true);
   update public.cc_real_service_wallets set balance_pen=balance_pen+take,updated_at=now() where user_id=sp.user_id and service=sp.service;
   insert into public.cc_real_wallet_refunds(spend_id,user_id,service,amount_pen,reference,reason) values(sp.id,sp.user_id,sp.service,take,'V320-ORDER-REF-'||req::text||'-'||sp.service,reason);remain:=remain-take;
  end loop;
  if remain<>0 then raise exception 'Los gastos del pedido no concilian; no se acreditó dinero';end if;
  insert into cc_internal.finance_order_adjustments(request_id,order_id,amount_pen,commission_pen,seller_pen,reason,actor_id) values(req,o.id,amount,fee,amount-fee,reason,actor);
  if refundtotal+amount=o.price_pen then update public.cc_portal_stream_orders set status='REFUNDED' where id=o.id;end if;
  insert into cc_internal.finance_events(actor_id,user_id,event,reference,amount_pen,details) values(actor,o.buyer_id,'ORDER_REFUND',o.order_code,amount,jsonb_build_object('reason',reason,'seller_id',o.seller_id));
  perform set_config('cc_audit.kind','',true);perform set_config('cc_audit.reference','',true);return jsonb_build_object('saved',true);
 elsif p_action='approve_settlement' then
  if req is null then raise exception 'Referencia obligatoria';end if;
  seller:=(p_data->>'seller_id')::uuid;since:=(p_data->>'from')::timestamptz;untilv:=(p_data->>'to')::timestamptz;amount:=(p_data->>'amount_pen')::numeric;
  select * into b from cc_internal.finance_settlements where request_id=req;
  if found then
   if b.seller_id<>seller or b.amount_pen is distinct from amount or b.starts_at<>since or b.ends_at<>untilv then raise exception 'Referencia utilizada con otros datos';end if;
   return jsonb_build_object('id',b.id,'already_processed',true);
  end if;
  report:=public.cc_finance_report(seller,since,untilv);
  if amount is null or amount<=0 or amount<>round(amount,2) or amount>(report->>'approval_available_pen')::numeric then raise exception 'Importe no disponible. Actualiza el reporte';end if;
  insert into cc_internal.finance_settlements(request_id,seller_id,starts_at,ends_at,amount_pen,approved_by) values(req,seller,since,untilv,amount,actor) returning id into bid;
  remain:=amount;
  for line in select o.id,o.seller_payable_pen-coalesce((select sum(seller_pen) from cc_internal.finance_order_adjustments where order_id=o.id),0)-coalesce((select sum(l.amount_pen) from cc_internal.finance_settlement_lines l join cc_internal.finance_settlements b on b.id=l.settlement_id where l.order_id=o.id and b.status<>'CANCELLED'),0) available from public.cc_portal_stream_orders o where o.seller_id=seller and o.status='FULFILLED' and o.created_at>=since and o.created_at<untilv order by o.created_at,o.id for update loop
   exit when remain<=0;take:=least(remain,line.available);if take<=0 then continue;end if;
   insert into cc_internal.finance_settlement_lines(settlement_id,order_id,amount_pen) values(bid,line.id,take);remain:=remain-take;
  end loop;
  if remain<>0 then raise exception 'Las ventas cambiaron. Vuelve a revisar';end if;
  insert into cc_internal.finance_events(actor_id,user_id,event,reference,amount_pen) values(actor,seller,'SETTLEMENT_APPROVED',bid::text,amount);
  return jsonb_build_object('id',bid,'saved',true);
 elsif p_action='record_payment' then
  if req is null then raise exception 'Referencia obligatoria';end if;
  bid:=(p_data->>'settlement_id')::uuid;amount:=(p_data->>'amount_pen')::numeric;method:=p_data->>'method';ref:=upper(trim(p_data->>'reference'));proof:=p_data->>'proof_path';
  select * into r from cc_internal.finance_settlement_payments where request_id=req;
  if found then
   if r.settlement_id<>bid or r.amount_pen is distinct from amount or r.method<>method or r.reference<>ref or r.proof_path<>proof then raise exception 'Referencia utilizada con otros datos';end if;
   return jsonb_build_object('already_processed',true);
  end if;
  select * into b from cc_internal.finance_settlements where id=bid for update;
  if not found or b.status not in('APPROVED','PARTIAL') then raise exception 'Liquidación no habilitada';end if;
  if method not in('YAPE','PLIN','TRANSFERENCIA') or length(coalesce(ref,'')) not between 4 and 100 or amount is null or amount<=0 or amount<>round(amount,2) then raise exception 'Datos del pago inválidos';end if;
  if proof is null or split_part(proof,'/',1)<>actor::text or not exists(select 1 from storage.objects where bucket_id='cc-financial-proofs' and name=proof) then raise exception 'Adjunta un comprobante privado válido';end if;
  select coalesce(sum(amount_pen),0) into take from cc_internal.finance_settlement_payments where settlement_id=bid;
  if take+amount>b.amount_pen then raise exception 'El pago supera el saldo pendiente';end if;
  insert into cc_internal.finance_settlement_payments(request_id,settlement_id,amount_pen,method,reference,proof_path,actor_id) values(req,bid,amount,method,ref,proof,actor);
  update cc_internal.finance_settlements set status=case when take+amount=amount_pen then 'PAID' else 'PARTIAL' end where id=bid;
  insert into cc_internal.finance_events(actor_id,user_id,event,reference,amount_pen,details) values(actor,b.seller_id,'SETTLEMENT_PAID',bid::text,amount,jsonb_build_object('method',method,'reference',ref));return jsonb_build_object('saved',true);
 elsif p_action='cancel_settlement' then
  select * into b from cc_internal.finance_settlements where id=(p_data->>'settlement_id')::uuid for update;
  if not found or length(reason) not between 3 and 160 then raise exception 'Liquidación o motivo inválido';end if;
  if exists(select 1 from cc_internal.finance_settlement_payments where settlement_id=b.id) then raise exception 'Liquidación con pagos: no se puede cancelar';end if;
  update cc_internal.finance_settlements set status='CANCELLED' where id=b.id;
  insert into cc_internal.finance_events(actor_id,user_id,event,reference,details) values(actor,b.seller_id,'SETTLEMENT_CANCELLED',b.id::text,jsonb_build_object('reason',reason));return jsonb_build_object('saved',true);
 end if;
 raise exception 'Acción financiera inválida';
end;$$;
-- Comprobantes privados, inmutables desde cliente: ADMIN carga y consulta; nadie publica URLs abiertas.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('cc-financial-proofs','cc-financial-proofs',false,5242880,array['image/jpeg','image/png','application/pdf']) on conflict(id) do nothing;
create policy finance_proofs_insert on storage.objects for insert to authenticated with check(bucket_id='cc-financial-proofs' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.cc_admins where user_id=(select auth.uid())));
create policy finance_proofs_read on storage.objects for select to authenticated using(bucket_id='cc-financial-proofs' and exists(select 1 from public.cc_admins where user_id=(select auth.uid())));
-- Se revocan por defecto todas las rutinas nuevas, y solo se conceden RPC protegidas.
revoke all on function cc_internal.finance_audit_immutable(),cc_internal.finance_admin(),cc_internal.finance_collect_debt(uuid),cc_internal.finance_commission_history(),cc_internal.finance_sales(uuid,timestamptz,timestamptz) from public,anon,authenticated;
revoke all on function public.cc_finance_rates(),public.cc_finance_pay_membership(text,uuid,numeric),public.cc_finance_report(uuid,timestamptz,timestamptz),public.cc_finance_my_referrals(),public.cc_finance_admin(text,jsonb) from public,anon,authenticated;
grant execute on function public.cc_finance_rates(),public.cc_finance_pay_membership(text,uuid,numeric),public.cc_finance_report(uuid,timestamptz,timestamptz),public.cc_finance_my_referrals(),public.cc_finance_admin(text,jsonb) to authenticated;
-- Impide que una ruta de reembolso antigua omita la reversión del bono nuevo.
do $$declare d text;begin
 select pg_get_functiondef('public.cc_refund_verified_real_purchase(text,text,numeric,text)'::regprocedure) into d;
 d:=replace(d,E'begin\n',E'begin\n if p_spend_reference like ''PORTAL-MONTH-%'' or p_spend_reference like ''PORTAL-BUY-%'' then raise exception ''Utiliza el reembolso financiero trazable de ADMIN'';end if;\n');execute d;
 select pg_get_functiondef('public.cc_refund_cobra_real_subscription(uuid,text,text)'::regprocedure) into d;
 d:=replace(d,E'begin\n',E'begin\n if exists(select 1 from cc_internal.finance_membership_payments where access_id=p_access_id) then raise exception ''Utiliza el reembolso mensual de ADMIN'';end if;\n');execute d;
 -- Cualquier compra que reutiliza el cargo común respeta la recuperación de bonos anulados.
 select pg_get_functiondef('cc_internal.cc_portal_charge_unified(uuid,numeric,text,text,text)'::regprocedure) into d;
 d:=replace(d,'remaining:=p_amount;', 'perform cc_internal.finance_collect_debt(p_user); select coalesce(sum(balance_pen),0) into available from public.cc_real_service_wallets where user_id=p_user; if available<p_amount then raise exception ''Saldo disponible insuficiente tras reversión de bonos'';end if; remaining:=p_amount;');execute d;
end;$$;
create or replace function public.cc_finance_wallet() returns jsonb language plpgsql stable security definer set search_path='' as $$declare u uuid:=auth.uid();balance numeric;debt numeric;begin
 if u is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 select coalesce(sum(balance_pen),0) into balance from public.cc_real_service_wallets where user_id=u;
 select coalesce(sum(5-recovered_pen),0) into debt from cc_internal.finance_referral_bonuses where beneficiary_id=u and status='REVERSAL_PENDING';
 return jsonb_build_object('balance_pen',balance,'pending_reversal_pen',debt,'available_pen',greatest(balance-debt,0));end;$$;
create or replace function public.cc_finance_my_movements() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('movement_id','finance:'||id,'occurred_at',created_at,'service','CLAN_CARTAN','movement_type',event,'amount_pen',amount_pen,'status','COMPLETED','provider','INTERNAL','reference',reference,'description',case when event='REFERRAL_BONUS' then 'Bono recurrente por referido · '||(details->>'service') else 'Reversión de bono por operación anulada' end,'affects_balance',true) order by id desc) from(select * from cc_internal.finance_events where user_id=auth.uid() and event in('REFERRAL_BONUS','BONUS_REVERSAL') order by id desc limit 200)x),'[]');end;$$;
revoke all on function public.cc_finance_wallet(),public.cc_finance_my_movements() from public,anon,authenticated;
grant execute on function public.cc_finance_wallet(),public.cc_finance_my_movements() to authenticated;
create index finance_settlement_payments_batch on cc_internal.finance_settlement_payments(settlement_id);
create index finance_orders_seller_date on public.cc_portal_stream_orders(seller_id,created_at,id);
