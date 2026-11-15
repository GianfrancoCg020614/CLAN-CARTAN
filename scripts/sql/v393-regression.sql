-- CI ONLY: synthetic owners, receipts and wallet entries in an isolated database.
create schema fixture393;
create function fixture393.assert(ok boolean,message text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'FAIL: %',message;end if;raise notice 'PASS: %',message;end $$;
create function fixture393.claim(u uuid,role_name text) returns void language sql as $$select set_config('request.jwt.claim.sub',u::text,false),set_config('request.jwt.claim.role',role_name,false)$$;
create function fixture393.denied(statement text) returns boolean language plpgsql as $$begin execute statement;return false;exception when others then return true;end $$;
insert into auth.users(id,email) values('11111111-1111-4111-8111-111111111111','admin@example.invalid'),('22222222-2222-4222-8222-222222222222','client@example.invalid'),('33333333-3333-4333-8333-333333333333','other@example.invalid');
insert into public.cc_admins values('11111111-1111-4111-8111-111111111111');
insert into public.cc_user_details values('22222222-2222-4222-8222-222222222222','Cliente Prueba'),('33333333-3333-4333-8333-333333333333','Otro Cliente');
insert into cc_internal.recharge_mail_connections(id,owner_id,provider,provider_subject,email_address,status) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','google','owner@example.invalid','owner@example.invalid','CONNECTED');
update cc_internal.recharge_mail_connections set token_secret_id=vault.create_secret('{"access_token":"SYNTHETIC","refresh_token":"SYNTHETIC"}');
update cc_internal.binance393_settings set enabled=true,connection_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select fixture393.claim('11111111-1111-4111-8111-111111111111','service_role');
select public.cc393_market(jsonb_build_object('fx',3.5,'spot',1,'fx_at',now()-interval '1 hour','fx_next',now()+interval '23 hours','spot_at',now()));
create function fixture393.new_quote(u uuid,q uuid,amount numeric) returns jsonb language plpgsql as $$declare result jsonb;begin
 perform fixture393.claim(u,'service_role');perform public.cc393_service_quote(u,q,amount);
 perform fixture393.claim(u,'authenticated');result:=public.cc393_accept_quote(q);return result;
end $$;
create function fixture393.send(q uuid,msg text,extra jsonb default '{}') returns jsonb language plpgsql as $$declare x cc_internal.binance393_quotes%rowtype;begin
 select * into x from cc_internal.binance393_quotes where id=q;
 perform fixture393.claim('11111111-1111-4111-8111-111111111111','service_role');
 return public.cc393_recharge_mail_service('mail_notice',jsonb_build_object('actor_id','11111111-1111-4111-8111-111111111111','connection_id','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','message_id',msg,'provider_hint','BINANCE','sender','do-not-reply@ses.binance.com','subject','Synthetic incoming receipt','sender_authenticated',true,'amount_hint',x.usdt,'currency_hint','USDT','payer_name_hint',x.payer_name,'received_at',clock_timestamp(),'provider_paid_at',date_trunc('second',x.created_at),'notice_recipient',x.recipient,'recipient_signed',true,'binance_receipt',true)||extra);
end $$;
select fixture393.assert(not has_function_privilege('anon','public.cc393_market(jsonb)','execute') and not has_function_privilege('authenticated','public.cc393_service_quote(uuid,uuid,numeric)','execute') and not has_function_privilege('authenticated','cc_internal.binance393_credit(uuid,text,uuid,boolean)','execute'),'service and private credit functions are inaccessible to clients');
select fixture393.assert(not has_table_privilege('authenticated','cc_internal.binance393_receipts','select'),'receipts are private');
select fixture393.claim('22222222-2222-4222-8222-222222222222','authenticated');
select fixture393.assert(fixture393.denied($s$select public.cc393_market(null)$s$),'service role checked inside RPC');
select fixture393.assert(fixture393.denied($s$select public.cc393_manual_binance_credit('REC-100000',gen_random_uuid(),true,'test reason',false)$s$),'non ADMIN cannot manually credit');
select fixture393.claim('22222222-2222-4222-8222-222222222222','service_role');
select fixture393.assert(fixture393.denied($s$select public.cc393_service_quote('22222222-2222-4222-8222-222222222222',gen_random_uuid(),1.000000001)$s$),'USDT precision cannot be silently rounded');
select fixture393.assert(fixture393.denied($s$select public.cc393_market(jsonb_build_object('fx',3.5,'spot',0.9,'fx_at',now(),'fx_next',now()+interval '1 day','spot_at',now()))$s$),'depeg is rejected');
select fixture393.assert(fixture393.denied($s$select public.cc393_market(jsonb_build_object('fx',3.5,'spot',1,'fx_at',now(),'fx_next',now()+interval '1 day','spot_at',now()-interval '10 minutes'))$s$),'stale market data is rejected');
select fixture393.new_quote('22222222-2222-4222-8222-222222222222','00000001-0000-4000-8000-000000000001',5);
select fixture393.assert((select pen=17.11 and net_rate=3.421250 from cc_internal.binance393_quotes where id='00000001-0000-4000-8000-000000000001'),'fixed PEN uses exact numeric net rate');
select fixture393.claim('22222222-2222-4222-8222-222222222222','authenticated');
select public.cc393_accept_quote('00000001-0000-4000-8000-000000000001');
select fixture393.assert((select count(*)=1 from cc_internal.recharge_registry),'repeated acceptance creates only one REC');
select fixture393.claim('33333333-3333-4333-8333-333333333333','authenticated');
select fixture393.assert(fixture393.denied($s$select public.cc393_accept_quote('00000001-0000-4000-8000-000000000001')$s$),'owner isolation for acceptance');
select fixture393.assert(fixture393.denied($s$select public.cc393_quote_details('REC-100000')$s$),'owner isolation for quote details');
select fixture393.send('00000001-0000-4000-8000-000000000001','first');
select fixture393.assert((select reason='PAYER_REQUIRES_ADMIN' from cc_internal.binance393_receipts),'unverified payer never automatically credits');
select fixture393.assert((select count(*)=0 from public.cc_real_wallet_ledger),'review cannot modify money');
-- Reject unauthenticated, wrong recipient, unsigned recipient and missing original dates.
select fixture393.send('00000001-0000-4000-8000-000000000001','unsigned','{"recipient_signed":false}');
select fixture393.send('00000001-0000-4000-8000-000000000001','other-recipient','{"notice_recipient":"other@example.invalid"}');
select fixture393.send('00000001-0000-4000-8000-000000000001','null-recipient','{"notice_recipient":null}');
select fixture393.send('00000001-0000-4000-8000-000000000001','missing-date','{"provider_paid_at":null}');
select fixture393.send('00000001-0000-4000-8000-000000000001','no-auth','{"sender_authenticated":false}');
select fixture393.assert((select count(*)=1 from cc_internal.binance393_receipts),'invalid source and date cannot reserve a usable receipt');
-- Generic approval must not bypass the canonical receipt guard.
select fixture393.assert(fixture393.denied($s$insert into public.cc_real_wallet_ledger(user_id,service,order_id,provider,provider_transaction_id,amount_pen) select user_id,'STREAM_BULLS',origin_id,'LEMON_DALE','FAKE-GENERIC-APPROVAL',requested_pen from cc_internal.recharge_registry where rec_code='REC-100000'$s$),'old generic credit route cannot bypass quoted receipt consumption');
select fixture393.claim('11111111-1111-4111-8111-111111111111','authenticated');
select public.cc393_manual_binance_credit('REC-100000',(select id from cc_internal.recharge_mail_events where message_id='first'),true,'Synthetic owner verification',true);
select fixture393.assert((select balance_pen=17.11 from public.cc_real_service_wallets where user_id='22222222-2222-4222-8222-222222222222'),'first approved receipt credits fixed PEN');
select fixture393.assert((select count(*)=1 from cc_internal.binance393_payers),'ADMIN can bind the confirmed payer for future automatic matching');
select fixture393.send('00000001-0000-4000-8000-000000000001','copied-first');
select fixture393.assert((select count(*)=1 from cc_internal.binance393_receipts) and (select count(*)=1 from public.cc_real_wallet_ledger),'same receipt in a different email cannot credit twice');
select pg_sleep(1.1);
select fixture393.new_quote('22222222-2222-4222-8222-222222222222','00000002-0000-4000-8000-000000000002',5);
select fixture393.send('00000002-0000-4000-8000-000000000002','second');
select fixture393.assert((select count(*)=2 from public.cc_real_wallet_ledger) and (select balance_pen=34.22 from public.cc_real_service_wallets where user_id='22222222-2222-4222-8222-222222222222'),'same amount with a distinct original payment time credits a new request once');
select fixture393.send('00000002-0000-4000-8000-000000000002','second');
select fixture393.send('00000002-0000-4000-8000-000000000002','copied-second');
select fixture393.assert((select count(*)=2 from public.cc_real_wallet_ledger),'same email and copied email are idempotent');
select fixture393.claim('11111111-1111-4111-8111-111111111111','authenticated');
select public.cc393_manual_binance_credit('REC-100001',(select id from cc_internal.recharge_mail_events where message_id='second'),true,'Synthetic repeat approval',false);
select fixture393.assert((select count(*)=2 from public.cc_real_wallet_ledger),'manual approval after automatic credit cannot duplicate the deposit');
select fixture393.assert((select count(*)=2 from cc_internal.cc_verified_payment_receipts),'existing global receipt registry is preserved');
select fixture393.assert((select count(*)=2 from public.cc_wallet_financial_audit where event_type='AUTOMATIC_VERIFIED_RECHARGE'),'each actual wallet credit has a financial audit entry');
select fixture393.assert((select bool_and(provider='BINANCE' and quote_available_usdt=5 and payment_currency='USDT' and amount_pen=17.11) from public.cc_real_topup_orders),'credited orders preserve actual original USDT and agreed PEN');
-- Wrong amounts and partial names never auto-match an open request.
select fixture393.new_quote('22222222-2222-4222-8222-222222222222','00000003-0000-4000-8000-000000000003',6);
select fixture393.send('00000003-0000-4000-8000-000000000003','partial-name','{"payer_name_hint":"Cliente Otra"}');
select fixture393.send('00000003-0000-4000-8000-000000000003','wrong-amount','{"amount_hint":6.01}');
select fixture393.assert((select count(*)=2 from public.cc_real_wallet_ledger),'partial name and mismatched amount cannot credit');
-- Fault after receipt reservation must roll back all financial writes.
create function fixture393.break_wallet() returns trigger language plpgsql as $$begin raise exception 'Synthetic wallet failure';end $$;
create trigger fixture_break_wallet before update or insert on public.cc_real_service_wallets for each row execute function fixture393.break_wallet();
select fixture393.send('00000003-0000-4000-8000-000000000003','atomic-failure');
select fixture393.assert((select count(*)=2 from public.cc_real_wallet_ledger) and (select count(*)=2 from cc_internal.cc_verified_payment_receipts) and (select state='OPEN' from cc_internal.binance393_quotes where id='00000003-0000-4000-8000-000000000003'),'wallet failure rolls back ledger, reservation and quote state together');
drop trigger fixture_break_wallet on public.cc_real_service_wallets;
select fixture393.send('00000003-0000-4000-8000-000000000003','retry-failed-receipt');
select fixture393.assert((select count(*)=2 from public.cc_real_wallet_ledger),'a receipt in review never auto-reassigns after conditions change');
select fixture393.claim('11111111-1111-4111-8111-111111111111','authenticated');
select public.cc393_manual_binance_credit('REC-100002',(select id from cc_internal.recharge_mail_events where message_id='atomic-failure'),true,'Synthetic manual recovery',false);
select fixture393.assert((select count(*)=3 from public.cc_real_wallet_ledger),'ADMIN can recover a reviewed receipt exactly once');
-- Leave a fourth pending quote for the real concurrent SQL test.
select fixture393.new_quote('22222222-2222-4222-8222-222222222222','00000004-0000-4000-8000-000000000004',7);
