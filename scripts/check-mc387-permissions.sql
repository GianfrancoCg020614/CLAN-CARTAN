-- LOCAL/CI ONLY. Test the exact permission migration without real financial operations.
\set ON_ERROR_STOP on
begin;
create function public.mc384_historical(bigint,date,date,date,numeric,text) returns jsonb language sql security definer set search_path='' as $$select '{}'::jsonb$$;
select md5(pg_get_functiondef('public.mc384_historical(bigint,date,date,date,numeric,text)'::regprocedure)) as prior_hash \gset
\ir ../supabase/migrations/20261114044925_mi_cochera_v387_historical_permissions.sql
select md5(pg_get_functiondef('public.mc384_historical(bigint,date,date,date,numeric,text)'::regprocedure))=:'prior_hash' as body_preserved \gset
\if :body_preserved
\else
\quit 1
\endif
do $$begin
 if has_function_privilege('anon','public.mc384_historical(bigint,date,date,date,numeric,text)','EXECUTE') then raise exception 'Anonymous execution remains';end if;
 if not has_function_privilege('authenticated','public.mc384_historical(bigint,date,date,date,numeric,text)','EXECUTE') then raise exception 'Authenticated access lost';end if;
end $$;
rollback;
select 'PASS V387: historical RPC ACL only, function body unchanged' result;
