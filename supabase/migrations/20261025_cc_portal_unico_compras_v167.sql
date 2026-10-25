-- CLAN CARTAN · V167: un panel, catálogo real, compras atómicas y membresía STREAM BULL'S.
-- Cero datos de prueba, cero modificación retroactiva del libro mayor.
-- PROHIBIDO crear órdenes por clientes fuera de las RPC de seguridad.
create table if not exists public.cc_portal_stream_orders (
 id uuid primary key default gen_random_uuid(),
 checkout_key uuid not null unique,
 buyer_id uuid not null references auth.users(id),
 seller_id uuid not null references auth.users(id),
 product_id uuid not null references public.cc_portal_stream_products(id),
 service text not null,
 title text not null,
 price_pen numeric(12,2) not null check(price_pen>0),
 cost_pen numeric(12,2) not null check(cost_pen>=0 and cost_pen<=price_pen),
 admin_percent numeric(5,2) not null check(admin_percent between 0 and 100),
 admin_fee_pen numeric(12,2) not null check(admin_fee_pen>=0),
 seller_payable_pen numeric(12,2) not null check(seller_payable_pen>=0),
 seller_whatsapp text not null,
 wallet_parts jsonb not null default '[]'::jsonb,
 status text not null default 'PAID_AWAITING_DELIVERY'
  check(status in ('PAID_AWAITING_DELIVERY','FULFILLED','REFUNDED','DISPUTED')),
 created_at timestamptz not null default now(),
 fulfilled_at timestamptz
);
create index if not exists cc_portal_orders_buyer_idx on public.cc_portal_stream_orders(buyer_id,created_at desc);
create index if not exists cc_portal_orders_seller_idx on public.cc_portal_stream_orders(seller_id,created_at desc);
create table if not exists public.cc_portal_stream_memberships_paid (
 id uuid primary key default gen_random_uuid(),
 checkout_key uuid not null unique,
 user_id uuid not null references auth.users(id),
 membership_id uuid not null references public.cc_memberships(id),
 subscription_id uuid not null references public.cc_subscriptions(id),
 amount_pen numeric(12,2) not null check(amount_pen>0),
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 wallet_parts jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists cc_portal_paid_membership_user_idx on public.cc_portal_stream_memberships_paid(user_id,created_at desc);
alter table public.cc_portal_stream_orders enable row level security;
alter table public.cc_portal_stream_memberships_paid enable row level security;
revoke all on public.cc_portal_stream_orders from anon,authenticated;
revoke all on public.cc_portal_stream_memberships_paid from anon,authenticated;
grant select on public.cc_portal_stream_orders,public.cc_portal_stream_memberships_paid to authenticated;
drop policy if exists cc_portal_orders_select on public.cc_portal_stream_orders;
create policy cc_portal_orders_select on public.cc_portal_stream_orders
 for select to authenticated using (
 buyer_id=(select auth.uid()) or seller_id=(select auth.uid())
 or exists(select 1 from public.cc_admins where user_id=(select auth.uid())));
drop policy if exists cc_portal_membership_paid_select on public.cc_portal_stream_memberships_paid;
create policy cc_portal_membership_paid_select on public.cc_portal_stream_memberships_paid
 for select to authenticated using (
 user_id=(select auth.uid())
 or exists(select 1 from public.cc_admins where user_id=(select auth.uid())));
drop policy if exists cc_portal_products_read on public.cc_portal_stream_products;
create policy cc_portal_products_read on public.cc_portal_stream_products
 for select to authenticated using (
 status='ACTIVE' or seller_id=(select auth.uid())
 or exists(select 1 from public.cc_admins where user_id=(select auth.uid())));
-- Se publica solo el catálogo activo a usuarios autenticados; un vendedor
-- puede consultar sus productos PAUSED, ADMIN puede auditar todo.
-- Función interna: saldo consolidado REAL = suma de subbilleteras existentes.
-- Un cargo puede repartirse entre servicios, dejando asientos individuales exactos.
create or replace function cc_internal.cc_portal_charge_unified(
 p_user uuid,p_amount numeric,p_kind text,p_key text,p_description text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare w record; available numeric:=0;remaining numeric;part numeric;parts jsonb:='[]'::jsonb;
begin
 if auth.uid() is distinct from p_user or p_user is null
  or p_amount is null or p_amount<=0 or p_amount>10000 or p_amount<>round(p_amount,2)
  or p_kind not in ('PURCHASE','SUBSCRIPTION')
  or length(coalesce(p_key,'')) not between 10 and 80
  or length(coalesce(p_description,'')) not between 3 and 160
 then raise exception 'Cargo no autorizado' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC-UNIFIED:'||p_user::text,0));
 for w in select service,balance_pen from public.cc_real_service_wallets
          where user_id=p_user order by service for update
 loop available:=available+w.balance_pen;end loop;
 if available<p_amount then raise exception 'Saldo real insuficiente';end if;
 remaining:=p_amount;
 for w in select service,balance_pen from public.cc_real_service_wallets
          where user_id=p_user and balance_pen>0 order by service
 loop
  exit when remaining<=0;
  part:=least(remaining,w.balance_pen);
  if part<=0 then continue;end if;
  update public.cc_real_service_wallets
  set balance_pen=balance_pen-part,updated_at=now()
  where user_id=p_user and service=w.service and balance_pen>=part;
  if not found then raise exception 'El saldo cambió, actualiza el panel';end if;
  insert into public.cc_real_wallet_spends(user_id,service,kind,amount_pen,reference,description)
  values(p_user,w.service,p_kind,part,'PORTAL-'||p_key||'-'||w.service,p_description);
  parts:=parts||jsonb_build_array(jsonb_build_object('service',w.service,'amount_pen',part));
  remaining:=remaining-part;
 end loop;
 if remaining<>0 then raise exception 'Cargo incompleto';end if;
 return parts;
end $$;
revoke all on function cc_internal.cc_portal_charge_unified(uuid,numeric,text,text,text) from public,anon,authenticated;
-- Función de compra: stock + precio + saldo + asiento + orden + comisión,
-- todo en una transacción. WhatsApp se entrega SOLO después de pago confirmado.
create or replace function public.cc_portal_purchase_stream_product(
 p_product_id uuid,p_checkout_key uuid,p_expected_price_pen numeric
) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();product public.cc_portal_stream_products%rowtype;
 old_order public.cc_portal_stream_orders%rowtype;
 seller_valid boolean:=false;percent numeric:=0;fee numeric;payable numeric;
 parts jsonb;oid uuid;phone text;
begin
 if u is null or p_product_id is null or p_checkout_key is null or p_expected_price_pen is null
 then raise exception 'Compra incompleta' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended('CC-ORDER:'||p_checkout_key::text,0));
 select * into old_order from public.cc_portal_stream_orders where checkout_key=p_checkout_key;
 if found then
  if old_order.buyer_id<>u or old_order.product_id<>p_product_id then
   raise exception 'Referencia de compra no corresponde' using errcode='42501';end if;
  return jsonb_build_object('order_id',old_order.id,'status',old_order.status,
   'price_pen',old_order.price_pen,'seller_whatsapp',old_order.seller_whatsapp,
   'title',old_order.title,'already_processed',true);
 end if;
 select * into product from public.cc_portal_stream_products where id=p_product_id for update;
 if not found or product.status<>'ACTIVE' or product.stock<1 then
  raise exception 'Producto sin disponibilidad';end if;
 if product.seller_id=u then raise exception 'No puedes comprar tu propio producto';end if;
 if product.price_pen<>p_expected_price_pen then
  raise exception 'El precio cambió; actualiza el catálogo antes de confirmar';end if;
 phone:=pg_catalog.regexp_replace(product.whatsapp,'[^0-9]','','g');
 if phone !~ '^[1-9][0-9]{7,14}$' then raise exception 'Vendedor sin WhatsApp verificado';end if;
 select exists(select 1 from public.cc_admins where user_id=product.seller_id) into seller_valid;
 if not seller_valid then
  select exists(
   select 1 from public.cc_portal_super_resellers r
   join public.cc_memberships m on m.user_id=r.user_id and m.role='SUPER_RESELLER' and m.status='ACTIVE'
   join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
   join public.cc_subscriptions s on s.membership_id=m.id and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()
   where r.user_id=product.seller_id and r.enabled
  ) into seller_valid;
  if not seller_valid then raise exception 'El vendedor no tiene permiso o membresía vigente';end if;
  select admin_percent into percent from public.cc_portal_super_resellers where user_id=product.seller_id;
 else percent:=0;end if;
 percent:=coalesce(percent,20);
 fee:=round((product.price_pen-product.cost_pen)*percent/100,2);
 payable:=product.price_pen-fee;
 parts:=cc_internal.cc_portal_charge_unified(u,product.price_pen,'PURCHASE',
    'BUY-'||p_checkout_key::text,left('Compra '||product.service||': '||product.title,160));
 update public.cc_portal_stream_products set stock=stock-1 where id=product.id;
 insert into public.cc_portal_stream_orders(checkout_key,buyer_id,seller_id,product_id,service,title,
 price_pen,cost_pen,admin_percent,admin_fee_pen,seller_payable_pen,seller_whatsapp,wallet_parts)
 values(p_checkout_key,u,product.seller_id,product.id,product.service,product.title,
 product.price_pen,product.cost_pen,percent,fee,payable,phone,parts)
 returning id into oid;
 return jsonb_build_object('order_id',oid,'status','PAID_AWAITING_DELIVERY',
  'price_pen',product.price_pen,'seller_whatsapp',phone,'title',product.title,
  'already_processed',false);
end $$;
revoke all on function public.cc_portal_purchase_stream_product(uuid,uuid,numeric) from public,anon;
grant execute on function public.cc_portal_purchase_stream_product(uuid,uuid,numeric) to authenticated;
-- Entrega manual controlada; no liquidación automática, ni modificación de saldos.
create or replace function public.cc_portal_mark_stream_order_delivered(p_order_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null then raise exception 'No autenticado' using errcode='42501';end if;
 update public.cc_portal_stream_orders set status='FULFILLED',fulfilled_at=now()
 where id=p_order_id and status='PAID_AWAITING_DELIVERY'
  and (seller_id=u or exists(select 1 from public.cc_admins where user_id=u));
 return found;
end $$;
revoke all on function public.cc_portal_mark_stream_order_delivered(uuid) from public,anon;
grant execute on function public.cc_portal_mark_stream_order_delivered(uuid) to authenticated;
-- Plan único anual (365 días, el día de activación cuenta como día 1).
insert into public.cc_plans(business_id,code,title,billing_type,price_pen,is_active)
select id,'STREAM_365','STREAM BULLS · membresía 365 días','ONE_TIME',25,true
from public.cc_businesses where code='STREAM_BULLS'
on conflict(business_id,code) do nothing;
create or replace function public.cc_portal_buy_stream_membership(
 p_checkout_key uuid,p_expected_amount_pen numeric
) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();plan public.cc_plans%rowtype;biz uuid;member uuid;
 oldrecord public.cc_portal_stream_memberships_paid%rowtype;
 current_until timestamptz;begin_date date;starts timestamptz;finishes timestamptz;
 subscription uuid;parts jsonb;legacyrole text;
begin
 if u is null or p_checkout_key is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('CC-MEMBER:'||p_checkout_key::text,0));
 select * into oldrecord from public.cc_portal_stream_memberships_paid where checkout_key=p_checkout_key;
 if found then
  if oldrecord.user_id<>u then raise exception 'Referencia de otro usuario' using errcode='42501';end if;
  return jsonb_build_object('membership_id',oldrecord.membership_id,'subscription_id',oldrecord.subscription_id,
   'ends_at',oldrecord.ends_at,'amount_pen',oldrecord.amount_pen,'already_processed',true);
 end if;
 select id into biz from public.cc_businesses where code='STREAM_BULLS';
 select * into plan from public.cc_plans where business_id=biz and code='STREAM_365' and is_active for share;
 if not found or plan.price_pen<=0 or plan.price_pen<>p_expected_amount_pen
 then raise exception 'Precio de membresía actualizado o no disponible';end if;
 insert into public.cc_profiles(user_id) values(u) on conflict(user_id) do nothing;
 select m.id,m.role into member,legacyrole from public.cc_memberships m
 where m.user_id=u and m.business_id=biz for update;
 select max(s.end_at) into current_until
 from public.cc_subscriptions s where s.membership_id=member and s.status='ACTIVE' and s.end_at>now();
 begin_date:=case when current_until is not null
  then (current_until at time zone 'America/Lima')::date+1
  else (now() at time zone 'America/Lima')::date end;
 starts:=begin_date::timestamp at time zone 'America/Lima';
 finishes:=((begin_date+365)::timestamp at time zone 'America/Lima')-interval '1 second';
 parts:=cc_internal.cc_portal_charge_unified(u,plan.price_pen,'SUBSCRIPTION',
 'MEM-'||p_checkout_key::text,'Membresía STREAM BULLS · 365 días');
 if member is null then
  insert into public.cc_memberships(user_id,business_id,role,status,activated_at)
  values(u,biz,'RESELLER','ACTIVE',now()) returning id into member;
 else
  update public.cc_memberships set status='ACTIVE',activated_at=coalesce(activated_at,now())
  where id=member;
 end if;
 insert into public.cc_subscriptions(membership_id,plan_id,status,start_at,end_at)
 values(member,plan.id,'ACTIVE',starts,finishes) returning id into subscription;
 insert into public.cc_portal_stream_memberships_paid
 (checkout_key,user_id,membership_id,subscription_id,amount_pen,starts_at,ends_at,wallet_parts)
 values(p_checkout_key,u,member,subscription,plan.price_pen,starts,finishes,parts);
 return jsonb_build_object('membership_id',member,'subscription_id',subscription,
 'ends_at',finishes,'amount_pen',plan.price_pen,'already_processed',false);
end $$;
revoke all on function public.cc_portal_buy_stream_membership(uuid,numeric) from public,anon;
grant execute on function public.cc_portal_buy_stream_membership(uuid,numeric) to authenticated;
-- Corregir habilitación ADMIN: debe existir membresía STREAM vigente; sin falsos privilegios.
create or replace function public.cc_portal_admin_set_super_reseller(
 p_email text,p_enabled boolean,p_admin_percent numeric default 20
) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();target uuid;member uuid;
begin
 if actor is null or not exists(select 1 from public.cc_admins where user_id=actor)
 then raise exception 'Solo ADMIN' using errcode='42501';end if;
 if p_email is null or length(trim(p_email))<6 or p_enabled is null or p_admin_percent is null
  or p_admin_percent<0 or p_admin_percent>100 or p_admin_percent<>round(p_admin_percent,2)
 then raise exception 'Datos incorrectos';end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email)) limit 1;
 if target is null then raise exception 'Cuenta no registrada';end if;
 select m.id into member from public.cc_memberships m
 join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
 where m.user_id=target and m.status='ACTIVE'
  and exists(select 1 from public.cc_subscriptions s where s.membership_id=m.id
  and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now())
 for update of m;
 if p_enabled and member is null then raise exception 'Debe pagar membresía STREAM BULLS antes de publicar';end if;
 insert into public.cc_portal_super_resellers(user_id,enabled,admin_percent,granted_by,granted_at)
 values(target,p_enabled,p_admin_percent,actor,now())
 on conflict(user_id) do update set enabled=excluded.enabled,
 admin_percent=excluded.admin_percent,granted_by=excluded.granted_by,granted_at=now();
 if member is not null then
  update public.cc_memberships set role=case when p_enabled then 'SUPER_RESELLER' else 'RESELLER' end
  where id=member;
 end if;
 return jsonb_build_object('updated',true,'enabled',p_enabled);
end $$;
revoke all on function public.cc_portal_admin_set_super_reseller(text,boolean,numeric) from public,anon;
grant execute on function public.cc_portal_admin_set_super_reseller(text,boolean,numeric) to authenticated;
-- Publicaciones del ADMIN y SUPER requieren WhatsApp y autorización del servidor.
create or replace function public.cc_portal_publish_stream_product(
 p_service text,p_title text,p_duration_days int,p_price_pen numeric,
 p_cost_pen numeric,p_stock int,p_whatsapp text default '',
 p_description text default ''
) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();authorized boolean:=false;oid uuid;phone text;
begin
 if u is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 select exists(select 1 from public.cc_admins where user_id=u) into authorized;
 if not authorized then
  select exists(
    select 1 from public.cc_portal_super_resellers r
    join public.cc_memberships m on m.user_id=r.user_id and m.role='SUPER_RESELLER' and m.status='ACTIVE'
    join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
    join public.cc_subscriptions s on s.membership_id=m.id and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()
    where r.user_id=u and r.enabled
  ) into authorized;
 end if;
 if not authorized then raise exception 'No autorizado para publicar' using errcode='42501';end if;
 phone:=pg_catalog.regexp_replace(coalesce(p_whatsapp,''),'[^0-9]','','g');
 if phone !~ '^[1-9][0-9]{7,14}$'
  or length(coalesce(p_service,'')) not between 2 and 90
  or length(coalesce(p_title,'')) not between 4 and 180
  or length(coalesce(p_description,''))>1000
  or p_duration_days is null or p_duration_days not between 1 and 366
  or p_price_pen is null or p_price_pen<=0 or p_price_pen>10000
  or p_cost_pen is null or p_cost_pen<0 or p_cost_pen>p_price_pen
  or p_stock is null or p_stock<1 or p_stock>100000
 then raise exception 'Corrige los campos y el WhatsApp (código de país + número)';end if;
 insert into public.cc_portal_stream_products(seller_id,service,title,description,duration_days,
 price_pen,cost_pen,stock,whatsapp)
 values(u,trim(p_service),trim(p_title),coalesce(p_description,''),p_duration_days,
 p_price_pen,p_cost_pen,p_stock,phone) returning id into oid;
 return oid;
end $$;
revoke all on function public.cc_portal_publish_stream_product(text,text,int,numeric,numeric,int,text,text) from public,anon;
grant execute on function public.cc_portal_publish_stream_product(text,text,int,numeric,numeric,int,text,text) to authenticated;
