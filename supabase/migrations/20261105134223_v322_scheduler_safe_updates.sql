-- PostgREST aplica safeupdate: incluso la tabla singleton necesita WHERE explícito.
do $$declare f regprocedure;d text;begin
 foreach f in array array['public.cc_recharge_schedule_service(text,jsonb)'::regprocedure,'public.cc_recharge_schedule_config(boolean)'::regprocedure] loop
  d:=pg_get_functiondef(f);
  d:=regexp_replace(d,'(update cc_internal\.recharge_schedule set [^;]+);','\1 where singleton;','gi');
  execute d;
 end loop;
end;$$;
