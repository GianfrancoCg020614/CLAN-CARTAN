// MI ALQUILER V161.4 · Consulta DNI por backend con sesión CLAN CARTAN.
// Solo devuelve nombres: NO modifica teléfonos ni crea tenants; permite alta manual.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const base = Deno.env.get('SUPABASE_URL') || '';
const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const token = Deno.env.get('APIPERU_TOKEN') || '';
const allowed = new Set(['https://www.clancartan.com','https://clancartan.com','https://clan-cartan.pages.dev']);
function answer(body:Record<string,unknown>,status=200,origin='') {
 return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
   'Access-Control-Allow-Origin':allowed.has(origin)?origin:'https://www.clancartan.com',
   'Access-Control-Allow-Headers':'authorization,apikey,content-type',
   'Access-Control-Allow-Methods':'POST,OPTIONS'}});
}
const clean=(v:unknown)=>String(v??'').trim();
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 if(origin&&!allowed.has(origin))return answer({status:'forbidden_origin'},403,origin);
 if(req.method==='OPTIONS')return answer({},200,origin);
 if(req.method!=='POST')return answer({status:'invalid_method'},405,origin);
 const bearer=req.headers.get('Authorization')||'';
 if(!bearer.startsWith('Bearer ')||!base||!anon||!service)return answer({status:'unavailable'},503,origin);
 const userResp=await fetch(base+'/auth/v1/user',{headers:{apikey:anon,Authorization:bearer}}).catch(()=>null);
 const user=userResp?.ok?await userResp.json().catch(()=>null):null;
 if(!user?.id)return answer({status:'unauthorized'},401,origin);
 const reqbody=await req.json().catch(()=>({}));
 const dni=clean(reqbody?.dni);
 if(!/^\d{8}$/.test(dni))return answer({status:'invalid_dni'},400,origin);
 const headers={apikey:service,Authorization:'Bearer '+service,'Content-Type':'application/json'};
 const owner=encodeURIComponent(user.id);
 // ADMIN o RESELLER no suspendido y con membresía vigente. No confía en user_metadata.
 const [adminRes,accountRes]=await Promise.all([
  fetch(base+'/rest/v1/cc_admins?select=user_id&user_id=eq.'+owner,{headers}).catch(()=>null),
  fetch(base+'/rest/v1/ma_accounts?select=subscription_until,suspended&user_id=eq.'+owner,{headers}).catch(()=>null)
 ]);
 if(!adminRes?.ok||!accountRes?.ok)return answer({status:'manual',reason:'membership_unavailable'},200,origin);
 const admins=await adminRes.json().catch(()=>[]),accounts=await accountRes.json().catch(()=>[]),account=accounts?.[0];
 const active=Array.isArray(admins)&&admins.length>0 || (account&&!account.suspended&&Date.parse(account.subscription_until||'')>Date.now());
 if(!active)return answer({status:'manual',reason:'subscription_inactive'},200,origin);
 // Busca SOLO en la cartera del propio usuario, incluso sin gastar consultas externas.
 const stored=await fetch(base+'/rest/v1/ma_tenants?select=full_name&reseller_id=eq.'+owner+'&document_type=eq.DNI&document_number=eq.'+dni+'&limit=1',{headers}).catch(()=>null);
 if(stored?.ok){const saved=await stored.json().catch(()=>[]);if(saved?.[0]?.full_name)return answer({status:'saved',full_name:clean(saved[0].full_name).slice(0,160)},200,origin);}
 // Respeta la autorización central que ya regula consultas de datos personales en CLAN CARTAN.
 const perm=await fetch(base+'/rest/v1/rpc/cc_dni_auto_permission',{method:'POST',headers,body:JSON.stringify({p_user:user.id})}).catch(()=>null);
 if(!perm?.ok||await perm.json().catch(()=>false)!==true)return answer({status:'manual',reason:'operator_not_approved'},200,origin);
 if(!token)return answer({status:'manual',reason:'provider_not_configured'},200,origin);
 const claim=await fetch(base+'/rest/v1/rpc/cc_claim_dni_quota',{method:'POST',headers,body:JSON.stringify({p_user:user.id})}).catch(()=>null);
 const quota=claim?.ok?await claim.json().catch(()=>null):null;const slot=Array.isArray(quota)?quota[0]:quota;
 if(!slot?.allowed)return answer({status:'manual',reason:slot?.reason||'quota_exhausted',remaining:slot?.remaining??0},200,origin);
 const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),9000);
 try{
  const remote=await fetch('https://api.apiperu.dev/dni',{method:'POST',signal:ctl.signal,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({dni})});
  const data=await remote.json().catch(()=>({}));
  if(remote.status===429||/quota|credit|limit|plan_exhausted/i.test(clean(data?.code)+' '+clean(data?.message))){
   await fetch(base+'/rest/v1/rpc/cc_mark_dni_provider_exhausted',{method:'POST',headers,body:'{}'}).catch(()=>{});
   return answer({status:'manual',reason:'quota_exhausted',remaining:0},200,origin);
  }
  if(!remote.ok||data?.success!==true)return answer({status:'manual',reason:remote.status===404?'not_found':'provider_unavailable',remaining:slot.remaining??null},200,origin);
  const d=data?.data||{};
  if(clean(d.numero)&&clean(d.numero)!==dni)return answer({status:'manual',reason:'response_mismatch'},200,origin);
  const full=clean(d.nombre_completo||[d.nombres,d.apellido_paterno,d.apellido_materno].filter(Boolean).join(' ')).slice(0,160);
  if(full.length<2)return answer({status:'manual',reason:'not_found'},200,origin);
  return answer({status:'found',full_name:full,remaining:slot.remaining??null},200,origin);
 }catch(_){return answer({status:'manual',reason:'provider_unavailable'},200,origin);}finally{clearTimeout(timeout);}
});