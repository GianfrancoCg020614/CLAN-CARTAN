// STAGING-only: verified Supabase Auth user -> service-only demo loan + installments.
const STAGING_REF='szcplebbqhtcgxhvmxdv';
const uuid=/^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
const anyUuid=/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i;
function corsOrigin(origin:string|null){
 if(!origin)return true;
 if(origin==='https://clan-cartan.pages.dev')return true;
 if(/^https:\/\/[a-z0-9-]+\.clan-cartan\.pages\.dev$/.test(origin))return true;
 return /^http:\/\/localhost(?::\d{2,5})?$/.test(origin);
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 const allowed=corsOrigin(origin);
 const headers:Record<string,string>={
  'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS'
 };
 if(allowed&&origin)headers['Access-Control-Allow-Origin']=origin;
 const json=(status:number,obj:Record<string,unknown>)=>
  new Response(JSON.stringify(obj),{status,headers});
 if(!allowed)return json(403,{error:'origin_not_allowed'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return json(405,{error:'method_not_allowed'});
 const base=Deno.env.get('SUPABASE_URL')||'';
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(base!=='https://'+STAGING_REF+'.supabase.co'||!key)
  return json(503,{error:'staging_backend_unavailable'});
 const bearer=req.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9_.-]{80,5000}$/.test(bearer))
  return json(401,{error:'sign_in_required'});
 let data:Record<string,unknown>;
 try{
  const raw=await req.text();
  if(raw.length>2048)return json(413,{error:'request_too_large'});
  data=JSON.parse(raw);
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('bad');
 }catch{return json(400,{error:'invalid_json'});}
 const {client_id,request_id,principal,interest_percent,installments,term_unit,term_value}=data;
 if(typeof client_id!=='string'||!anyUuid.test(client_id)
 ||typeof request_id!=='string'||!uuid.test(request_id)
 ||typeof principal!=='number'||!Number.isFinite(principal)||principal<10||principal>10000||Math.abs(principal*100-Math.round(principal*100))>1e-7
 ||typeof interest_percent!=='number'||!Number.isFinite(interest_percent)||interest_percent<0||interest_percent>100||Math.abs(interest_percent*100-Math.round(interest_percent*100))>1e-7
 ||!Number.isInteger(installments)||installments<1||installments>12
 ||!Number.isInteger(term_value)
 ||!((term_unit==='MONTHS'&&term_value>=1&&term_value<=4)
   ||(term_unit==='DAYS'&&term_value>=1&&term_value<=365))
 )return json(400,{error:'invalid_demo_loan_term'});
 const auth=await fetch(base+'/auth/v1/user',{
  headers:{'apikey':key,'Authorization':bearer,'Cache-Control':'no-store'}
 });
 if(!auth.ok)return json(401,{error:'invalid_session'});
 const verified=await auth.json();
 if(verified?.role!=='authenticated'||typeof verified.id!=='string'||!anyUuid.test(verified.id))
  return json(401,{error:'invalid_user'});
 // User ID must NEVER be accepted from browser. The database checks client ownership + active paid access.
 const created=await fetch(base+'/rest/v1/rpc/cc_clan_cobra_create_demo_loan_with_term',{
  method:'POST',headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify({
   p_user_id:verified.id,p_client_id:client_id,p_request_id:request_id,
   p_principal:principal,p_interest_percent:interest_percent,
   p_installments:installments,p_term_unit:term_unit,p_term_value:term_value
  })
 });
 if(!created.ok)return json(409,{error:'demo_loan_not_created',message:'Revisa tu suscripcion vigente, el cliente y los datos de prueba.'});
 const info=await created.json();
 const loanId=info?.loan_id;
 const finalDue=info?.final_due;
 if(typeof loanId!=='string'||!anyUuid.test(loanId)
  ||typeof finalDue!=='string'||!/^\\d{4}-\\d{2}-\\d{2}$/.test(finalDue))
  return json(502,{error:'invalid_loan_result'});
 return json(200,{ok:true,loan_id:loanId,request_id,installments,
  term_unit,term_value,final_due:finalDue});
});
