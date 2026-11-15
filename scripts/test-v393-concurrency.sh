#!/usr/bin/env bash
# CI ONLY: assumes scripts/sql/v393-regression.sql ran in an isolated PostgreSQL.
set -euo pipefail
sql(){ psql -X -q -v ON_ERROR_STOP=1 "$@"; }
sql <<'SQL'
update cc_internal.binance393_settings set enabled=false;
select fixture393.send('00000004-0000-4000-8000-000000000004','concurrent-manual-auto');
update cc_internal.binance393_settings set enabled=true;
SQL
pids=()
for n in 1 2 3 4 5 6; do
 (
 if (( n % 2 )); then
 sql <<'SQL'
select fixture393.claim('11111111-1111-4111-8111-111111111111','service_role');
select cc_internal.binance393_credit('00000004-0000-4000-8000-000000000004',(select receipt_key from cc_internal.binance393_receipts where event_id=(select id from cc_internal.recharge_mail_events where message_id='concurrent-manual-auto')));
SQL
 else
 sql <<'SQL'
select fixture393.claim('11111111-1111-4111-8111-111111111111','authenticated');
select public.cc393_manual_binance_credit('REC-100003',(select id from cc_internal.recharge_mail_events where message_id='concurrent-manual-auto'),true,'Concurrent fixture review',false);
SQL
 fi
 ) >"/tmp/v393-race-$n.log" 2>&1 &
 pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
sql <<'SQL'
select fixture393.assert((select count(*)=4 from public.cc_real_wallet_ledger),'six concurrent automatic/manual calls produce just one new credit');
select fixture393.assert((select count(*)=4 from cc_internal.cc_verified_payment_receipts),'receipt reservation is also exactly once under concurrency');
select fixture393.new_quote('22222222-2222-4222-8222-222222222222','00000005-0000-4000-8000-000000000005',8);
SQL
pids=()
for n in 1 2 3 4 5 6; do
 sql -c "select fixture393.send('00000005-0000-4000-8000-000000000005','parallel-copy-$n');" >"/tmp/v393-copy-$n.log" 2>&1 &
 pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid"; done
sql <<'SQL'
select fixture393.assert((select count(*)=5 from public.cc_real_wallet_ledger),'six distinct email IDs for one payment produce one new credit');
select fixture393.assert((select balance_pen=106.07 from public.cc_real_service_wallets where user_id='22222222-2222-4222-8222-222222222222'),'final wallet equals all five quoted credits exactly');
SQL
# Construct a legacy ambiguity only inside the fixture, then verify it stays in review.
sql <<'SQL'
insert into public.cc_user_details values('11111111-1111-4111-8111-111111111111','Admin Prueba');
select fixture393.new_quote('33333333-3333-4333-8333-333333333333','00000006-0000-4000-8000-000000000006',9);
select fixture393.new_quote('11111111-1111-4111-8111-111111111111','00000007-0000-4000-8000-000000000007',9);
update cc_internal.binance393_quotes set payer_name='Otro Cliente',payer_key='otro cliente',created_at=(select created_at from cc_internal.binance393_quotes where id='00000006-0000-4000-8000-000000000006') where id='00000007-0000-4000-8000-000000000007';
select fixture393.send('00000006-0000-4000-8000-000000000006','ambiguous');
select fixture393.assert((select reason='AMBIGUOUS' from cc_internal.binance393_receipts where event_id=(select id from cc_internal.recharge_mail_events where message_id='ambiguous')),'overlapping legacy requests are not guessed');
update cc_internal.recharge_registry set status='REJECTED' where id=(select rec_id from cc_internal.binance393_quotes where id='00000007-0000-4000-8000-000000000007');
select fixture393.send('00000006-0000-4000-8000-000000000006','ambiguous-copy');
select fixture393.assert((select count(*)=5 from public.cc_real_wallet_ledger),'removing one candidate never automatically reassigns an ambiguous receipt');
-- Existing Lemon path still credits its own independently verified receipt.
update public.cc_manual_recharge_requests set status='REJECTED' where user_id='33333333-3333-4333-8333-333333333333';
insert into cc_internal.lemon_assisted_settings values(true,true);
insert into public.cc_manual_recharge_settings values(true,'fixture-only.svg');
select fixture393.claim('33333333-3333-4333-8333-333333333333','authenticated');
select public.cc_recharge_create('00000008-0000-4000-8000-000000000008',5,'LEMON_DALE');
select fixture393.claim('11111111-1111-4111-8111-111111111111','service_role');
select public.cc393_recharge_mail_service('mail_notice',jsonb_build_object('actor_id','11111111-1111-4111-8111-111111111111','connection_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','message_id','lemon-unchanged','provider_hint','LEMON','sender','notify@lemon.me','subject','Synthetic Lemon deposit','sender_authenticated',true,'amount_hint',5,'currency_hint','PEN','transaction_hint','LEMON-SYNTHETIC-0001','payer_name_hint','Otro Cliente','received_at',clock_timestamp()));
select fixture393.assert((select balance_pen=5 from public.cc_real_service_wallets where user_id='33333333-3333-4333-8333-333333333333'),'Lemon reconciliation still credits PEN without the Binance protocol');
SQL
