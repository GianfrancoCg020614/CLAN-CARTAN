import { createClient } from "jsr:@supabase/supabase-js@2";
import { callMerchant, exactDecimal } from "../_shared/binance-merchant-client.mjs";

const origin = "https://www.clancartan.com";
function reply(body,status=200,requestOrigin="") {
  return new Response(JSON.stringify(body),{
    status,headers:{"Content-Type":"application/json; charset=utf-8",
      ...(requestOrigin===origin?{"Access-Control-Allow-Origin":origin,"Vary":"Origin"}:{})}
  });
}
const required = key => {
  const value=Deno.env.get(key);
  if (!value) throw Error("Configuración Merchant incompleta");
  return value;
};
Deno.serve(async req => {
  const requestOrigin=req.headers.get("origin")||"";
  if (req.method==="OPTIONS")
    return new Response(null,{status:204,headers:{
      "Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS",
      "Access-Control-Allow-Headers":"authorization, apikey, content-type","Vary":"Origin"
    }});
  if (req.method!=="POST" || (requestOrigin && requestOrigin!==origin))
    return reply({error:"Solicitud no permitida"},403);
  // Requisito absoluto: cuentas personales NO habilitan pagos en producción.
  if (Deno.env.get("CC_BINANCE_MERCHANT_ENABLED")!=="true")
    return reply({error:"Binance Merchant no habilitado: no envíes fondos"},503,requestOrigin);
  const bearer=req.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ")) return reply({error:"Inicia sesión"},401,requestOrigin);
  let orderId;
  let db;
  try {
    const url=required("SUPABASE_URL");
    const publishable=required("SUPABASE_ANON_KEY");
    const service=required("SUPABASE_SERVICE_ROLE_KEY");
    const merchantId=required("BINANCE_MERCHANT_ID");
    const creds={apiKey:required("BINANCE_PAY_API_KEY"),secretKey:required("BINANCE_PAY_SECRET_KEY")};
    const auth=createClient(url,publishable,{auth:{persistSession:false,autoRefreshToken:false}});
    const token=bearer.slice(7);
    const {data:{user},error:authError}=await auth.auth.getUser(token);
    if(authError||!user) return reply({error:"Sesión inválida"},401,requestOrigin);

    if(Number(req.headers.get("content-length")||0)>4096) return reply({error:"Solicitud excesiva"},413,requestOrigin);
    const body=await req.json();
    const serviceName=body?.service;
    const amount=String(body?.amountPen??"");
    if (!["COBRA_YA","STREAM_BULLS"].includes(serviceName) ||
        !/^(?:[1-9]\d?)(?:\.\d{1,2})?$/.test(amount) ||
        Number(amount)<1 || Number(amount)>10)
      return reply({error:"Elige billetera y monto entre S/1 y S/10"},400,requestOrigin);
    db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
    const merchantTradeNo=crypto.randomUUID().replaceAll("-","");
    const {data:reserved,error:reserveError}=await db.rpc("cc_binance_merchant_reserve",{
      p_user_id:user.id,p_service:serviceName,p_amount_pen:Number(amount),p_trade_no:merchantTradeNo
    });
    if (reserveError || !reserved) return reply({error:"No fue posible reservar orden"},409,requestOrigin);
    orderId=reserved;

    const data=await callMerchant("/binancepay/openapi/v2/order",{
      env:{terminalType:"WEB"}, merchantTradeNo,
      fiatAmount:Number(amount), fiatCurrency:"PEN",
      goods:{goodsType:"02", goodsCategory:"6000",referenceGoodsId:merchantTradeNo,
        goodsName:"Recarga Clan Cartan"}
    },creds);
    if (data.fiatCurrency!=="PEN" ||
        exactDecimal(data.fiatAmount)!==exactDecimal(amount) ||
        data.currency!=="USDT" ||
        !data.prepayId || !data.checkoutUrl || !data.totalFee)
      throw Error("Binance no confirmó fiat PEN o el equivalente USDT");

    const {data:ready,error:readyError}=await db.rpc("cc_binance_merchant_ready",{
      p_order_id:orderId,p_prepay_id:String(data.prepayId),
      p_expected_usdt:data.totalFee,p_checkout_url:String(data.checkoutUrl),
      p_merchant_id:merchantId
    });
    if(readyError||ready!==true) throw Error("No fue posible registrar orden Merchant");
    return reply({
      orderId,merchantTradeNo,amountPen:Number(amount),currency:"PEN",
      equivalentUsdt:String(data.totalFee),checkoutUrl:String(data.checkoutUrl),
      expiresAt:data.expireTime, status:"READY"
    },200,requestOrigin);
  } catch (e) {
    if(orderId && db) {
      try {await db.rpc("cc_binance_merchant_fail",{p_order_id:orderId});} catch {}
    }
    console.error("Binance Merchant crear orden:",e instanceof Error?e.message:"error inesperado");
    return reply({error:"No fue posible crear la orden verificada. No envíes fondos."},503,requestOrigin);
  }
});
