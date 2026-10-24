// COBRA YA STAGING ONLY: client-side demo loan form, never real payments.
import {STAGING_SUPABASE_URL} from './parte3-cobra-checkout-client.mjs';
import {setupHistoricalDemo} from './parte3-cobra-staging-historical.mjs';

export function initializeDemoLoans({supabase,currentUser,accessAllowed}){
 const $=id=>document.getElementById(id);
 const results=$('loanDemoResults'),form=$('loanDemoForm'),clientSelect=$('loanDemoClient');
 let busy=false,pendingRequest=null;
 const note=value=>{$('loanDemoNotice').textContent=value;};
 const money=n=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(n));
 const historic=setupHistoricalDemo({supabase,currentUser,accessAllowed,clientSelect,refresh,otherBusy:()=>busy});
 function enable(){
  $('createLoanDemo').disabled=busy||!accessAllowed()||!clientSelect.value;
  historic.enable();
 }
 function clear(){
  pendingRequest=null;clientSelect.replaceChildren();results.replaceChildren();historic.clear();
  note('El directorio de préstamos requiere una suscripción vigente.');enable();
 }
 async function refresh(){
  if(!accessAllowed()||!currentUser()){clear();return;}
  const uid=currentUser();
  note('Cargando clientes y préstamos ficticios…');
  const [clients,loans]=await Promise.all([
   supabase.from('cy_clients').select('id,client_code,full_name').eq('owner_id',uid).eq('alias','DEMO').order('created_at',{ascending:false}).limit(50),
   supabase.from('cy_loans').select('id,principal,interest_rate,term_installments,total_due,created_at,demo_origin,issued_on').eq('owner_id',uid).not('demo_request_id','is',null).order('created_at',{ascending:false}).limit(20)
  ]);
  if(uid!==currentUser()||!accessAllowed())return;
  if(clients.error||loans.error){
   note('No se pudieron consultar los préstamos en STAGING. No se habilita la creación.');
   clientSelect.replaceChildren();enable();return;
  }
  const selected=clientSelect.value;
  clientSelect.replaceChildren();
  for(const cl of clients.data||[]){
   const option=document.createElement('option');
   option.value=cl.id;option.textContent=(cl.client_code||'CY-DEMO')+' · '+cl.full_name;
   clientSelect.appendChild(option);
  }
  if([...clientSelect.options].some(o=>o.value===selected))clientSelect.value=selected;
  enable();
  results.replaceChildren();
  const items=loans.data||[];
  if(!items.length){const p=document.createElement('p');p.className='small';p.textContent='Todavía no hay préstamos ficticios.';results.appendChild(p);}
  else{
   const ids=items.map(l=>l.id);
   const installments=await supabase.from('cy_installments')
    .select('loan_id,installment_number,due_on,amount,paid_total,status')
    .eq('owner_id',uid).in('loan_id',ids).order('installment_number',{ascending:true}).limit(240);
   if(uid!==currentUser()||!accessAllowed())return;
   if(installments.error){note('No se pudo cargar el cronograma.');return;}
   for(const loan of items){
    const section=document.createElement('section');
    section.style.cssText='margin-top:14px;border-top:1px solid #344660;padding-top:12px';
    const title=document.createElement('strong');
    title.textContent=(loan.demo_origin==='HISTORICAL_DEMO'?'Préstamo ANTERIOR ficticio ('+loan.issued_on+')':'Préstamo nuevo ficticio')+' · '+money(loan.principal)+' capital · '+money(loan.total_due)+' total · '+loan.term_installments+' cuotas';
    section.append(title);
    const myRows=(installments.data||[]).filter(i=>i.loan_id===loan.id);
    for(const row of myRows){
     const line=document.createElement('p');line.className='small';
     line.textContent='Cuota '+row.installment_number+' · '+row.due_on+' · '+money(row.amount)+' · Pagado: '+money(row.paid_total)+' · '+row.status;
     section.appendChild(line);
    }
    results.appendChild(section);
   }
  }
  note('Datos ficticios actualizados. Los saldos de la billetera no se modificaron.');
 }
 function validate(){
  const principal=Number($('loanPrincipal').value);
  const interest=Number($('loanInterest').value);
  const installments=Number($('loanInstallments').value);
  const due=$('loanFirstDue').value;
  const now=new Date();
  const utcToday=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  const date=new Date(due+'T00:00:00Z');
  if(!Number.isFinite(principal)||principal<10||principal>10000||Math.abs(principal*100-Math.round(principal*100))>1e-7
    ||!Number.isFinite(interest)||interest<0||interest>100||Math.abs(interest*100-Math.round(interest*100))>1e-7
    ||!Number.isInteger(installments)||installments<1||installments>12
    ||!Number.isFinite(date.getTime())||date<=utcToday||date.getTime()>utcToday.getTime()+365*86400000){
    throw Error('Verifica capital, interés, cuotas y primer vencimiento (futuro y hasta 365 días).');
  }
  if(!clientSelect.value)throw Error('Primero registra un cliente ficticio.');
  return {client_id:clientSelect.value,principal,interest_percent:interest,installments,first_due:due};
 }
 async function submit(event){
  event.preventDefault();
  if(busy||!accessAllowed()||!currentUser())return;
  let params;
  try{params=validate();}catch(e){note(e.message);return;}
  busy=true;enable();
  const uid=currentUser();
  const fingerprint=JSON.stringify(params);
  if(!pendingRequest||pendingRequest.fingerprint!==fingerprint)pendingRequest={id:crypto.randomUUID(),fingerprint};
  const request_id=pendingRequest.id;
  note('Registrando préstamo ficticio y creando cronograma seguro…');
  try{
   const {data,error}=await supabase.auth.getSession();
   if(error||data?.session?.user?.id!==uid||!data?.session?.access_token)
    throw Error('Inicia sesión nuevamente en STAGING.');
   const response=await fetch(STAGING_SUPABASE_URL+'/functions/v1/cc-clan-cobra-loan-demo',{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token},
    body:JSON.stringify({...params,request_id})
   });
   if(!response.ok)throw Error('El servidor rechazó el préstamo de prueba. Revisa la vigencia y los datos.');
   const result=await response.json();
   if(!result?.ok||typeof result.loan_id!=='string'||result.request_id!==request_id)
    throw Error('Respuesta de préstamo inválida.');
   pendingRequest=null;
   await refresh();
   note('Préstamo ficticio creado. Se generaron '+result.installments+' cuotas y no se descontó saldo.');
  }catch(e){
   note(e.message+' Si reintentas sin cambiar datos, se utiliza la misma referencia para evitar duplicados.');
  }finally{busy=false;enable();}
 }
 const tomorrow=new Date();tomorrow.setDate(tomorrow.getDate()+30);
 $('loanFirstDue').value=new Date(Date.UTC(tomorrow.getFullYear(),tomorrow.getMonth(),tomorrow.getDate())).toISOString().slice(0,10);
 clientSelect.addEventListener('change',enable);
 form.addEventListener('submit',submit);
 return Object.freeze({refresh,clear});
}
