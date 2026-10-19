// Binance Pay Merchant API. La clave nunca se expone al navegador.
// https://developers.binance.com/en/docs/products/binance-pay-merchant/api-common
const host = "https://bpay.binanceapi.com";
const encoder = new TextEncoder();
function assertAllowedPath(path) {
  if (!["/binancepay/openapi/v2/order", "/binancepay/openapi/order/query"].includes(path))
    throw Error("Endpoint Merchant no permitido");
}
const nonce = () => Array.from(crypto.getRandomValues(new Uint8Array(32)),
  n => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[n % 62]).join("");
export async function signMerchantRequest(body, {apiKey, secretKey}, time=Date.now()) {
  if (!apiKey || !secretKey) throw Error("Merchant API no configurada");
  const timestamp = String(time), requestNonce = nonce(), rawBody=JSON.stringify(body);
  const key=await crypto.subtle.importKey("raw",encoder.encode(secretKey),
    {name:"HMAC",hash:"SHA-512"},false,["sign"]);
  const mac=await crypto.subtle.sign("HMAC",key,encoder.encode(timestamp+"\n"+requestNonce+"\n"+rawBody+"\n"));
  const signature=Array.from(new Uint8Array(mac), b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
  return {rawBody,headers:{
    "Content-Type":"application/json",
    "BinancePay-Timestamp":timestamp,
    "BinancePay-Nonce":requestNonce,
    "BinancePay-Certificate-SN":apiKey,
    "BinancePay-Signature":signature
  }};
}
export async function callMerchant(path,body,credentials,fetcher=fetch) {
  assertAllowedPath(path);
  const request=await signMerchantRequest(body,credentials);
  const response=await fetcher(host+path,{
    method:"POST",headers:request.headers,body:request.rawBody,signal:AbortSignal.timeout(8500)
  });
  if (!response.ok) throw Error("Binance Merchant HTTP "+response.status);
  const json=await response.json();
  if(json?.status!=="SUCCESS"||json.code!=="000000"||!json.data)
    throw Error("Binance Merchant rechazó la solicitud: "+String(json?.code ?? "sin código"));
  return json.data;
}
export function exactDecimal(value,maxDigits=8) {
  const s=String(value);
  if (!/^\d{1,10}(\.\d{1,8})?$/.test(s)) throw Error("Decimal no válido");
  const [whole,decimal=""] = s.split(".");
  if(decimal.length>maxDigits) throw Error("Precisión monetaria excedida");
  return (BigInt(whole)*100000000n+BigInt((decimal+"00000000").slice(0,8))).toString();
}
