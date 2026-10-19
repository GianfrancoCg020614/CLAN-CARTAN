import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyBinancePayNotification } from "../_shared/binance-pay-verify.mjs";
import { callMerchant } from "../_shared/binance-merchant-client.mjs";
import { validateBinanceSettlement } from "../_shared/binance-settlement.mjs";

const reply=(body,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"Content-Type":"application/json; charset=utf-8"}
});
const required = key => {
  const v=Deno.env.get(key); if(!v)throw Error("Merchant webhook no configurado");return v;
};
Deno.serve(async req=>{
 if(req.method!=="POST") return reply({returnCode:"FAIL",returnMessage:"Method"},405);
 if (Deno.env.get("CC_BINANCE_MERCHANT_ENABLED")!=="true")
   return reply({returnCode:"FAIL",returnMessage:"Not enabled"},503);
 try{
  const length=Number(req.headers.get("content-length")||0);
  if(length>16384) return reply({returnCode:"FAIL",returnMessage:"Too large"},413);
  const rawBody=await req.text();
  if(new TextEncoder().encode(rawBody).length>16384)
    return reply({returnCode:"FAIL",returnMessage:"Too large"},413);
  // 1. Rechaza firmas falsas antes de consultar Supabase o Binance.
  const event=await verifyBinancePayNotification(req.headers,rawBody,{
    publicKeyPem:required("BINANCE_WEBHOOK_PUBLIC_KEY_PEM").replaceAll("\\n","\n"),
    certificateSerial:required("BINANCE_WEBHOOK_CERT_SN")
  });
  // 2. Independientemente consulta la orden a la API Merchant.
  const creds={apiKey:required("BINANCE_PAY_API_KEY"),
    secretKey:required("BINANCE_PAY_SECRET_KEY")};
  const expectedMerchant=required("BINANCE_MERCHANT_ID");
  const info=await callMerchant("/binancepay/openapi/order/query",{
    merchantTradeNo:event.orderKey
  },creds);
  const params=validateBinanceSettlement(event,info,expectedMerchant);

  // 3. La única operación financiera es una función SQL transaccional:
  // lock de orden, comparación exacta con importe esperado, ID único,
  // actualización de estado, asiento y balance al mismo tiempo.
  const db=createClient(required("SUPABASE_URL"),
    required("SUPABASE_SERVICE_ROLE_KEY"),
    {auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.rpc("cc_binance_merchant_credit",params);
  if(error) throw Error("Conciliación no aceptada: "+error.code);
  if(data!==true && data!==false) throw Error("Respuesta de conciliación desconocida");
  return reply({returnCode:"SUCCESS",returnMessage:null});
 }catch(err) {
  // Binance debe reintentar; nunca devolver SUCCESS antes del COMMIT o duplicado reconocido.
  console.error("Webhook rechazado:",err instanceof Error?err.message:"error");
  return reply({returnCode:"FAIL",returnMessage:"Verification failed"},503);
 }
});
