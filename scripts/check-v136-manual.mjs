// V136: comprobaciones de UI y seguridad de recarga manual, sin mover dinero.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('scripts/v136-manual-recharges.js');
const qrSharedNumberExposed=(source)=> /Número DALE:\\s*<strong>|CCI:\\s*<strong>|923319637/.test(source);

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
assert.ok(html.includes('scripts/v136-manual-recharges.js?v=147') || html.includes('scripts/v136-manual-recharges.js?v=156'));
assert.ok(html.includes('styles/v136-manual-recharges.css?v=137'));
assert.ok(html.includes('scripts/v122-recharges.js?v=147'));
assert.ok(css.includes('.cc136manual'));
assert.ok(base.includes('LEMON_DALE:false,BINANCE:false'));
assert.ok(base.includes('cc136goManual'));
assert.ok(js.includes('if(!readiness.enabled)'));
assert.ok(!js.includes('923319637'),"V155: la interfaz pública no debe revelar el número DALE");
assert.ok(!qrSharedNumberExposed(read('scripts/v146-personal-manual-topups.js')),"V155: la leyenda del QR no debe mostrar datos bancarios");
assert.ok(js.includes("LEMON / DALE"),"V137: etiqueta de recaudación ausente");
assert.ok(!js.includes('navigator.clipboard.writeText'),"V155: retirar botón de copiar teléfono");
assert.ok(html.includes('<details class="cy105advanced" open><summary>Moneda y garantía (opcional)</summary>'),"V137: garantía opcional debe estar visible");
assert.ok(html.includes('name="collateral"')&&html.includes('¿Qué dejó en garantía? (opcional)'),"V137: descripción de garantía no disponible");
assert.ok(html.includes('content="V152-20261020"'));

const qrShared=readFileSync(new URL('v146-personal-manual-topups.js',import.meta.url),'utf8');
assert.ok(qrShared.includes("renderSharedQr('cc147manualQr'"),'QR manual no visible');
assert.ok(qrShared.includes("renderSharedQr('cc147autoQr'"),'QR automático no visible');
assert.ok(qrShared.includes('assets/qr-dale-gianfranco.svg')&&qrShared.includes('assets/qr-binance-personal.png'),'QR compartidos ausentes');
assert.ok(qrShared.includes('1276635702'),'ID Binance incorrecto');
assert.ok(html.includes('scripts/v146-personal-manual-topups.js?v=147') || html.includes('scripts/v146-personal-manual-topups.js?v=156'),'Script V146 no cargado');
const qrPng=readFileSync(new URL('../assets/qr-binance-personal.png',import.meta.url));
assert.equal(qrPng.subarray(0,8).toString('hex'),'89504e470d0a1a0a','QR Binance no es PNG');
console.log('V136: controles manuales con cola ADMIN y confirmación explícita, con QR personales compartidos; siempre verifica ADMIN.');
