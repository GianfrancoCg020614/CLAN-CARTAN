-- Sondeo de avisos únicamente. Ninguna función de esta migración acredita dinero.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
alter table cc_internal.recharge_mail_connections add column last_scheduled_at timestamptz;
create table cc_internal.recharge_schedule(
 singleton boolean primary key default true check(singleton),enabled boolean not null default true,
 secret_id uuid not null references vault.secrets(id),secret_hash text not null,
 lease_until timestamptz,run_id uuid,last_tick_at timestamptz,last_started_at timestamptz,last_completed_at timestamptz,
 status text not null default 'WAITING_FOR_MAILBOX',examined integer not null default 0,detected integer not null default 0,failed integer not null default 0
);
alter table cc_internal.recharge_schedule enable row level security;
revoke all on cc_internal.recharge_schedule from public,anon,authenticated;
create policy service_only on cc_internal.recharge_schedule to service_role using(true) with check(true);
do $$declare token text;sid uuid;begin
 token:=encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex');
 sid:=vault.create_secret(token);
 insert into cc_internal.recharge_schedule(secret_id,secret_hash) values(sid,encode(sha256(convert_to(token,'UTF8')),'hex'));
end;$$;
create or replace function public.cc_recharge_schedule_status() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not cc_internal.finance_admin() then raise exception 'Solo ADMIN' using errcode='42501';end if;
 return(select jsonb_build_object('enabled',enabled,'interval_minutes',5,'status',status,'last_tick_at',last_tick_at,'last_completed_at',last_completed_at,'examined',examined,'detected',detected,'failed',failed,
 'connected_mailboxes',(select count(*) from cc_internal.recharge_mail_connections c join public.cc_admins a on a.user_id=c.owner_id where c.status='CONNECTED')) from cc_internal.recharge_schedule);
end;$$;
create or replace function public.cc_recharge_schedule_config(p_enabled boolean) returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not cc_internal.finance_admin() or p_enabled is null then raise exception 'Solo ADMIN' using errcode='42501';end if;
 update cc_internal.recharge_schedule set enabled=p_enabled,status=case when p_enabled then 'WAITING' else 'PAUSED' end;
 insert into cc_internal.recharge_audit(actor_id,action,details) values(auth.uid(),'MAIL_SCHEDULE_CONFIGURED',jsonb_build_object('enabled',p_enabled));
 return public.cc_recharge_schedule_status();end;$$;
create or replace function public.cc_recharge_schedule_service(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare s cc_internal.recharge_schedule%rowtype;jobs jsonb;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Solo servicio' using errcode='42501';end if;
 select * into s from cc_internal.recharge_schedule where singleton for update;
 if p_action='claim' then
  if coalesce(p_data->>'secret_hash','')<>s.secret_hash then raise exception 'Invocación no autorizada' using errcode='42501';end if;
  if not s.enabled then return jsonb_build_object('status','PAUSED','jobs','[]'::jsonb);end if;
  if s.lease_until>now() then return jsonb_build_object('status','BUSY','jobs','[]'::jsonb);end if;
  select coalesce(jsonb_agg(jsonb_build_object('actor_id',owner_id,'connection_id',id)),'[]') into jobs from(
   select c.id,c.owner_id from cc_internal.recharge_mail_connections c join public.cc_admins a on a.user_id=c.owner_id
   join cc_internal.recharge_mail_settings m on m.admin_id=c.owner_id and cardinality(m.allowed_senders)>0
   where c.status='CONNECTED' and c.token_secret_id is not null order by c.last_scheduled_at nulls first,c.id limit 1) q;
  update cc_internal.recharge_mail_connections set last_scheduled_at=now() where id in(select (j->>'connection_id')::uuid from jsonb_array_elements(jobs) j);
  update cc_internal.recharge_schedule set run_id=(p_data->>'run_id')::uuid,lease_until=now()+interval '3 minutes',last_started_at=now(),status='RUNNING',examined=0,detected=0,failed=0;
  return jsonb_build_object('status','READY','jobs',jobs);
 elsif p_action='finish' then
  if s.run_id is distinct from (p_data->>'run_id')::uuid then raise exception 'Ejecución reemplazada';end if;
  update cc_internal.recharge_schedule set lease_until=null,last_completed_at=now(),status=case when (p_data->>'failed')::int>0 then 'ERROR' when (p_data->>'jobs')::int=0 then 'WAITING_FOR_MAILBOX' else 'SUCCESS' end,
   examined=greatest(0,least(20,(p_data->>'examined')::int)),detected=greatest(0,least(20,(p_data->>'detected')::int)),failed=greatest(0,least(2,(p_data->>'failed')::int));
  return jsonb_build_object('saved',true);
 end if;raise exception 'Acción inválida';end;$$;
create or replace function cc_internal.recharge_schedule_dispatch() returns bigint language plpgsql security definer set search_path='' as $$
declare s cc_internal.recharge_schedule%rowtype;token text;request_id bigint;begin
 select * into s from cc_internal.recharge_schedule where singleton;
 update cc_internal.recharge_schedule set last_tick_at=now();
 if not s.enabled then return null;end if;
 if not exists(select 1 from cc_internal.recharge_mail_connections c join public.cc_admins a on a.user_id=c.owner_id where c.status='CONNECTED' and c.token_secret_id is not null) then
  update cc_internal.recharge_schedule set status='WAITING_FOR_MAILBOX';return null;end if;
 if not exists(select 1 from cc_internal.recharge_mail_connections c join public.cc_admins a on a.user_id=c.owner_id join cc_internal.recharge_mail_settings m on m.admin_id=c.owner_id and cardinality(m.allowed_senders)>0 where c.status='CONNECTED' and c.token_secret_id is not null) then
  update cc_internal.recharge_schedule set status='WAITING_FOR_SENDERS';return null;end if;
 if s.lease_until>now() then return null;end if;
 select decrypted_secret into token from vault.decrypted_secrets where id=s.secret_id;
 select net.http_post(url:='https://pqalxtrcyrpmwqdlibqd.supabase.co/functions/v1/cc-recharge-mail',body:='{"action":"scheduled_scan"}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||token),timeout_milliseconds:=150000) into request_id;
 return request_id;end;$$;
revoke all on function public.cc_recharge_schedule_status(),public.cc_recharge_schedule_config(boolean),public.cc_recharge_schedule_service(text,jsonb),cc_internal.recharge_schedule_dispatch() from public,anon,authenticated;
grant execute on function public.cc_recharge_schedule_status(),public.cc_recharge_schedule_config(boolean) to authenticated;
grant execute on function public.cc_recharge_schedule_service(text,jsonb) to service_role;
-- El cron solo almacena una llamada, nunca claves ni direcciones de correo.
select cron.schedule('cc-recharge-mail-every-five-minutes','*/5 * * * *','select cc_internal.recharge_schedule_dispatch();');
revoke all on schema net,cron from public,anon,authenticated;
revoke all on all tables in schema net,cron from public,anon,authenticated;
