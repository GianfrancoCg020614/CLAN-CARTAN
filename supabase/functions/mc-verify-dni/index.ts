// MI COCHERA V158 · DNI oficial con autorización registrada, cupo y corrección en cartera.
// No acepta autorización autoafirmada desde el navegador; protege teléfonos existentes.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const base=Deno.env.get("SUPABASE_URL")||"";
const key=Deno.env.get("SUPABASE_ANON_KEY")||"";
const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const token=Deno.env.get("APIPERU_TOKEN")||"";
const allowed=new Set(["https://www.clancartan.com","https://clancartan.com","https://clan-cartan.pages.dev"]);
const response=(o:Record<string,unknown>,status=200,origin="")=>new Response(JSON.stringify(o),{status,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":allowed.has(origin)?origin:"https://www.clancartan.com","Access-Control-Allow-Headers":"authorization,apikey,content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Cache-Control":"no-store","Vary":"Origin"}});
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return response({},200,origin);
 if(req.method!=="POST")return response({status:"invalid_method"},405,origin);
 if(origin&&!allowed.has(origin))return response({status:"forbidden_origin"},403,origin);
 const bearer=req.headers.get("Authorization")||"";
 if(!bearer.startsWith("Bearer ")||!base||!key||!service)return response({status:"unavailable"},503,origin);
 const userRes=await fetch(base+"/auth/v1/user",{headers:{apikey:key,Authorization:bearer}}).catch(()=>null);
 if(!userRes?.ok)return response({status:"unauthorized"},401,origin);
 const user=await userRes.json().catch(()=>null);
 if(!user?.id)return response({status:"unauthorized"},401,origin);
 const payload=await req.json().catch(()=>({}));
 const dni=String(payload?.dni||"");
 if(!/^\d{8}$/.test(dni))return response({status:"invalid_dni"},400,origin);
 const headers={apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"};
 const owner=encodeURIComponent(user.id);
 const acct=await fetch(base+"/rest/v1/mc_accounts?select=subscription_until,suspended&user_id=eq."+owner,{headers}).catch(()=>null);
 const account=acct?.ok?(await acct.json().catch(()=>[]))[0]:null;
 if(!account||account.suspended||Date.parse(account.subscription_until||"")<=Date.now())return response({status:"manual",reason:"subscription_inactive"},200,origin);
 const perm=await fetch(base+"/rest/v1/rpc/cc_dni_auto_permission",{method:"POST",headers,body:JSON.stringify({p_user:user.id})}).catch(()=>null);
 if(!perm?.ok||await perm.json().catch(()=>false)!==true)return response({status:"manual",reason:"operator_not_approved"},200,origin);
 if(!token)return response({status:"manual",reason:"provider_not_configured"},200,origin);
 const claim=await fetch(base+"/rest/v1/rpc/cc_claim_dni_quota",{method:"POST",headers,body:JSON.stringify({p_user:user.id})}).catch(()=>null);
 const slot=claim?.ok?await claim.json().catch(()=>null):null;
 const dataSlot=Array.isArray(slot)?slot[0]:slot;
 if(!dataSlot?.allowed)return response({status:"manual",reason:dataSlot?.reason||"quota_exhausted"},200,origin);
 const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),9000);
 try{
  const remote=await fetch("https://api.apiperu.dev/dni",{method:"POST",signal:ctl.signal,headers:{Authorization:"Bearer "+token,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({dni})});
  const data=await remote.json().catch(()=>({}));
  if(remote.status===429||/quota|credit|limit/i.test(String(data?.code||"")+" "+String(data?.message||"")))return response({status:"manual",reason:"quota_exhausted"},200,origin);
  if(!remote.ok||data?.success!==true)return response({status:"manual",reason:"provider_unavailable"},200,origin);
  const d=data.data||{},name=String(d.nombre_completo||[d.nombres,d.apellido_paterno,d.apellido_materno].filter(Boolean).join(" ")).trim().slice(0,160);
  if(name.length<2)return response({status:"manual",reason:"not_found"},200,origin);
  // PATCH preserves phone, email and all columns except verified identity; INSERT does not invent phone.
  const resource=base+"/rest/v1/mc_people?select=id&reseller_id=eq."+owner+"&document_type=eq.DNI&document_number=eq."+dni;
  const existing=await fetch(resource,{headers}).then(r=>r.ok?r.json():[]).catch(()=>[]);
  if(existing.length){
   const put=await fetch(base+"/rest/v1/mc_people?id=eq."+encodeURIComponent(existing[0].id),{method:"PATCH",headers,body:JSON.stringify({full_name:name,verification_source:"API_PERU"})});
   if(!put.ok)return response({status:"manual",reason:"save_unavailable"},200,origin);
  }else{
   const put=await fetch(base+"/rest/v1/mc_people",{method:"POST",headers,body:JSON.stringify({reseller_id:user.id,document_type:"DNI",document_number:dni,full_name:name,verification_source:"API_PERU"})});
   if(!put.ok)return response({status:"manual",reason:"save_unavailable"},200,origin);
  }
  return response({status:"found",full_name:name,remaining:dataSlot.remaining??null},200,origin);
 }catch(_){return response({status:"manual",reason:"provider_unavailable"},200,origin);}
 finally{clearTimeout(tm);}
});
