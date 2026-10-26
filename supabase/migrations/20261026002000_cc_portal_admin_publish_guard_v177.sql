-- V177 · Identidad ADMIN y separación entre administración y venta.
-- Conserva membresías, fondos, pedidos y usuarios existentes.
create or replace function public.cc_portal_admin_accounts_v2()
returns setof jsonb language plpgsql volatile security definer set search_path=''
as $fn$
begin
 if (select auth.uid()) is null or not exists
 (select 1 from public.cc_admins where user_id=(select auth.uid()))
 then raise exception 'Solo ADMIN puede consultar usuarios' using errcode='42501';end if;
 insert into public.cc_portal_user_registry(user_id,registered_at)
 select u.id,u.created_at from auth.users u
 where not exists(select 1 from public.cc_portal_user_registry r where r.user_id=u.id)
 order by u.created_at,u.id on conflict(user_id) do nothing;
 return query
 select to_jsonb(a)||jsonb_build_object(
  'user_id',u.id,
  'registry_no',r.registry_no,
  'registry_code','CLAN'||r.registry_no::text,
  'registry_alias',coalesce(nullif(r.display_alias,''),nullif(a.display_name,''),split_part(a.email,'@',1)),
  'registered_at',r.registered_at)
 from public.cc_portal_admin_accounts() a
 join auth.users u on lower(u.email)=lower(a.email)
 join public.cc_portal_user_registry r on r.user_id=u.id
 order by r.registry_no limit 250;
end;
$fn$;
revoke all on function public.cc_portal_admin_accounts_v2() from public,anon;
grant execute on function public.cc_portal_admin_accounts_v2() to authenticated;

-- ADMIN administra publicaciones pero no genera nuevas publicaciones comerciales.
create or replace function public.cc_portal_publish_stream_product_v2(
 p_service text,p_title text,p_duration_days integer,p_price_pen numeric,
 p_distributor_price_pen numeric,p_cost_pen numeric,p_stock integer,
 p_whatsapp text,p_description text
)
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare product_id uuid;actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Inicia sesión' using errcode='42501';end if;
 if exists(select 1 from public.cc_admins where user_id=actor)
 then raise exception 'ADMIN supervisa; la publicación corresponde exclusivamente a Súper reseller' using errcode='42501';end if;
 if p_price_pen is null or p_distributor_price_pen is null
   or p_price_pen<=0 or p_price_pen>10000
   or p_distributor_price_pen<=0 or p_distributor_price_pen>p_price_pen
   or p_cost_pen is null or p_cost_pen<0 or p_distributor_price_pen<p_cost_pen
   or p_price_pen<>round(p_price_pen,2)
   or p_distributor_price_pen<>round(p_distributor_price_pen,2)
   or p_cost_pen<>round(p_cost_pen,2)
 then raise exception 'Costo <= distribuidor <= público; dos decimales' using errcode='22023';end if;
 product_id:=public.cc_portal_publish_stream_product(
  p_service,p_title,p_duration_days,p_price_pen,p_cost_pen,
  p_stock,p_whatsapp,p_description);
 update public.cc_portal_stream_products
 set distributor_price_pen=p_distributor_price_pen
 where id=product_id and seller_id=actor;
 return product_id;
end;
$fn$;
revoke all on function public.cc_portal_publish_stream_product_v2(text,text,integer,numeric,numeric,numeric,integer,text,text) from public,anon;
grant execute on function public.cc_portal_publish_stream_product_v2(text,text,integer,numeric,numeric,numeric,integer,text,text) to authenticated;
-- Evita el camino antiguo que permitiría publicar directamente al ADMIN.
-- V2 se ejecuta como propietario y puede invocar el procedimiento interno.
revoke execute on function public.cc_portal_publish_stream_product(text,text,integer,numeric,numeric,integer,text,text) from authenticated,anon;
