#!/usr/bin/env bash
# SOLO CI: PostgreSQL efímero en localhost. No ejecutar contra producción.
set -euo pipefail
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id,email) values('32510000-0000-4000-8000-000000000001','buyer@concurrency.invalid'),('32510000-0000-4000-8000-000000000002','referrer@concurrency.invalid');
insert into public.cc_clan_attributions(referred_user_id,inviter_user_id) values('32510000-0000-4000-8000-000000000001','32510000-0000-4000-8000-000000000002');
insert into public.cc_real_service_wallets(user_id,service,balance_pen) values('32510000-0000-4000-8000-000000000001','STREAM_BULLS',100);
SQL
i=0
for service in COBRA_YA MI_COCHERA MI_ALQUILER STREAM_BULLS; do
i=$((i+1))
fee=15
if [ "$service" = STREAM_BULLS ]; then fee=25; fi
for n in 1 2; do
 delay=0
 if [ "$n" = 1 ]; then delay=0.3; fi
 psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 -c "begin;set request.jwt.claim.sub='32510000-0000-4000-8000-000000000001';select pg_sleep($delay);select public.cc_finance_activate_membership('$service','32510000-0000-4000-9000-0000000000$i$n',$fee);select pg_sleep(0.5);commit;" >"/tmp/cc325-$n.txt" &
 if [ "$n" = 1 ]; then pid_a=$!; else pid_b=$!; fi
 if [ "$n" = 1 ]; then sleep 0.1; fi
done
wait "$pid_a"
wait "$pid_b"
cat /tmp/cc325-1.txt /tmp/cc325-2.txt
done
psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 <<'SQL'
do $$begin
 if (select sum(balance_pen) from public.cc_real_service_wallets where user_id='32510000-0000-4000-8000-000000000001')<>30 then raise exception 'Doble gasto';end if;
 if (select count(*) from cc_internal.finance_membership_payments where user_id='32510000-0000-4000-8000-000000000001')<>4 then raise exception 'Doble periodo';end if;
 if (select sum(balance_pen) from public.cc_real_service_wallets where user_id='32510000-0000-4000-8000-000000000002')<>20 then raise exception 'Doble bono';end if;
 raise notice 'PASS cuatro negocios, dos referencias y conexiones por negocio: un cargo, periodo y bono por servicio';
end;$$;
SQL
