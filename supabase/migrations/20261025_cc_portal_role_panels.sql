-- CLAN CARTAN V166 · Roles y publicaciones STREAM BULL'S.
-- Aditivo, sin operaciones monetarias ni autorización por metadatos del cliente.
create table if not exists public.cc_portal_super_resellers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 admin_percent numeric(5,2) not null default 20 check(admin_percent between 0 and 100),
 granted_by uuid references auth.users(id),
 granted_at timestamptz not null default now()
);
create table if not exists public.cc_portal_stream_products (
 id uuid primary key default gen_random_uuid(),
 seller_id uuid not null references auth.users(id),
 service text not null check(char_length(service) between 2 and 90),
 title text not null check(char_length(title) between 4 and 180),
 description text not null default '' check(char_length(description)<=1000),
 duration_days int not null check(duration_days between 1 and 366),
 price_pen numeric(12,2) not null check(price_pen>0),
 cost_pen numeric(12,2) not null check(cost_pen>=0 and cost_pen<=price_pen),
 stock int not null check(stock between 0 and 100000),
 whatsapp text not null default '' check(char_length(whatsapp)<=30),
 status text not null default 'ACTIVE' check(status in ('ACTIVE','PAUSED')),
 created_at timestamptz not null default now()
);
create index if not exists cc_portal_stream_products_seller_idx on public.cc_portal_stream_products(seller_id,created_at desc);
alter table public.cc_portal_super_resellers enable row level security;
alter table public.cc_portal_stream_products enable row level security;
revoke all on public.cc_portal_super_resellers from anon,authenticated;
revoke all on public.cc_portal_stream_products from anon,authenticated;
grant select on public.cc_portal_super_resellers to authenticated;
grant select on public.cc_portal_stream_products to authenticated;
drop policy if exists cc_portal_super_read on public.cc_portal_super_resellers;
create policy cc_portal_super_read on public.cc_portal_super_resellers
 for select to authenticated using (
 user_id=(select auth.uid()) or exists(select 1 from public.cc_admins where user_id=(select auth.uid()))
);
drop policy if exists cc_portal_products_read on public.cc_portal_stream_products;
create policy cc_portal_products_read on public.cc_portal_stream_products
 for select to authenticated using (
 seller_id=(select auth.uid()) or exists(select 1 from public.cc_admins where user_id=(select auth.uid()))
);
create or replace function public.cc_portal_admin_set_super_reseller(
 p_email text,p_enabled boolean,p_admin_percent numeric default 20
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); target uuid;
begin
 if actor is null or not exists(select 1 from public.cc_admins where user_id=actor) then
  raise exception 'Solo ADMIN puede cambiar permisos' using errcode='42501';
 end if;
 if p_email is null or length(trim(p_email))<6 or p_admin_percent<0 or p_admin_percent>100 then
  raise exception 'Datos de permiso invalidos';
 end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email)) limit 1;
 if target is null then raise exception 'Usuario no registrado'; end if;
 insert into public.cc_portal_super_resellers(user_id,enabled,admin_percent,granted_by,granted_at)
 values(target,p_enabled,round(p_admin_percent,2),actor,now())
 on conflict(user_id) do update set enabled=excluded.enabled,
 admin_percent=excluded.admin_percent,granted_by=excluded.granted_by,granted_at=now();
 return jsonb_build_object('updated',true,'enabled',p_enabled);
end; $$;
revoke all on function public.cc_portal_admin_set_super_reseller(text,boolean,numeric) from public,anon;
grant execute on function public.cc_portal_admin_set_super_reseller(text,boolean,numeric) to authenticated;
create or replace function public.cc_portal_publish_stream_product(
 p_service text,p_title text,p_duration_days int,p_price_pen numeric,
 p_cost_pen numeric,p_stock int,p_whatsapp text default '',
 p_description text default ''
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare actor uuid:=auth.uid(); allowed boolean; product_id uuid;
begin
 if actor is null then raise exception 'Inicia sesion' using errcode='42501'; end if;
 if exists(select 1 from public.cc_admins where user_id=actor) then allowed:=true;
 else
  select exists(
   select 1 from public.cc_portal_super_resellers r
   join public.cc_memberships m on m.user_id=r.user_id
   join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
   join public.cc_subscriptions s on s.membership_id=m.id
   where r.user_id=actor and r.enabled and m.role='SUPER_RESELLER'
    and m.status='ACTIVE' and s.status='ACTIVE' and s.end_at>now()
  ) into allowed;
 end if;
 if not coalesce(allowed,false) then raise exception 'Falta permiso o membresia vigente' using errcode='42501'; end if;
 if nullif(trim(coalesce(p_service,'')),'') is null or nullif(trim(coalesce(p_title,'')),'') is null
    or p_duration_days is null or p_duration_days not between 1 and 366
    or p_price_pen is null or p_price_pen<=0 or p_price_pen>100000
    or p_cost_pen is null or p_cost_pen<0 or p_cost_pen>p_price_pen
    or p_stock is null or p_stock<0 or p_stock>100000
    or length(trim(p_title)) not between 4 and 180
    or length(trim(p_service)) not between 2 and 90
    or length(coalesce(p_description,''))>1000
    or length(coalesce(p_whatsapp,''))>30 then raise exception 'Producto invalido'; end if;
 insert into public.cc_portal_stream_products(seller_id,service,title,description,duration_days,price_pen,cost_pen,stock,whatsapp)
 values(actor,trim(p_service),trim(p_title),coalesce(p_description,''),p_duration_days,p_price_pen,p_cost_pen,p_stock,coalesce(p_whatsapp,''))
 returning id into product_id;
 return product_id;
end; $$;
revoke all on function public.cc_portal_publish_stream_product(text,text,int,numeric,numeric,int,text,text) from public,anon;
grant execute on function public.cc_portal_publish_stream_product(text,text,int,numeric,numeric,int,text,text) to authenticated;
