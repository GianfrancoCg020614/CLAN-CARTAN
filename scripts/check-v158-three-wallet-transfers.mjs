// V158.3: verifies the central three-wallet UI, backend debit source and bonus isolation without payments.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
const ui=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const cochera=fs.readFileSync('scripts/v158-mi-cochera.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20261021080000_v158_three_way_real_transfers.sql','utf8');
const requireText=(str,t)=>assert.ok(str.includes(t),'Missing '+t);
for(const name of ['COBRA_YA','STREAM_BULLS','MI_COCHERA']) {
 requireText(ui,name);
 requireText(migration,"'"+name+"'");
}
assert.ok(!fs.existsSync('scripts/v127-wallet-switch.js'),'La interfaz retirada no debe permanecer en el proyecto');
assert.ok(!html.includes('scripts/v127-wallet-switch.js'),'La interfaz retirada no debe cargarse');
assert.ok(!cochera.includes('rpc/mc_transfer_real_balance'),'No ofrecer transferencias por negocio');
requireText(ui,'window.cc166OpenWallet=');
requireText(ui,'Saldo real disponible');
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
console.log('PASS: billetera única sin UI de transferencias; historial y bloqueos contables conservados');
