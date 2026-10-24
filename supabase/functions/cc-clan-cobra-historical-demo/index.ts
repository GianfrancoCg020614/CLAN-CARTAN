// COBRA YA — historical loans DEMO, STAGING only.
// No real customer upload or payment ledger is allowed here.
const STAGING_REF = 'szcplebbqhtcgxhvmxdv';
const uuid4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
function allowedOrigin(origin:string|null){
 if(!origin)return true;
 return origin==='https://clan-cartan.pages.dev'||
  /^https:\/\/[a-z0-9-]+\.clan-cartan\.pages\.dev$/.test(origin)||
  /^http:\/\/localhost(?::\d{2,5})?$/.test(origin);
}
function validDate(x:unknown){
 return typeof x==='string'&&ISO_DATE.test(x)&&
  Number.isFinite(Date.parse(x+'T00:00:00Z'))&&
  new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
}
function cents(x:unknown,limit:number,allowZero=false){
 return typeof x==='number'&&Number.isFinite(x)&&x<limit&&
  (allowZero?x>=0:x>0)&&Math.abs(x*100-Math.round(x*100))<1e-7;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 const cors:Record<string,string>={
  'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
  'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods':'POST,OPTIONS'
 };
 if(allowedOrigin(origin)&&origin)cors['Access-Control-Allow-Origin']=origin;
 const respond=(status:number,data:Record<string,unknown>)=>
  new Response(JSON.stringify(data),{status,headers:cors});
 if(!allowedOrigin(origin))return respond(403,{error:'origin_not_allowed'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return respond(405,{error:'method_not_allowed'});
 const base=Deno.env.get('SUPABASE_URL')||'';
 const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 if(base!=='https://'+STAGING_REF+'.supabase.co'||!key)
  return respond(503,{error:'staging_backend_not_configured'});
 const bearer=req.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9_.-]{80,5000}$/.test(bearer))
  return respond(401,{error:'sign_in_required'});
 let payload:Record<string,unknown>;
 try{
  const raw=await req.text();
  if(raw.length>8192)return respond(413,{error:'request_too_large'});
  payload=JSON.parse(raw);
  if(!payload||Array.isArray(payload)||typeof payload!=='object')throw Error('bad');
 }catch{return respond(400,{error:'invalid_json'});}
 const {client_id,request_id,principal,issued_on,schedule}=payload;
 if(typeof client_id!=='string'||!uuid.test(client_id)||
 typeof request_id!=='string'||!uuid4.test(request_id)||
 !cents(principal,10000.01)||Number(principal)<10||
 !validDate(issued_on)||!Array.isArray(schedule)||schedule.length<1||schedule.length>36
 )return respond(400,{error:'invalid_historical_demo'});
 const today=new Date().toISOString().slice(0,10);
 if((issued_on as string)<'1990-01-01'||(issued_on as string)>today)
  return respond(400,{error:'invalid_issued_date'});
 let total=0;
 let lastDue='';
 for(const row of schedule){
  if(!row||typeof row!=='object'||Array.isArray(row)||
   Object.keys(row).sort().join(',')!=='amount,due_on,paid_total'||
   !validDate(row.due_on)||
   row.due_on<issued_on||row.due_on<lastDue||
   !cents(row.amount,20000.01)||!cents(row.paid_total,20000.01,true)||
   row.paid_total>row.amount)
     return respond(400,{error:'invalid_installment'});
  total+=Math.round(row.amount*100);
  lastDue=row.due_on;
 }
 if(total>5000000||total<Math.round(Number(principal)*100))
  return respond(400,{error:'invalid_total'});
 const auth=await fetch(base+'/auth/v1/user',{
  headers:{'apikey':key,'Authorization':bearer,'Cache-Control':'no-store'}
 });
 if(!auth.ok)return respond(401,{error:'invalid_session'});
 const user=await auth.json();
 if(user?.role!=='authenticated'||typeof user.id!=='string'||!uuid.test(user.id))
  return respond(401,{error:'invalid_user'});
 const created=await fetch(base+'/rest/v1/rpc/cc_clan_cobra_import_historical_demo',{
  method:'POST',
  headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'},
  body:JSON.stringify({
   p_user_id:user.id,p_client_id:client_id,p_request_id:request_id,
   p_principal:principal,p_issued_on:issued_on,p_schedule:schedule
  })
 });
 if(!created.ok)return respond(409,{
  error:'historical_demo_not_saved',
  message:'Verifica tu suscripción, cliente ficticio, fechas y pagos.'
 });
 const loanId=await created.json();
 if(typeof loanId!=='string'||!uuid.test(loanId))
  return respond(502,{error:'unexpected_loan_id'});
 return respond(200,{
  ok:true,origin:'HISTORICAL_DEMO',loan_id:loanId,request_id,
  installments:schedule.length,amount_due:total/100
 });
});