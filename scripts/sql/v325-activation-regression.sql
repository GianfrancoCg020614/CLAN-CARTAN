-- SOLO base efímera: todos los usuarios y saldos son ficticios. No ejecutar en producción.
begin;
create function pg_temp.ok(v boolean,msg text) returns void language plpgsql as $$begin
 if v is not true then raise exception 'FAIL %',msg;end if;raise notice 'PASS %',msg;end;$$;
insert into auth.users(id,email) select ('32500000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'fixture'||i||'@example.invalid' from generate_series(1,4)i;
insert into public.cc_clan_attributions(referred_user_id,inviter_user_id) values('32500000-0000-4000-8000-000000000001','32500000-0000-4000-8000-000000000002');
insert into public.cc_real_service_wallets(user_id,service,balance_pen) values('32500000-0000-4000-8000-000000000001','STREAM_BULLS',70);
select set_config('request.jwt.claim.sub','32500000-0000-4000-8000-000000000001',true);
do $$declare s text;r jsonb;req uuid;fee numeric;i int:=0;begin
 foreach s in array array['COBRA_YA','MI_COCHERA','MI_ALQUILER','STREAM_BULLS'] loop
  i:=i+1;fee:=case when s='STREAM_BULLS' then 25 else 15 end;
  req:=('32500000-0000-4000-9000-'||lpad(i::text,12,'0'))::uuid;
  r:=public.cc_finance_activate_membership(s,req,fee);
  perform pg_temp.ok((r->>'amount_pen')::numeric=fee,'Activación '||s);
  perform pg_temp.ok(public.cc_finance_activate_membership(s,req,fee)->>'already_processed'='true','Reintento con misma referencia '||s);
  r:=public.cc_finance_activate_membership(s,gen_random_uuid(),fee);
  perform pg_temp.ok(r->>'status'='ALREADY_ACTIVE' and r->>'charged'='false' and (r->>'amount_pen')::numeric=0,'Nueva referencia no renueva '||s);
 end loop;
end;$$;
select pg_temp.ok((select sum(balance_pen)=0 from public.cc_real_service_wallets where user_id=auth.uid()),'Saldo exacto: cuatro servicios, sin cargo repetido');
select pg_temp.ok((select count(*)=4 from cc_internal.finance_membership_payments),'Solo cuatro periodos pagados');
select pg_temp.ok((select sum(balance_pen)=20 from public.cc_real_service_wallets where user_id='32500000-0000-4000-8000-000000000002'),'Solo cuatro bonos de S/5');
select pg_temp.ok((select end_at>=now()+interval '364 days' from public.cc_subscriptions limit 1),'STREAM conserva periodo anual');
-- Una renovación voluntaria conserva tiempo y tarifa; su reintento no cobra de nuevo.
update public.cc_real_service_wallets set balance_pen=100 where user_id=auth.uid();
select public.cc_finance_pay_membership('COBRA_YA','32500000-0000-4000-9000-000000000020',15);
select public.cc_finance_pay_membership('COBRA_YA','32500000-0000-4000-9000-000000000020',15);
select pg_temp.ok((select max(period_end)>now()+interval '50 days' from public.cc_cobra_real_access_periods where user_id=auth.uid()),'Renovación anticipada conserva días pagados');
select pg_temp.ok((select sum(balance_pen)=85 from public.cc_real_service_wallets where user_id=auth.uid()),'Una renovación, un cargo');
update public.mc_accounts set subscription_until=now()-interval '1 day' where user_id=auth.uid();
select public.cc_finance_activate_membership('MI_COCHERA','32500000-0000-4000-9000-000000000021',15);
select pg_temp.ok((select subscription_until>now() from public.mc_accounts where user_id=auth.uid()),'Reactivación vencida habilitada');
-- Un error posterior al cobro revierte también el saldo, periodo y bono.
create function pg_temp.fail_payment() returns trigger language plpgsql as $$begin raise exception 'fixture-failure';end;$$;
create trigger fixture_failure before insert on cc_internal.finance_membership_payments for each row execute function pg_temp.fail_payment();
do $$declare before_balance numeric;before_count bigint;begin
 select sum(balance_pen) into before_balance from public.cc_real_service_wallets where user_id=auth.uid();
 select count(*) into before_count from cc_internal.finance_membership_payments;
 begin perform public.cc_finance_pay_membership('MI_ALQUILER',gen_random_uuid(),15);raise exception 'FAIL no rollback';
 exception when others then if sqlerrm<>'fixture-failure' then raise;end if;end;
 perform pg_temp.ok((select sum(balance_pen)=before_balance from public.cc_real_service_wallets where user_id=auth.uid()),'Fallo: saldo intacto');
 perform pg_temp.ok((select count(*)=before_count from cc_internal.finance_membership_payments),'Fallo: sin periodo parcial');
end;$$;
drop trigger fixture_failure on cc_internal.finance_membership_payments;
select set_config('request.jwt.claim.sub','32500000-0000-4000-8000-000000000003',true);
do $$begin
 begin perform public.cc_finance_activate_membership('COBRA_YA',gen_random_uuid(),15);raise exception 'FAIL accepted insufficient';
 exception when others then if sqlerrm='FAIL accepted insufficient' then raise;end if;end;
 begin perform public.cc_finance_activate_membership('COBRA_YA','32500000-0000-4000-9000-000000000001',15);raise exception 'FAIL accepted foreign';
 exception when insufficient_privilege then null;end;
end;$$;
select pg_temp.ok(not has_function_privilege('anon','public.cc_finance_activate_membership(text,uuid,numeric)','execute'),'Anon sin acceso');
select set_config('request.jwt.claim.sub','',true);
do $$begin
 begin perform public.cc_finance_activate_membership('STREAM_BULLS',gen_random_uuid(),25);raise exception 'FAIL anonymous';
 exception when insufficient_privilege then null;end;
end;$$;
rollback;
