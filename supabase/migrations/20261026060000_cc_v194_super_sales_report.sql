-- V194: regla comercial solicitada: la comisión ADMIN se calcula sobre el precio REAL de venta,
-- no sobre el margen precio - costo. No cambia registros históricos ni mueve billeteras.
-- Ejecutar en STAGING primero y validar contra versiones posteriores de la RPC.
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
 fee:=round(product.price_pen*percent/100,2);
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

-- Vista de reporte para el ADMIN y el vendedor (seguridad por usuario autenticado).
create or replace function public.cc_portal_sales_report_v194(p_seller uuid,p_from date,p_to date)
returns table(order_id uuid,seller_id uuid,product_id uuid,sale_date date,
 service text,product_title text,order_status text,price_pen numeric,
 cost_pen numeric,admin_percent numeric,admin_fee_pen numeric,seller_payable_pen numeric)
language plpgsql stable security definer set search_path='' as $fn$
declare actor uuid:=auth.uid();
begin
 if actor is null or p_seller is null or p_from is null or p_to is null or p_from>p_to
  or p_to-p_from>366 then raise exception 'Filtro inválido' using errcode='22023';end if;
 if actor<>p_seller and not exists(select 1 from public.cc_admins a where a.user_id=actor)
 then raise exception 'Reporte no autorizado' using errcode='42501';end if;
 return query select o.id,o.seller_id,o.product_id,
 (o.created_at at time zone 'America/Lima')::date,o.service,o.title,o.status,
 o.price_pen,o.cost_pen,o.admin_percent,o.admin_fee_pen,o.seller_payable_pen
 from public.cc_portal_stream_orders o where o.seller_id=p_seller
 and o.created_at>=((p_from::timestamp) at time zone 'America/Lima')
 and o.created_at<(((p_to+1)::timestamp) at time zone 'America/Lima')
 order by o.created_at,o.id;
end $fn$;
revoke all on function public.cc_portal_sales_report_v194(uuid,date,date) from public,anon;
grant execute on function public.cc_portal_sales_report_v194(uuid,date,date) to authenticated;
