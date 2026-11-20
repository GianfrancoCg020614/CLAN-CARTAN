-- V399: support reasons and owned purchase selection. No order/payment mutations.
-- Snapshots preserve the support context without adding deletion restrictions to orders.
alter table cc_internal.support398_tickets add column order_id uuid,add column order_code text,add column order_title text;
alter table cc_internal.support398_tickets drop constraint support398_tickets_reason_check;
alter table cc_internal.support398_tickets add constraint support398_tickets_reason_check check(reason in ('Problema','Consulta','Sugerencia','Información de producto','Ayuda con mi compra','Propuesta de proveedor','Otro motivo'));
create function cc_internal.support399(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb; purchase record; purchase_id uuid; ticket_id uuid;
begin
 if u is null then raise exception 'Inicia sesión para consultar soporte' using errcode='42501';end if;
 if p_action='purchases' then
  select coalesce(jsonb_agg(x),'[]'::jsonb) into result from (
   select id,order_code,title,service,created_at,status from public.cc_portal_stream_orders
   where buyer_id=u and (not(p_data ? 'before') or (created_at,id)<((p_data->>'before')::timestamptz,(p_data->>'before_id')::uuid))
   order by created_at desc,id desc limit 20
  )x;return result;
 end if;
 if p_action='create' then
  if p_data->>'reason'='Ayuda con mi compra' then
   purchase_id:=nullif(p_data->>'order_id','')::uuid;
   select id,order_code,title into purchase from public.cc_portal_stream_orders where id=purchase_id and buyer_id=u;
   if not found then raise exception 'Selecciona una compra de tu cuenta' using errcode='42501';end if;
   p_data:=p_data||jsonb_build_object('business','STREAM_BULLS','subject',left('Pedido '||coalesce(purchase.order_code,purchase.id::text)||' · '||purchase.title,160));
  elsif nullif(p_data->>'order_id','') is not null then raise exception 'El pedido solo corresponde a Ayuda con mi compra';
  else p_data:=p_data||jsonb_build_object('subject',coalesce(nullif(btrim(p_data->>'subject'),''),p_data->>'reason'));end if;
  result:=cc_internal.support398('create',p_data);ticket_id:=(result->>'id')::uuid;
  if result->>'reason' is distinct from p_data->>'reason' then raise exception 'Esta solicitud ya fue utilizada para otra consulta';end if;
  if result->>'order_id' is not null and (result->>'order_id')::uuid is distinct from purchase_id then raise exception 'Esta solicitud ya corresponde a otro pedido';end if;
  if purchase_id is not null then
   update cc_internal.support398_tickets set order_id=purchase.id,order_code=purchase.order_code,order_title=purchase.title where id=ticket_id and owner_id=u and order_id is null;
   select to_jsonb(t) into result from cc_internal.support398_tickets t where t.id=ticket_id and t.owner_id=u;
  end if;
  return result;
 end if;
 return cc_internal.support398(p_action,p_data);
end;$$;
revoke all on function cc_internal.support399(text,jsonb) from public,anon,authenticated;
grant execute on function cc_internal.support399(text,jsonb) to authenticated;
create or replace function public.cc_support398(p_action text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select cc_internal.support399(p_action,p_data)$$;
-- Keep the existing public API explicitly available to signed-in users only.
revoke all on function public.cc_support398(text,jsonb) from public,anon,authenticated;
grant execute on function public.cc_support398(text,jsonb) to authenticated;
revoke all on function cc_internal.support398(text,jsonb) from authenticated;
notify pgrst,'reload schema';
