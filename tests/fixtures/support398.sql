-- LOCAL TEST DATABASE ONLY: never run this fixture on production.
create schema auth;create schema cc_internal;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.cc_admins(user_id uuid primary key);
create function cc_internal.finance_admin() returns boolean language sql stable as $$select exists(select 1 from public.cc_admins where user_id=auth.uid())$$;
insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
insert into cc_admins values ('00000000-0000-0000-0000-000000000003');
grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select,insert on storage.objects to authenticated;
alter table auth.users add column email text;
update auth.users set email='fixture@example.invalid';
create table public.cc_profiles(user_id uuid primary key,display_name text);
create table public.cc_user_details(user_id uuid primary key,full_name text);
