// V142: tests sin saldo, no compras, no usuarios creados y sin acceso a secretos.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base=read('supabase/migrations/20261019111500_v142_wallet_audit_real_access_foundation.sql');
const payment=read('supabase/migrations/20261019113500_v142_subscription_bonus_reversals.sql');
const info=read('supabase/migrations/20261019115500_v142_information_discounts_and_pending_reversals.sql');
const cutover=read('supabase/migrations/20261019120500_v142_disable_test_subscription_after_launch.sql');
assert.ok(cutover.includes('cc_no_test_subscription_in_real_mode')&&cutover.includes('enabled=true'),'No se cierra TEST al habilitar cobro real');
const js=read('scripts/v142-financial-audit.js');
const css=read('styles/v142-financial-audit.css');
const html=read('index.html');
new Script(js,{filename:'v142-financial-audit.js'});
assert.match(html,/content="(?:V152-20261020|V158-20261021|V160-20261021|V161-20261021|V162-20261021)"/);
assert.ok(html.includes('scripts/v142-financial-audit.js?v=142'));
assert.ok(html.includes('styles/v142-financial-audit.css?v=142'));
for(const phrase of [
 'cc_wallet_financial_audit','balance_before','balance_after','cc_real_wallet_financial_capture',
 'auth.uid()','security invoker','p_before_id','cc_cobra_real_payment_settings',
 'enabled boolean not null default false','cc_cobra_real_access_periods',
 'cc_cobra_referral_bonuses','unique references public.cc_real_wallet_spends(id)',
 'unique references public.cc_cobra_real_access_periods(id)',
 'prevent_invitation_reassignment', 'cc_internal.cobra_entitled',
 'cc_internal.require_cobra_payment_for_approval','public.cy_subscription_status',
 'alter table public.cc_wallet_financial_audit enable row level security'
]) assert.ok(base.includes(phrase),'Fundamento no seguro: '+phrase);
for(const phrase of [
 'cc_pay_cobra_subscription_real','auth.uid()','CY_MONTHLY_V113',
 'balance_pen>=v_amount','from public.cy_access_periods',
 'from public.cc_cobra_real_access_periods','v_amount numeric(14,2):=15.00',
 "then 'RENEWAL' else 'INITIAL'","'BONUS'",'balance_pen=balance_pen+5.00',
 "'COBRA%'",'a.registered_user_id=v_user','a.inviter_user_id<>v_user',
 'cc_cobra_referral_bonuses','REVERSAL_PENDING','for update',
 'cc_refund_cobra_real_subscription','cc_refund_verified_real_purchase',
 'cc_audit.kind','to service_role'
]) assert.ok(payment.includes(phrase),'Pago/bono incorrecto: '+phrase);
assert.ok(payment.includes("coalesce(v_enabled,false)=false"),'No existe bloqueo comercial');
assert.ok(payment.includes("raise exception 'Saldo REAL insuficiente"),'Se habilita saldo simulado');
assert.ok(payment.includes("then return false"),'Reembolsos no idempotentes');
assert.ok(!payment.includes("balance_test=balance_test-"),'Prohibida billetera TEST en pagos reales');
for(const phrase of [
 'affects_balance=false','notional_amount_pen','cc_record_real_discount',
 'cc_cobra_bonus_pending_notice','Sin cambio'
]) {
 if(phrase==='Sin cambio')assert.ok(js.includes(phrase),'Presentación ahorro incorrecta');
 else assert.ok(info.includes(phrase),'Ausente evidencia informativa '+phrase);
}
assert.ok(js.includes('rpc/cc_my_real_financial_audit'),'Falta lectura protegida de auditoría');
assert.ok(js.includes('p_before_id:cursor'),'Falta paginación por cursor real');
assert.ok(js.includes('balance_before')&&js.includes('balance_after'),'Falta saldo antes/después');
assert.ok(js.includes('loadedUser!==user()'),'Caché entre usuarios no invalidado');
assert.ok(js.includes('csvSafe'),'CSV no protege contra fórmulas');
assert.ok(css.includes('.cc142-entry'),'Falta vista compacta móvil');
assert.ok(!js.includes('cc_service_wallets'),'Auditoría no puede leer billetera de prueba');
console.log('V142: saldo real auditado, S/15, bono único S/5, idempotencia, descuentos sin crédito y cierre comercial.');
