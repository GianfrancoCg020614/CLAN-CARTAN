-- CLAN CARTAN · MI ALQUILER V161.4 · auditoría de apertura de avisos.
-- No acredita que WhatsApp haya enviado o entregado un mensaje.
create table if not exists public.ma_whatsapp_notice_events (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 reseller_id uuid not null references auth.users(id),
 lease_id uuid not null references public.ma_leases(id),
 tenant_id uuid not null references public.ma_tenants(id),
 phone_snapshot text not null check(length(phone_snapshot) between 9 and 18),
 due_on date not null,
 event_type text not null default 'OPENED' check(event_type = 'OPENED'),
 created_at timestamptz not null default now()
);
create index if not exists ma_whatsapp_notices_owner_created on public.ma_whatsapp_notice_events(reseller_id,created_at desc);
create index if not exists ma_whatsapp_notices_lease_due on public.ma_whatsapp_notice_events(lease_id,due_on);
alter table public.ma_whatsapp_notice_events enable row level security;
revoke all on public.ma_whatsapp_notice_events from anon,authenticated;
grant select on public.ma_whatsapp_notice_events to authenticated;
drop policy if exists ma_whatsapp_notice_select on public.ma_whatsapp_notice_events;
create policy ma_whatsapp_notice_select on public.ma_whatsapp_notice_events for select to authenticated
 using(reseller_id=(select auth.uid()) and (select public.ma_can_use()));

create or replace function public.ma_log_notice(p_lease uuid,p_due_on date,p_phone text,p_request uuid)
returns uuid language plpgsql security definer set search_path = '' as $fn$
declare actor uuid:=public.ma_guard();rec record;result uuid;
begin
 if p_request is null or p_due_on is null or p_phone is null then raise exception 'Datos de aviso incompletos';end if;
 select l.id as lease_id,l.tenant_id,l.next_due_on,l.state,t.whatsapp,t.consent_whatsapp
   into rec from public.ma_leases l join public.ma_tenants t on t.id=l.tenant_id and t.reseller_id=l.reseller_id
   where l.id=p_lease and l.reseller_id=actor;
 if rec.lease_id is null or rec.state<>'ACTIVE' then raise exception 'Contrato no autorizado o cerrado';end if;
 if rec.consent_whatsapp is not true then raise exception 'Inquilino sin autorización para avisos';end if;
 if rec.whatsapp is null or regexp_replace(rec.whatsapp,'[^0-9]','','g')<>regexp_replace(p_phone,'[^0-9]','','g') then
   raise exception 'El WhatsApp cambió; actualiza el aviso';
 end if;
 if rec.next_due_on<>p_due_on then raise exception 'Vencimiento actualizado; refresca el aviso';end if;
 insert into public.ma_whatsapp_notice_events(request_id,reseller_id,lease_id,tenant_id,phone_snapshot,due_on)
 values(p_request,actor,rec.lease_id,rec.tenant_id,rec.whatsapp,rec.next_due_on)
 on conflict(request_id) do nothing returning id into result;
 if result is null then
  select id into result from public.ma_whatsapp_notice_events where request_id=p_request and reseller_id=actor;
  if result is null then raise exception 'Identificador de aviso utilizado';end if;
 end if;
 return result;
end $fn$;
revoke all on function public.ma_log_notice(uuid,date,text,uuid) from public,anon,authenticated;
grant execute on function public.ma_log_notice(uuid,date,text,uuid) to authenticated;
comment on table public.ma_whatsapp_notice_events is 'OPENED significa enlace WhatsApp abierto, no envío confirmado';