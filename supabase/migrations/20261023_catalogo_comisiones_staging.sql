-- CLAN CARTAN: base de catálogo y comisiones. Aplicada inicialmente a STAGING.
-- No habilita cobros ni concede a clientes permisos para publicar.
create table if not exists public.cc_market_seller_roles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check(role in ('ADMIN','SUPER_RESELLER')),
 active boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.cc_market_listings (
 id uuid primary key default gen_random_uuid(),
 seller_id uuid not null references auth.users(id),
 title text not null check(length(trim(title)) between 3 and 160),
 description text not null default '',
 service text not null check(service in ('STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER','OTRO')),
 price_pen numeric(12,2) not null check(price_pen>=0),
 commission_bps integer not null default 2000 check(commission_bps between 0 and 10000),
 status text not null default 'DRAFT' check(status in ('DRAFT','PENDING','PUBLISHED','PAUSED','REJECTED')),
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint cc_market_publish_approval check(status<>'PUBLISHED' or (approved_by is not null and approved_at is not null))
);
create index if not exists cc_market_listings_public_idx on public.cc_market_listings(status,service);
create table if not exists public.cc_market_sales (
 id uuid primary key default gen_random_uuid(),
 listing_id uuid not null references public.cc_market_listings(id),
 seller_id uuid not null references auth.users(id),
 buyer_id uuid references auth.users(id),
 external_operation_key text not null unique check(length(external_operation_key) between 12 and 200),
 gross_pen numeric(12,2) not null check(gross_pen>0),
 commission_bps integer not null check(commission_bps between 0 and 10000),
 platform_pen numeric(12,2) generated always as (round(gross_pen*commission_bps/10000,2)) stored,
 seller_pen numeric(12,2) generated always as (gross_pen-round(gross_pen*commission_bps/10000,2)) stored,
 state text not null default 'PENDING' check(state in ('PENDING','VERIFIED','REVERSED')),
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 constraint cc_market_verified_requires_time check(state<>'VERIFIED' or verified_at is not null)
);
alter table public.cc_market_seller_roles enable row level security;
alter table public.cc_market_listings enable row level security;
alter table public.cc_market_sales enable row level security;
revoke all on public.cc_market_seller_roles,public.cc_market_listings,public.cc_market_sales from anon,authenticated;
grant select on public.cc_market_listings to anon,authenticated;
drop policy if exists cc_market_public_listings on public.cc_market_listings;
create policy cc_market_public_listings on public.cc_market_listings for select to anon,authenticated using (status='PUBLISHED');
grant all on public.cc_market_seller_roles,public.cc_market_listings,public.cc_market_sales to service_role;
-- La API de escritura privada deberá comprobar rol ADMIN/SUPER_RESELLER y pago REAL.
