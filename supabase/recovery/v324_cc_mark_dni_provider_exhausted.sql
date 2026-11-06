CREATE OR REPLACE FUNCTION public.cc_mark_dni_provider_exhausted()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then raise exception 'Forbidden';end if;
 update public.cc_dni_quota set external_exhausted=true
 where month_key=to_char(now() at time zone 'America/Lima','YYYY-MM');
end $function$;
