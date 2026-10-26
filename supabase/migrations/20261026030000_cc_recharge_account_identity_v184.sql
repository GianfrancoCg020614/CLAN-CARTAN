-- V184 · Cola de recargas con identidad verificada de la cuenta CLAN CARTAN.
-- El nombre del depositante declarado NO sustituye el nombre/registro/correo del titular.
-- RPC exclusiva de ADMIN. Solo lectura: no mueve saldos ni cambia solicitudes.
create or replace function public.cc_admin_manual_recharge_queue_v184()
returns table(
  request_id uuid,
  order_id uuid,
  user_id uuid,
  service text,
  amount_pen numeric,
  payer_name text,
  payer_reference text,
  created_at timestamptz,
  registry_no bigint,
  registry_code text,
  registered_alias text,
  registered_name text,
  registered_email text
)
language plpgsql stable security definer set search_path=''
as $fn$
begin
 if (select auth.uid()) is null or not exists (
  select 1 from public.cc_admins a where a.user_id=(select auth.uid())
 ) then
  raise exception 'Solo ADMIN puede revisar la identidad de recargas' using errcode='42501';
 end if;
 return query
 select
  r.id, r.order_id, r.user_id, r.service, r.amount_pen,
  r.payer_name, r.payer_reference, r.created_at,
  reg.registry_no,
  case when reg.registry_no is not null then 'CLAN'||reg.registry_no::text else null end,
  coalesce(nullif(btrim(reg.display_alias),''), nullif(btrim(p.display_name),'')),
  coalesce(
   nullif(btrim(d.full_name),''),
   nullif(btrim(p.display_name),''),
   nullif(btrim(reg.display_alias),''),
   split_part(u.email,'@',1)
  ),
  u.email::text
 from public.cc_manual_recharge_requests r
 join auth.users u on u.id=r.user_id
 left join public.cc_portal_user_registry reg on reg.user_id=r.user_id
 left join public.cc_user_details d on d.user_id=r.user_id
 left join public.cc_profiles p on p.user_id=r.user_id
 where r.status='PENDING'
 order by r.created_at asc
 limit 100;
end;
$fn$;
revoke all on function public.cc_admin_manual_recharge_queue_v184() from public,anon;
grant execute on function public.cc_admin_manual_recharge_queue_v184() to authenticated;
