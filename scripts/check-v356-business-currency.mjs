import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8');
const html=read('index.html');
const helper=read('scripts/v356-business-currency.js');
const cochera=read('scripts/v158-mi-cochera.js');
const alquiler2=read('scripts/v161-2-mi-alquiler.js');
const alquiler3=read('scripts/v161-3-mi-alquiler.js');
const alquiler4=read('scripts/v161-4-mi-alquiler.js');
const cobra=read('index.html');
const stream=read('scripts/v195-streambulls-live.js');
const guard=read('supabase/migrations/20261111172630_currency_shared_preference_lock_v356.sql');

const deployed=html.match(/<meta name="cc-deploy-version" content="V(\d+)-(\d{8})">/);
assert.ok(deployed&&Number(deployed[1])>=357,'La versión debe conservar la preferencia compartida V357 o posterior');
assert.match(html,/scripts\/v356-business-currency\.js\?v=\d+(?:\.\d+)?/);
assert.match(helper,/cc_set_business_currency/);
assert.match(helper,/cc_profiles\?select=business_country,business_currency/);
assert.match(helper,/cy53loan/);
assert.match(helper,/No hay tipo de cambio ni conversión automática/);
assert.match(cochera,/MI COCHERA, MI ALQUILER y COBRA YA/);
assert.match(cochera,/ccLoadBusinessCurrency/);
assert.match(alquiler2,/ccFormatBusinessCurrency/);
assert.match(alquiler3,/ccFormatBusinessCurrency/);
assert.match(alquiler4,/ccFormatBusinessCurrency/);
assert.match(alquiler3,/cashPen/);
assert.match(cobra,/name="currency"/);
assert.doesNotMatch(stream,/CC_BUSINESS_CURRENCY|ccLoadBusinessCurrency|cc_set_business_currency/);
assert.match(guard,/currency IS DISTINCT FROM currency_code/);
assert.match(guard,/STREAM BULLS queda excluido/);

assert.ok(alquiler3.includes("inp('Importe ('+esc(window.CC_BUSINESS_CURRENCY||'PEN')+')','amount'"),'La garantía debe mostrar la moneda operativa');
assert.doesNotMatch(alquiler4,/Día PEN|Mes PEN|Tarifa PEN|Saldo PEN/);
assert.match(alquiler4,/Tarifa diaria/);
assert.match(alquiler4,/Moneda/);
assert.ok(alquiler4.includes("Saldo '+esc(window.CC_BUSINESS_CURRENCY||'PEN')+'"),'El reporte impreso debe indicar la moneda activa');
assert.match(cochera,/GTQ:"es-GT"/);
assert.match(cochera,/VES:"es-VE"/);
assert.match(cochera,/Guatemala","GTQ"/);
assert.match(cochera,/Venezuela","VES"/);
assert.match(read('scripts/v152-cobra-fast.js'),/ccFormatBusinessCurrency/);

console.log('PASS V357: moneda compartida en MI COCHERA, MI ALQUILER y COBRA YA; STREAM BULL’S excluido; sin conversión ni alteración de históricos.');
