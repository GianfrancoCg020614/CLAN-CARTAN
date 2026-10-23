-- CLAN CARTAN V163.4. SÓLO LECTURA: RLS, funciones y contabilidad.
select c.relname as table_name, c.relrowsecurity as rls,
has_table_privilege('anon',c.oid,'INSERT') as anon_insert,
has_table_privilege('authenticated',c.oid,'INSERT') as authenticated_insert,
has_table_privilege('authenticated',c.oid,'UPDATE') as authenticated_update,
(select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as policy_count
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r' and c.relname like 'ma\_%' escape '\'
order by c.relname;
select p.proname,pg_get_function_identity_arguments(p.oid) as args,p.prosecdef as security_definer,
has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'ma\_%' escape '\' order by p.proname;
select c.conname,c.contype,pg_get_constraintdef(c.oid) as definition
from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
where n.nspname='public' and (t.relname like 'ma\_%' escape '\' or t.relname='cc_real_service_wallets')
order by t.relname,c.conname;