-- SOLO pruebas aisladas.
create role anon;create role authenticated;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.cc_admins(user_id uuid primary key);
grant usage on schema auth,public to authenticated;
grant select on public.cc_admins to authenticated;
