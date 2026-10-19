import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
const read = p => readFileSync(new URL("../"+p,import.meta.url),"utf8");
const js=read("scripts/v132-wallet-movements.js");
const css=read("styles/v132-wallet-movements.css");
const sql=read("supabase/migrations/20261018221000_v132_wallet_movements.sql");
const html=read("index.html");
new Script(js,{filename:"v132-wallet-movements.js"});
assert.match(html,/content="V136-20261019"/);
assert.ok(html.includes('scripts/v132-wallet-movements.js?v=135'));
assert.ok(html.includes('styles/v132-wallet-movements.css?v=135'));
for(const id of ["cc132search","cc132service","cc132perpage","cc132pdf","cc132excel","cc132tbody","cc132state","cc132reload"]){
 assert.ok(js.includes(id),"Falta un control de historial "+id);
}
assert.ok(js.includes("rpc/cc_my_real_wallet_movements"),"Historial no consulta el RPC protegido");
assert.ok(js.includes("affects_balance"),"No se distinguen órdenes pendientes");
assert.ok(js.includes("window.print()"),"No está disponible Guardar como PDF");
assert.ok(js.includes("text/csv;charset=utf-8"),"No existe Excel CSV");
assert.ok(js.includes("loadedUser!==currentUser()"),"Historial se puede conservar al cambiar de cuenta");
assert.ok(!js.includes("cc_service_wallets?"),"No se deben mostrar saldos de prueba como reales");
assert.ok(css.includes("CLAN CARTAN V132"),"Estilo de movimientos ausente");
assert.ok(sql.includes("security invoker"),"La consulta de movimientos debe respetar RLS");
assert.ok(sql.includes("auth.uid()"),"La consulta no restringe la sesión");
assert.ok(sql.includes("cc_real_wallet_ledger"),"Falta historial real de depósitos");
assert.ok(sql.includes("cc_real_wallet_transfers"),"Faltan transferencias reales");
assert.ok(sql.includes("cc_real_wallet_spends"),"Faltan futuros gastos reales");
assert.ok(sql.includes("from public.cc_binance_merchant_orders"),"Faltan órdenes Binance");
assert.ok(sql.includes("status<>'CREDITED'"),"Recargas potencialmente duplicadas con ledger");
assert.ok(sql.includes("revoke all on function public.cc_charge_verified_real_wallet"),"Gastos reales no protegidos");
assert.ok(!sql.includes("cc_service_wallets.balance_test"),"Consulta mezcla saldos de prueba");
// V135: reembolsos de compras reales y constancia del usuario.
const refundSQL=read("supabase/migrations/20261019001500_v135_real_wallet_refunds.sql");
for(const field of ["cc135type","cc135month","cc135in","cc135out","cc135ref","cc135net","printReceipt","REFUND"]){
 assert.ok(js.includes(field),"V135 falta "+field);
}
for(const term of ["cc_real_wallet_refunds","for update","v_total+p_amount>v_spend.amount_pen",
 "to service_role","security invoker"]){
 assert.ok(refundSQL.includes(term),"V135 SQL falta "+term);
}
assert.ok(css.includes(".cc135-summary"));
console.log("V132: migración RLS, filtros, UI, exportaciones y separación de saldos verificados.");
