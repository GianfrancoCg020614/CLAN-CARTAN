-- MI COCHERA V375 — propuesta de migración ADITIVA, NO APLICADA
-- Revisar respaldo, permisos, tests y despliegue antes de ejecutar.
begin;
create table if not exists public.mc_payment_requests (
  reseller_id uuid not null,
  request_id uuid not null,
  cart_id bigint not null,
  payload jsonb not null,
  movement_id uuid,
  created_at timestamptz not null default now(),
  primary key (reseller_id,request_id)
);
alter table public.mc_payment_requests enable row level security;
revoke all on public.mc_payment_requests from public,anon,authenticated;
create or replace function public.mc_record_payment_once(
  p_cart bigint, p_amount numeric, p_method text, p_request uuid
) returns uuid language plpgsql security definer set search_path='' as $fn$
declare
 u uuid:=auth.uid(); existing public.mc_payment_requests%rowtype;
 fingerprint jsonb; result uuid;
begin
 if u is null then raise exception 'Sesión requerida'; end if;
 if p_request is null then raise exception 'Identificador de solicitud requerido'; end if;
 if p_amount is null or p_amount<=0 or p_amount<>round(p_amount,2) then
  raise exception 'Importe inválido';
 end if;
 if p_method is null or length(trim(p_method))=0 then raise exception 'Medio requerido';end if;
 fingerprint:=jsonb_build_object('cart',p_cart,'amount',p_amount,'method',trim(p_method));
 insert into public.mc_payment_requests(reseller_id,request_id,cart_id,payload)
 values(u,p_request,p_cart,fingerprint)
 on conflict do nothing;
 select * into existing from public.mc_payment_requests
 where reseller_id=u and request_id=p_request for update;
 if not found then raise exception 'Solicitud no encontrada'; end if;
 if existing.payload<>fingerprint then raise exception 'Identificador reutilizado con datos diferentes';end if;
 if existing.movement_id is not null then return existing.movement_id;end if;
 -- La llamada original conserva validación de propietario, membresía, bloqueo del carrito y deuda.
 result:=public.mc_record_movement(p_cart,'PAYMENT','Abono recibido',null,null,-p_amount,p_method);
 update public.mc_payment_requests set movement_id=result
 where reseller_id=u and request_id=p_request;
 return result;
end $fn$;
revoke all on function public.mc_record_payment_once(bigint,numeric,text,uuid) from public,anon;
grant execute on function public.mc_record_payment_once(bigint,numeric,text,uuid) to authenticated;
commit;
