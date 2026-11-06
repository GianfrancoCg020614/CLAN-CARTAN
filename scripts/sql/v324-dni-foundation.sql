-- SOLO CI aislado; no consulta documentos ni servicios externos.
create role anon;create role authenticated;create role service_role;
create schema auth;
create function auth.jwt() returns jsonb stable language sql as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create table public.cc_admins(user_id uuid primary key);
create table public.cc_businesses(id uuid primary key,code text);
create table public.cc_memberships(user_id uuid,business_id uuid,status text,role text);
create table public.mc_accounts(user_id uuid,suspended boolean,subscription_until timestamptz);
create table public.cc_dni_quota(month_key text primary key,used int not null default 0,external_exhausted boolean not null default false);
create table public.cc_dni_quota_log(id bigint generated always as identity primary key,user_id uuid,month_key text,called_at timestamptz default now());
