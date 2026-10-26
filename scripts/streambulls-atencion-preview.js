/* STREAM BULL'S / CLAN CARTAN — banco de pruebas UI dentro del repositorio.
   Datos sintéticos en este navegador; jamás conecta con billeteras o producción. */
(function(){
'use strict';
const C=window.SBOperationsCore,app=document.getElementById('sb-demo-app');
if(!C||!app)return;
const KEY='cc-streambulls-stage-fixture-v2';
const html=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!==undefined)el.textContent=String(txt);return el;};
const mkButton=(caption,action,cls)=>{const x=html('button',cls||'btn',caption);x.type='button';x.addEventListener('click',action);return x;};
let state,section='due',timeWindow=7,term='',freeService='TODOS',minFreeDays=0,toast='',modal=null;
const initial=()=>C.fixtures(new Date());
try{
 const raw=sessionStorage.getItem(KEY);
 state=raw?JSON.parse(raw):initial();
 if(state.version!==2||!Array.isArray(state.assignments))state=initial();
}catch(_){state=initial();}
const persist=()=>{try{sessionStorage.setItem(KEY,JSON.stringify(state));}catch(_){}};
const formatDate=value=>new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value));
const money=value=>'S/ '+C.money(value||0).toFixed(2);
const dayKey=C.parts;
const isValidPhone=x=>!x||/^\+[1-9][0-9]{7,14}$/.test(x);
function flash(m){toast=String(m);render();const tip=document.getElementById('sb-tip');if(tip)tip.scrollIntoView({block:'nearest'});}
const event=(type,data)=>state.events.unshift({id:'e'+Date.now(),at:new Date().toISOString(),type,...data});
function mutator(fn){
 try{fn();persist();toast='Cambio guardado solamente en esta prueba';render();}
 catch(e){toast='No se pudo completar: '+String(e.message||e);render();}
}
const active=t=>t&&t.state==='PENDING';
const currentTransfer=r=>state.transfers.find(t=>t.contractId===r.c.id&&t.state==='PENDING');
const searchKey=r=>[r.c?.client,r.c?.phone,r.c?.email,r.account?.code,r.account?.alias,r.account?.service,r.position?'P'+r.position:''].join(' ').toLowerCase();
const filtered=rows=>rows.filter(r=>!term||searchKey(r).includes(term));
function head(){
 const hero=html('header','hero');
 const left=html('div');left.append(html('p','eyebrow','CLAN CARTAN / STREAM BULL’S · STAGING'),html('h1','','Atención de hoy'),html('p','muted','Cuentas, perfiles, pagos y espacios — un solo lugar para operar.'));
 const right=html('div','hero-right');
 right.append(html('span','status-pill','AISLADO · DATOS FICTICIOS'),mkButton('Restablecer escenarios',()=>{
  if(!confirm('¿Restablecer datos ficticios de esta prueba?'))return;
  state=initial();section='due';timeWindow=7;persist();render();
 },'btn ghost'));
 hero.append(left,right);app.append(hero);
 const note=html('div','warning','Esta pantalla prueba la ampliación de STREAM BULL’S. No mueve dinero, no cambia accesos en Netflix/otras plataformas y no modifica www.clancartan.com.');
 app.append(note);
}
function metricBar(m){
 const navigation=[
  {id:'due',label:'Por vencer',value:m.expiring7.length},
  {id:'debts',label:'Deudores',value:m.debtors.length},
  {id:'free',label:'Libres ahora',value:m.free.length},
  {id:'release',label:'Próximos a liberarse',value:m.releasing.length},
  {id:'accounts',label:'Cuentas por renovar',value:m.mainExpiring.length}
 ];
 const wrap=html('nav','metrics');wrap.setAttribute('aria-label','Filtros de Atención de hoy');
 for(const item of navigation){
  const b=mkButton('',()=>{section=item.id;render();},'metric'+(section===item.id?' current':''));
  b.append(html('strong','count',item.value),html('span','',item.label));wrap.append(b);
 }
 app.append(wrap);
}
function toolbar(m){
 const wrap=html('div','toolbar'),search=html('input','search');
 search.type='search';search.value=term;search.placeholder='Buscar cuentas, perfiles, clientes, correos o teléfonos…';search.setAttribute('aria-label','Buscador universal');
 search.addEventListener('input',e=>{term=e.target.value.trim().toLowerCase();render({keepFocus:true});});
 wrap.append(search);
 const actions=html('div','action-group');
 actions.append(mkButton('+ Agregar cuenta',()=>openAccountForm(),'btn primary'));
 actions.append(mkButton('+ Agregar cliente',()=>openClientForm(m),'btn secondary'));
 const more=html('details','dropdown'),summary=html('summary','','Más indicadores');more.append(summary);
 const list=html('div','drop-list');
 for(const [s,label] of [['expired','Vencidos'],['transfers','Necesitan traslado'],['pending','Pendientes de liberación'],['reactivate','Cuentas finalizadas']]){
  list.append(mkButton(label,()=>{section=s;render();},'btn ghost'));
 }
 more.append(list);actions.append(more);wrap.append(actions);app.append(wrap);
 if(toast){const p=html('p','alert-message',toast);p.id='sb-tip';p.setAttribute('role','status');app.append(p);}
}
function labelFor(r){
 if(r.state==='PENDING_RELEASE'||r.expired)return 'PENDIENTE DE LIBERACIÓN';
 if(r.needsTransfer)return 'REQUIERE CONTINUIDAD';
 return r.days===0?'VENCE HOY':r.days===1?'VENCE MAÑANA':r.days>=0?'PRÓXIMO A VENCER':'VENCIDO';
}
function statusClass(r){return r.state==='PENDING_RELEASE'||r.expired?'warn':r.needsTransfer?'warn':'ok';}
function rowCard(r){
 const wrap=html('article','row-card');
 const details=html('details','row-details');
 const head=html('summary','row-head');
 const title=html('div','row-identity');
 title.append(html('strong','',r.account.code+' — P'+r.position+' — '+r.c.client));
 title.append(html('span','secondary',r.account.service+' · '+r.remaining+' · '+r.payState+' · '+labelFor(r)));
 head.append(title,html('span','pill '+statusClass(r),labelFor(r)));details.append(head);
 const body=html('div','row-body');
 const pairs=[
 ['Cliente / alias',r.c.client],['Posición','P'+r.position],['Fecha de conexión',formatDate(r.c.connected)],
 ['Inicio',formatDate(r.c.start)],['Vence el cliente',formatDate(r.c.end)],
 ['Cuenta principal vence',formatDate(r.account.end)],
 ['Diferencia de vigencia principal',r.mainSurplus+' días'],
 ['Restante de la cuenta',r.accountRemaining],
 ['Costo / pagado / deuda',money(r.c.price)+' / '+money(r.c.paid)+' / '+money(r.due)],
 ['Estado de pago',r.payState],['Contacto WhatsApp',r.c.phone||'No registrado'],
 ['Dispositivos',r.c.devices||'No registrados']
 ];
 const grid=html('div','detail-grid');
 for(const [key,value] of pairs){const cell=html('div','detail-cell');cell.append(html('small','',key),html('strong','',value));grid.append(cell);}
 body.append(grid);
 if(r.needsTransfer){body.append(html('p','warning','La cuenta principal no cubre todo el contrato del cliente. Gestiona renovación o traslado compatible.'));}
 const tools=html('div','row-actions');
 tools.append(mkButton('Renovar',()=>mutator(()=>C.renew(state,r.c.id,Number(prompt('¿Cuántos días adicionales (1 a 366)?','30')))),'btn primary'));
 tools.append(mkButton('WhatsApp',()=>openWhatsApp(r.c),'btn secondary'));
 const more=html('details','dropdown');more.append(html('summary','','⋮ Más opciones'));
 const list=html('div','drop-list');
 list.append(mkButton('Registrar abono',()=>registerPaid(r.c),'btn ghost'));
 if(r.state==='ACTIVE')list.append(mkButton('Marcar pendiente de liberación',()=>mutator(()=>C.markPending(state,r.id)),'btn ghost'));
 if(r.state==='PENDING_RELEASE')list.append(mkButton('Liberar (confirmar retirada)',()=>{
  if(confirm('¿Ya retiraste realmente el acceso anterior? La posición solo quedará libre si confirmas.'))mutator(()=>C.release(state,r.id,true));
 },'btn ghost'));
 const transfer=currentTransfer(r);
 if(!transfer)list.append(mkButton('Trasladar cliente',()=>requestTransfer(r),'btn ghost'));
 else list.append(mkButton('Confirmar traslado pendiente',()=>{
  if(confirm('¿Se retiró el acceso en el proveedor y se verificó la nueva asignación?')){
   mutator(()=>C.confirmTransfer(state,transfer.id,true));
  }
 },'btn ghost'));
 list.append(mkButton('Suspender contrato',()=>mutator(()=>{
  r.c.status='SUSPENDED';event('SUSPENDIDO',{contractId:r.c.id});
 }), 'btn ghost'));
 list.append(mkButton('Editar WhatsApp',()=>editContact(r.c),'btn ghost'));
 list.append(mkButton('Historial',()=>openHistory(r.c.id),'btn ghost'));
 more.append(list);tools.append(more);body.append(tools);
 if(transfer)body.append(html('p','warning','TRASLADO SOLICITADO: destino reservado hasta que confirmes retirada de acceso y cambio administrativo. El proveedor no cambia automáticamente.'));
 details.append(body);wrap.append(details);return wrap;
}
function accountCard(a,now=new Date()){
 const card=html('article','row-card account');
 const heading=html('div','row-head compact');
 const free=C.available(state,now).filter(x=>x.accountId===a.id);
 const occupied=state.assignments.filter(x=>x.accountId===a.id&&x.state!=='CLOSED').length;
 const content=html('div','row-identity');
 content.append(html('strong','',a.code+' · '+a.alias),
 html('span','secondary',a.service+' · '+a.status+' · '+occupied+'/'+a.capacity+' ocupados · '+free.length+' libres'));
 heading.append(content,html('span','pill '+(a.status==='ACTIVE'?'ok':'warn'),C.countdown(a.end,now)));card.append(heading);
 const row=html('div','account-detail');
 row.append(html('small','', 'Inicio '+formatDate(a.start)+' · Vence '+formatDate(a.end)+' · Reasignación: '+(a.allowReuse?'permitida según plan':'no autorizada')));
 row.append(mkButton('Renovar cuenta',()=>mutator(()=>{
  const n=Number(prompt('Días de extensión de la cuenta principal (1-366):','30'));C.renewAccount(state,a.id,n);
 }),'btn secondary'));
 if(a.status==='ENDED')row.append(mkButton('Reactivar',()=>mutator(()=>{
  a.status='ACTIVE';event('CUENTA REACTIVADA',{accountId:a.id});
 }),'btn secondary'));
 if(a.status==='ACTIVE')row.append(mkButton('Suspender',()=>mutator(()=>{
  a.status='SUSPENDED';event('CUENTA SUSPENDIDA',{accountId:a.id});
 }),'btn ghost'));
 card.append(row);return card;
}
function sectionBody(m){
 const sectionEl=html('section','section'),heading=html('div','section-title');
 const titles={due:'Por vencer (hoy y próximos 7 días)',debts:'Clientes con deuda',
 free:'Espacios disponibles ahora',release:'Espacios que se liberan próximamente',
 accounts:'Cuentas principales por renovar',expired:'Clientes vencidos',
 transfers:'Clientes que requieren continuidad',pending:'Posiciones pendientes de liberación',
 reactivate:'Cuentas que pueden reactivarse'};
 heading.append(html('h2','',titles[section]||'Operaciones'));
 sectionEl.append(heading);
 let rows=[];
 if(section==='due')rows=m.expiring7;
 if(section==='debts')rows=m.debtors;
 if(section==='release')rows=m.releasing;
 if(section==='expired')rows=m.expired;
 if(section==='transfers')rows=m.transfer;
 if(section==='pending')rows=m.pending;
 if(section==='release'){
  const filters=html('div','chips');
  for(const [d,l] of [[0,'Hoy'],[1,'Mañana'],[3,'En 3 días'],[7,'En 7 días']]){
   filters.append(mkButton(l,()=>{timeWindow=d;render();},'chip'+(timeWindow===d?' selected':'')));
  }
  sectionEl.append(filters,html('p','muted',timeWindow===0?'Hoy exclusivamente':timeWindow===1?'Mañana exclusivamente':'Intervalo acumulado desde hoy hasta '+timeWindow+' días; cada posición se cuenta una sola vez.'));
  rows=rows.filter(r=>timeWindow===0?r.days===0:timeWindow===1?r.days===1:r.days>=0&&r.days<=timeWindow);
 }
 if(['due','debts','release','expired','transfers','pending'].includes(section)){
  const arr=filtered(rows);
  if(!arr.length)sectionEl.append(html('p','empty','Sin registros para este filtro.'));
  for(const row of arr)sectionEl.append(rowCard(row));
 }
 if(section==='free'){
  const controls=html('div','free-controls'),select=html('select');
  for(const svc of ['TODOS',...new Set(state.accounts.map(a=>a.service))]){
   const o=html('option','',svc);o.value=svc;select.append(o);
  }
  select.value=freeService;select.addEventListener('change',()=>{freeService=select.value;render();});
  const min=html('input');min.type='number';min.min='0';min.max='366';min.value=String(minFreeDays);
  min.setAttribute('aria-label','Mínimo de días disponibles');
  min.addEventListener('change',()=>{minFreeDays=Math.max(0,Number(min.value)||0);render();});
  controls.append(html('label','','Servicio'),select,html('label','','Mínimo de días disponibles'),min);
  sectionEl.append(controls);
  const list=m.free.filter(x=>(freeService==='TODOS'||x.service===freeService)&&
   C.daysFromNow(x.accountEnd)>=minFreeDays&&(!term||[x.code,x.service,'P'+x.position].join(' ').toLowerCase().includes(term)));
  if(!list.length)sectionEl.append(html('p','empty','No hay espacios libres autorizados para esos filtros.'));
  for(const a of list){
   const row=html('article','row-card compact-row');
   const content=html('div','row-identity');content.append(html('strong','',a.code+' — P'+a.position),
    html('span','secondary',a.remaining+' de vigencia principal · '+a.service));
   row.append(content,html('span','pill ok','LIBRE'));
   row.append(mkButton('+ Agregar cliente',()=>openClientForm(m,a.accountId,a.position),'btn secondary'));
   sectionEl.append(row);
  }
 }
 if(section==='accounts'||section==='reactivate'){
  const arr=state.accounts.filter(a=>section==='accounts'?m.mainExpiring.some(x=>x.id===a.id):a.status==='ENDED').filter(a=>
   !term||[a.code,a.service,a.alias].join(' ').toLowerCase().includes(term));
  if(!arr.length)sectionEl.append(html('p','empty','No hay cuentas con ese estado.'));
  for(const a of arr)sectionEl.append(accountCard(a));
 }
 app.append(sectionEl);
}
function dialogForm(titleText,inputs,onSave){
 const overlay=html('div','modal-backdrop');
 const panel=html('div','modal');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 panel.append(html('h2','',titleText));
 const form=html('form','form-grid');
 const fields={};
 for(const f of inputs){
  const label=html('label','',f.label);
  let input;
  if(f.options){input=html('select');for(const v of f.options){const opt=html('option','',v[1]);opt.value=v[0];input.append(opt);}}
  else {input=html('input');input.type=f.type||'text';}
  input.name=f.key;input.required=!!f.required;
  if(f.value!==undefined)input.value=f.value;
  if(f.min!==undefined)input.min=String(f.min);
  if(f.max!==undefined)input.max=String(f.max);
  if(f.step!==undefined)input.step=String(f.step);
  label.append(input);fields[f.key]=input;form.append(label);
 }
 const actions=html('div','row-actions'),save=mkButton('Guardar',()=>{},'btn primary');
 save.type='submit';
 actions.append(mkButton('Cancelar',()=>overlay.remove(),'btn ghost'),save);
 form.append(actions);
 form.addEventListener('submit',e=>{
  e.preventDefault();const data=Object.fromEntries(Object.entries(fields).map(([k,el])=>[k,el.value]));
  try{onSave(data);persist();overlay.remove();toast='Guardado en este escenario de prueba';render();}
  catch(err){const note=panel.querySelector('.dialog-error')||html('p','dialog-error');note.textContent=String(err.message||err);panel.append(note);}
 });
 panel.append(form);overlay.append(panel);
 overlay.addEventListener('click',e=>{if(e.target===overlay)overlay.remove();});
 document.body.append(overlay);fields[inputs[0].key]?.focus();
}
function openAccountForm(){
 dialogForm('Agregar cuenta principal (simulación)',[
 {key:'service',label:'Plataforma',required:true,options:[['Netflix','Netflix'],['Disney','Disney'],['YouTube','YouTube'],['ChatGPT','ChatGPT'],['Otro','Otro']]},
 {key:'code',label:'Código de cuenta',required:true,value:'NETFLIX '+String(state.accounts.length+1).padStart(3,'0')},
 {key:'alias',label:'Alias',value:'Nueva cuenta'},
 {key:'start',label:'Fecha de inicio',type:'date',value:C.parts(),required:true},
 {key:'end',label:'Fecha fin',type:'date',value:C.dayOffset(30),required:true},
 {key:'capacity',label:'Número de posiciones',type:'number',required:true,min:1,max:12,value:5},
 {key:'reuse',label:'¿El plan permite reasignaciones?',options:[['no','No / sin autorización'],['si','Sí, autorizado']]}
 ],x=>C.addAccount(state,{service:x.service,code:x.code.trim(),alias:x.alias,
 start:C.localStart(x.start),end:C.localEnd(x.end),capacity:Number(x.capacity),allowReuse:x.reuse==='si'}));
}
function openClientForm(m,chosenAccount=null,chosenPosition=null){
 const targets=C.available(state);if(!targets.length){flash('No hay espacios libres y autorizados actualmente.');return;}
 const accounts=[...new Map(targets.map(s=>[s.accountId,s])).values()];
 const accountOptions=accounts.map(t=>[t.accountId,t.code+' — '+t.service]);
 const a=chosenAccount||accountOptions[0][0];
 const slots=targets.filter(t=>t.accountId===a);
 const slotOptions=targets.map(t=>[t.key,t.code+' · P'+t.position]);
 dialogForm('Agregar cliente a un espacio libre',[
 {key:'target',label:'Cuenta y posición libre',options:slotOptions,required:true,value:chosenAccount?chosenAccount+':'+chosenPosition:slotOptions[0][0]},
 {key:'client',label:'Nombre o alias',required:true,value:''},
 {key:'phone',label:'WhatsApp (opcional, +519XXXXXXXX)',value:''},
 {key:'email',label:'Correo (opcional)',type:'email'},
 {key:'start',label:'Inicio',type:'date',value:C.parts(),required:true},
 {key:'days',label:'Duración contratada (días)',type:'number',min:1,max:366,value:30,required:true},
 {key:'price',label:'Precio acordado (S/)',type:'number',min:0,step:'0.01',value:15,required:true},
 {key:'paid',label:'Pagado (S/)',type:'number',min:0,step:'0.01',value:0,required:true}
 ],x=>{
  if(!isValidPhone(x.phone))throw Error('WhatsApp debe iniciar con + y código de país.');
  const selected=targets.find(s=>s.key===x.target);if(!selected)throw Error('Posición ocupada.');
  const end=C.calendarDurationEnd(C.localStart(x.start),Number(x.days));
  if(!end)throw Error('Duración inválida.');
  const result=C.addClient(state,{accountId:selected.accountId,position:selected.position,
   client:x.client.trim(),phone:x.phone,email:x.email,start:C.localStart(x.start),
   end,price:Number(x.price),paid:Number(x.paid)});
  if(result.needRenewAccount){event('ALERTA DE CONTINUIDAD',{contractId:result.contract.id});}
 });
}
function registerPaid(c){
 const n=prompt('Monto del abono YA RECIBIDO (simulación, no billetera):',String(C.money(c.price-c.paid)));
 if(n===null)return;mutator(()=>C.pay(state,c.id,Number(n)));
}
function editContact(c){
 const n=prompt('WhatsApp con código de país (+519XXXXXXXX):',c.phone||'');
 if(n===null)return;
 if(!isValidPhone(n)){flash('Formato de WhatsApp inválido.');return;}
 mutator(()=>{c.phone=n;event('CONTACTO EDITADO',{contractId:c.id});});
}
function openWhatsApp(c){
 const choice=prompt('Mensaje: 1 próximo vencimiento, 2 vencido, 3 renovación, 4 deuda, 5 traslado','1');
 if(choice===null)return;
 const options={1:'upcoming',2:'expired',3:'renewal',4:'debt',5:'transfer'};
 const url=C.whatsapp(c,options[choice]||'upcoming');
 if(!url){flash('Este cliente no tiene WhatsApp. Regístralo desde ⋮ Más opciones.');return;}
 window.open(url,'_blank','noopener,noreferrer');
}
function requestTransfer(r){
 const choices=C.available(state).filter(x=>x.service===r.c.service&&x.accountId!==r.account.id);
 if(!choices.length){flash('No hay posiciones del mismo servicio libres y autorizadas.');return;}
 const message=choices.map((x,i)=>(i+1)+'. '+x.code+' P'+x.position+' (vigencia '+formatDate(x.accountEnd)+')').join('\n');
 const select=prompt('Selecciona el número del destino:\n'+message,'1');
 if(select===null)return;const n=Number(select),target=choices[n-1];
 if(!Number.isInteger(n)||!target){flash('Destino inválido.');return;}
 mutator(()=>{
  const x=C.requestTransfer(state,r.c.id,target.accountId,target.position);
  if(x.needsAccountRenewal)event('ADVERTENCIA EXTENDER DESTINO',{contractId:r.c.id});
 });
}
function openHistory(contractId){
 const events=state.events.filter(e=>e.contractId===contractId);
 alert(events.length?events.map(e=>formatDate(e.at)+' · '+e.type).join('\n'):'Este cliente aún no tiene eventos registrados en la simulación.');
}
function render(opts){
 const focus=document.activeElement,focusedSearch=opts?.keepFocus&&focus?.classList.contains('search');
 const selection=focusedSearch?focus.selectionStart:0;
 app.replaceChildren();
 const m=C.metrics(state,new Date());
 head();metricBar(m);toolbar(m);sectionBody(m);
 const bottom=html('footer','footer');
 bottom.append(html('span','','STREAM BULL’S · Prueba aislada · America/Lima'),
 html('span','','Las operaciones reales requieren autorización y verificación del proveedor.'));
 app.append(bottom);
 if(focusedSearch){const input=app.querySelector('.search');input?.focus();input?.setSelectionRange(selection,selection);}
}
render();
})();
