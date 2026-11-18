#!/usr/bin/env bash
# Isolated finance fixture only, after v394-regression.sql.
set -euo pipefail
sql(){ psql -X -q -v ON_ERROR_STOP=1 "$@"; }
before=$(sql -At -c 'select coalesce(sum(balance_pen),0) from public.cc_real_service_wallets')
pids=()
for n in 1 2 3 4 5 6; do
 sql <<'SQL' >"/tmp/v394-bonus-$n.log" 2>&1 &
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.cc394_admin_grant_shared_bonus('33333333-3333-4333-8333-333333333333',15,'40000000-0000-4000-8000-000000000002','Concurrent fixture gift');
SQL
 pids+=("$!")
done
for pid in "${pids[@]}";do wait "$pid";done
result=$(sql -At -c "select (select count(*) from public.cc_admin_promo_grants where request_id='40000000-0000-4000-8000-000000000002')=1 and (select balance_pen from public.cc_cobra_welcome_bonus_wallets where user_id='33333333-3333-4333-8333-333333333333')=15")
test "$result" = t
after=$(sql -At -c 'select coalesce(sum(balance_pen),0) from public.cc_real_service_wallets')
test "$before" = "$after"
echo 'PASS: six concurrent approvals credit one shared bonus and preserve real balances.'
sql <<'SQL'
delete from public.cc_admin_promo_grants where request_id='40000000-0000-4000-8000-000000000002';
delete from public.cc_cobra_welcome_bonus_wallets where user_id='33333333-3333-4333-8333-333333333333';
SQL
