import {createHandler} from '../cc-stream-delivery/handler.ts';
import {scanPaymentNotices} from '../_shared/payment-notices.mjs';
// Una aplicación OAuth puede servir a ambos módulos; los tokens y permisos se aíslan en el servidor.
const env=(name:string)=>Deno.env.get(name.replace(/^CC_STREAM_/,'CC_RECHARGE_'))||Deno.env.get(name);
Deno.serve(createHandler({env,fetcher:fetch,paymentMode:true,paymentScanner:scanPaymentNotices}));
