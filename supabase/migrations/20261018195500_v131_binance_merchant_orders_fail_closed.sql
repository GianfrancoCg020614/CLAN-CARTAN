-- CLAN CARTAN: Binance Pay Merchant (PEN -> importe USDT fijado por Binance).
-- Aditivo. No toca saldos de prueba, prestamos ni tablas historicas de recarga.
-- El flujo permanece inhabilitado hasta contar con Merchant API real.
create table if not exists public.cc_binance_merchant_orders (
  id uuid primary key default gen_random_uuid(),
  merchant_trade_no text not null unique check (merchant_trade_no ~ '^[0-9a-f]{32}$'),
  user_id uuid not null references auth.users(id),
  service text not null check (service in ('COBRA_YA','STREAM_BULLS')),
  amount_pen numeric(12,2) not null check (amount_pen between 1 and 10),
  expected_usdt numeric(20,8) check (expected_usdt > 0),
  prepay_id text unique,
  checkout_url text,
  merchant_id text,
  status text not null default 'CREATING'
      check (status in ('CREATING','READY','CREDITED','FAILED','DISPUTED')),
  provider_transaction_id text unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  credited_at timestamptz,
  check (status not in ('READY','CREDITED') or
         (expected_usdt is not null and prepay_id is not null and merchant_id is not null))
);
create index if not exists cc_binance_merchant_orders_user_created
  on public.cc_binance_merchant_orders (user_id,created_at desc);
create table if not exists public.cc_binance_merchant_credits (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.cc_binance_merchant_orders(id),
  user_id uuid not null references auth.users(id),
  service text not null check (service in ('COBRA_YA','STREAM_BULLS')),
  transaction_id text not null unique,
  usdt_paid numeric(20,8) not null check (usdt_paid > 0),
  amount_pen numeric(12,2) not null check (amount_pen > 0),
  created_at timestamptz not null default now()
);
alter table public.cc_binance_merchant_orders enable row level security;
alter table public.cc_binance_merchant_credits enable row level security;
revoke all on table public.cc_binance_merchant_orders from public,anon,authenticated;
revoke all on table public.cc_binance_merchant_credits from public,anon,authenticated;
grant select on public.cc_binance_merchant_orders to authenticated;
drop policy if exists cc_binance_orders_self_read on public.cc_binance_merchant_orders;
create policy cc_binance_orders_self_read
on public.cc_binance_merchant_orders for select to authenticated
using ((select auth.uid()) = user_id);
-- IMPORTANT: functions below callable by service_role only, never authenticated users.
create or replace function public.cc_binance_merchant_reserve(
 p_user_id uuid, p_service text, p_amount_pen numeric, p_trade_no text
) returns uuid language plpgsql security definer set search_path = '' as $$
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
end $$;

create or replace function public.cc_binance_merchant_ready(
 p_order_id uuid,p_prepay_id text,p_expected_usdt numeric,p_checkout_url text,p_merchant_id text
) returns boolean language plpgsql security definer set search_path = '' as $$
begin
 if p_prepay_id is null or p_prepay_id !~ '^[0-9]{1,32}$'
 or p_expected_usdt is null or p_expected_usdt<=0
 or p_expected_usdt<>round(p_expected_usdt,8)
 or p_checkout_url is null or p_checkout_url !~ '^https://(pay[.]binance[.]com|app[.]binance[.]com)/'
 or p_merchant_id is null or p_merchant_id !~ '^[0-9]{1,32}$'
 then raise exception 'Respuesta Merchant invalida'; end if;
 update public.cc_binance_merchant_orders
 set status='READY',prepay_id=p_prepay_id,expected_usdt=p_expected_usdt,
     checkout_url=p_checkout_url,merchant_id=p_merchant_id
 where id=p_order_id and status='CREATING' and expires_at>now();
 if not found then raise exception 'Orden no reservada o expirada'; end if;
 return true;
end $$;

create or replace function public.cc_binance_merchant_fail(p_order_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.cc_binance_merchant_orders set status='FAILED'
 where id=p_order_id and status='CREATING';
 return found;
end $$;

create or replace function public.cc_binance_merchant_credit(
 p_trade_no text,p_merchant_id text,p_prepay_id text,p_transaction_id text,
 p_usdt numeric,p_paid_at timestamptz
) returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.cc_binance_merchant_orders%rowtype;
begin
 if p_trade_no is null or p_transaction_id is null or
 p_transaction_id !~ '^[A-Za-z0-9_-]{8,128}$' or
 p_merchant_id is null or p_usdt is null or p_usdt<=0
 or p_usdt<>round(p_usdt,8) or p_paid_at is null
 then raise exception 'Pago verificado incompleto'; end if;
 select * into v from public.cc_binance_merchant_orders
 where merchant_trade_no=p_trade_no for update;
 if not found then raise exception 'Orden no existente'; end if;
 if v.status='CREDITED' then
   if v.provider_transaction_id=p_transaction_id then return false; end if;
   raise exception 'Orden ya acreditada con otra transaccion';
 end if;
 if v.status<>'READY' then raise exception 'Orden no apta para acreditar'; end if;
 if v.merchant_id<>p_merchant_id or v.prepay_id<>p_prepay_id or v.expected_usdt<>p_usdt then
   raise exception 'Merchant o importe USDT no coincide'; end if;
 if p_paid_at < v.created_at-interval '1 minute'
 or p_paid_at > v.expires_at+interval '1 minute'
 then raise exception 'Pago fuera de vigencia'; end if;
 insert into public.cc_binance_merchant_credits(order_id,user_id,service,transaction_id,usdt_paid,amount_pen)
 values(v.id,v.user_id,v.service,p_transaction_id,p_usdt,v.amount_pen);
 insert into public.cc_real_service_wallets(user_id,service,balance_pen)
 values(v.user_id,v.service,v.amount_pen)
 on conflict (user_id,service) do update set
 balance_pen=public.cc_real_service_wallets.balance_pen+excluded.balance_pen,
 updated_at=now();
 update public.cc_binance_merchant_orders
 set status='CREDITED',provider_transaction_id=p_transaction_id,credited_at=now()
 where id=v.id;
 return true;
end $$;

revoke all on function public.cc_binance_merchant_reserve(uuid,text,numeric,text) from public,anon,authenticated;
revoke all on function public.cc_binance_merchant_ready(uuid,text,numeric,text,text) from public,anon,authenticated;
revoke all on function public.cc_binance_merchant_fail(uuid) from public,anon,authenticated;
revoke all on function public.cc_binance_merchant_credit(text,text,text,text,numeric,timestamptz) from public,anon,authenticated;
grant execute on function public.cc_binance_merchant_reserve(uuid,text,numeric,text) to service_role;
grant execute on function public.cc_binance_merchant_ready(uuid,text,numeric,text,text) to service_role;
grant execute on function public.cc_binance_merchant_fail(uuid) to service_role;
grant execute on function public.cc_binance_merchant_credit(text,text,text,text,numeric,timestamptz) to service_role;
comment on table public.cc_binance_merchant_orders is 'Binance Merchant fiat PEN: isolated and disabled until merchant onboarding and signed confirmation';
