-- LOCAL FIXTURE ONLY: run in test393 after V394 regressions, never production.
-- All synthetic inserts and temporary functions roll back, including on failure.
\set ON_ERROR_STOP on
begin;
set local statement_timeout='30s';
create function pg_temp.assert_ok(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;raise notice 'PASS: %',label;end$$;
create temp table original_counts as select count(*) users from auth.users;
insert into auth.users(id,email,email_confirmed_at)
select md5('capacity-local-'||n)::uuid,'capacity-'||n||'@example.test',now() from generate_series(1,10000)n;
insert into public.cc_clan_codes(user_id,code_number,code)
select md5('capacity-local-'||n)::uuid,900000+n,'CLAN-CAP-'||lpad(n::text,5,'0') from generate_series(1,10000)n;
insert into public.cc_user_details(user_id,full_name)
select md5('capacity-local-'||n)::uuid,'Persona Ficticia '||n from generate_series(1,10000)n;
analyze auth.users;
analyze public.cc_clan_codes;
analyze public.cc_user_details;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true),set_config('request.jwt.claim.role','authenticated',true);
create temp table timings(label text,iteration int,ms numeric);
do $$declare i int;label text;t timestamptz;r jsonb;begin
foreach label in array array['first_page','last_page','code_search','name_search'] loop
 for i in 1..10 loop
 t:=clock_timestamp();
 r:=public.cc394_admin_directory(case label when 'code_search' then 'CLAN-CAP-10000' when 'name_search' then 'Persona Ficticia 10000' else '' end,case when label='last_page' then 500 else 0 end);
 insert into timings values(label,i,1000*extract(epoch from clock_timestamp()-t));
 perform pg_temp.assert_ok((r->>'registered_users')::int=(select users+10000 from original_counts),'total accounts');
 if label in('code_search','name_search') then
 perform pg_temp.assert_ok(jsonb_array_length(r->'rows')=1 and r->'rows'->0->>'user_id'=md5('capacity-local-10000')::uuid::text,'exact fixture found');
 elsif label='first_page' then perform pg_temp.assert_ok(jsonb_array_length(r->'rows')=20 and (r->>'has_more')::boolean,'bounded first page');
 else perform pg_temp.assert_ok(jsonb_array_length(r->'rows') between 1 and 20,'last page exists');end if;
 end loop;
end loop;end$$;
select label,count(*) samples,round(min(ms),2) min_ms,round(avg(ms),2) avg_ms,round(max(ms),2) max_ms,round(percentile_cont(0.95) within group(order by ms)::numeric,2) p95_ms from timings group by label order by label;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$begin
 begin perform public.cc394_admin_directory('',0);raise exception 'FAIL: unauthorized directory succeeded';exception when insufficient_privilege then raise notice 'PASS: non-admin denied with 10000 accounts';end;
end$$;
rollback;
select count(*) filter(where email like 'capacity-%@example.test') synthetic_accounts_remaining from auth.users;
