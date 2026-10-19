import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync,sign } from "node:crypto";
import {verifyBinancePayNotification} from "../supabase/functions/_shared/binance-pay-verify.mjs";
const {publicKey,privateKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const cert=publicKey.export({type:"spki",format:"pem"}).toString();
const sn="expected-binance-merchant-certificate";
const now=Date.UTC(2026,9,18,18,0,0);
const key="a".repeat(32);
function notification({status="PAY_SUCCESS",fee="10.50",currency="USDT"}={}) {
  const raw=JSON.stringify({bizType:"PAY",bizStatus:status,bizIdStr:"EVENT1",data:JSON.stringify({
    merchantTradeNo:key,transactionId:"M_R_123456789",currency,totalFee:fee
  })});
  const h=new Headers({
    "BinancePay-Certificate-SN":sn,
    "BinancePay-Nonce":"A".repeat(32),
    "BinancePay-Timestamp":String(now),
    "BinancePay-Signature":sign("RSA-SHA256",Buffer.from(String(now)+"\n"+"A".repeat(32)+"\n"+raw+"\n"),privateKey).toString("base64")
  });
  return {raw,h};
}
const verify=(h,raw,config={})=>verifyBinancePayNotification(h,raw,{publicKeyPem:cert,certificateSerial:sn,now,...config});
test("firma RSA valida, evento PAY_SUCCESS, USDT y monto exacto",async()=>{
 const {raw,h}=notification();
 assert.deepEqual(await verify(h,raw),{orderKey:key,transactionId:"M_R_123456789",currency:"USDT",amountMicros:"1050000000",eventId:"EVENT1"});
});
test("rechaza evento alterado despues de firmar",async()=>{
 const {raw,h}=notification();
 await assert.rejects(verify(h,raw.replace("10.50","99.99")),/Firma/);
});
test("rechaza certificado distinto",async()=>{
 const {raw,h}=notification();h.set("BinancePay-Certificate-SN","otro");
 await assert.rejects(verify(h,raw),/Cabeceras/);
});
test("rechaza notificacion antigua",async()=>{
 const {raw,h}=notification();
 await assert.rejects(verify(h,raw,{now:now+360000}),/ventana/);
});
test("rechaza cancelacion aunque tenga firma legitima",async()=>{
 const {raw,h}=notification({status:"PAY_CLOSED"});
 await assert.rejects(verify(h,raw),/no acredita/);
});
test("rechaza moneda incorrecta firmada",async()=>{
 const {raw,h}=notification({currency:"BTC"});
 await assert.rejects(verify(h,raw),/USDT/);
});
test("no confunde un numero con un recibo verificado",async()=>{
 const {raw,h}=notification({fee:"0.000001"});
 assert.equal((await verify(h,raw)).amountMicros,"100");
});
