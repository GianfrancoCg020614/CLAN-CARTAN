/**
 * CLAN CARTAN V133 — TAYPI: helpers de firma para piloto SANDBOX.
 * NO es un webhook activo, NO acredita saldos y NO envía dinero.
 * Aún requiere verificar jurídicamente al proveedor, activar cuenta comercio
 * y obtener credenciales por un canal seguro.
 * Docs: https://docs.taypi.pe/seguridad & /webhooks
 */
const enc = new TextEncoder();
const hex = bytes => Array.from(new Uint8Array(bytes), v=>v.toString(16).padStart(2,"0")).join("");
const key = async (secret) => {
  if (typeof secret!=="string" || secret.length<24) throw Error("Secreto no configurado");
  return crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
};
export async function signTaypiRequest({method,path,rawBody="",timestamp,secret}) {
  if (!["GET","POST"].includes(method) || !/^\/api\/v1\/payments(?:\/[a-zA-Z0-9-]+)?$/.test(path))
    throw Error("Ruta o método de pagos no permitidos");
  if (!/^\d{10}$/.test(String(timestamp)) || typeof rawBody!=="string")
    throw Error("Solicitud inválida");
  const msg=[String(timestamp),method,path,rawBody].join("\n");
  return hex(await crypto.subtle.sign("HMAC",await key(secret),enc.encode(msg)));
}
export async function verifyTaypiWebhook(headers,rawBody,secret,now=Date.now()) {
  if(typeof rawBody!=="string" || enc.encode(rawBody).byteLength>16384)
    throw Error("Payload inválido");
  const h=headers instanceof Headers?headers:new Headers(headers);
  const sig=h.get("Taypi-Signature")||"";
  const ts=h.get("Taypi-Timestamp")||"";
  if(!/^sha256=[0-9a-fA-F]{64}$/.test(sig)|| !/^\d{10}$/.test(ts))
    throw Error("Firma o timestamp inválido");
  if(Math.abs(now/1000-Number(ts))>300) throw Error("Webhook fuera de ventana temporal");
  const expected=new Uint8Array(await crypto.subtle.sign("HMAC",await key(secret),enc.encode(rawBody)));
  const received=Uint8Array.from((sig.slice(7).match(/.{2}/g)||[]), n=>parseInt(n,16));
  let diff=0;
  if(received.length!==expected.length) throw Error("Longitud firma inválida");
  for(let i=0;i<expected.length;i++)diff|=expected[i]^received[i];
  if(diff!==0)throw Error("Firma inválida");
  const data=JSON.parse(rawBody);
  if(data.event!=="payment.completed"||data.status!=="completed"||data.currency!=="PEN")
    throw Error("Evento no acredita pago");
  if(typeof data.payment_id!=="string" || !/^[a-f0-9-]{36}$/i.test(data.payment_id))
    throw Error("Falta ID de pago");
  if(typeof data.reference!=="string" || !/^CC-[a-f0-9]{32}$/.test(data.reference))
    throw Error("Referencia de orden desconocida");
  if(typeof data.merchant_id!=="string" || data.merchant_id.length<8)
    throw Error("Merchant faltante");
  if(typeof data.amount!=="string"|| !/^[1-9]\d{0,3}\.\d{2}$/.test(data.amount))
    throw Error("Monto PEN inválido");
  if(!Number.isFinite(Date.parse(data.paid_at)))throw Error("Fecha de pago inválida");
  return Object.freeze({
    paymentId:data.payment_id,
    reference:data.reference,
    merchantId:data.merchant_id,
    amountPen:data.amount,
    paidAt:data.paid_at,
    currency:"PEN"
  });
}
