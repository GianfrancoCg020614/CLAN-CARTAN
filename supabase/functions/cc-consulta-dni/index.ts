import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const base=Deno.env.get("SUPABASE_URL")||"";
const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const token=Deno.env.get("APIPERU_TOKEN")||"";
const allowed=new Set(["https://www.clancartan.com","https://clancartan.com","https://clan-cartan.pages.dev"]);
function respond(body:Record<string,unknown>,status=200,origin=""){return new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":allowed.has(origin)?origin:"https://www.clancartan.com","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store","Vary":"Origin"}});}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return respond({},200,origin);
 if(req.method!=="POST")return respond({status:"invalid_method"},405,origin);
 if(origin&&!allowed.has(origin))return respond({status:"forbidden_origin"},403,origin);
 const auth=req.headers.get("Authorization")||"";
 if(!auth.startsWith("Bearer ")||!base||!anon||!service)return respond({status:"unavailable"},503,origin);
 const userResp=await fetch(base+"/auth/v1/user",{headers:{"apikey":anon,"Authorization":auth}}).catch(()=>null);
 if(!userResp?.ok)return respond({status:"unauthorized"},401,origin);
 const user=await userResp.json().catch(()=>null);
 if(!user?.id)return respond({status:"unauthorized"},401,origin);
 const body=await req.json().catch(()=>({}));
 const dni=String(body.dni||"");
 if(!/^\d{8}$/.test(dni))return respond({status:"invalid_dni"},400,origin);
 if(body.consent!==true)return respond({status:"consent_required"},400,origin);
 if(!token)return respond({status:"manual",reason:"provider_not_configured"},200,origin);
 const headers={"apikey":service,"Authorization":"Bearer "+service,"Content-Type":"application/json"};
 const quotaResp=await fetch(base+"/rest/v1/rpc/cc_claim_dni_quota",{method:"POST",headers,body:JSON.stringify({p_user:user.id})}).catch(()=>null);
 if(!quotaResp?.ok)return respond({status:"manual",reason:"quota_unavailable"},200,origin);
 const quota=await quotaResp.json().catch(()=>null);
 const slot=Array.isArray(quota)?quota[0]:quota;
 if(!slot?.allowed)return respond({status:"manual",reason:slot?.reason||"quota_exhausted",remaining:slot?.remaining??0},200,origin);
 const control=new AbortController();const stop=setTimeout(()=>control.abort(),9000);
 try{
  const remote=await fetch("https://api.apiperu.dev/dni",{method:"POST",signal:control.signal,headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({dni})});
  const data=await remote.json().catch(()=>({}));
  if(remote.status===429||/quota|credit|limit|plan_exhausted/i.test(String(data?.code||"")+" "+String(data?.message||""))){
   await fetch(base+"/rest/v1/rpc/cc_mark_dni_provider_exhausted",{method:"POST",headers,body:"{}"}).catch(()=>{});
   return respond({status:"manual",reason:"quota_exhausted",remaining:0},200,origin);
  }
  if(!remote.ok||data?.success!==true)return respond({status:"manual",reason:remote.status===404?"not_found":"provider_unavailable",remaining:slot.remaining},200,origin);
  const d=data.data||{};
  const full=String(d.nombre_completo||[d.nombres,d.apellido_paterno,d.apellido_materno].filter(Boolean).join(" ")).trim().slice(0,160);
  if(!full)return respond({status:"manual",reason:"not_found",remaining:slot.remaining},200,origin);
  return respond({status:"found",full_name:full,remaining:slot.remaining},200,origin);
 }catch(_){return respond({status:"manual",reason:"provider_unavailable",remaining:slot.remaining},200,origin);}
 finally{clearTimeout(stop);}
});
