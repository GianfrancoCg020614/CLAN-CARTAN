import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { signMerchantRequest, exactDecimal } from "../supabase/functions/_shared/binance-merchant-client.mjs";
import { validateBinanceSettlement } from "../supabase/functions/_shared/binance-settlement.mjs";
const secret="s".repeat(36),apiKey="merchant-api-key";
test("HMAC request Binance coincide sobre body literal y headers",async()=>{
 const r=await signMerchantRequest({merchantTradeNo:"a".repeat(32),fiatAmount:1,fiatCurrency:"PEN"},
  {apiKey,secretKey:secret},1720000000000);
 assert.equal(r.headers["BinancePay-Nonce"].length,32);
 const payload=r.headers["BinancePay-Timestamp"]+"\n"+r.headers["BinancePay-Nonce"]+"\n"+r.rawBody+"\n";
 const expected=createHmac("sha512",secret).update(payload).digest("hex").toUpperCase();
 assert.equal(r.headers["BinancePay-Signature"],expected);
});
test("compara enteros 8 decimales, sin error decimal de coma flotante",()=>{
 assert.equal(exactDecimal("0.00000001"),"1");
 assert.equal(exactDecimal("10.50000000"),"1050000000");
 assert.throws(()=>exactDecimal("10.000000001"));
});
const event={orderKey:"f".repeat(32),transactionId:"M_R_77777777",currency:"USDT",amountMicros:"250000000"};
const paid={merchantId:123456789,merchantTradeNo:event.orderKey,prepayId:"1234567890123",transactionId:event.transactionId,status:"PAID",currency:"USDT",totalFee:"2.50000000",transactTime:1792330000000};
test("consulta Merchant PAID y transaccion coincidente se aceptan",()=>{
 const params=validateBinanceSettlement(event,paid,"123456789");
 assert.equal(params.p_trade_no,event.orderKey);
 assert.equal(params.p_usdt,"2.50000000");
});
for(const [label,variation] of [
 ["merchant extraño",{merchantId:999}],
 ["pendiente",{status:"PENDING"}],
 ["monto cambiado",{totalFee:"2.50000001"}],
 ["moneda cambiada",{currency:"BNB"}],
 ["ID de transaccion cambiado",{transactionId:"M_R_88888888"}],
 ["numero de orden cambiado",{merchantTradeNo:"a".repeat(32)}],
 ["momento de pago invalido",{transactTime:null}],
]){
 test("rechaza "+label,()=>assert.throws(()=>validateBinanceSettlement(event,{...paid,...variation},"123456789")));
}
test("bloqueos de produccion presentes en ambos handlers",()=>{
 for(const p of ["cc-binance-create-order","cc-binance-pay-webhook"]){
  const content=readFileSync(new URL("../supabase/functions/"+p+"/index.ts",import.meta.url),"utf8");
  assert.match(content,/CC_BINANCE_MERCHANT_ENABLED/);
 }
});
test("migracion aisla saldos de prueba y exige servicio en RPC",()=>{
 const sql=readFileSync(new URL("../supabase/migrations/20261018195500_v131_binance_merchant_orders_fail_closed.sql",import.meta.url),"utf8");
 assert.ok(sql.includes("balance_pen=public.cc_real_service_wallets.balance_pen+excluded.balance_pen"));
 assert.ok(sql.includes("for update"));
 assert.ok(sql.includes("create policy cc_binance_orders_self_read"));
 assert.ok(sql.includes("cc_binance_merchant_credits"));
 assert.ok(sql.includes("revoke all on function public.cc_binance_merchant_credit"));
 assert.ok(!sql.includes("cc_service_wallets.balance_test"));
});
