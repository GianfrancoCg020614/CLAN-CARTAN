begin;
insert into auth.users(id,email) values('a0000000-0000-4000-8000-000000000001','admin@scheduler.invalid'),('a0000000-0000-4000-8000-000000000002','buyer@scheduler.invalid');
insert into public.cc_admins values('a0000000-0000-4000-8000-000000000001');
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000002',true);
do $$begin begin perform public.cc_recharge_schedule_status();raise exception 'FAIL buyer scheduler';exception when insufficient_privilege then null;end;end;$$;
select set_config('request.jwt.claim.sub','a0000000-0000-4000-8000-000000000001',true);
select public.cc_recharge_schedule_config(false);
do $$begin if (public.cc_recharge_schedule_status()->>'enabled')::boolean then raise exception 'FAIL pause';end if;end;$$;
select public.cc_recharge_schedule_config(true);
select cc_internal.recharge_schedule_dispatch();
do $$begin if (select status from cc_internal.recharge_schedule)<>'WAITING_FOR_MAILBOX' then raise exception 'FAIL empty scheduler';end if;
 if has_function_privilege('authenticated','public.cc_recharge_schedule_service(text,jsonb)','execute') or has_function_privilege('anon','cc_internal.recharge_schedule_dispatch()','execute') then raise exception 'FAIL scheduler permissions';end if;
 if exists(select 1 from cron.job where command like '%Bearer%' or command like '%secret%') then raise exception 'FAIL secret in cron';end if;end;$$;
select set_config('request.jwt.claim.role','service_role',true);
do $$declare s text;r jsonb;rid uuid:=gen_random_uuid();begin
 select secret_hash into s from cc_internal.recharge_schedule;
 begin perform public.cc_recharge_schedule_service('claim',jsonb_build_object('secret_hash',repeat('0',64),'run_id',rid));raise exception 'FAIL forged cron';exception when insufficient_privilege then null;end;
 r:=public.cc_recharge_schedule_service('claim',jsonb_build_object('secret_hash',s,'run_id',rid));if r->>'status'<>'READY' then raise exception 'FAIL claim';end if;
 r:=public.cc_recharge_schedule_service('claim',jsonb_build_object('secret_hash',s,'run_id',gen_random_uuid()));if r->>'status'<>'BUSY' then raise exception 'FAIL simultaneous cron';end if;
 perform public.cc_recharge_schedule_service('finish',jsonb_build_object('run_id',rid,'jobs',0,'examined',0,'detected',0,'failed',0));
 if (select status from cc_internal.recharge_schedule)<>'WAITING_FOR_MAILBOX' then raise exception 'FAIL empty status';end if;
 if (select count(*) from public.cc_real_wallet_ledger)>0 then raise exception 'FAIL scheduler changed wallet';end if;
 raise notice 'PASS cron authentication, pause, empty mailbox and concurrent lease; no financial operations';end;$$;

insert into cc_internal.recharge_mail_settings(admin_id,allowed_senders) values('a0000000-0000-4000-8000-000000000001',array['notify@fixture.invalid']);
insert into cc_internal.recharge_mail_connections(owner_id,provider,provider_subject,email_address,status,token_secret_id) values
('a0000000-0000-4000-8000-000000000001','google','mail1','mail1@fixture.invalid','CONNECTED',vault.create_secret('{}')),
('a0000000-0000-4000-8000-000000000001','google','mail2','mail2@fixture.invalid','CONNECTED',vault.create_secret('{}'));
do $$declare s text;a jsonb;b jsonb;r uuid:=gen_random_uuid();begin
 select secret_hash into s from cc_internal.recharge_schedule;
 a:=public.cc_recharge_schedule_service('claim',jsonb_build_object('secret_hash',s,'run_id',r));
 if jsonb_array_length(a->'jobs')<>1 then raise exception 'FAIL bounded jobs';end if;
 perform public.cc_recharge_schedule_service('finish',jsonb_build_object('run_id',r,'jobs',1,'examined',0,'detected',0,'failed',0));
 b:=public.cc_recharge_schedule_service('claim',jsonb_build_object('secret_hash',s,'run_id',gen_random_uuid()));
 if a->'jobs'->0->>'connection_id'=b->'jobs'->0->>'connection_id' then raise exception 'FAIL unfair rotation';end if;
 raise notice 'PASS bounded batch and fair mailbox rotation';end;$$;
rollback;
