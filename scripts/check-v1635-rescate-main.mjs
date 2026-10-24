import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html');
const ui=read('scripts/v1635-rescate-ui.js');
const alquiler=read('scripts/v161-1-mi-alquiler.js');
const css=read('styles/v164-portal-4-negocios.css');
// Una sola web oficial; rescate aditivo y sin sobreescribir Auth/moneda/referidos.
for(const needed of [
 'Cuatro negocios, una sola cuenta',
 'Una cuenta para cuatro negocios',
 'STREAM BULL', 'COBRA YA', 'MI COCHERA', 'MI ALQUILER',
 'scripts/v161-1-mi-alquiler.js?v=1636',
 'scripts/v1635-rescate-ui.js?v=1636',
 'styles/v164-portal-4-negocios.css?v=1636',
 'scripts/v172-clan-referrals.js?v=172',
 'scripts/v160-invitation-register.js?v=160',
 'scripts/v161-marketing-account.js?v=161',
 'id="cc164-privacy"', 'id="cc161-marketing"',
 'scripts/v158-mi-cochera.js?v=158'
])assert.ok(html.includes(needed),'Falta en main integrado: '+needed);
for(const unsafe of ['scripts/v161-2-mi-alquiler.js?v=1636','scripts/v161-3-mi-alquiler.js?v=1636','scripts/v161-4-mi-alquiler.js?v=1636','scripts/v162-1-mi-alquiler-wallets.js']){
 assert.ok(!html.includes(unsafe),'No activar aún transacciones MI ALQUILER sin prueba E2E: '+unsafe);
}
assert.ok(!html.includes('Tres plataformas, una sola cuenta.'),'Texto anterior sin actualizar');
assert.ok(!html.includes('transfiere de una billetera a otra fácilmente'),'No anunciar billetera antigua como unica');
assert.ok(alquiler.includes("third.insertAdjacentElement('afterend', card)"));
assert.ok(alquiler.includes("card.id = 'ma1611card'"));
assert.ok(css.includes('repeat(4,minmax(0,1fr))'));
assert.ok(css.includes('html[data-cc-theme="light"]'));
assert.ok(ui.includes("const KEY='cc164-theme'"));
for(const dangerous of ['cc_real_service_wallets?','post_wallet_operation','ma_transfer_real_balance','cc_referral_monthly_rewards','signup('])
 assert.ok(!ui.includes(dangerous),'La recuperación visual NO debe ejecutar '+dangerous);
for(const legacy of ['cc77Auth(create)','ccParte1LegalReady','window.CC_V53_SESSION={jwt:jwt,userId:me.id'])
 assert.ok(html.includes(legacy),'No alterar seguridad/login/códigos preexistentes '+legacy);
for(const src of [
 'scripts/v161-1-mi-alquiler.js','scripts/v161-2-mi-alquiler.js',
 'scripts/v161-3-mi-alquiler.js','scripts/v161-4-mi-alquiler.js'
])assert.ok(read(src).length>5000,'MI ALQUILER incompleto '+src);
console.log('PASS rescate V163.5 sobre main: cuatro servicios, MI ALQUILER, tema visual y Auth/referrals intactos.');
