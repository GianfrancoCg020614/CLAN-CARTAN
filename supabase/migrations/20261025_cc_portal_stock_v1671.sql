-- V167.1 · editar stock, estado y WhatsApp; sin alterar compras ni saldos.
create or replace function public.cc_portal_update_stream_product(
 p_product_id uuid,p_stock int default null,p_status text default null,p_whatsapp text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();r public.cc_portal_stream_products%rowtype;
 can_modify boolean:=false;phone text;
begin
 if u is null or p_product_id is null then
  raise exception 'Inicia sesión' using errcode='42501';end if;
 select * into r from public.cc_portal_stream_products where id=p_product_id for update;
 if not found then raise exception 'Publicación no encontrada';end if;
 can_modify:=r.seller_id=u or exists(select 1 from public.cc_admins where user_id=u);
 if not can_modify then raise exception 'No autorizado' using errcode='42501';end if;
 if p_stock is not null and p_stock not between 0 and 100000 then
  raise exception 'Stock inválido';end if;
 if p_status is not null and p_status not in ('ACTIVE','PAUSED') then
  raise exception 'Estado inválido';end if;
 if p_whatsapp is not null then
  phone:=pg_catalog.regexp_replace(p_whatsapp,'[^0-9]','','g');
  if phone !~ '^[1-9][0-9]{7,14}$' then raise exception 'WhatsApp inválido';end if;
 end if;
 -- Si el vendedor perdió autorización, solo puede PAUSAR y no aumentar stock.
 if r.seller_id=u and not exists(select 1 from public.cc_admins where user_id=u) then
  if not exists(
    select 1 from public.cc_portal_super_resellers g
    join public.cc_memberships m on m.user_id=g.user_id and m.role='SUPER_RESELLER' and m.status='ACTIVE'
    join public.cc_businesses b on b.id=m.business_id and b.code='STREAM_BULLS'
    join public.cc_subscriptions s on s.membership_id=m.id and s.status='ACTIVE' and s.start_at<=now() and s.end_at>now()
    where g.user_id=u and g.enabled
  ) and (coalesce(p_status,r.status)<>'PAUSED' or coalesce(p_stock,r.stock)>r.stock)
  then raise exception 'La membresía expiró; solo puedes pausar el producto' using errcode='42501';end if;
 end if;
 update public.cc_portal_stream_products
  set stock=coalesce(p_stock,stock),status=coalesce(p_status,status),
      whatsapp=coalesce(phone,whatsapp)
 where id=p_product_id
 returning * into r;
 return jsonb_build_object('id',r.id,'stock',r.stock,'status',r.status);
end $$;
revoke all on function public.cc_portal_update_stream_product(uuid,int,text,text) from public,anon;
grant execute on function public.cc_portal_update_stream_product(uuid,int,text,text) to authenticated;
