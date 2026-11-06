-- SOLO CI/local. Políticas equivalentes a las auditadas.
create role anon;create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.cc_admins(user_id uuid primary key);
create table public.mc_accounts(user_id uuid primary key,suspended boolean default false,subscription_until timestamptz);
create table public.mc_carts(id bigint primary key,reseller_id uuid not null);
create table public.mc_movements(id bigint generated always as identity primary key,cart_id bigint,reseller_id uuid not null,amount_local numeric not null);
alter table public.mc_carts enable row level security;
alter table public.mc_movements enable row level security;
create policy fixture_carts on public.mc_carts for select to authenticated using(exists(select 1 from public.cc_admins where user_id=(select auth.uid())) or (reseller_id=(select auth.uid()) and exists(select 1 from public.mc_accounts where user_id=mc_carts.reseller_id and not suspended and subscription_until>now())));
create policy fixture_movements on public.mc_movements for select to authenticated using(exists(select 1 from public.cc_admins where user_id=(select auth.uid())) or (reseller_id=(select auth.uid()) and exists(select 1 from public.mc_accounts where user_id=mc_movements.reseller_id and not suspended and subscription_until>now())));
grant usage on schema public,auth to authenticated;
grant select on public.cc_admins,public.mc_accounts,public.mc_carts,public.mc_movements to authenticated;
