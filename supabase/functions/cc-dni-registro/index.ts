import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const root=Deno.env.get("SUPABASE_URL")||"";
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const providerToken=Deno.env.get("APIPERU_TOKEN")||"";
const allow=new Set(["https://www.clancartan.com","https://clancartan.com","https://clan-cartan.pages.dev"]);
function json(data:Record<string,unknown>,origin:string,status=200){
 return new Response(JSON.stringify(data),{status,headers:{
  "Content-Type":"application/json;charset=utf-8","Cache-Control":"no-store",
  "Vary":"Origin","Access-Control-Allow-Origin":allow.has(origin)?origin:"https://www.clancartan.com",
  "Access-Control-Allow-Methods":"POST,OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type,apikey",
  "X-Content-Type-Options":"nosniff"
 }});
}
function hex(bytes:ArrayBuffer){return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("");}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin")||"";
 if(!allow.has(origin))return json({status:"forbidden_origin"},origin,403);
 if(req.method==="OPTIONS")return json({},origin);
 if(req.method!=="POST")return json({status:"invalid_method"},origin,405);
 if(Number(req.headers.get("Content-Length")||0)>2000)return json({status:"bad_request"},origin,400);
 const body=await req.json().catch(()=>({}));
 const dni=typeof body.dni==="string"?body.dni.trim():"";
 if(!/^\d{8}$/.test(dni))return json({status:"invalid_dni"},origin,400);
 if(body.consent!==true)return json({status:"consent_required"},origin,400);
 if(!root||!service||!providerToken)return json({status:"manual",reason:"provider_unavailable"},origin);
 // Network rate limit: HMAC of address, never store raw IP or the DNI.
 const ip=(req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||
  req.headers.get("x-forwarded-for")?.split(",")[0]||"").trim();
 if(!ip||ip.length>72||!/^[0-9a-fA-F.:]+$/.test(ip))return json({status:"manual",reason:"rate_unavailable"},origin);
 const hmacKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(service),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const hash=hex(await crypto.subtle.sign("HMAC",hmacKey,new TextEncoder().encode(ip)));
 const headers={apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"};
 const claim=await fetch(root+"/rest/v1/rpc/cc_claim_public_dni_quota",{
  method:"POST",headers,body:JSON.stringify({p_ip_hash:hash})
 }).catch(()=>null);
 if(!claim?.ok)return json({status:"manual",reason:"quota_unavailable"},origin);
 const rows=await claim.json().catch(()=>[]);
 const slot=Array.isArray(rows)?rows[0]:rows;
 if(!slot?.allowed)return json({status:"manual",reason:slot?.reason||"quota_unavailable",remaining:slot?.remaining??0},origin);
 const controller=new AbortController();const stop=setTimeout(()=>controller.abort(),8500);
 try{
  const response=await fetch("https://api.apiperu.dev/dni",{
   method:"POST",headers:{Authorization:"Bearer "+providerToken,"Content-Type":"application/json","Accept":"application/json"},
   body:JSON.stringify({dni}),signal:controller.signal
  });
  const remote=await response.json().catch(()=>({}));
  const desc=String(remote?.code||"")+" "+String(remote?.message||"");
  if(response.status===429||/quota|limite|límite|crédito|credit|plan_exhausted/i.test(desc)){
   await fetch(root+"/rest/v1/rpc/cc_mark_dni_provider_exhausted",{method:"POST",headers,body:"{}"}).catch(()=>{});
   return json({status:"manual",reason:"quota_exhausted",remaining:0},origin);
  }
  if(!response.ok||remote?.success!==true)return json({status:"manual",reason:"provider_unavailable",remaining:slot.remaining},origin);
  const value=remote.data||{};
  const name=String(value.nombre_completo||[value.nombres,value.apellido_paterno,value.apellido_materno].filter(Boolean).join(" ")).trim().replace(/\s+/g," ").slice(0,150);
  if(!name)return json({status:"manual",reason:"not_found",remaining:slot.remaining},origin);
  return json({status:"found",full_name:name,remaining:slot.remaining},origin);
 }catch(_){return json({status:"manual",reason:"provider_unavailable",remaining:slot.remaining},origin);}
 finally{clearTimeout(stop);}
});
