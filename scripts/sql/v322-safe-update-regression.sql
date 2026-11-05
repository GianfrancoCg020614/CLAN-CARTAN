begin;
do $$declare f regprocedure;d text;stmt text;begin
 foreach f in array array['public.cc_recharge_schedule_service(text,jsonb)'::regprocedure,'public.cc_recharge_schedule_config(boolean)'::regprocedure] loop
  d:=pg_get_functiondef(f);
  for stmt in select x[1] from regexp_matches(d,'(update cc_internal\.recharge_schedule set [^;]+);','gi') x loop
   if stmt !~* 'where singleton$' then raise exception 'FAIL PostgREST safeupdate condition';end if;
  end loop;
 end loop;
 raise notice 'PASS scheduler updates are scoped to singleton for PostgREST safeupdate';end;$$;
rollback;
