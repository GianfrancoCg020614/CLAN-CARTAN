/* CLAN CARTAN V195 · STREAM BULL'S / Atención de hoy.
   Componente del panel EXISTENTE. Datos auténticos con RLS y RPC; nunca usa DEMO o billeteras. */
(function(){
'use strict';
const by=id=>document.getElementById(id);
const api=(path,method,body)=>window.cc80.api(path,method,body);
const E=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
const B=(label,fn,kind='')=>{const b=E('button','sb195-btn '+kind,label);b.type='button';b.addEventListener('click',fn);return b;};
const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const format=d=>new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(d));
const limaDay=d=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(d));const f=k=>p.find(x=>x.type===k)?.value;return f('year')+'-'+f('month')+'-'+f('day');};
const addDay=(s,n)=>new Date(Date.parse(s+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
const stamp=(day,end=false)=>day+(end?'T23:59:00-05:00':'T00:00:00-05:00');
const days=(date,now=new Date())=>(Date.parse(limaDay(date)+'T12:00:00Z')-Date.parse(limaDay(now)+'T12:00:00Z'))/86400000;
const remaining=(end,now=new Date())=>{
 const m=Math.max(0,Math.floor((new Date(end)-now)/60000));
 return Math.floor(m/1440)+'d '+String(Math.floor(m%1440/60)).padStart(2,'0')+'h '+String(m%60).padStart(2,'0')+'m';
};
const weekdays=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
let tab='due',windowDays=7,search='',minDays=0,service='Todos',serial=0;
function guard(uid,jwt){return window.CC_V53_SESSION?.userId===uid&&window.CC_V53_SESSION?.jwt===jwt;}
function display(root,summary,detail){
 const entry=E('article','sb195-entry'),toggle=E('details','sb195-fold');
 toggle.append(E('summary','sb195-sum',summary));
 const info=E('div','sb195-info');if(detail)detail(info);
 toggle.append(info);entry.append(toggle);root.append(entry);
}
function grid(parent,pairs){
 const table=E('div','sb195-grid');
 for(const [key,value] of pairs){
  const cell=E('div','sb195-field');cell.append(E('small','',key),E('strong','',value==null?'—':value));table.append(cell);
 }
 parent.append(table);
}
function actionPrompt(title,fields,fn){
 const modal=E('div','sb195-overlay'),card=E('div','sb195-modal');
 card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
 card.append(E('h3','',title));const form=E('form','sb195-form'),inputs={};
 for(const f of fields){
  const label=E('label','',f.title),input=E(f.options?'select':'input');
  if(f.options)for(const [value,text] of f.options){const item=E('option','',text);item.value=value;input.append(item);}
  else input.type=f.type||'text';
  if(f.value!==undefined)input.value=String(f.value);
  if(f.required)input.required=true;
  if(f.min!==undefined)input.min=f.min;
  if(f.max!==undefined)input.max=f.max;
  if(f.step!==undefined)input.step=f.step;
  label.append(input);form.append(label);inputs[f.key]=input;
 }
 const actions=E('div','sb195-buttons');
 const close=()=>modal.remove();
 actions.append(B('Cancelar',close),B('Guardar',()=>{},'primary'));
 actions.lastChild.type='submit';
 form.append(actions);form.addEventListener('submit',async ev=>{
  ev.preventDefault();const values=Object.fromEntries(Object.entries(inputs).map(([k,v])=>[k,v.value]));
  try{await fn(values);close();}catch(e){let error=card.querySelector('.sb195-error');if(!error){error=E('p','sb195-error');card.append(error);}error.textContent=String(e?.message||e);}
 });
 card.append(form);modal.append(card);
 modal.addEventListener('click',e=>{if(e.target===modal)close();});
 document.body.append(modal);
}
function openWhatsApp(row,kind){
 if(!row.client.phone_e164)return alert('Primero registra el WhatsApp del cliente.');
 const phone=row.client.phone_e164.replace(/\D/g,'');
 if(!/^[1-9][0-9]{7,14}$/.test(phone))return alert('WhatsApp inválido.');
 const date=format(row.contract.end_at);
 const messages={
 upcoming:'Hola '+row.client.alias+', te recordamos que tu servicio '+row.account.service+' vence el '+date+'. ¿Deseas renovarlo?',
 expired:'Hola '+row.client.alias+', tu servicio '+row.account.service+' venció el '+date+'. Escríbenos para renovarlo.',
 renewal:'Hola '+row.client.alias+', podemos coordinar tu renovación de '+row.account.service+'. Vencimiento registrado: '+date+'.',
 debt:'Hola '+row.client.alias+', tienes un pago pendiente por tu servicio '+row.account.service+'. Fecha de vencimiento: '+date+'.',
 transfer:'Hola '+row.client.alias+', coordinemos tu cambio de asignación de '+row.account.service+' conservando tu plazo contratado hasta '+date+'.'
 };
 const url='https://wa.me/'+phone+'?text='+encodeURIComponent(messages[kind]||messages.upcoming);
 window.open(url,'_blank','noopener,noreferrer');
}
function mapData(raw){
 const accountBy=new Map(raw.accounts.map(a=>[a.id,a]));
 const clientBy=new Map(raw.clients.map(c=>[c.id,c]));
 const contractBy=new Map(raw.contracts.map(c=>[c.id,c]));
 const slotBy=new Map(raw.slots.map(s=>[s.id,s]));
 const active=raw.assignments.filter(a=>a.state!=='CLOSED');
 const used=new Set(active.map(a=>a.slot_id));
 const reserved=new Set(raw.transfers.filter(t=>t.status==='PENDING').map(t=>t.dest_slot_id));
 const now=new Date();
 const free=raw.slots.filter(s=>{
  const ac=accountBy.get(s.account_id);
  return ac&&ac.state==='ACTIVE'&&new Date(ac.end_at)>now&&ac.provider_allows_reassignment&&!used.has(s.id)&&!reserved.has(s.id);
 }).map(s=>({...s,account:accountBy.get(s.account_id),days:days(accountBy.get(s.account_id).end_at,now)}));
 const rows=active.map(a=>{
  const contract=contractBy.get(a.contract_id),slot=slotBy.get(a.slot_id);
  const account=accountBy.get(slot?.account_id),client=clientBy.get(contract?.client_id);
  if(!contract||!slot||!account||!client)return null;
  const due=Number(contract.price_pen)-Number(contract.paid_pen);
  const n=days(contract.end_at,now);
  return {assignment:a,contract,slot,account,client,due,days:n,accountDays:days(account.end_at,now),
   payState:due<=0?'PAGADO':Number(contract.paid_pen)>0?'PARCIAL':'DEBE',
   transfer:account.state!=='ACTIVE'||new Date(account.end_at)<new Date(contract.end_at)};
 }).filter(Boolean);
 return {rows,free,raw,now,accountBy,clientBy,contractBy,slotBy};
}
async function loadData(uid,jwt,root){
 const queries={
 accounts:'sb_oper_accounts?select=*&order=end_at.asc&limit=1000',
 slots:'sb_oper_slots?select=*&order=position.asc&limit=1000',
 clients:'sb_oper_clients?select=*&order=alias.asc&limit=1000',
 contracts:'sb_oper_contracts?select=*&order=end_at.asc&limit=1000',
 assignments:'sb_oper_assignments?select=*&limit=1000',
 transfers:'sb_oper_transfers?select=*&order=requested_at.desc&limit=1000',
 events:'sb_oper_events?select=*&order=occurred_at.desc&limit=1000',
 payments:'sb_oper_payments?select=*&order=recorded_at.desc&limit=1000'
 };
 const keys=Object.keys(queries);
 const values=await Promise.all(keys.map(k=>api(queries[k])));
 if(!guard(uid,jwt)||!root.isConnected)throw Error('Sesión modificada');
 const data=Object.fromEntries(keys.map((k,i)=>[k,values[i]]));
 if(keys.some(k=>!Array.isArray(data[k])))throw Error('No se recibieron todos los registros');
 if(keys.some(k=>data[k].length>=1000))data.truncated=true;
 return mapData(data);
}
function board(root,s,uid,jwt){
 root.replaceChildren();
 const {rows,free,raw,now}=s;
 const gate=async(fn,payload,feedback)=>{
  if(!guard(uid,jwt))return alert('Sesión vencida. Vuelve a ingresar.');
  try{
   await api('rpc/'+fn,'POST',payload);
   await refresh(root,uid,jwt,feedback||'Actualizado.');
  }catch(e){alert('Operación no confirmada: '+String(e?.message||e));}
 };
 const visible=a=>a.filter(r=>!search||[r.account?.code,r.account?.alias,r.account?.account_email,r.account?.service,r.client?.alias,r.client?.email,r.client?.phone_e164,'P'+r.slot?.position].join(' ').toLowerCase().includes(search));
 const expiring=rows.filter(r=>r.contract.status==='ACTIVE'&&r.days>=0&&r.days<=7);
 const debtors=rows.filter(r=>r.due>0);
 const releasing=rows.filter(r=>r.contract.status==='ACTIVE'&&r.days>=0&&r.days<=7);
 const main=raw.accounts.filter(a=>a.state==='ACTIVE'&&days(a.end_at,now)>=0&&days(a.end_at,now)<=7);
 const header=E('div','sb195-head');header.append(E('div','', 'STREAM BULL’S · GESTIÓN OPERATIVA'),E('h2','','Atención de hoy'),E('p','sb195-muted','Clientes, cuentas, vencimientos y espacios realmente disponibles.'));
 root.append(header);
 const indicators=[
 ['due','POR VENCER',expiring.length],
 ['debts','DEUDORES',debtors.length],
 ['free','LIBRES AHORA',free.length],
 ['release','PRÓXIMOS A LIBERARSE',releasing.length],
 ['main','CUENTAS POR RENOVAR',main.length]
 ];
 const row=E('div','sb195-indicators');
 for(const [key,name,value] of indicators){
  const b=B('',()=>{tab=key;board(root,s,uid,jwt);},'sb195-tile'+(tab===key?' active':''));
  b.append(E('strong','',value),E('small','',name));row.append(b);
 }
 root.append(row);
 const bar=E('div','sb195-bar');
 const input=E('input','sb195-search');input.type='search';input.value=search;
 input.placeholder='Buscar cliente, P1, cuenta, correo o WhatsApp…';
 input.addEventListener('change',()=>{search=input.value.trim().toLowerCase();board(root,s,uid,jwt);});
 const controls=E('div','sb195-buttons');
 controls.append(B('+ AGREGAR CUENTA',()=>actionPrompt('Agregar cuenta principal',[
  {key:'service',title:'Plataforma',options:['Netflix','Disney','YouTube','Prime Video','HBO','ChatGPT','Canva','Spotify','Otro'].map(x=>[x,x])},
  {key:'code',title:'Código de cuenta',required:true},{key:'alias',title:'Alias'},
  {key:'start',title:'Inicio',type:'date',value:limaDay(now),required:true},
  {key:'end',title:'Vencimiento principal',type:'date',value:addDay(limaDay(now),30),required:true},
  {key:'capacity',title:'Posiciones permitidas por plan',type:'number',min:1,max:12,value:1,required:true},
  {key:'allowed',title:'¿Plan permite asignaciones/reasignaciones?',options:[['false','No / sin autorización'],['true','Sí, confirmado']]}
 ],v=>gate('sb_oper_add_account',{p_service:v.service,p_code:v.code.trim(),p_alias:v.alias||'',
 p_start:stamp(v.start),p_end:stamp(v.end,true),p_capacity:Number(v.capacity),p_allow_reuse:v.allowed==='true'},'Cuenta guardada.')),'primary'));
 controls.append(B('+ AGREGAR CLIENTE',()=>addClient()));
 const more=E('details','sb195-more');more.append(E('summary','','⋮ Más opciones'));
 const menu=E('div','sb195-dropdown');
 for(const [key,title] of [['expired','Vencidos'],['pending','Pendiente de liberación'],['transfer','Necesitan traslado'],['reactivate','Cuentas finalizadas']]){
  menu.append(B(title,()=>{tab=key;board(root,s,uid,jwt);}));
 }
 more.append(menu);controls.append(more);bar.append(input,controls);root.append(bar);
 function addClient(){
  const opts=free.map(p=>[p.id,p.account.code+' · P'+p.position+' · '+p.account.service+' · '+p.days+' días de cuenta']);
  if(!opts.length)return alert('No hay posiciones realmente libres y autorizadas para asignar.');
  actionPrompt('Asignar cliente a una posición libre',[
   {key:'slot',title:'Posición',options:opts,required:true},
   {key:'name',title:'Cliente / alias',required:true},
   {key:'phone',title:'WhatsApp con +51'},
   {key:'start',title:'Fecha de inicio',type:'date',value:limaDay(now),required:true},
   {key:'duration',title:'Duración del cliente (días)',type:'number',min:1,max:366,value:30,required:true},
   {key:'price',title:'Precio contratado (S/)',type:'number',min:0,step:'0.01',value:0,required:true},
   {key:'paid',title:'Importe recibido manualmente (S/)',type:'number',min:0,step:'0.01',value:0,required:true}
  ],async v=>{
   const slot=free.find(x=>x.id===v.slot),period=Number(v.duration);
   if(!slot||!Number.isInteger(period)||period<1||period>366)throw Error('Posición o plazo inválidos');
   const ending=stamp(addDay(v.start,period-1),true);
   if(new Date(ending)>new Date(slot.account.end_at)&&!confirm('La cuenta principal vence ANTES que el contrato del cliente. ¿Confirmas que gestionarás la continuidad?'))return;
   return gate('sb_oper_add_client',{p_slot:v.slot,p_client:v.name.trim(),p_phone:v.phone||null,
    p_start:stamp(v.start),p_end:ending,p_price:Number(v.price),p_paid:Number(v.paid)},'Cliente asignado.');
  });
 }
 function clientCard(r){
  const surplus=Math.max(0,days(r.account.end_at,new Date(r.contract.end_at)));
  const status=r.assignment.state==='PENDING_RELEASE'||r.days<0?'PENDIENTE DE LIBERACIÓN':r.transfer?'CONTINUIDAD / TRASLADO':r.days===0?'VENCE HOY':r.days===1?'VENCE MAÑANA':'PRÓXIMO A VENCER';
  display(list,r.account.code+' — P'+r.slot.position+' — '+r.client.alias+' · '+r.payState+' · '+status,body=>{
   grid(body,[['Plataforma',r.account.service],['Cuenta',r.account.alias||r.account.code],
    ['Contrato inicia',format(r.contract.start_at)],['Última conexión',r.contract.connected_at?format(r.contract.connected_at):'Sin registrar'],
    ['Cliente vence',format(r.contract.end_at)],['Contador del cliente',remaining(r.contract.end_at,now)],
    ['Cuenta principal vence',format(r.account.end_at)],['Cuenta principal restante',remaining(r.account.end_at,now)],
    ['Vigencia sobrante tras el cliente',surplus+' días'],['Estado',status],
    ['Precio / pagado / deuda',money(r.contract.price_pen)+' / '+money(r.contract.paid_pen)+' / '+money(r.due)],
    ['Dispositivos',r.contract.device_notes||'Sin registrar'],['WhatsApp',r.client.phone_e164||'No registrado']]);
   if(r.transfer)body.append(E('p','sb195-alert','La cuenta principal no cubre todo el contrato. Gestiona renovación o traslado compatible.'));
   const tools=E('div','sb195-buttons');
   tools.append(B('RENOVAR',()=>actionPrompt('Renovar '+r.client.alias,[
    {key:'days',title:'Días adicionales',type:'number',min:1,max:366,value:30,required:true},
    {key:'price',title:'Precio adicional contratado (S/)',type:'number',min:0,step:'0.01',value:0,required:true}
   ],v=>gate('sb_oper_extend_contract',{p_contract:r.contract.id,p_days:Number(v.days),p_price_add:Number(v.price)},'Renovación guardada.')),'primary'));
   tools.append(B('WHATSAPP',()=>actionPrompt('Mensaje WhatsApp manual',[
    {key:'type',title:'Motivo',options:[['upcoming','Próximo vencimiento'],['expired','Vencimiento'],['renewal','Renovación'],['debt','Deuda pendiente'],['transfer','Cambio de asignación']]}
   ],v=>openWhatsApp(r,v.type))));
   const menu=E('details','sb195-more');menu.append(E('summary','','⋮ MÁS OPCIONES'));const box=E('div','sb195-dropdown');
   if(r.assignment.state==='ACTIVE')box.append(B('Marcar pendiente de liberación',()=>gate('sb_oper_mark_pending',{p_assignment:r.assignment.id})));
   if(r.assignment.state==='PENDING_RELEASE')box.append(B('Liberar tras retirar acceso',()=>{
    if(confirm('¿CONFIRMAS que el acceso anterior ya fue retirado del proveedor?'))void gate('sb_oper_release',{p_assignment:r.assignment.id,p_confirm_removed:true});
   }));
   box.append(B('Trasladar cliente',()=>{
    const valid=free.filter(x=>x.account.service===r.account.service&&x.account.id!==r.account.id);
    if(!valid.length)return alert('No hay una posición compatible disponible.');
    actionPrompt('Trasladar '+r.client.alias,[
     {key:'slot',title:'Destino libre',options:valid.map(x=>[x.id,x.account.code+' · P'+x.position+' · '+format(x.account.end_at)])}
    ],v=>{
     const dest=valid.find(x=>x.id===v.slot);
     if(dest&&new Date(dest.account.end_at)<new Date(r.contract.end_at))alert('AVISO: el destino vence antes que el cliente. Será necesaria continuidad.');
     return gate('sb_oper_request_transfer',{p_contract:r.contract.id,p_dest_slot:v.slot},'Traslado solicitado. Confirma la retirada real para terminar.');
    });
   }));
   const pending=raw.transfers.find(t=>t.contract_id===r.contract.id&&t.status==='PENDING');
   if(pending)box.append(B('Confirmar traslado solicitado',()=>{
    if(confirm('¿Has retirado el acceso del origen y coordinado manualmente la nueva asignación en el proveedor?'))
     void gate('sb_oper_confirm_transfer',{p_transfer:pending.id,p_origin_removed:true},'Traslado registrado sin alterar el contrato.');
   }));
   if(r.due>0)box.append(B('Registrar pago realmente recibido',()=>actionPrompt('Registrar pago manual',[
    {key:'amount',title:'Importe recibido (S/)',type:'number',min:0.01,max:r.due,step:'0.01',required:true},
    {key:'method',title:'Medio',options:['YAPE','PLIN','TRANSFERENCIA','EFECTIVO','OTRO'].map(x=>[x,x])},
    {key:'reference',title:'Referencia real (mínimo 3 caracteres)',required:true}
   ],v=>gate('sb_oper_record_payment',{p_contract:r.contract.id,p_amount:Number(v.amount),
    p_method:v.method,p_reference:v.reference},'Pago declarado registrado; no modifica la billetera.'))));
   box.append(B('Editar contacto',()=>actionPrompt('Editar datos del cliente',[
    {key:'name',title:'Alias',value:r.client.alias,required:true},{key:'phone',title:'WhatsApp (+51)',value:r.client.phone_e164||''},
    {key:'email',title:'Correo',type:'email',value:r.client.email||''}
   ],v=>gate('sb_oper_edit_client',{p_client:r.client.id,p_name:v.name,p_phone:v.phone,p_email:v.email}))));
   box.append(B('Registrar conexión',()=>gate('sb_oper_update_contract',{p_contract:r.contract.id,p_action:'CONNECTION',p_notes:null})));
   box.append(B('Registrar dispositivos / notas',()=>actionPrompt('Dispositivos (sin contraseñas ni PIN)',[
    {key:'notes',title:'Descripción',value:r.contract.device_notes||''}
   ],v=>gate('sb_oper_update_contract',{p_contract:r.contract.id,p_action:'DEVICES',p_notes:v.notes}))));
   box.append(B(r.contract.status==='SUSPENDED'?'Reactivar cliente':'Suspender cliente',()=>gate('sb_oper_update_contract',{
    p_contract:r.contract.id,p_action:r.contract.status==='SUSPENDED'?'REACTIVATE':'SUSPEND',p_notes:null})));
   box.append(B('Ver historial',()=>{
    const events=raw.events.filter(e=>e.contract_id===r.contract.id);
    alert(events.length?events.map(e=>format(e.occurred_at)+' · '+e.action).join('\n'):'Sin movimientos registrados.');
   }));
   menu.append(box);tools.append(menu);body.append(tools);
  });
 }
 function accountCard(a){
  display(list,a.code+' · '+a.service+' · '+a.state+' · vence '+format(a.end_at),body=>{
   const f=free.filter(x=>x.account_id===a.id);
   grid(body,[['Alias',a.alias||'—'],['Inicio',format(a.start_at)],['Fin',format(a.end_at)],
    ['Cuenta restante',remaining(a.end_at,now)],['Posiciones autorizadas',a.capacity],
    ['Espacios realmente libres',f.length]]);
   const actions=E('div','sb195-buttons');
   actions.append(B('RENOVAR CUENTA',()=>actionPrompt('Renovar cuenta principal',[
    {key:'days',title:'Días de vigencia adicional',type:'number',min:1,max:366,value:30,required:true}
   ],v=>gate('sb_oper_manage_account',{p_account:a.id,p_action:'RENEW',p_days:Number(v.days)})),'primary'));
   actions.append(B(a.state==='SUSPENDED'||a.state==='ENDED'?'REACTIVAR':'SUSPENDER',()=>{
    const action=a.state==='ACTIVE'?'SUSPEND':'REACTIVATE';
    void gate('sb_oper_manage_account',{p_account:a.id,p_action:action,p_days:null});
   }));
   if(a.state!=='ENDED')actions.append(B('FINALIZAR (si no tiene perfiles activos)',()=>{
    if(confirm('¿Confirmas que ya retiraste los accesos de esta cuenta?'))void gate('sb_oper_manage_account',{p_account:a.id,p_action:'END',p_days:null});
   }));
   body.append(actions);
  });
 }
 const titles={due:'Por vencer en 7 días',debts:'Clientes con pagos pendientes',free:'Espacios disponibles ahora',
  release:'Espacios que se liberan próximamente',main:'Cuentas principales por renovar',
  expired:'Clientes vencidos',pending:'Pendientes de liberación',transfer:'Requieren traslado',reactivate:'Cuentas finalizadas'};
 root.append(E('h3','sb195-title',titles[tab]||titles.due));
 if(tab==='release'){
  const selector=E('div','sb195-chips');
  for(const [d,label] of [[0,'HOY'],[1,'MAÑANA'],[3,'EN 3 DÍAS'],[7,'EN 7 DÍAS']]){
   selector.append(B(label,()=>{windowDays=d;board(root,s,uid,jwt);},windowDays===d?'active':''));
  }root.append(selector);
  root.append(E('p','sb195-muted',windowDays===0?'Hoy exclusivamente':windowDays===1?'Mañana exclusivamente':'Desde hoy hasta '+windowDays+' días (acumulado, sin registros duplicados).'));
 }
 const list=E('div','sb195-list');root.append(list);
 const sections={
 due:expiring,debts:debtors,release:releasing.filter(r=>windowDays===0?r.days===0:windowDays===1?r.days===1:r.days<=windowDays),
 expired:rows.filter(r=>r.days<0),pending:rows.filter(r=>r.assignment.state==='PENDING_RELEASE'),
 transfer:rows.filter(r=>r.transfer)
 };
 if(sections[tab]){const selected=visible(sections[tab]);for(const r of selected)clientCard(r);if(!selected.length)list.append(E('p','sb195-empty','No hay registros para este filtro.'));}
 if(tab==='free'){
  const filt=E('div','sb195-buttons');
  const sel=E('select','sb195-select');
  for(const option of ['Todos',...new Set(raw.accounts.map(x=>x.service))]){
   const o=E('option','',option);o.value=option;sel.append(o);
  }sel.value=service;sel.addEventListener('change',()=>{service=sel.value;board(root,s,uid,jwt);});
  const min=E('input','sb195-min');min.type='number';min.min=0;min.max=366;min.value=minDays;
  min.title='Días mínimos';min.addEventListener('change',()=>{minDays=Number(min.value)||0;board(root,s,uid,jwt);});
  filt.append(E('span','','Servicio'),sel,E('span','','Mínimo días'),min);root.insertBefore(filt,list);
  const shown=free.filter(x=>(service==='Todos'||x.account.service===service)&&x.days>=minDays&&(!search||[x.account.code,x.account.service,'P'+x.position].join(' ').toLowerCase().includes(search)));
  for(const x of shown){
   const r=E('div','sb195-free-row');r.append(E('strong','',x.account.code+' · P'+x.position),
    E('span','',remaining(x.account.end_at,now)),E('strong','','LIBRE'));list.append(r);
  }
  if(!shown.length)list.append(E('p','sb195-empty','No hay espacios libres y autorizados.'));
 }
 if(tab==='main'||tab==='reactivate'){
  const arr=tab==='main'?main:raw.accounts.filter(a=>a.state==='ENDED');
  const filtered=arr.filter(a=>!search||[a.code,a.alias,a.service,a.account_email].join(' ').toLowerCase().includes(search));
  for(const a of filtered)accountCard(a);if(!filtered.length)list.append(E('p','sb195-empty','No hay cuentas con este estado.'));
 }
 if(raw.truncated)root.append(E('p','sb195-alert','Algunos listados superaron 1000 filas; se necesita paginación para mostrar todos los registros.'));
 root.append(E('p','sb195-muted','Solo gestión administrativa. WhatsApp se envía manualmente. No se transfieren accesos entre proveedores ni se modifica la billetera.'));
}
async function refresh(root,uid,jwt,feedback){
 if(!root.isConnected||!guard(uid,jwt))return;
 root.replaceChildren(E('p','sb195-loading',feedback||'Consultando tus cuentas y perfiles…'));
 try{
  const data=await loadData(uid,jwt,root);
  if(guard(uid,jwt)&&root.isConnected)board(root,data,uid,jwt);
 }catch(e){if(root.isConnected)root.replaceChildren(E('p','sb195-alert','No se pudo cargar Atención de hoy: '+String(e.message||e)));}
}
async function mount(){
 const page=by('cc166-content'),session=window.CC_V53_SESSION;
 if(!page||!session?.userId||!session?.jwt||page.querySelector('#sb195-attention'))return;
 const heading=page.querySelector('.cc166-section-title h2')?.textContent||'';
 if(!/STREAM BULL['’]?S/.test(heading))return;
 if(page.dataset.sb195Mounting==='1')return;
 const uid=session.userId,jwt=session.jwt;
 page.dataset.sb195Mounting='1';
 try{
  const eligible=await api('rpc/sb_oper_has_access_v195','POST',{});
  if(!guard(uid,jwt)||!page.isConnected||page.querySelector('.cc166-section-title h2')?.textContent!==heading)return;
  if(eligible!==true)return;
  const root=E('section','sb195-root');root.id='sb195-attention';
  page.replaceChildren(root);
  await refresh(root,uid,jwt);
 }catch(_){/* Conservar el panel y las membresías existentes si el módulo aún no responde. */ }
 finally{delete page.dataset.sb195Mounting;}
}
function init(){
 let tick=false;
 new MutationObserver(()=>{
  if(tick)return;tick=true;
  requestAnimationFrame(()=>{tick=false;void mount();});
 }).observe(document.body,{subtree:true,childList:true});
 void mount();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();