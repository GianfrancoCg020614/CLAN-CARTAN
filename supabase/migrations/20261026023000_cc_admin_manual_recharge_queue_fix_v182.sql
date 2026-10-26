-- V182 · Hotfix: error PostgreSQL "column reference user_id is ambiguous".
-- Causa: RETURNS TABLE(...) define una variable de salida user_id que
-- colisiona con cc_admins.user_id cuando el WHERE usa user_id sin alias.
-- Corrección estrictamente de lectura: no modifica solicitudes, billeteras ni cobros.
create or replace function public.cc_admin_manual_recharge_queue()
returns table(
 request_id uuid,order_id uuid,user_id uuid,service text,
 amount_pen numeric,payer_name text,payer_reference text,
 created_at timestamp with time zone
)
language plpgsql stable security definer set search_path=''
as $fn$
begin
 if (select auth.uid()) is null or not exists(
  select 1 from public.cc_admins a
  where a.user_id=(select auth.uid())
 ) then
  raise exception 'Solo ADMIN puede revisar recargas' using errcode='42501';
 end if;
 return query
 select
   r.id,r.order_id,r.user_id,r.service,r.amount_pen,
   r.payer_name,r.payer_reference,r.created_at
 from public.cc_manual_recharge_requests r
 where r.status='PENDING'
 order by r.created_at asc
 limit 100;
end;
$fn$;
revoke all on function public.cc_admin_manual_recharge_queue() from public,anon;
grant execute on function public.cc_admin_manual_recharge_queue() to authenticated;
