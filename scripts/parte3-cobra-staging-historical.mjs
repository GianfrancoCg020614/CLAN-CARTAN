// Historical-demo-only intake, client never submits the owner ID.
import {STAGING_SUPABASE_URL} from './parte3-cobra-checkout-client.mjs';
const DATE=/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const cents=(v)=>Number.isFinite(v)&&Math.abs(v*100-Math.round(v*100))<1e-7;
function validDate(s){
 return DATE.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&
  new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
}
export function readHistoricalDemo({issued_on,principal,rawSchedule,client_id}){
 const today=new Date().toISOString().slice(0,10);
 if(!validDate(issued_on)||issued_on<'1990-01-01'||issued_on>today)
  throw Error('Ingresa la fecha original del préstamo, anterior o igual a hoy.');
 const original=Number(principal);
 if(!cents(original)||original<10||original>10000)throw Error('El capital debe estar entre S/10 y S/10 000.');
 if(typeof client_id!=='string'||client_id.length<30)throw Error('Selecciona un cliente ficticio.');
 if(typeof rawSchedule!=='string')throw Error('Cronograma inválido.');
 const lines=rawSchedule.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
 if(lines.length<1||lines.length>36)throw Error('Registra entre 1 y 36 cuotas.');
 let sumCents=0;
 let prevDue='';
 const schedule=lines.map((line,index)=>{
  const vals=line.split(',').map(v=>v.trim());
  const [due_on,rawAmount,rawPaid]=vals;
  const amount=Number(rawAmount),paid_total=Number(rawPaid);
  if(vals.length!==3||!validDate(due_on)||due_on<issued_on||due_on<prevDue||
   rawAmount===''||rawPaid===''||!cents(amount)||amount<=0||amount>20000||
   !cents(paid_total)||paid_total<0||paid_total>amount)
    throw Error('Revisa fecha, cuota y pagado en la línea '+(index+1)+'.');
  prevDue=due_on;
  sumCents+=Math.round(amount*100);
  return {due_on,amount,paid_total};
 });
 if(sumCents<Math.round(original*100)||sumCents>5000000)
  throw Error('El total de cuotas debe cubrir el capital y no superar S/50 000.');
 return {client_id,issued_on,principal:original,schedule};
}
export function setupHistoricalDemo({supabase,currentUser,accessAllowed,clientSelect,refresh,otherBusy}){
 const $=id=>document.getElementById(id),form=$('historicalDemoForm');
 let busy=false,pending=null;
 const notice=text=>{$('historicalDemoNotice').textContent=text;};
 function enable(){
  $('createHistoricalDemo').disabled=busy||otherBusy()||!accessAllowed()||!clientSelect.value;
 }
 function clear(){
  pending=null;
  notice('Solo puedes registrar históricos ficticios con una suscripción vigente.');
  enable();
 }
 async function submit(e){
  e.preventDefault();
  if(busy||otherBusy()||!accessAllowed()||!currentUser())return;
  let data;
  try{data=readHistoricalDemo({
   issued_on:$('historicalIssue').value,principal:$('historicalPrincipal').value,
   rawSchedule:$('historicalSchedule').value,client_id:clientSelect.value
  });}catch(error){notice(error.message);return;}
  const snapshot=JSON.stringify(data),uid=currentUser();
  if(!pending||pending.snapshot!==snapshot)pending={request_id:crypto.randomUUID(),snapshot};
  busy=true;enable();
  notice('Guardando el historial ficticio sin realizar cobros…');
  try{
   const session=await supabase.auth.getSession();
   if(session.error||session.data?.session?.user?.id!==uid||
    !session.data?.session?.access_token)throw Error('Debes volver a entrar a STAGING.');
   const response=await fetch(STAGING_SUPABASE_URL+'/functions/v1/cc-clan-cobra-historical-demo',{
    method:'POST',headers:{
     'Authorization':'Bearer '+session.data.session.access_token,
     'Content-Type':'application/json'
    },
    body:JSON.stringify({...data,request_id:pending.request_id})
   });
   if(!response.ok)throw Error('El servidor rechazó el préstamo histórico ficticio. Revisa los importes, fechas y tu suscripción.');
   const result=await response.json();
   if(result?.ok!==true||result.origin!=='HISTORICAL_DEMO'||
    result.request_id!==pending.request_id||typeof result.loan_id!=='string')
    throw Error('Respuesta inesperada del registro histórico.');
   pending=null;
   await refresh();
   notice('Préstamo anterior ficticio registrado: '+result.installments+
    ' cuotas conservadas con sus fechas y pagos simulados. La billetera permanece intacta.');
  }catch(error){
   notice(error.message+' Puedes reintentar sin cambiar los datos para evitar duplicaciones.');
  }finally{busy=false;enable();}
 }
 $('historicalIssue').value='2025-01-10';
 form.addEventListener('submit',submit);
 return Object.freeze({enable,clear});
}
