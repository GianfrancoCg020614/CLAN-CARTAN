begin;
do $$begin
 if exists(select 1 from cron.job where jobname='cc-recharge-mail-every-five-minutes') then raise exception 'FAIL duplicate scheduler';end if;
 if exists(select 1 from information_schema.columns where table_schema='cc_internal' and table_name='recharge_schedule' and column_name='secret_id') then raise exception 'FAIL obsolete poll credential';end if;
 if to_regprocedure('cc_internal.recharge_schedule_dispatch()') is not null then raise exception 'FAIL obsolete dispatch';end if;
 if pg_get_functiondef('public.cc_recharge_schedule_service(text,jsonb)'::regprocedure) not like '%last_tick_at=now()%' then raise exception 'FAIL missing worker heartbeat';end if;
 if has_function_privilege('anon','public.cc_recharge_schedule_status()','execute') then raise exception 'FAIL anonymous scheduler access';end if;
 raise notice 'PASS private Worker dispatch, no old cron and no old credential';end;$$;
rollback;
