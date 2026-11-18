-- Isolated CI fixture only; NEVER a production migration.
\set ON_ERROR_STOP on
begin;
do $$begin if current_database()<>'capacity' then raise exception 'Fixture database required';end if;end$$;
-- Bridge the legacy fixture claim helpers to the claims set by actual PostgREST.
create or replace function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,jsonb_build_object('role',current_setting('request.jwt.claim.role',true)))$$;
create role capacity_authenticator login noinherit password 'capacity-fixture-only';
grant anon,authenticated to capacity_authenticator;
insert into auth.users(id,email) select md5('capacity-http-user-'||n)::uuid,'capacity-http-'||n||'@example.test' from generate_series(1,10000)n;
insert into public.cc_clan_codes(user_id,code_number,code) select md5('capacity-http-user-'||n)::uuid,900000+n,'CLAN-CAPACITY-'||n from generate_series(1,10000)n;
insert into public.cc_real_service_wallets(user_id,service,balance_pen) select md5('capacity-http-user-'||n)::uuid,'STREAM_BULLS',100 from generate_series(1,10000)n;
-- One hundred distinct products allow contention to be observed without one global row.
insert into public.cc_portal_stream_products(id,seller_id,price_pen,status,stock,service,title,whatsapp,cost_pen)
select md5('capacity-http-product-'||n)::uuid,'11111111-1111-4111-8111-111111111111',1,'ACTIVE',10000,'TEST','Producto ficticio '||n,'+51900000000',0 from generate_series(1,100)n;
revoke all on function public.cc_portal_purchase_stream_product(uuid,uuid,numeric) from public,anon;
grant execute on function public.cc_portal_purchase_stream_product(uuid,uuid,numeric) to authenticated;
create function public.capacity_fixture_marker() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('marker','CLAN-CAPACITY-SYNTHETIC-ONLY','accounts',(select count(*) from auth.users where email like 'capacity-http-%@example.test'))$$;
grant execute on function public.capacity_fixture_marker() to anon,authenticated;
commit;
analyze;
