-- CLAN CARTAN V167.3 · Reglas comerciales privadas sin cambiar pagos ni saldos.
-- La venta muestra costo y comisión solo a su vendedor o ADMIN.
-- Buyers solo pueden ver registros propios, sin precio de compra del proveedor.
revoke select on table public.cc_portal_stream_products from authenticated;
grant select(id,seller_id,service,title,description,duration_days,price_pen,stock,status,created_at)
 on public.cc_portal_stream_products to authenticated;
-- Revocar acceso directo a las órdenes que contienen datos de rentabilidad.
revoke select on table public.cc_portal_stream_orders from authenticated;
create or replace function public.cc_portal_my_stream_orders(p_limit integer default 100)
returns table (
 id uuid,
 checkout_key uuid,
 buyer_id uuid,
 seller_id uuid,
 title text,
 price_pen numeric,
 admin_fee_pen numeric,
 seller_payable_pen numeric,
 seller_whatsapp text,
 status text,
 created_at timestamptz
) language sql stable security definer set search_path='' as $$
 with caller as (
  select auth.uid() as uid,
   exists(select 1 from public.cc_admins a where a.user_id=auth.uid()) as is_admin
 )
 select o.id,o.checkout_key,o.buyer_id,o.seller_id,o.title,o.price_pen,
  case when c.is_admin or o.seller_id=c.uid then o.admin_fee_pen else null::numeric end,
  case when c.is_admin or o.seller_id=c.uid then o.seller_payable_pen else null::numeric end,
  -- Buyer pagó y tiene derecho a contactar vendedor. Fuera de órdenes: no se expone.
  o.seller_whatsapp,o.status,o.created_at
 from public.cc_portal_stream_orders o cross join caller c
 where c.uid is not null and (o.buyer_id=c.uid or o.seller_id=c.uid or c.is_admin)
 order by o.created_at desc
 limit least(greatest(coalesce(p_limit,100),1),200);
$$;
revoke all on function public.cc_portal_my_stream_orders(integer) from public,anon;
grant execute on function public.cc_portal_my_stream_orders(integer) to authenticated;
