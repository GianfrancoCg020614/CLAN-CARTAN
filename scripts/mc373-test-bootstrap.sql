-- LOCAL/CI ONLY: synthetic MI COCHERA tables; never run against production.
create schema auth;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
do $$begin if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated;end if;if not exists(select 1 from pg_roles where rolname='anon') then create role anon;end if;end $$;
create table public.mc_accounts(user_id uuid primary key,currency text default 'PEN',country text default 'PE',subscription_until timestamptz,suspended boolean default false);
create table public.mc_people(id uuid primary key,reseller_id uuid,full_name text,document_number text,phone text);
create table public.mc_carts(id bigint primary key,reseller_id uuid,alias text,business_type text,owner_person_id uuid,worker_person_id uuid,daily_rate numeric,currency text,state text default 'ACTIVE');
create table public.mc_movements(id uuid primary key default gen_random_uuid(),reseller_id uuid,cart_id bigint,kind text,label text,amount_local numeric,currency text,occurred_on date,created_at timestamptz default now());
grant usage on schema public,auth to authenticated;
grant select on public.mc_accounts,public.mc_people,public.mc_carts,public.mc_movements to authenticated;
alter table public.mc_accounts enable row level security;
create policy mc_fixture_account on public.mc_accounts for select to authenticated using(user_id=auth.uid());
do $$declare t text;begin foreach t in array array['mc_people','mc_carts','mc_movements'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create policy mc_fixture_owner on public.%I for select to authenticated using(reseller_id=auth.uid() and exists(select 1 from public.mc_accounts where user_id=auth.uid() and not suspended and subscription_until>now()))',t);
end loop;end $$;
insert into public.mc_accounts values('00000000-0000-4000-8000-000000000001','PEN','PE',now()+interval '30 days',false),('00000000-0000-4000-8000-000000000002','EUR','ES',now()+interval '30 days',false);
insert into public.mc_people values('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','Juan Rodríguez Pérez','12345678','+51 987654321'),('00000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000001','Ana Torres','87654321','+51911122333'),('00000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000002','Otro propietario','11223344','+34123456789');
insert into public.mc_carts values(1,'00000000-0000-4000-8000-000000000001','El Paisa','Emoliente','00000000-0000-4000-8000-000000000101',null,4,'PEN','ACTIVE'),(2,'00000000-0000-4000-8000-000000000001','Ana','Frutas','00000000-0000-4000-8000-000000000102',null,5,'USD','RETIRED'),(3,'00000000-0000-4000-8000-000000000002','Privado','Otro','00000000-0000-4000-8000-000000000103',null,5,'EUR','ACTIVE');
insert into public.mc_carts select n,'00000000-0000-4000-8000-000000000001'::uuid,'Carrito '||n,'Negocio','00000000-0000-4000-8000-000000000101'::uuid,null,4,'PEN','ACTIVE' from generate_series(4,68) n;
insert into public.mc_movements(reseller_id,cart_id,kind,label,amount_local,currency,occurred_on)
 select '00000000-0000-4000-8000-000000000001',1,'RENT','Alquiler',1,'PEN',(now() at time zone 'America/Lima')::date-case when n<=2500 then 1 else 0 end from generate_series(1,2505) n;
insert into public.mc_movements(reseller_id,cart_id,kind,label,amount_local,currency,occurred_on) values('00000000-0000-4000-8000-000000000001',1,'PRODUCT','Hielo',2.50,'PEN',(now() at time zone 'America/Lima')::date),('00000000-0000-4000-8000-000000000001',1,'PAYMENT','Abono',-1000,'PEN',(now() at time zone 'America/Lima')::date),('00000000-0000-4000-8000-000000000001',2,'PRODUCT','Producto',20,'USD',(now() at time zone 'America/Lima')::date),('00000000-0000-4000-8000-000000000001',2,'PAYMENT','Abono',-3,'USD',(now() at time zone 'America/Lima')::date),('00000000-0000-4000-8000-000000000002',3,'RENT','Privado',900,'EUR',(now() at time zone 'America/Lima')::date);
