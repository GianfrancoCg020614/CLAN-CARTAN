import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {signTaypiRequest,verifyTaypiWebhook} from "../supabase/functions/_shared/taypi-auth.mjs";
const secret="taypi_sk_test_"+"a".repeat(64);
const t=1792360800;
const raw=JSON.stringify({event:"payment.completed",payment_id:"a14dfb8e-d5c2-4a69-bae4-4688fef5eac2",merchant_id:"b25eac9f-e6d3-5b7a-bcf5-5799gfg6fbd3",amount:"5.00",currency:"PEN",status:"completed",reference:"CC-"+"a".repeat(32),paid_at:"2026-10-18T19:00:00-05:00"});
const head={ "Taypi-Signature":"sha256="+createHmac("sha256",secret).update(raw).digest("hex"),"Taypi-Timestamp":String(t)};
test("Firma solicitud TAYPI sobre timestamp metodo path body", async()=>{
 const body=JSON.stringify({amount:"5.00",currency:"PEN",reference:"CC-xyz"});
 const signed=await signTaypiRequest({method:"POST",path:"/api/v1/payments",rawBody:body,timestamp:t,secret});
 assert.equal(signed,createHmac("sha256",secret).update([t,"POST","/api/v1/payments",body].join("\n")).digest("hex"));
});
test("Acepta solo webhook firmado pago completado",async()=>{
 const e=await verifyTaypiWebhook(head,raw,secret,t*1000);
 assert.equal(e.amountPen,"5.00");assert.equal(e.reference,"CC-"+"a".repeat(32));
});
test("Rechaza alteraciones del monto",async()=>{
 await assert.rejects(verifyTaypiWebhook(head,raw.replace("5.00","9.00"),secret,t*1000),/Firma/);
});
test("Rechaza timestamp vencido",async()=>{
 await assert.rejects(verifyTaypiWebhook(head,raw,secret,(t+301)*1000),/ventana/);
});
test("Rechaza cancelación aun firmada",async()=>{
 const changed=raw.replace('"completed"','"expired"');
 const h={...head,"Taypi-Signature":"sha256="+createHmac("sha256",secret).update(changed).digest("hex")};
 await assert.rejects(verifyTaypiWebhook(h,changed,secret,t*1000),/no acredita/);
});
test("Rechaza moneda incorrecta aun firmada",async()=>{
 const changed=raw.replace('"PEN"','"USD"');
 const h={...head,"Taypi-Signature":"sha256="+createHmac("sha256",secret).update(changed).digest("hex")};
 await assert.rejects(verifyTaypiWebhook(h,changed,secret,t*1000),/no acredita/);
});
