#!/usr/bin/env bash
# SOLO CI: PostgreSQL efímero en localhost, nunca la base de producción.
set -euo pipefail
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id,email) values('90000000-0000-4000-8000-000000000001','buyer@concurrency.invalid'),('90000000-0000-4000-8000-000000000002','referrer@concurrency.invalid');
insert into public.cc_businesses(code) values('COBRA_YA');
insert into public.cc_clan_attributions(referred_user_id,inviter_user_id) values('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000002');
insert into public.cc_real_service_wallets(user_id,service,balance_pen) values('90000000-0000-4000-8000-000000000001','STREAM_BULLS',100);
SQL
query="set request.jwt.claim.sub='90000000-0000-4000-8000-000000000001'; select public.cc_finance_pay_membership('COBRA_YA','90000000-0000-4000-8000-000000000003',20);"
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -c "$query" > /tmp/cc320-concurrent-a.txt &
pid_a=$!
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -c "$query" > /tmp/cc320-concurrent-b.txt &
pid_b=$!
wait "$pid_a"
wait "$pid_b"
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 <<'SQL'
do $$begin
 if (select sum(balance_pen) from public.cc_real_service_wallets where user_id='90000000-0000-4000-8000-000000000001')<>80 then raise exception 'Doble gasto concurrente';end if;
 if (select count(*) from cc_internal.finance_membership_payments)<>1 then raise exception 'Doble periodo concurrente';end if;
 if (select sum(balance_pen) from public.cc_real_service_wallets where user_id='90000000-0000-4000-8000-000000000002')<>5 then raise exception 'Doble bono concurrente';end if;
 raise notice 'PASS dos transacciones concurrentes, un cargo y un bono';
end;$$;
SQL
