-- CLAN CARTAN V170 · flyers STREAM BULL'S, SIN duplicar catálogo/productos.
-- Migración aditiva única; no altera billetera, precios, stock ni compras.
alter table public.cc_portal_stream_products
  add column if not exists flyer_path text;

-- Bucket exclusivo, solo archivos de imagen públicos: nunca subir contraseñas,
-- documentos ni información privada. Máximo 5 MiB.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cc-stream-flyers','cc-stream-flyers',true,5242880,
       array['image/jpeg','image/png','image/webp']::text[])
on conflict(id) do nothing;

-- Evitar sustituir accidentalmente un bucket existente con configuración insegura.
-- Si se había creado este bucket, endurecer sus restricciones.
update storage.buckets
set public=true,
    file_size_limit=5242880,
    allowed_mime_types=array['image/jpeg','image/png','image/webp']::text[]
where id='cc-stream-flyers';

-- Ruta única e inmutable: vendedor_uuid/producto_uuid/archivo_uuid.ext
-- Sin INSERT para afiliados, resellers comunes ni SUPER con membresía vencida.
drop policy if exists cc_stream_flyers_insert_v170 on storage.objects;
create policy cc_stream_flyers_insert_v170 on storage.objects
for insert to authenticated
with check(
 bucket_id='cc-stream-flyers'
 and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
 and exists (
  select 1 from public.cc_portal_stream_products p
  where p.id::text=split_part(name,'/',2)
    and p.seller_id::text=split_part(name,'/',1)
    and (
      exists(select 1 from public.cc_admins a
             where a.user_id=(select auth.uid()))
      or (
       p.seller_id=(select auth.uid())
       and exists(
        select 1 from public.cc_portal_super_resellers r
        join public.cc_memberships m on m.user_id=r.user_id
           and m.role='SUPER_RESELLER' and m.status='ACTIVE'
        join public.cc_businesses b on b.id=m.business_id
           and b.code='STREAM_BULLS'
        join public.cc_subscriptions s on s.membership_id=m.id
           and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()
        where r.user_id=(select auth.uid()) and r.enabled
       )
      )
    )
 )
);
-- No conceder UPDATE/DELETE directos: cada reemplazo crea un objeto nuevo;
-- el DB solo apunta a uno y nunca altera un archivo histórico de otro producto.

-- El mismo producto mantiene su identificador, precios, vendedor y stock.
-- El vendedor solo modifica SUS publicaciones; ADMIN puede auditar cualquier ficha.
create or replace function public.cc_portal_set_stream_product_flyer(
 p_product_id uuid, p_flyer_path text
) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
 actor uuid:=auth.uid();
 p public.cc_portal_stream_products%rowtype;
 authorized boolean;
begin
 if actor is null or p_product_id is null then
  raise exception 'Inicia sesión' using errcode='42501';
 end if;
 select * into p from public.cc_portal_stream_products
  where id=p_product_id for update;
 if not found then raise exception 'Publicación inexistente';end if;
 select exists(select 1 from public.cc_admins a where a.user_id=actor)
 into authorized;
 if not authorized then
  authorized:=p.seller_id=actor
    and exists(
     select 1 from public.cc_portal_super_resellers r
     join public.cc_memberships m on m.user_id=r.user_id
       and m.status='ACTIVE' and m.role='SUPER_RESELLER'
     join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
     join public.cc_subscriptions s on s.membership_id=m.id
       and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()
     where r.user_id=actor and r.enabled
    );
 end if;
 if not authorized then
  raise exception 'Sin permiso o membresía vigente para editar el flyer'
    using errcode='42501';
 end if;
 if p_flyer_path is not null then
  if char_length(p_flyer_path)>160
   or p_flyer_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
   or split_part(p_flyer_path,'/',1)<>p.seller_id::text
   or split_part(p_flyer_path,'/',2)<>p.id::text
   or not exists(select 1 from storage.objects o
      where o.bucket_id='cc-stream-flyers' and o.name=p_flyer_path)
  then raise exception 'Flyer no encontrado o no pertenece a esta publicación'
    using errcode='22023';end if;
 end if;
 update public.cc_portal_stream_products
 set flyer_path=p_flyer_path where id=p.id;
 return jsonb_build_object('updated',true,'product_id',p.id,
    'flyer_path',p_flyer_path);
end $$;
revoke all on function public.cc_portal_set_stream_product_flyer(uuid,text)
 from public,anon;
grant execute on function public.cc_portal_set_stream_product_flyer(uuid,text)
 to authenticated;

-- El panel solo lee la ruta; no otorgamos acceso a costos privados.
grant select(flyer_path) on public.cc_portal_stream_products to authenticated;

-- V2 conserva todos los filtros y validaciones de V169.
-- No reemplazar v1: así no rompemos clientes anteriores.
create or replace function public.cc_portal_public_catalog_v2()
returns table(
 id uuid,service text,title text,description text,duration_days integer,
 price_pen numeric,stock integer,flyer_path text
)
language sql stable security definer set search_path=''
as $$
 select c.id,c.service,c.title,c.description,c.duration_days,
        c.price_pen,c.stock,p.flyer_path
 from public.cc_portal_public_catalog() c
 join public.cc_portal_stream_products p on p.id=c.id
 order by p.created_at desc,p.id
$$;
revoke all on function public.cc_portal_public_catalog_v2()
 from public,anon,authenticated;
grant execute on function public.cc_portal_public_catalog_v2()
 to anon,authenticated;
