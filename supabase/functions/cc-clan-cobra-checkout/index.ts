// CLAN CARTAN · COBRA YA checkout con Auth de STAGING.
// No se comparte el service_role: el usuario se verifica contra Supabase Auth.
// El SQL cobra y concede acceso de 30 dias en una sola transaccion.
const STAGING="szcplebbqhtcgxhvmxdv";
const requestId=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const userId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isAllowedOrigin(origin:string|null){
 if(!origin)return true;
 if(origin==="https://clan-cartan.pages.dev")return true;
 if(/^https:\/\/[a-z0-9-]+\.clan-cartan\.pages\.dev$/.test(origin))return true;
 return /^http:\/\/localhost(?::\d{2,5})?$/.test(origin);
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin");
 const allowed=isAllowedOrigin(origin);
 const common:Record<string,string>={
  "Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"
 };
 if(origin&&allowed)common["Access-Control-Allow-Origin"]=origin;
 common["Access-Control-Allow-Headers"]="authorization,apikey,content-type,x-client-info";
 common["Access-Control-Allow-Methods"]="POST,OPTIONS";
 function reply(status:number,body:Record<string,unknown>){
  return new Response(JSON.stringify(body),{status,headers:common});
 }
 if(!allowed)return reply(403,{error:"origin_not_allowed"});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:common});
 if(req.method!=="POST")return reply(405,{error:"method_not_allowed"});
 const endpoint=Deno.env.get("SUPABASE_URL");
 const roleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!endpoint||!roleKey||!endpoint.startsWith("https://"+STAGING+".supabase.co"))
  return reply(503,{error:"staging_backend_not_configured"});
 const bearer=req.headers.get("authorization")||"";
 if(!/^Bearer [A-Za-z0-9_.-]{80,5000}$/.test(bearer))
  return reply(401,{error:"sign_in_required"});
 let body:Record<string,unknown>;
 try{
  const raw=await req.text();
  if(raw.length>2048)return reply(413,{error:"request_too_large"});
  body=JSON.parse(raw);
  if(!body||typeof body!=="object"||Array.isArray(body))throw Error("bad");
 }catch{return reply(400,{error:"invalid_json"});}
 const funding=body.funding;
 const id=body.request_id;
 if((funding!=="REAL"&&funding!=="ACTIVATION_BONUS")||
 typeof id!=="string"||!requestId.test(id))return reply(400,{error:"invalid_checkout"});
 const auth=await fetch(endpoint+"/auth/v1/user",{
  headers:{"apikey":roleKey,"Authorization":bearer,"Cache-Control":"no-store"}
 });
 if(!auth.ok)return reply(401,{error:"invalid_session"});
 const identity=await auth.json();
 if(!identity||identity.role!=="authenticated"||typeof identity.id!=="string"||!userId.test(identity.id))
  return reply(401,{error:"invalid_user"});
 // El navegador JAMAS decide a que usuario cobrar: id proviene de Auth.
 const charge=await fetch(endpoint+"/rest/v1/rpc/cc_clan_cobra_checkout_staging",{
  method:"POST",headers:{
   "apikey":roleKey,"Authorization":"Bearer "+roleKey,
   "Content-Type":"application/json"
  },body:JSON.stringify({
   p_user_id:identity.id,p_funding:funding,p_request_id:id
  })
 });
 if(!charge.ok){
  // No exponer detalles internos, ids de otros clientes, ni informacion de DB.
  return reply(charge.status===400?409:502,{
   error:"checkout_not_completed",
   message:"No se realizo el cobro; comprueba saldo REAL/bono y acceso vigente.",
   retryable:true
  });
 }
 const ends=await charge.json();
 if(typeof ends!=="string"||!Number.isFinite(Date.parse(ends)))
  return reply(502,{error:"invalid_checkout_result"});
 return reply(200,{ok:true,status:"ACCESS_ACTIVE",funding,request_id:id,access_until:ends});
});
