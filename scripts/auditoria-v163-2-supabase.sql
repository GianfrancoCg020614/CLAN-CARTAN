-- MI ALQUILER V163.2: sólo lectura. No ejecutar migración V163 experimental.
select table_name, count(*) as fields
from information_schema.columns
where table_schema='public' and table_name like 'ma\_%' escape '\'
group by table_name order by table_name;
select relname as table_name, relrowsecurity as rls,
  has_table_privilege('anon',oid,'INSERT') as anon_insert,
  has_table_privilege('authenticated',oid,'INSERT') as authenticated_insert
from pg_class where oid in (
 select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and c.relname like 'ma\_%' escape '\'
) order by table_name;
select version, name from supabase_migrations.schema_migrations
where name like '%mi_alquiler%' or name like '%mi%alquiler%'
order by version;