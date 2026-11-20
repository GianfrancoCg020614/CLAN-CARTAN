-- V398: additive human support. No financial tables or authentication changes.
-- Rollback: revert UI commit and revoke support RPC execute; preserve support history.
create table cc_internal.support398_tickets (
 id uuid primary key, owner_id uuid not null references auth.users(id),
 business text not null check(business in ('CLAN_CARTAN','COBRA_YA','MI_COCHERA','MI_ALQUILER','STREAM_BULLS')),
 reason text not null check(reason in ('Problema','Consulta','Sugerencia')),
 subject text not null check(length(btrim(subject)) between 3 and 160),
 status text not null default 'OPEN' check(status in ('OPEN','RESOLVED')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index support398_owner_status on cc_internal.support398_tickets(owner_id,status,updated_at desc,id);
create index support398_status on cc_internal.support398_tickets(status,updated_at desc,id);
create table cc_internal.support398_messages (
 id bigint generated always as identity primary key,
 ticket_id uuid not null references cc_internal.support398_tickets(id),
 sender_id uuid not null references auth.users(id), request_id uuid not null,
 attachment text,
 staff boolean not null, kind text not null default 'MESSAGE' check(kind in ('MESSAGE','STATUS')),
 body text not null check(length(btrim(body)) between 1 and 4000),
 created_at timestamptz not null default now(),unique(sender_id,request_id)
);
create index support398_thread on cc_internal.support398_messages(ticket_id,id desc);
alter table cc_internal.support398_tickets enable row level security;
alter table cc_internal.support398_messages enable row level security;
revoke all on cc_internal.support398_tickets,cc_internal.support398_messages from public,anon,authenticated;
-- Private implementation is privileged only to perform ownership-checked atomic writes.
create function cc_internal.support398(p_action text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a boolean; t cc_internal.support398_tickets; req uuid; v_body text; file_path text; result jsonb; lim integer; cursor_id bigint;
begin
 if u is null then raise exception 'Inicia sesión para consultar soporte' using errcode='42501';end if;
 a:=cc_internal.finance_admin();
 if p_action='context' then return jsonb_build_object('admin',a);end if;
 if p_action='list' then
  lim:=least(greatest(coalesce((p_data->>'limit')::int,20),1),50);
  select coalesce(jsonb_agg(x),'[]'::jsonb) into result from (
   select q.*, coalesce(d.full_name,p.display_name,split_part(c.email,'@',1)) as customer_name, case when a then c.email else null end as customer_email, (select m.body from cc_internal.support398_messages m where m.ticket_id=q.id order by m.id desc limit 1) as preview
   from cc_internal.support398_tickets q
   join auth.users c on c.id=q.owner_id left join public.cc_user_details d on d.user_id=q.owner_id left join public.cc_profiles p on p.user_id=q.owner_id
   where (q.owner_id=u or a) and q.status=coalesce(p_data->>'status','OPEN')
    and (coalesce(p_data->>'query','')='' or q.subject ilike '%'||left(p_data->>'query',100)||'%' or q.id::text ilike '%'||left(p_data->>'query',100)||'%' or concat_ws(' ',d.full_name,p.display_name,c.email) ilike '%'||left(p_data->>'query',100)||'%')
    and (not(p_data ? 'before') or (q.updated_at,q.id)<((p_data->>'before')::timestamptz,(p_data->>'before_id')::uuid))
   order by q.updated_at desc,q.id desc limit lim
  )x;return result;
 end if;
 if p_action='create' then
  req:=(p_data->>'request_id')::uuid;v_body:=btrim(p_data->>'body');
  if req is null or v_body is null or length(v_body) not between 1 and 4000 then raise exception 'Escribe tu consulta (máximo 4000 caracteres)';end if;
  insert into cc_internal.support398_tickets(id,owner_id,business,reason,subject)
   values(req,u,p_data->>'business',p_data->>'reason',btrim(p_data->>'subject')) on conflict(id) do nothing;
  select * into t from cc_internal.support398_tickets where id=req for update;
  if t.owner_id is distinct from u then raise exception 'Consulta no disponible' using errcode='42501';end if;
  insert into cc_internal.support398_messages(ticket_id,sender_id,request_id,staff,body) values(req,u,req,false,v_body) on conflict(sender_id,request_id) do nothing;
  return to_jsonb(t);
 end if;
 select * into t from cc_internal.support398_tickets where id=(p_data->>'ticket_id')::uuid for update;
 if t.id is null or (t.owner_id<>u and not a) then raise exception 'Consulta no disponible' using errcode='42501';end if;
 if p_action='thread' then
  cursor_id:=coalesce((p_data->>'before_id')::bigint,9223372036854775807);
  select coalesce(jsonb_agg(x order by x.id),'[]'::jsonb) into result from (
   select id,ticket_id,sender_id,staff,kind,body,attachment,created_at from cc_internal.support398_messages
   where ticket_id=t.id and id<cursor_id order by id desc limit 50
  )x;return jsonb_build_object('ticket',to_jsonb(t),'messages',result);
 end if;
 if p_action='send' then
  req:=(p_data->>'request_id')::uuid;v_body:=btrim(p_data->>'body');
  if req is null or v_body is null or length(v_body) not between 1 and 4000 then raise exception 'Escribe un mensaje (máximo 4000 caracteres)';end if;
  file_path:=nullif(p_data->>'attachment','');
  if file_path is not null and (split_part(file_path,'/',1)<>t.id::text or not exists(select 1 from storage.objects o where o.bucket_id='cc-support398' and o.name=file_path and o.owner_id=u::text)) then raise exception 'Adjunto no disponible';end if;
  insert into cc_internal.support398_messages(ticket_id,sender_id,request_id,staff,body,attachment)
   values(t.id,u,req,a,v_body,file_path) on conflict(sender_id,request_id) do nothing;
  if not found then
   if not exists(select 1 from cc_internal.support398_messages where sender_id=u and request_id=req and ticket_id=t.id and support398_messages.body=v_body and attachment is not distinct from file_path) then raise exception 'Solicitud ya utilizada';end if;
  else update cc_internal.support398_tickets set updated_at=clock_timestamp(),status='OPEN' where id=t.id;end if;
  return jsonb_build_object('ok',true);
 end if;
 if p_action='status' then
  if not a then raise exception 'Solo ADMIN puede resolver consultas' using errcode='42501';end if;
  if p_data->>'status' not in ('OPEN','RESOLVED') or p_data->>'status' is null then raise exception 'Estado inválido';end if;
  if t.status<>p_data->>'status' then
   update cc_internal.support398_tickets set status=p_data->>'status',updated_at=clock_timestamp() where id=t.id;
   insert into cc_internal.support398_messages(ticket_id,sender_id,request_id,staff,kind,body) values(t.id,u,(p_data->>'request_id')::uuid,true,'STATUS',case p_data->>'status' when 'RESOLVED' then 'Consulta solucionada por ADMIN' else 'Consulta reabierta por ADMIN' end);
  end if;
  return jsonb_build_object('ok',true);
 end if;
 raise exception 'Acción de soporte no válida';
end;$$;
revoke all on function cc_internal.support398(text,jsonb) from public,anon,authenticated;
grant usage on schema cc_internal to authenticated;
grant execute on function cc_internal.support398(text,jsonb) to authenticated;
create function public.cc_support398(p_action text,p_data jsonb default '{}') returns jsonb
language sql security invoker set search_path='' as $$select cc_internal.support398(p_action,p_data)$$;
revoke all on function public.cc_support398(text,jsonb) from public,anon,authenticated;
grant execute on function public.cc_support398(text,jsonb) to authenticated;
notify pgrst,'reload schema';

-- Screenshots are private; no public URL and no overwrite/delete of shared history.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('cc-support398','cc-support398',false,5242880,array['image/jpeg','image/png','image/webp']);
create function cc_internal.support398_file_access(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from cc_internal.support398_tickets t
 where t.id=case when split_part(p_path,'/',1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then split_part(p_path,'/',1)::uuid else null end and (t.owner_id=auth.uid() or cc_internal.finance_admin()))
$$;
revoke all on function cc_internal.support398_file_access(text) from public,anon,authenticated;
grant execute on function cc_internal.support398_file_access(text) to authenticated;
create policy support398_read on storage.objects for select to authenticated
 using(bucket_id='cc-support398' and cc_internal.support398_file_access(name));
create policy support398_upload on storage.objects for insert to authenticated
 with check(bucket_id='cc-support398' and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$' and cc_internal.support398_file_access(name));
