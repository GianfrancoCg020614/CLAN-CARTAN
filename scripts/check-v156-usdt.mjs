// V156: pruebas estáticas y de sintaxis sin pagos ni tasas ficticias.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(p,'utf8');
const quote=read('scripts/v156-usdt-quote.js');
const legacy=read('scripts/v146-personal-manual-topups.js');
const patch=read('scripts/patch-v152-cobra.mjs');
const sql=read('supabase/migrations/20261021001000_v156_binance_usdt_pen_settlement_protection.sql');
const constraints=read('supabase/migrations/20261021001200_v156_1_usdt_credit_net_settlement_check.sql');
const fix=read('supabase/migrations/20261021001400_v156_2_quote_publisher_string_concat_fix.sql');
new Script(quote,{filename:'v156-usdt-quote.js'});
new Script(legacy,{filename:'v146-personal-manual-topups.js'});
for(const marker of [
 'cc_current_usdt_pen_quote_v125','cc_admin_publish_usdt_pen_quote',
 'cc_admin_credit_verified_binance_personal','cc_binance_personal_policy',
 'data-usdt-custom','data-quote-market','data-quote-fees','data-quote-protect',
 '<table>','valid_until','rateActive','Sin cotización vigente','PEN neto',
 'No se acredita más que ese neto','confirmed_settled'
])assert.ok(quote.includes(marker),'V156 falta '+marker);
assert.ok(!quote.includes('3.700000'),'No publicar tasas hipotéticas como mercado actual');
assert.ok(!legacy.includes('<option value="BINANCE_PERSONAL">'),'Formulario viejo no puede acreditar Binance');
assert.ok(patch.includes('scripts/v156-usdt-quote.js?v=156'),'Falta cargar tabla USDT/PEN');
assert.ok(patch.includes('v146-personal-manual-topups.js?v=156'),'Falta bustear cache recarga');
for(const token of ['commercial_authorized','net_settled_pen','settlement_reference',
 'quote_id','p_confirmed_received','p_confirmed_settled','trunc(',
 'cc_personal_binance_net_settlement_guard','BINANCE_PERSONAL'
])assert.ok(sql.includes(token),'Falta protección SQL '+token);
assert.ok(constraints.includes('credited_pen<=net_settled_pen'),'Límite por neto liquidado no preservado');
assert.ok(fix.includes('||trim(p_reference)'),'La corrección de cotización no está versionada');
console.log('V156 verificada: precio verificable y conservador; USDT/PEN solo tras liquidación neta ADMIN; sin recargas reales.');
