// V158.3: verifies the central three-wallet UI, backend debit source and bonus isolation without payments.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
const ui=fs.readFileSync('scripts/v127-wallet-switch.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20261021080000_v158_three_way_real_transfers.sql','utf8');
const requireText=(str,t)=>assert.ok(str.includes(t),'Missing '+t);
for(const name of ['COBRA_YA','STREAM_BULLS','MI_COCHERA']) {
 requireText(ui,name);
 requireText(migration,"'"+name+"'");
}
requireText(html,'scripts/v127-wallet-switch.js?v=1583');
requireText(ui,'id="cc127fromSelect"');
requireText(ui,'id="cc127toSelect"');
requireText(ui,'rpc/mc_transfer_real_balance');
requireText(ui,'p_request:request');
requireText(ui,'Los bonos gratuitos ADMIN nunca se transfieren');
requireText(migration,'cc_real_service_wallets');
requireText(migration,'mc_real_transfer_requests');
requireText(migration,'pg_advisory_xact_lock');
requireText(migration,'auth.uid()');
requireText(migration,'p_from=p_to then');
requireText(migration,'on conflict(user_id,service) do nothing');
assert.ok(!migration.includes("p_from<>'MI_COCHERA'"),'All six origin/destination pairs must be allowed');
assert.ok(!migration.includes('bonus_pen'),'Promotional balance must never fund a transfer');
assert.ok(!migration.includes('cc_cobra_welcome_bonus_wallets'),'COBRA YA welcome bonus must never fund a transfer');
assert.ok(!ui.includes('rpc/cc_transfer_test_balance'),'Central transfers cannot use test balances');
assert.ok(!ui.includes('balance_test'),'Never offer test balance in this UI');
console.log('PASS V158.3: six real-wallet routes, same user, idempotency and bonus isolation');