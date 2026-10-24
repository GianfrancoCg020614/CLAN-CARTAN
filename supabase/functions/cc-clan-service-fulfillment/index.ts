// CLAN CARTAN · signed service fulfillment bridge · STAGING only.
// This endpoint is fail-closed until each service backend has its own HMAC secret.
const SERVICES = {
  STREAM_BULLS: "CLAN_FULFILLMENT_STREAM_BULLS_SECRET",
  COBRA_YA: "CLAN_FULFILLMENT_COBRA_YA_SECRET",
  MI_COCHERA: "CLAN_FULFILLMENT_MI_COCHERA_SECRET",
  MI_ALQUILER: "CLAN_FULFILLMENT_MI_ALQUILER_SECRET"
} as const;
const json=(status:number,data:Record<string,unknown>)=>new Response(JSON.stringify(data),{
 status,headers:{"content-type":"application/json","cache-control":"no-store"}
});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ref=/^[a-zA-Z0-9:_-]{12,130}$/;
function hex(b:ArrayBuffer){return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("");}
function timingSafe(a:string,b:string){
 if(a.length!==b.length)return false;
 let different=0;
 for(let i=0;i<a.length;i++)different|=a.charCodeAt(i)^b.charCodeAt(i);
 return different===0;
}
Deno.serve(async(req)=>{
 if(req.method!=="POST")return json(405,{error:"method_not_allowed"});
 const endpoint=Deno.env.get("SUPABASE_URL");
 const serverKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!endpoint||!serverKey)return json(503,{error:"backend_not_configured"});
 const raw=await req.text();
 if(raw.length>8192)return json(413,{error:"payload_too_large"});
 let body:Record<string,unknown>;
 try{body=JSON.parse(raw);if(!body||Array.isArray(body)||typeof body!=="object")throw Error("Invalid JSON");}
 catch{return json(400,{error:"invalid_json"});}
 const service=body.service;
 if(typeof service!=="string"||!(service in SERVICES))return json(400,{error:"invalid_service"});
 const secret=Deno.env.get(SERVICES[service as keyof typeof SERVICES]);
 if(!secret||secret.length<32)return json(503,{error:"service_not_configured"});
 const timestamp=req.headers.get("x-clan-timestamp")||"";
 const time=Number(timestamp);
 if(!/^\d{13}$/.test(timestamp)||Math.abs(Date.now()-time)>300000)return json(401,{error:"expired_request"});
 const signature=req.headers.get("x-clan-signature")||"";
 if(!/^[0-9a-f]{64}$/i.test(signature))return json(401,{error:"invalid_signature"});
 const cryptoKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),
 {name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const expected=hex(await crypto.subtle.sign("HMAC",cryptoKey,new TextEncoder().encode(timestamp+"."+raw)));
 if(!timingSafe(expected,signature.toLowerCase()))return json(401,{error:"invalid_signature"});
 const {activation_key,user_id,amount_pen,fulfillment_reference}=body;
 if(typeof activation_key!=="string"||!ref.test(activation_key)||
 typeof user_id!=="string"||!uuid.test(user_id)||
 typeof fulfillment_reference!=="string"||!ref.test(fulfillment_reference)||
 typeof amount_pen!=="number"||!Number.isFinite(amount_pen)||amount_pen<=0||
 !Number.isInteger(amount_pen*100)||amount_pen>100000)return json(400,{error:"invalid_fulfillment"});
 // Do NOT trust a browser confirmation. Only service servers possessing the HMAC key can attest delivery.
 const headers={"apikey":serverKey,"Authorization":"Bearer "+serverKey,"Content-Type":"application/json"};
 const receipt={activation_key,user_id,service,amount_pen,fulfillment_reference,fulfilled_at:new Date().toISOString()};
 const saved=await fetch(endpoint+"/rest/v1/cc_clan_service_fulfillment_receipts",{
 method:"POST",headers:{...headers,"Prefer":"resolution=ignore-duplicates,return=minimal"},body:JSON.stringify(receipt)});
 if(!saved.ok)return json(502,{error:"fulfillment_record_failed"});
 const activated=await fetch(endpoint+"/rest/v1/rpc/cc_clan_activate_with_real_wallet",{
 method:"POST",headers,body:JSON.stringify({
 p_referred_user_id:user_id,p_service:service,p_amount_pen:amount_pen,
 p_activation_key:activation_key,p_receipt_key:fulfillment_reference
 })});
 if(!activated.ok)return json(409,{error:"activation_not_completed",retryable:true});
 const state=await activated.json();
 if(state!=="ACTIVATED_REAL_AND_REFERRAL_SETTLED"&&state!=="ALREADY_ACTIVATED")
 return json(502,{error:"unexpected_activation_result"});
 return json(200,{ok:true,activation_key,status:state});
});
