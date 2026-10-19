/**
 * Binance Pay Merchant: verificador de notificación firmada, SIN acreditar saldo.
 * Solo para integrar cuando exista habilitación Merchant y certificado público
 * obtenido por canal autenticado y FIJADO en secretos del servidor.
 * Fuente: https://merchant.binance.com/en/docs/functionalities/webhooks
 */
const fail = message => { throw new Error(message); };
const textBytes = value => new TextEncoder().encode(value);
function fromBase64(base64) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) fail("Firma/certificado en base64 invalido");
  return Uint8Array.from(atob(base64), c=>c.charCodeAt(0));
}
function usdtMicros(value) {
  const str = String(value);
  if (!/^(0|[1-9][0-9]{0,8})(\.[0-9]{1,6})?$/.test(str)) fail("Importe USDT invalido");
  const [whole,decimal=""] = str.split(".");
  const amount = BigInt(whole) * 100000000n + BigInt((decimal+"00000000").slice(0,8));
  if (amount<=0n) fail("Importe USDT no positivo");
  return amount.toString();
}
export async function verifyBinancePayNotification(headers,rawBody,config) {
  if (!config || typeof config.publicKeyPem!=="string" || !config.certificateSerial) fail("Certificado Merchant no configurado");
  if (typeof rawBody!=="string" || !rawBody || textBytes(rawBody).length>16384) fail("Cuerpo de webhook invalido");
  const h = headers instanceof Headers ? headers : new Headers(headers);
  const serial=h.get("BinancePay-Certificate-SN");
  const nonce=h.get("BinancePay-Nonce");
  const timestamp=h.get("BinancePay-Timestamp");
  const signature=h.get("BinancePay-Signature");
  if (!serial || serial!==config.certificateSerial || !nonce || !timestamp || !signature) fail("Cabeceras de autenticacion no validas");
  if (!/^\d{13}$/.test(timestamp) || !/^[a-zA-Z0-9]{32}$/.test(nonce)) fail("Timestamp/nonce mal formados");
  const now = config.now ?? Date.now();
  if (!Number.isFinite(now) || Math.abs(now-Number(timestamp))>300000) fail("Notificacion fuera de ventana temporal");
  const pem=config.publicKeyPem.replace(/-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----|\s/g,"");
  const key=await crypto.subtle.importKey("spki",fromBase64(pem),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["verify"]);
  let accepted=false;
  try {
    accepted=await crypto.subtle.verify("RSASSA-PKCS1-v1_5",key,fromBase64(signature),textBytes(timestamp+"\n"+nonce+"\n"+rawBody+"\n"));
  } catch { accepted=false; }
  if (!accepted) fail("Firma Binance Pay invalida");
  let payload,data;
  try {
    payload=JSON.parse(rawBody);
    data=typeof payload.data==="string"?JSON.parse(payload.data):payload.data;
  } catch { fail("Cuerpo JSON no valido"); }
  if (payload.bizType!=="PAY" || payload.bizStatus!=="PAY_SUCCESS" || !data || typeof data!=="object") fail("Evento no acredita pago exitoso");
  const orderKey=data.merchantTradeNo;
  const transactionId=data.transactionId;
  if (typeof orderKey!=="string" || !/^[a-fA-F0-9]{32}$/.test(orderKey)) fail("Orden Merchant fuera del formato interno");
  if (typeof transactionId!=="string" || !/^[a-zA-Z0-9_\-]{8,128}$/.test(transactionId)) fail("Transaccion no identificable");
  if (data.currency!=="USDT") fail("La notificacion no confirma USDT");
  return Object.freeze({
    orderKey:orderKey.toLowerCase(),
    transactionId,
    currency:"USDT",
    amountMicros:usdtMicros(data.totalFee),
    eventId:String(payload.bizIdStr ?? payload.bizId ?? "")
  });
}
