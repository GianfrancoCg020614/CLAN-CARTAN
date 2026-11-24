(() => {
 'use strict';

 const businesses = new Map([
  ['COBRA_YA','COBRA YA'], ['MI_COCHERA','MI COCHERA'], ['MI_ALQUILER','MI ALQUILER']
 ]);
 const format = new Intl.DateTimeFormat('es-PE',{dateStyle:'medium',timeZone:'America/Lima'});
 const limaDate = new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'America/Lima'});

 function element(tag,text){
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  return node;
 }
 function button(label,primary=false){
  const control=element('button',label);
  control.type='button';
  control.className=primary?'cc166-primary':'cc166-secondary';
  return control;
 }
 function dateField(label,value){
  const field=element('label',label);
  const input=element('input');
  input.type='date';
  input.min=limaDate.format(new Date());
  if(value&&new Date(value)>=new Date(input.min+'T00:00:00-05:00'))input.value=limaDate.format(new Date(value));
  field.append(input);
  return {field,input};
 }
 function endOfLimaDay(value){
  return value?new Date(Date.parse(value+'T00:00:00-05:00')+86400000).toISOString():null;
 }
 function lastDay(value){return new Date(Date.parse(value)-1);}

 function mount(host,{api,target=null}){
  const session=window.CC_V53_SESSION;
  const cards=element('div');
  cards.className='cc409-grid';
  const status=element('p');
  status.setAttribute('role','status');
  host.append(status,cards);
  let pending=false,attempt=null;

  async function request(params,success){
   if(pending||!host.isConnected||window.CC_V53_SESSION!==session)return;
   pending=true;
   cards.inert=true;
   status.textContent=success?'Guardando…':'Consultando cortesías…';
   try{
    if(params.p_action!=='read'){
     const intent=JSON.stringify(params);
     if(attempt?.intent!==intent)attempt={intent,id:crypto.randomUUID()};
     params={...params,p_request:attempt.id};
    }
    const rows=await api('rpc/cc409_admin_courtesy','POST',{p_user:target,...params});
    if(!host.isConnected||window.CC_V53_SESSION!==session)return;
    if(!Array.isArray(rows)||rows.length!==businesses.size||
       ![...businesses.keys()].every(service=>rows.filter(row=>row.service===service).length===1)){
     throw Error('No se pudo verificar la respuesta');
    }
    attempt=null;
    draw(rows);
    status.textContent=success||'';
   }catch(error){
    if(!host.isConnected||window.CC_V53_SESSION!==session)return;
    status.textContent='No se pudo confirmar: '+(error.message||'vuelve a intentarlo');
    if(!cards.childElementCount){
     const retry=button('Reintentar');
     retry.onclick=()=>{retry.remove();void request({p_action:'read'});};
     cards.append(retry);
    }
   }finally{
    pending=false;
    cards.inert=false;
   }
  }

  function draw(rows){
   cards.replaceChildren();
   for(const row of rows){
    const service=row.service;
    const card=element('section');
    card.className='cc166-card cc409-card';
    card.append(element('h3',businesses.get(service)));
    const mutate=(action,values,message)=>void request({p_action:action,p_service:service,...values},message);
    if(target){
     card.append(element('p',row.active
      ?row.ends_at?'Cortesía hasta el '+format.format(lastDay(row.ends_at)):'Cortesía activa sin vencimiento'
      :'Sin cortesía activa'));
     const {field,input}=dateField('Último día de cortesía (opcional)',row.active&&row.ends_at?lastDay(row.ends_at):null);
     const save=button(row.active?'Cambiar vigencia':'Otorgar cortesía',true);
     save.onclick=()=>{
      if(!input.reportValidity())return;
      mutate('grant',{p_until:endOfLimaDay(input.value)},'Cortesía guardada');
     };
     card.append(field,save);
     if(row.active){
      const stop=button('Retirar cortesía');
      stop.onclick=()=>{
       if(window.confirm('¿Retirar ahora la cortesía de '+businesses.get(service)+' para este cliente?'))mutate('revoke',{},'Cortesía retirada');
      };
      card.append(stop);
     }
    }else{
     const toggle=button(row.registration_enabled?'Desactivar para nuevos registros':'Activar para nuevos registros',!row.registration_enabled);
     toggle.onclick=()=>mutate('registration',{p_enabled:!row.registration_enabled},
      row.registration_enabled?'Cortesía desactivada para nuevos registros':'Cortesía activada para nuevos registros');
     card.append(element('p',row.registration_enabled?'Nuevos registros: cortesía activa':'Nuevos registros: requieren pago'),toggle);
     if(Date.parse(row.last_bulk_end)>Date.now()){
      card.append(element('p','Fin programado para cortesías ya otorgadas · '+format.format(lastDay(row.last_bulk_end))));
     }
     const end=element('details');
     end.append(element('summary','Finalizar cortesías ya otorgadas'));
     const {field,input}=dateField('Último día de cortesía (vacío para finalizar ahora)');
     const finish=button('Confirmar fin de cortesías');
     finish.onclick=()=>{
      if(!input.reportValidity())return;
      const when=input.value?'al terminar el '+format.format(lastDay(endOfLimaDay(input.value))):'ahora';
      if(window.confirm('¿Finalizar '+when+' las cortesías ya otorgadas en '+businesses.get(service)+'? Las vigencias pagadas se conservan.')){
       mutate('end_existing',{p_until:endOfLimaDay(input.value)},'Fin de cortesías guardado');
      }
     };
     end.append(element('p','Afecta a quienes ya tienen cortesía en este negocio. El acceso de los próximos registros se controla por separado.'),field,finish);
     card.append(end);
    }
    cards.append(card);
   }
  }
  queueMicrotask(()=>void request({p_action:'read'}));
 }

 window.cc409Courtesy=Object.freeze({mount});
})();
