-- V152: schema de COBRA YA y cola de comprobantes, sin borrar datos.
create sequence if not exists public.cy_client_code_seq start with 1 increment by 1;
alter table public.cy_clients add column if not exists alias text;
alter table public.cy_clients add column if not exists client_code text;
alter table public.cy_clients alter column client_code set default 'CY-' || lpad(nextval('public.cy_client_code_seq')::text,6,'0');
update public.cy_clients set client_code='CY-' || lpad(nextval('public.cy_client_code_seq')::text,6,'0') where client_code is null;
create unique index if not exists cy_clients_client_code_unique on public.cy_clients(client_code);
create index if not exists cy_clients_owner_alias_idx on public.cy_clients(owner_id,lower(alias));
do $$ begin
 if not exists(select 1 from pg_constraint where conname='cy_clients_alias_length_v152') then
  alter table public.cy_clients add constraint cy_clients_alias_length_v152 check (alias is null or length(alias)<=80);
 end if;
end $$;
grant usage on sequence public.cy_client_code_seq to authenticated;

create or replace function public.cc_admin_manual_notification_queue(p_limit integer default 40)
returns table(request_id uuid,recipient_id uuid,recipient_email text,service text,method text,amount_pen numeric,operation_number text,status text,created_at timestamptz)
language plpgsql security definer set search_path to ''
as $$
begin
 if auth.uid() is null or not exists(select 1 from public.cc_admins a where a.user_id=auth.uid()) then
  raise exception 'Solo ADMIN puede consultar esta lista';
 end if;
 return query
 select n.id,n.user_id,u.email::text,n.service,n.method,n.amount_pen,n.operation_number,n.status,n.created_at
 from public.cc_manual_payment_notifications n
 join auth.users u on u.id=n.user_id
 order by n.created_at desc,n.id desc
 limit least(greatest(coalesce(p_limit,40),1),100);
end;
$$;
revoke all on function public.cc_admin_manual_notification_queue(integer) from public,anon;
grant execute on function public.cc_admin_manual_notification_queue(integer) to authenticated;
-- Importante: verificación de dinero exclusiva de cc_admin_credit_verified_personal_payment.
-- La cola solo describe una declaración del cliente. No acredita saldo.
