/* Human support on the existing CLAN CARTAN account. No financial writes. */
(() => {
'use strict';
const session=()=>window.CC_V53_SESSION;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let dialog,launcher,owner='',admin=false,ticket=null,state='OPEN',query='',rows=[],busy=false,epoch=0,request=null,draft='',messages=[],focus,searchTimer,listSeq=0,threadSeq=0,uploadRequest=null,uploadPath='',purchases=[],purchaseSeq=0,hasOlderMessages=false;
const $=s=>dialog?.querySelector(s);
const date=v=>new Date(v).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short'});
const btn=(text,action,extra='')=>`<button type="button" data-support="${action}" ${extra}>${text}</button>`;
async function api(action,data={}){
 const s=session(),generation=epoch;
 if(!s?.jwt||s.userId!==owner)throw Error('Inicia sesión nuevamente para consultar soporte.');
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),15000);
 try{
  const r=await fetch(s.root+'/rest/v1/rpc/cc_support398',{method:'POST',headers:{apikey:s.key,Authorization:'Bearer '+s.jwt,'Content-Type':'application/json'},body:JSON.stringify({p_action:action,p_data:data}),signal:ctl.signal});
  const b=await r.json();if(epoch!==generation||session()?.userId!==owner||session()?.jwt!==s.jwt)throw Error('La sesión cambió.');
  if(!r.ok)throw Error(b.message||'No se pudo conectar con soporte.');return b;
 }catch(e){if(e.name==='AbortError')throw Error('La conexión tardó demasiado. Reintenta; tu mensaje se conserva.');throw e;}finally{clearTimeout(timer);}
}
async function storage(path,body,file=false){
 const s=session(),generation=epoch,ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),20000);
 try{
  const r=await fetch(s.root+'/storage/v1/'+path,{method:'POST',headers:{apikey:s.key,Authorization:'Bearer '+s.jwt,'Content-Type':file?body.type:'application/json'},body:file?body:JSON.stringify(body),signal:ctl.signal});
  const b=await r.json();if(generation!==epoch||session()?.userId!==owner)throw Error('La sesión cambió.');
  if(!r.ok&&!(file&&(r.status===409||String(b.statusCode)==='409')))throw Error(b.message||'No se pudo procesar la captura.');return b;
 }finally{clearTimeout(timer);}
}
function status(text,error=false){const n=$('[role=status]');if(n){n.textContent=text;n.classList.toggle('error',error);}}
function close(){epoch++;listSeq++;threadSeq++;purchaseSeq++;clearTimeout(searchTimer);busy=false;dialog?.close();dialog?.remove();dialog=null;ticket=null;request=null;draft='';focus?.focus?.();}
function chrome(){
 dialog.innerHTML=`<header><div><strong>CLAN CARTAN</strong><h2 id="support398-title">Soporte humano</h2></div>${btn('×','close','aria-label="Cerrar soporte y volver a la misma vista"')}</header><p class="cc398-support-note">Déjanos tu consulta. Un administrador te responderá aquí.</p><div class="cc398-support-content"></div><p role="status" aria-live="polite"></p>`;
}
function listView(){
 ticket=null;request=null;chrome();
 $('.cc398-support-content').innerHTML=`<h3>${admin?'Bandeja de soporte':'Mis consultas'}</h3><label>Buscar por nombre, asunto o código<input type="search" name="support-query" maxlength="100" value="${esc(query)}"></label><nav aria-label="Estado de consultas">${btn('Pendientes','open',`aria-pressed="${state==='OPEN'}"`)}${btn('Solucionadas','resolved',`aria-pressed="${state==='RESOLVED'}"`)}</nav><div class="cc398-support-list"></div><footer>${btn('+ Nueva consulta','new')}${btn('Actualizar','refresh')}</footer>`;
 void loadList();
}
async function loadList(more=false){
 const seq=++listSeq;status('Cargando consultas…');
 try{
  const last=more?rows.at(-1):null;
  const found=await api('list',{status:state,query,limit:20,...(last?{before:last.updated_at,before_id:last.id}:{})});
  if(seq!==listSeq||!$('.cc398-support-list'))return;
  rows=more?[...rows,...found]:found;
  $('.cc398-support-list').innerHTML=rows.map(t=>`<button type="button" data-support="ticket" data-id="${esc(t.id)}"><strong>${esc(t.subject)}</strong>${admin?`<span>${esc(t.customer_name||"Cliente")} · ${esc(t.customer_email||"")}</span>`:""}<small>${esc(t.business.replaceAll('_',' '))} · ${esc(t.reason)} · #${esc(t.id.slice(0,8))}</small><span>${esc(t.preview||'')}</span><small>${esc(date(t.updated_at))}</small></button>`).join('')||'<p class="cc398-support-empty">No hay consultas en esta lista. Pulsa «Nueva consulta» para comenzar.</p>';
  if(found.length===20)$('.cc398-support-list').insertAdjacentHTML('beforeend',btn('Cargar más','more'));
  status('');
 }catch(e){if(seq===listSeq&&dialog?.open&&!ticket)status(e.message,true);}
}
function newView(){
 listSeq++;ticket=null;request=crypto.randomUUID();chrome();
 $('.cc398-support-content').innerHTML=`${btn('← Mis consultas','list')}<h3>¿Cómo podemos ayudarte?</h3><form data-support-form="create"><label>Motivo<select name="reason"><option>Información de producto</option><option>Ayuda con mi compra</option><option>Propuesta de proveedor</option><option>Otro motivo</option></select></label><label data-support-business>Negocio<select name="business"><option value="CLAN_CARTAN">CLAN CARTAN</option><option value="COBRA_YA">COBRA YA</option><option value="MI_COCHERA">MI COCHERA</option><option value="MI_ALQUILER">MI ALQUILER</option><option value="STREAM_BULLS">STREAM BULL’S</option></select></label><div class="cc399-purchase-fields" hidden><label>Pedido<select name="order_id" aria-label="Seleccionar mi compra"></select></label><div class="cc399-purchase-pagination"></div><label>Producto<select name="order_product" aria-label="Producto del pedido" disabled></select></label></div><label data-support-subject>Asunto (opcional)<input name="subject" minlength="3" maxlength="160"></label><label>Tu consulta<textarea name="body" required maxlength="4000" rows="5" placeholder="Describe qué ocurrió. No incluyas contraseñas ni códigos de acceso."></textarea></label><button type="submit">Enviar consulta</button></form>`;
}
function renderPurchases(){
 const select=$('[name=order_id]');if(!select)return;const prior=select.value;
 select.replaceChildren(new Option(purchases.length?'Selecciona tu pedido':'No tienes compras registradas',''));
 for(const p of purchases)select.add(new Option((p.order_code||p.id)+' · '+p.title,p.id));
 if(purchases.some(p=>p.id===prior))select.value=prior;
 updateProduct();
}
function updateProduct(){
 const select=$('[name=order_product]');if(!select)return;
 const chosen=purchases.find(p=>p.id===$('[name=order_id]')?.value);
 select.replaceChildren(new Option(chosen?.title||'Selecciona primero un pedido',chosen?.id||''));
}
async function loadPurchases(more=false){
 const form=$('[data-support-form=create]'),seq=++purchaseSeq;if(!form)return;
 status('Consultando tus compras…');const select=$('[name=order_id]');select.disabled=true;
 try{
  const prior=more?purchases.at(-1):null;
  const found=await api('purchases',prior?{before:prior.created_at,before_id:prior.id}:{});
  if(seq!==purchaseSeq||!form.isConnected||form.elements.reason.value!=='Ayuda con mi compra')return;
  purchases=more?[...purchases,...found]:found;renderPurchases();
  $('.cc399-purchase-pagination').innerHTML=found.length===20?btn('Cargar pedidos anteriores','older-purchases'):'';
  status(purchases.length?'Selecciona el pedido sobre el que necesitas ayuda.':'No tienes compras registradas. Puedes elegir «Otro motivo» para consultar.');
 }catch(e){if(seq===purchaseSeq&&form.isConnected){status(e.message,true);$('.cc399-purchase-pagination').innerHTML=btn('Reintentar carga de compras','retry-purchases');}}
 finally{if(seq===purchaseSeq&&select.isConnected)select.disabled=false;}
}
function reasonChanged(){
 const form=$('[data-support-form=create]');if(!form)return;
 const needsPurchase=form.elements.reason.value==='Ayuda con mi compra';purchaseSeq++;
 $('.cc399-purchase-fields').hidden=!needsPurchase;$('[data-support-business]').hidden=needsPurchase;$('[data-support-subject]').hidden=needsPurchase;
 form.elements.order_id.required=needsPurchase;form.elements.order_id.disabled=!needsPurchase;form.elements.subject.disabled=needsPurchase;
 if(needsPurchase){purchases=[];renderPurchases();void loadPurchases();}else status('');
}
async function thread(id){
 listSeq++;ticket={id};messages=[];hasOlderMessages=false;request=null;draft='';chrome();
 $('.cc398-support-content').innerHTML=`${btn('← Volver a las consultas','list')}<h3 class="cc398-thread-title">Conversación</h3><div class="cc398-ticket-state"></div><div class="cc398-support-messages" aria-label="Mensajes de la consulta" aria-live="polite"></div><form data-support-form="send"><label>Tu mensaje<textarea name="body" required maxlength="4000" rows="3" placeholder="Escribe tu mensaje…"></textarea></label><label class="cc398-attachment">Adjuntar captura (PNG, JPG o WebP, máximo 5 MB)<input type="file" name="capture" accept="image/png,image/jpeg,image/webp"></label><button type="submit">Enviar mensaje</button></form>`;
 await loadThread();
}
async function loadThread(older=false,quiet=false){
 const id=ticket?.id,seq=++threadSeq;if(!id)return;if(!quiet)status('Cargando conversación…');
 try{
  const b=await api('thread',{ticket_id:id,...(older&&messages.length?{before_id:messages[0].id}:{})});
  if(seq!==threadSeq||ticket?.id!==id||!$('.cc398-support-messages'))return;
  ticket=b.ticket;$('.cc398-thread-title').textContent=ticket.subject;
  $('.cc398-ticket-state').innerHTML=`<span>${ticket.status==='RESOLVED'?'✓ Solucionada':'Pendiente'} · #${esc(id.slice(0,8))}${ticket.order_code?' · '+esc(ticket.order_code):''}</span>${admin?btn(ticket.status==='RESOLVED'?'Reabrir':'Marcar solucionada','status'):''}`;
  if(older||messages.length===0)hasOlderMessages=b.messages.length===50;
  const changed=older||messages.at(-1)?.id!==b.messages.at(-1)?.id;
  if(changed){
   const node=$('.cc398-support-messages'),nearBottom=node.scrollHeight-node.scrollTop-node.clientHeight<80,prior=node.scrollHeight;
   if(older)messages=[...b.messages,...messages];else if(messages.length&&b.messages.length)messages=[...messages.filter(m=>m.id<b.messages[0].id),...b.messages];else messages=b.messages;
   node.innerHTML=(hasOlderMessages?btn('Mensajes anteriores','older'):'')+messages.map(m=>`<article class="${m.kind==='STATUS'?'event':m.staff?'staff':'customer'}"><strong>${m.kind==='STATUS'?'Estado':m.staff?'Soporte CLAN CARTAN':'Cliente'}</strong><p>${esc(m.body)}</p>${m.attachment?btn("Ver captura","attachment",`data-id="${esc(m.id)}"`):""}<small>${esc(date(m.created_at))}</small></article>`).join('');
   if(older)node.scrollTop=node.scrollHeight-prior;else if(nearBottom||!quiet)node.scrollTop=node.scrollHeight;
  }
  if(!quiet)status('');
 }catch(e){if(seq===threadSeq&&ticket?.id===id)status(e.message,true);}
}
async function submit(form){
 if(busy||!form.reportValidity())return;
 const node=dialog,generation=epoch,current=()=>dialog===node&&epoch===generation&&node?.open;
 const kind=form.dataset.supportForm,data=Object.fromEntries(new FormData(form));
 const file=kind==='send'?form.querySelector('[name=capture]')?.files[0]:null;delete data.capture;
 if(file&&(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5242880)){status('Elige una imagen PNG, JPG o WebP de hasta 5 MB.',true);return;}
 if(kind==='create'){delete data.order_product;if(data.reason==='Ayuda con mi compra')data.business='STREAM_BULLS';else delete data.order_id;}
 const fingerprint=JSON.stringify({...data,file:file?[file.name,file.size,file.lastModified]:null});if(draft!==fingerprint){request=crypto.randomUUID();draft=fingerprint;}request??=crypto.randomUUID();
 busy=true;const send=form.querySelector('[type=submit]');send.disabled=true;status('Enviando…');
 try{
  if(kind==='create'){
   const t=await api('create',{...data,request_id:request});if(!current())return;await thread(t.id);
  }else{
   const id=ticket.id;
   if(file&&uploadRequest!==request){const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type];uploadPath=id+'/'+request+'.'+ext;await storage('object/cc-support398/'+uploadPath,file,true);uploadRequest=request;}
   await api('send',{body:data.body,ticket_id:id,request_id:request,attachment:file?uploadPath:null});
   if(!current()||ticket?.id!==id||!form.isConnected)return;form.reset();request=null;draft='';await loadThread();if(current())status('Mensaje registrado.');
  }
 }catch(e){if(current())status(e.message,true);}finally{if(current()){busy=false;if(send.isConnected)send.disabled=false;}}
}
async function open(){
 if(!session()?.jwt){window.alert('Inicia sesión en CLAN CARTAN para consultar soporte.');return;}
 if(dialog?.open){if(owner===session().userId)return;close();}
 if(owner!==session().userId){query='';state='OPEN';rows=[];messages=[];purchases=[];admin=false;uploadRequest=null;uploadPath='';}
 owner=session().userId;epoch++;focus=document.activeElement;dialog=document.createElement('dialog');dialog.id='cc398-support-dialog';dialog.setAttribute('aria-labelledby','support398-title');document.body.append(dialog);chrome();dialog.showModal();status('Conectando con soporte…');
 const node=dialog,generation=epoch,current=()=>dialog===node&&epoch===generation&&node.open;
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('submit',e=>{e.preventDefault();void submit(e.target);});
 dialog.addEventListener('change',e=>{if(e.target.name==='reason')reasonChanged();if(e.target.name==='order_id')updateProduct();});
 dialog.addEventListener('input',e=>{if(e.target.name==='support-query'){query=e.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>void loadList(),300);}});
 dialog.addEventListener('click',async e=>{
  const b=e.target.closest('[data-support]');if(!b)return;const action=b.dataset.support;
  if(action==='close'){close();return;}if(busy)return;
  if(action==='older-purchases')void loadPurchases(true);else if(action==='retry-purchases')void loadPurchases();else if(action==='list')listView();else if(action==='new')newView();else if(action==='ticket')void thread(b.dataset.id);
  else if(action==='open'||action==='resolved'){state=action==='open'?'OPEN':'RESOLVED';listView();}
  else if(action==='refresh')void loadList();else if(action==='more')void loadList(true);else if(action==='older')void loadThread(true);
  else if(action==='attachment'){
   const threadId=ticket?.id;const message=messages.find(m=>String(m.id)===b.dataset.id);if(!message?.attachment)return;
   b.disabled=true;try{const signed=await storage('object/sign/cc-support398/'+message.attachment,{expiresIn:60});if(!current()||ticket?.id!==threadId)return;
    const url=new URL(session().root+'/storage/v1'+signed.signedURL);if(url.origin!==new URL(session().root).origin)throw Error('Enlace de captura no válido.');
    dialog.querySelector('.cc398-capture-preview')?.remove();const figure=document.createElement('figure');figure.className='cc398-capture-preview';figure.innerHTML=btn('Cerrar captura','close-preview')+'<img alt="Captura adjunta a la consulta">';figure.querySelector('img').src=url.href;dialog.append(figure);
   }catch(err){if(current()&&ticket?.id===threadId)status(err.message,true);}finally{if(b.isConnected)b.disabled=false;}
  }else if(action==='close-preview')b.closest('figure')?.remove();
  else if(action==='status'){
   busy=true;b.disabled=true;try{await api('status',{ticket_id:ticket.id,status:ticket.status==='OPEN'?'RESOLVED':'OPEN',request_id:crypto.randomUUID()});if(current())await loadThread();}catch(err){if(current())status(err.message,true);}finally{if(current()){busy=false;if(b.isConnected)b.disabled=false;}}
  }
 });
 try{const ctx=await api('context');if(!current())return;admin=ctx.admin;listView();}catch(e){if(!current())return;status(e.message,true);$('.cc398-support-content').innerHTML=btn('Reintentar conexión','retry');node.addEventListener('click',e=>{if(current()&&e.target.dataset.support==='retry'){close();void open();}});}
}
window.cc398Support=Object.freeze({open});
function sync(){
 if(!launcher){launcher=document.createElement('button');launcher.type='button';launcher.id='cc398-support-launcher';launcher.textContent='Soporte humano';launcher.setAttribute('aria-label','Abrir soporte: problema, consulta o sugerencia');launcher.addEventListener('click',()=>void open());document.body.append(launcher);}
 const candidates=[...document.querySelectorAll('#ma1611layer,#mc158layer,#cy53layer,#cc166-panel')].filter(n=>!n.hidden&&n.getBoundingClientRect().width&&getComputedStyle(n).display!=='none').sort((a,b)=>(parseInt(getComputedStyle(b).zIndex)||0)-(parseInt(getComputedStyle(a).zIndex)||0));
 const home=document.getElementById('cc77home');
 const catalogHost=document.body.classList.contains('view-store')&&(!home||getComputedStyle(home).display==='none')?document.querySelector('#app .cc117-actions-top'):null;
 const root=candidates[0];
 const moduleHost=root?.id==='cy53layer'?root.querySelector('.cc398-theme-bar'):root?.id==='mc158layer'?root.querySelector('.mc395-toolbar'):root?.id==='ma1611layer'?root.querySelector('.cc401-tools'):root?.id==='cc166-panel'?root.querySelector('#cc166-top-actions'):null;
 const host=moduleHost||catalogHost||document.body;
 const inline=host!==document.body;launcher.classList.toggle('cc401-inline-help',inline);const label=inline?'Ayuda':'Soporte humano';if(launcher.textContent!==label)launcher.textContent=label;
 if(launcher.parentNode!==host)host.append(launcher);
 launcher.hidden=!session()?.jwt;
 if(dialog&&(!session()?.jwt||owner!==session()?.userId))close();
}
function initSupport(){
 sync();let scheduled=false;new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync();});}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','hidden']});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initSupport,{once:true});else initSupport();
document.addEventListener('cc192-session-refreshed',sync);
setInterval(sync,1000);
setInterval(()=>{if(dialog?.open&&ticket&&!busy&&document.visibilityState==='visible')void loadThread(false,true);},10000);
})();
