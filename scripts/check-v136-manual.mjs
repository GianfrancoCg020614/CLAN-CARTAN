// V136: comprobaciones de UI y seguridad de recarga manual, sin mover dinero.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('scripts/v136-manual-recharges.js');
const base=read('scripts/v122-recharges.js');
const html=read('index.html');
const css=read('styles/v136-manual-recharges.css');
const sql=read('supabase/migrations/20261019020000_v136_manual_recharges.sql');
new Script(js);
new Script(base);
for(const token of ['cc136submit','cc136adminList','cc136adminStatus','cc136recipient','cc136history','cc136service','cc136amount','cc136name','cc136ref','p_confirmed_received']){
 assert.ok(js.includes(token),'Falta UI '+token);
}
for(const token of ['cc_manual_recharge_requests','cc_submit_manual_recharge','cc_admin_manual_recharge_queue',
 'cc_admin_decide_manual_recharge','merchant_permission_verified','collection_enabled',
 'v_req.user_id=v_admin','cc_real_wallet_ledger','cc_real_service_wallets',
 'for update','auth.uid()','cc_admins','p_confirmed_received','bank_transaction_id text unique']){
 assert.ok(sql.includes(token),'Falta SQL '+token);
}
assert.ok(html.includes('scripts/v136-manual-recharges.js?v=137'));
assert.ok(html.includes('styles/v136-manual-recharges.css?v=137'));
assert.ok(html.includes('scripts/v122-recharges.js?v=136'));
assert.ok(css.includes('.cc136manual'));
assert.ok(base.includes('LEMON_DALE:false,BINANCE:false'));
assert.ok(base.includes('cc136goManual'));
assert.ok(js.includes('if(!readiness.enabled)'));
assert.ok(js.includes("923319637"),"V137: número DALE ausente");
assert.ok(js.includes("LEMON / DALE"),"V137: etiqueta de recaudación ausente");
assert.ok(js.includes("navigator.clipboard.writeText"),"V137: copiar número ausente");
assert.ok(html.includes('<details class="cy105advanced" open><summary>Moneda y garantía (opcional)</summary>'),"V137: garantía opcional debe estar visible");
assert.ok(html.includes('name="collateral"')&&html.includes('¿Qué dejó en garantía? (opcional)'),"V137: descripción de garantía no disponible");
assert.ok(html.includes('content="V138-20261019"'));
console.log('V136: controles manuales con cola ADMIN y confirmación explícita, sin QR personal.');
