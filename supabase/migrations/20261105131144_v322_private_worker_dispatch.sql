-- Sustituye la cola HTTP por un Worker con binding secreto privado.
-- No se enviaron solicitudes por pg_net: el sistema no tiene buzones autorizados.
drop function cc_internal.recharge_schedule_dispatch();
-- pg_cron y pg_net son extensiones administradas por Supabase. No quedan jobs ni solicitudes; no se utilizan para esta integración.
do $$declare sid uuid;begin
 select secret_id into sid from cc_internal.recharge_schedule;
 alter table cc_internal.recharge_schedule drop column secret_id;
 delete from vault.secrets where id=sid;
end;$$;
-- El binding secreto de Cloudflare se configura fuera de GitHub. Aquí solo se conserva su hash.
update cc_internal.recharge_schedule set enabled=false,status='PAUSED',last_tick_at=null;
do $$declare d text;begin
 select pg_get_functiondef('public.cc_recharge_schedule_service(text,jsonb)'::regprocedure) into d;
 d:=replace(d,$old$if not s.enabled then return jsonb_build_object('status','PAUSED','jobs','[]'::jsonb);end if;$old$,$new$update cc_internal.recharge_schedule set last_tick_at=now();
  if not s.enabled then return jsonb_build_object('status','PAUSED','jobs','[]'::jsonb);end if;$new$);
 execute d;
end;$$;
