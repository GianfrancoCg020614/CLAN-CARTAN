#!/usr/bin/env bash
# SOLO CI: PostgreSQL efímero en localhost. No ejecutar contra producción.
set -euo pipefail
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id,email) values('32510000-0000-4000-8000-000000000001','buyer@concurrency.invalid'),('32510000-0000-4000-8000-000000000002','referrer@concurrency.invalid');
insert into public.cc_clan_attributions(referred_user_id,inviter_user_id) values('32510000-0000-4000-8000-000000000001','32510000-0000-4000-8000-000000000002');
insert into public.cc_real_service_wallets(user_id,service,balance_pen) values('32510000-0000-4000-8000-000000000001','STREAM_BULLS',100);
SQL
for n in 1 2; do
 psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -c "begin;set request.jwt.claim.sub='32510000-0000-4000-8000-000000000001';select public.cc_finance_activate_membership('COBRA_YA','32510000-0000-4000-9000-00000000000$n',15);select pg_sleep(0.5);commit;" >"/tmp/cc325-$n.txt" &
 if [ "$n" = 1 ]; then pid_a=$!; else pid_b=$!; fi
done
wait "$pid_a"
wait "$pid_b"
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 <<'SQL'
do $$begin
 if (select sum(balance_pen) from public.cc_real_service_wallets where user_id='32510000-0000-4000-8000-000000000001')<>85 then raise exception 'Doble gasto';end if;
 if (select count(*) from cc_internal.finance_membership_payments where user_id='32510000-0000-4000-8000-000000000001')<>1 then raise exception 'Doble periodo';end if;
 if (select sum(balance_pen) from public.cc_real_service_wallets where user_id='32510000-0000-4000-8000-000000000002')<>5 then raise exception 'Doble bono';end if;
 raise notice 'PASS dos referencias y conexiones distintas: un cargo, un periodo y un bono';
end;$$;
SQL
