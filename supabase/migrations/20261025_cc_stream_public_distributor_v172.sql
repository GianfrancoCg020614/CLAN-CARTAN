-- CLAN CARTAN V172 · STREAM BULL'S: PRECIO PÚBLICO / PRECIO DISTRIBUIDOR.
-- UN catálogo y UN producto, con precio efectivo decidido por la base de datos.
-- Desactiva pruebas gratuitas SIN tocar saldos, pedidos ni suscripciones pagadas.
-- Ejecutar una sola vez vía migración: cc_stream_public_distributor_v172.

-- La prueba gratuita V171 nunca se usó en producción. Deshabilitar sus dos
-- operaciones para todas las sesiones web, incluso si alguien conserva la URL.
revoke all on function public.cc_portal_admin_start_stream_trial(text,integer)
 from public,anon,authenticated;
revoke all on function public.cc_portal_admin_end_stream_trial(text)
 from public,anon,authenticated;
-- Su plan técnico anterior sigue inactivo; no puede adquirirse.
update public.cc_plans set is_active=false
where code='STREAM_TEST_7' and price_pen=0;

alter table public.cc_portal_stream_products
 add column if not exists distributor_price_pen numeric;

-- Publicaciones anteriores (si aparecen) conservan precio público sin descuento.
-- El costo de adquisición sigue siendo privado.
alter table public.cc_portal_stream_products
 add constraint cc_stream_distributor_price_v172
 check (
  distributor_price_pen is null
  or (distributor_price_pen>0
   and distributor_price_pen<=price_pen
   and distributor_price_pen>=cost_pen
   and distributor_price_pen=round(distributor_price_pen,2))
 );

-- NO conceder SELECT directo sobre esta columna: las ofertas públicas
-- se consultan solamente mediante las RPCs que comprueban membresía.
revoke select(distributor_price_pen) on public.cc_portal_stream_products from authenticated;

create or replace function cc_internal.cc_stream_distributor_eligible(p_user uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
 select p_user is not null and p_user=(select auth.uid()) and (
  exists(select 1 from public.cc_admins a where a.user_id=p_user)
  or exists(
   select 1 from public.cc_memberships m
   join public.cc_businesses b on b.id=m.business_id
     and b.code='STREAM_BULLS'
   join public.cc_subscriptions s on s.membership_id=m.id
      and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()
   join public.cc_plans plan on plan.id=s.plan_id
      and plan.code<>'STREAM_TEST_7' and plan.price_pen>0
   where m.user_id=p_user and m.status='ACTIVE'
     and m.role in ('RESELLER','SUPER_RESELLER')
  )
 );
$$;
revoke all on function cc_internal.cc_stream_distributor_eligible(uuid)
 from public,anon,authenticated;

-- Publicación V2: valida precios y reutiliza íntegramente la RPC existente
-- (roles, permisos, stock, descripción, teléfono y autor).
create or replace function public.cc_portal_publish_stream_product_v2(
 p_service text,p_title text,p_duration_days integer,
 p_price_pen numeric,p_distributor_price_pen numeric,p_cost_pen numeric,
 p_stock integer,p_whatsapp text,p_description text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare product_id uuid;
begin
 if auth.uid() is null then
  raise exception 'Inicia sesión' using errcode='42501';end if;
 if p_price_pen is null or p_distributor_price_pen is null
    or p_price_pen<=0 or p_price_pen>10000
    or p_distributor_price_pen<=0 or p_distributor_price_pen>p_price_pen
    or p_cost_pen is null or p_cost_pen<0
    or p_distributor_price_pen<p_cost_pen
    or p_price_pen<>round(p_price_pen,2)
    or p_distributor_price_pen<>round(p_distributor_price_pen,2)
    or p_cost_pen<>round(p_cost_pen,2)
 then raise exception 'El costo debe ser menor o igual al precio distribuidor, y este al público. Usa dos decimales como máximo'
 using errcode='22023';end if;
 product_id:=public.cc_portal_publish_stream_product(
   p_service,p_title,p_duration_days,p_price_pen,p_cost_pen,
   p_stock,p_whatsapp,p_description);
 update public.cc_portal_stream_products
 set distributor_price_pen=p_distributor_price_pen
 where id=product_id and seller_id=auth.uid();
 return product_id;
end $$;
revoke all on function public.cc_portal_publish_stream_product_v2(
 text,text,integer,numeric,numeric,numeric,integer,text,text
) from public,anon;
grant execute on function public.cc_portal_publish_stream_product_v2(
 text,text,integer,numeric,numeric,numeric,integer,text,text
) to authenticated;

-- Edición de ambos precios EN LA MISMA ficha, sin duplicar productos.
create or replace function public.cc_portal_update_stream_prices(
 p_product_id uuid,p_public_price_pen numeric,p_distributor_price_pen numeric
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare actor uuid:=auth.uid();product public.cc_portal_stream_products%rowtype;
 can_edit boolean;
begin
 if actor is null or p_product_id is null
 then raise exception 'Inicia sesión' using errcode='42501';end if;
 select * into product from public.cc_portal_stream_products
  where id=p_product_id for update;
 if not found then raise exception 'Publicación no encontrada';end if;
 select exists(select 1 from public.cc_admins where user_id=actor)
   into can_edit;
 if not can_edit then
  can_edit:=product.seller_id=actor and exists(
    select 1 from public.cc_portal_super_resellers sr
    join public.cc_memberships m on m.user_id=sr.user_id
      and m.status='ACTIVE' and m.role='SUPER_RESELLER'
    join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
    join public.cc_subscriptions s on s.membership_id=m.id
      and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()
    join public.cc_plans plan on plan.id=s.plan_id
      and plan.code<>'STREAM_TEST_7' and plan.price_pen>0
    where sr.user_id=actor and sr.enabled
  );
 end if;
 if not can_edit then raise exception 'No autorizado a editar precios'
   using errcode='42501';end if;
 if p_public_price_pen is null or p_distributor_price_pen is null
    or p_public_price_pen<=0 or p_public_price_pen>10000
    or p_distributor_price_pen<product.cost_pen
    or p_distributor_price_pen<=0
    or p_distributor_price_pen>p_public_price_pen
    or p_public_price_pen<>round(p_public_price_pen,2)
    or p_distributor_price_pen<>round(p_distributor_price_pen,2)
 then raise exception 'Precios inválidos: costo ≤ distribuidor ≤ público (máximo dos decimales)'
   using errcode='22023';end if;
 update public.cc_portal_stream_products
 set price_pen=p_public_price_pen, distributor_price_pen=p_distributor_price_pen
 where id=p_product_id;
 return jsonb_build_object('updated',true,'id',p_product_id,
  'public_price_pen',p_public_price_pen,
  'distributor_price_pen',p_distributor_price_pen);
end $$;
revoke all on function public.cc_portal_update_stream_prices(uuid,numeric,numeric)
 from public,anon;
grant execute on function public.cc_portal_update_stream_prices(uuid,numeric,numeric)
 to authenticated;

-- Panel ADMIN y SUPER: consultar precios de sus publicaciones incluso PAUSADAS.
create or replace function public.cc_portal_my_stream_prices()
returns table(id uuid,public_price_pen numeric,distributor_price_pen numeric)
language plpgsql stable security definer set search_path=''
as $$
declare actor uuid:=auth.uid();admin_role boolean;
begin
 if actor is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 select exists(select 1 from public.cc_admins a where a.user_id=actor)
 into admin_role;
 if not admin_role and not exists(
   select 1 from public.cc_portal_super_resellers sr
   join public.cc_memberships m on m.user_id=sr.user_id
      and m.role='SUPER_RESELLER' and m.status='ACTIVE'
   join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
   join public.cc_subscriptions s on s.membership_id=m.id and s.status='ACTIVE'
      and s.start_at<=now() and s.end_at>now()
   join public.cc_plans plan on plan.id=s.plan_id
      and plan.code<>'STREAM_TEST_7' and plan.price_pen>0
   where sr.user_id=actor and sr.enabled
 ) then return; end if;
 return query
 select p.id,p.price_pen,coalesce(p.distributor_price_pen,p.price_pen)
 from public.cc_portal_stream_products p
 where admin_role or p.seller_id=actor
 order by p.created_at desc limit 200;
end $$;
revoke all on function public.cc_portal_my_stream_prices() from public,anon;
grant execute on function public.cc_portal_my_stream_prices() to authenticated;

-- Único catálogo público V3. El precio de distribuidor se envía ÚNICAMENTE
-- a ADMIN o RESELLER/SUPER_RESELLER con membresía pagada y vigente.
create or replace function public.cc_portal_public_catalog_v3()
returns table(
 id uuid,service text,title text,description text,duration_days integer,
 price_pen numeric,public_price_pen numeric,distributor_price_pen numeric,
 price_tier text,stock integer,flyer_path text
)
language sql stable security definer set search_path=''
as $$
 select c.id,c.service,c.title,c.description,c.duration_days,
        case when a.allowed
          then coalesce(p.distributor_price_pen,p.price_pen)
          else p.price_pen end as price_pen,
        p.price_pen as public_price_pen,
        case when a.allowed
          then coalesce(p.distributor_price_pen,p.price_pen)
          else null end as distributor_price_pen,
        case when a.allowed then 'DISTRIBUTOR' else 'PUBLIC' end as price_tier,
        c.stock,c.flyer_path
 from public.cc_portal_public_catalog_v2() c
 join public.cc_portal_stream_products p on p.id=c.id
 cross join lateral (
  select cc_internal.cc_stream_distributor_eligible(auth.uid()) as allowed
 ) a
 order by p.created_at desc,p.id
$$;
revoke all on function public.cc_portal_public_catalog_v3()
 from public,anon,authenticated;
grant execute on function public.cc_portal_public_catalog_v3()
 to anon,authenticated;

-- Checkout web: confirma precio de ESTE comprador con permisos de servidor.
create or replace function public.cc_portal_stream_price_for_me(p_product_id uuid)
returns jsonb
language plpgsql stable security definer set search_path=''
as $$
declare actor uuid:=auth.uid();product public.cc_portal_stream_products%rowtype;
 eligible boolean;
begin
 if actor is null or p_product_id is null
 then raise exception 'Inicia sesión' using errcode='42501';end if;
 if not exists(select 1 from public.cc_portal_public_catalog_v2() c
   where c.id=p_product_id)
 then raise exception 'Producto sin disponibilidad';end if;
 select * into strict product from public.cc_portal_stream_products
 where id=p_product_id and status='ACTIVE' and stock>0;
 eligible:=cc_internal.cc_stream_distributor_eligible(actor);
 return jsonb_build_object('id',product.id,'title',product.title,
   'service',product.service,'seller_id',product.seller_id,
   'status',product.status,'stock',product.stock,
   'price_pen',case when eligible
      then coalesce(product.distributor_price_pen,product.price_pen)
      else product.price_pen end,
   'price_tier',case when eligible then 'DISTRIBUTOR' else 'PUBLIC' end);
end $$;
revoke all on function public.cc_portal_stream_price_for_me(uuid)
 from public,anon;
grant execute on function public.cc_portal_stream_price_for_me(uuid)
 to authenticated;

-- Mismo checkout V167, misma idempotencia, mismo monedero y comisión:
-- SOLO cambia el precio efectivo que el servidor calcula y verifica.
create or replace function public.cc_portal_purchase_stream_product(
 p_product_id uuid,p_checkout_key uuid,p_expected_price_pen numeric
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 u uuid:=auth.uid();product public.cc_portal_stream_products%rowtype;
 old_order public.cc_portal_stream_orders%rowtype;
 seller_valid boolean:=false;percent numeric:=0;fee numeric;payable numeric;
 parts jsonb;oid uuid;phone text;effective_price numeric;
 distributor boolean;
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
 select * into product from public.cc_portal_stream_products
 where id=p_product_id for update;
 if not found or product.status<>'ACTIVE' or product.stock<1 then
  raise exception 'Producto sin disponibilidad';end if;
 if product.seller_id=u then raise exception 'No puedes comprar tu propio producto';end if;
 distributor:=cc_internal.cc_stream_distributor_eligible(u);
 effective_price:=case when distributor
   then coalesce(product.distributor_price_pen,product.price_pen)
   else product.price_pen end;
 if effective_price<>p_expected_price_pen then
  raise exception 'El precio o tipo de cliente cambió; actualiza el catálogo antes de confirmar';end if;
 phone:=pg_catalog.regexp_replace(product.whatsapp,'[^0-9]','','g');
 if phone !~ '^[1-9][0-9]{7,14}$' then
  raise exception 'Vendedor sin WhatsApp verificado';end if;
 select exists(select 1 from public.cc_admins where user_id=product.seller_id)
 into seller_valid;
 if not seller_valid then
  select exists(
    select 1 from public.cc_portal_super_resellers r
    join public.cc_memberships m on m.user_id=r.user_id
      and m.role='SUPER_RESELLER' and m.status='ACTIVE'
    join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
    join public.cc_subscriptions s on s.membership_id=m.id
      and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()
    join public.cc_plans plan on plan.id=s.plan_id
      and plan.code<>'STREAM_TEST_7' and plan.price_pen>0
    where r.user_id=product.seller_id and r.enabled
  ) into seller_valid;
  if not seller_valid then raise exception 'El vendedor no tiene permiso o membresía vigente';end if;
  select admin_percent into percent
  from public.cc_portal_super_resellers where user_id=product.seller_id;
 else percent:=0;end if;
 percent:=coalesce(percent,20);
 fee:=round((effective_price-product.cost_pen)*percent/100,2);
 payable:=effective_price-fee;
 parts:=cc_internal.cc_portal_charge_unified(u,effective_price,'PURCHASE',
    'BUY-'||p_checkout_key::text,
    left('Compra '||product.service||': '||product.title,160));
 update public.cc_portal_stream_products
 set stock=stock-1 where id=product.id;
 insert into public.cc_portal_stream_orders(
  checkout_key,buyer_id,seller_id,product_id,service,title,
  price_pen,cost_pen,admin_percent,admin_fee_pen,seller_payable_pen,
  seller_whatsapp,wallet_parts
 ) values(
  p_checkout_key,u,product.seller_id,product.id,product.service,product.title,
  effective_price,product.cost_pen,percent,fee,payable,phone,parts
 ) returning id into oid;
 return jsonb_build_object('order_id',oid,'status','PAID_AWAITING_DELIVERY',
  'price_pen',effective_price,'seller_whatsapp',phone,'title',product.title,
  'price_tier',case when distributor then 'DISTRIBUTOR' else 'PUBLIC' end,
  'already_processed',false);
end $$;
-- Garantizar que el checkout siga prohibido para visitantes.
revoke all on function public.cc_portal_purchase_stream_product(uuid,uuid,numeric)
 from public,anon;
grant execute on function public.cc_portal_purchase_stream_product(uuid,uuid,numeric)
 to authenticated;
