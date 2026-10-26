-- V194: registro manual de liquidaciones, sin transferir dinero.
create table if not exists public.cc_portal_super_liquidations(
 id uuid primary key default gen_random_uuid(),
 seller_id uuid not null references auth.users(id),
 date_from date not null,
 date_to date not null,
 admin_share_pen numeric(12,2) not null default 0,
 seller_share_pen numeric(12,2) not null default 0,
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 check(date_from <= date_to)
);
alter table public.cc_portal_super_liquidations enable row level security;
