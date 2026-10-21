import fs from 'node:fs';
import assert from 'node:assert/strict';
const sql=fs.readFileSync('supabase/migrations/20261021143000_v161_3_mi_alquiler_financial.sql','utf8');
const js=fs.readFileSync('scripts/v161-3-mi-alquiler.js','utf8');
const bridge=fs.readFileSync('scripts/v161-2-mi-alquiler.js','utf8');
const loader=fs.readFileSync('scripts/v161-marketing-account.js','utf8');
const css=fs.readFileSync('styles/v161-3-mi-alquiler.css','utf8');
for(const key of ['ma_wallets','ma_bonus_events','ma_subscription_events','ma_ledger','ma_meter_readings','ma_guarantee_events','ma_expenses']){
 assert.ok(sql.includes('public.'+key),'Missing table: '+key);
 assert.ok(sql.includes(`'${key}'`),'Missing RLS/grants: '+key);
}
for(const key of ['ma_record_payment','ma_charge_fixed','ma_record_meter','ma_record_guarantee','ma_record_expense','ma_admin_grant_bonus','ma_activate_bonus','ma_ensure_account','ma_contract_billing_trigger'])
 assert.ok(sql.includes('public.'+key),'Missing operation: '+key);
for(const key of ['request_id uuid not null unique','on conflict do nothing','for update','ma_ledger_rent_period','ma_ledger_fixed_month','ma_ledger_single_reversal','revoke all on public.%I from anon,authenticated',"reseller_id=(select auth.uid()) and (select public.ma_can_use())",'real_verified_pen numeric(12,2) not null default 0','No checkout, recharge credit'])assert.ok(sql.includes(key),'Missing safety: '+key);
for(const key of ['ma_record_payment','ma_charge_fixed','ma_record_meter','ma_record_guarantee','ma_record_expense','ma_admin_grant_bonus','ma_activate_bonus','data-ma3-action','data-ma3-form','ma1613Enhance'])assert.ok(js.includes(key),'Missing UI '+key);
assert.ok(bridge.includes('window.ma1613Enhance(area,target'));
assert.ok(loader.includes('v161-3-mi-alquiler.js?v=1613'));
assert.ok(loader.includes('v161-3-mi-alquiler.css?v=1613'));
assert.ok(css.includes('#ma1611layer .ma3-card'));
assert.ok(!/localStorage|sessionStorage|service_role|api\.apiperu\.pe|window\.location\.href\s*=/.test(js),'No secrets, cashouts, or insecure browser storage');
assert.ok(!/\b(drop\s+(table|schema)|truncate|alter\s+table\s+public\.mc_|alter\s+table\s+public\.cc_|update\s+public\.cc_real_service_wallets)\b/i.test(sql));
console.log('PASS V161.3: billing, RLS, financial idempotency, no commercial settlement; prior modules preserved.');