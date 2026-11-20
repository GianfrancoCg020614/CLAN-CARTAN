-- Controlled local database only. Fixture UUIDs are not production users.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.cc_support398('create','{"request_id":"10000000-0000-0000-0000-000000000001","subject":"Consulta controlada","business":"MI_COCHERA","reason":"Problema","body":"Mensaje de prueba"}');
select public.cc_support398('create','{"request_id":"10000000-0000-0000-0000-000000000001","subject":"Consulta controlada","business":"MI_COCHERA","reason":"Problema","body":"Mensaje de prueba"}');
do $$begin
 if jsonb_array_length(public.cc_support398('list','{"query":"Consulta controlada"}'))<>1 then raise exception 'Create duplicate';end if;
 if jsonb_array_length(public.cc_support398('thread','{"ticket_id":"10000000-0000-0000-0000-000000000001"}')->'messages')<>1 then raise exception 'Message duplicate';end if;
 begin perform * from cc_internal.support398_tickets;raise exception 'Direct read allowed';exception when insufficient_privilege then null;end;
 begin perform public.cc_support398('status','{"ticket_id":"10000000-0000-0000-0000-000000000001","status":"RESOLVED"}');raise exception 'Owner resolved as ADMIN';exception when insufficient_privilege then null;end;
end$$;
insert into storage.objects(bucket_id,name,owner_id) values('cc-support398','10000000-0000-0000-0000-000000000001/10000000-0000-0000-0000-000000000099.png','00000000-0000-0000-0000-000000000001');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$begin
 if jsonb_array_length(public.cc_support398('list','{"query":"Consulta controlada"}'))<>0 then raise exception 'Other-owner list leak';end if;
 if exists(select 1 from storage.objects where bucket_id='cc-support398') then raise exception 'Other-owner attachment leak';end if;
 begin insert into storage.objects(bucket_id,name,owner_id) values('cc-support398','10000000-0000-0000-0000-000000000001/20000000-0000-0000-0000-000000000099.png','00000000-0000-0000-0000-000000000002');raise exception 'Cross-ticket upload';exception when insufficient_privilege then null;end;
 begin perform public.cc_support398('thread','{"ticket_id":"10000000-0000-0000-0000-000000000001"}');raise exception 'Thread leak';exception when insufficient_privilege then null;end;
 begin perform public.cc_support398('send','{"ticket_id":"10000000-0000-0000-0000-000000000001","body":"forged","request_id":"20000000-0000-0000-0000-000000000001"}');raise exception 'Other owner sent';exception when insufficient_privilege then null;end;
 begin perform public.cc_support398('create','{"request_id":"10000000-0000-0000-0000-000000000001","subject":"ID collision","business":"MI_COCHERA","reason":"Problema","body":"forged"}');raise exception 'Owner overwritten';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.cc_support398('send','{"ticket_id":"10000000-0000-0000-0000-000000000001","request_id":"30000000-0000-0000-0000-000000000001","body":"Respuesta humana ADMIN"}');
select public.cc_support398('send','{"ticket_id":"10000000-0000-0000-0000-000000000001","request_id":"30000000-0000-0000-0000-000000000001","body":"Respuesta humana ADMIN"}');
select public.cc_support398('status','{"ticket_id":"10000000-0000-0000-0000-000000000001","request_id":"30000000-0000-0000-0000-000000000002","status":"RESOLVED"}');
do $$begin
 if not (public.cc_support398('context','{}')->>'admin')::boolean then raise exception 'Admin context';end if;
 if jsonb_array_length(public.cc_support398('list','{"status":"RESOLVED","query":"Consulta controlada"}'))<>1 then raise exception 'Solved list';end if;
 if jsonb_array_length(public.cc_support398('thread','{"ticket_id":"10000000-0000-0000-0000-000000000001"}')->'messages')<>3 then raise exception 'Admin dedup';end if;
end$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.cc_support398('send','{"ticket_id":"10000000-0000-0000-0000-000000000001","request_id":"10000000-0000-0000-0000-000000000002","body":"Reapertura por cliente"}');
do $$begin
 if public.cc_support398('thread','{"ticket_id":"10000000-0000-0000-0000-000000000001"}')->'ticket'->>'status'<>'OPEN' then raise exception 'Reopen failed';end if;
 if public.cc_support398('context','{}')->>'admin'<>'false' then raise exception 'Owner admin';end if;
end$$;
select set_config('request.jwt.claim.sub','',true);
do $$begin
 begin perform public.cc_support398('list','{"query":"Consulta controlada"}');raise exception 'Unsigned access';exception when insufficient_privilege then null;end;
end$$;
rollback;
