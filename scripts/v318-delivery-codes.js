/* V319 · Un ORD identifica la entrega. No almacena códigos ni credenciales en el navegador. */
(function(){'use strict';
const E=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;};
const B=(text,fn,primary=false)=>{const b=E('button',primary?'cc166-primary':'cc166-secondary',text);b.type='button';b.onclick=fn;return b;};
const normalize=value=>{let v=String(value||'').trim().toUpperCase();if(/^\d{6,15}$/.test(v))v='ORD-'+v;return /^ORD-\d{6,15}$/.test(v)?v:null;};
const methods=[['AUTOMATIC','Código comercial automático'],['AUTHENTICATOR','Autenticador · asistencia del titular'],['MANUAL','Verificación manual'],['DIRECT','Entrega directa · licencia comercial']];
let owner=null,root=null,cleanups=[],prefill='',accountChoice='',sellerOrder='',tabChoice='accounts';
function cleanup(){for(const f of cleanups.splice(0))try{f();}catch(_){}root=null;}
function reset(){cleanup();owner=null;prefill='';accountChoice='';sellerOrder='';tabChoice='accounts';}
const date=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('es-PE',{dateStyle:'medium',timeStyle:'short'}):'Sin iniciar';
const select=(name,options,value)=>{const e=E('select');e.name=name;for(const [v,label]of options){const o=E('option','',label);o.value=v;e.append(o);}if(value!==undefined)e.value=value;return e;};
function field(form,label,input){const l=E('label','',label);l.append(input);form.append(l);return input;}
function input(name,type='text',value=''){const e=E('input');e.name=name;e.type=type;e.value=value;return e;}
function notice(form,text){const n=E('p','cc318-status',text);n.setAttribute('role','status');form.append(n);return n;}
function card(parent,title,desc){const box=E('section','cc166-card cc318-card');box.append(E('h2','',title));if(desc)box.append(E('p','cc166-subline',desc));parent.append(box);return box;}
function scope(page,ctx){
 cleanup();if(owner!==ctx.uid){owner=ctx.uid;prefill='';accountChoice='';sellerOrder='';tabChoice='accounts';}
 const host=E('section','cc318-root');root=host;page.append(host);const alive=()=>host.isConnected&&root===host&&window.CC_V53_SESSION?.userId===ctx.uid&&window.CC_V53_SESSION?.jwt===ctx.jwt;
 const after=fn=>{cleanups.push(fn);return fn;};
 const rpc=async(action,data={})=>ctx.api('rpc/cc_stream_delivery_manage','POST',{p_action:action,p_data:data});
 async function edge(body,signal){const response=await fetch(ctx.root+'/functions/v1/cc-stream-delivery',{method:'POST',headers:{apikey:ctx.key,Authorization:'Bearer '+ctx.jwt,'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(body),signal});const result=await response.json();if(!response.ok){const error=Error(result.error==='OAUTH_NOT_CONFIGURED'?'ADMIN debe completar la configuración de este proveedor de correo.':result.error==='AUTH_REQUIRED'?'Vuelve a iniciar sesión.':'No se pudo completar la consulta. Vuelve a intentarlo.');error.code=result.error;throw error;}return result;}
 function footer(){host.append(E('footer','cc318-credit','Creado por CLAN CARTAN'));}
 return {host,alive,after,rpc,edge,ctx,footer};
}
function buyer(s){
 const {host,alive,after,edge,ctx}=s;
 const box=card(host,'Obtener código','Introduce tu número de pedido. Identificaremos automáticamente su entrega autorizada.');
 const form=E('form','cc318-lookup');form.noValidate=true;
 const order=field(form,'Número de pedido',input('order_code','text',prefill));order.placeholder='ORD-526272';order.maxLength=19;order.autocomplete='off';order.spellcheck=false;order.required=true;
 const submit=E('button','cc166-primary','Obtener código');submit.type='submit';form.append(submit);const result=E('div','cc318-result');result.setAttribute('aria-live','polite');box.append(form,result);s.footer();
 let sequence=0,controller=null,timer=null;const clear=()=>{clearTimeout(timer);result.replaceChildren();};after(()=>{controller?.abort();clearTimeout(timer);});
 order.addEventListener('input',()=>{prefill=order.value;sequence++;controller?.abort();submit.disabled=false;submit.textContent='Obtener código';clear();});
 const show=text=>{clear();result.append(E('p','cc318-status',text));};
 function assist(code){const run=sequence,valid=()=>alive()&&run===sequence&&normalize(order.value)===code;const b=B('Solicitar asistencia',async()=>{if(!valid())return;b.disabled=true;try{const r=await ctx.api('rpc/cc_stream_delivery_assistance','POST',{p_order_code:code});if(!valid())return;if(r.status!=='REQUESTED')throw Error('No se puede solicitar asistencia para este pedido.');b.textContent='Solicitud enviada';result.append(E('p','cc318-status','El proveedor recibió tu solicitud en su panel.'));}catch(e){if(valid()){b.disabled=false;result.append(E('p','cc318-status',e.message||'No se pudo enviar la solicitud.'));}}});result.append(b);}
 function display(data,code){
  clear();const messages={DENIED:'No se puede consultar este pedido.',EXPIRED:'Tu pedido ha vencido. Ya no puedes solicitar códigos.',SUSPENDED:'Tu pedido está suspendido. La consulta está bloqueada.',CANCELLED:'Tu pedido está cancelado. La consulta está bloqueada.',NOT_STARTED:'La vigencia de tu pedido todavía no ha comenzado.',NOT_READY:'El proveedor todavía no ha habilitado la entrega de este pedido.',ASSISTANCE_REQUIRED:'La cuenta asignada necesita atención del proveedor. Puedes solicitar asistencia.',CONSUMED:'Esta compra se aplicó a una renovación. Consulta tu pedido original.',AUTHENTICATOR:'Esta cuenta requiere el procedimiento autorizado del titular. Solicita asistencia.',MANUAL:'Esta entrega requiere atención del proveedor.',MAIL_DISCONNECTED:'El proveedor debe reconectar su correo de entregas. Puedes solicitar asistencia.',NO_CODE:'Todavía no hay un código comercial autorizado disponible. Puedes volver a consultar.',RATE_LIMITED:'Has realizado varias consultas. Espera unos minutos y vuelve a intentarlo.'};
  if(data.status==='AVAILABLE'){
   if(typeof data.code!=='string'||!/[A-Za-z0-9]/.test(data.code)||data.code.length>128){show('No se pudo confirmar la entrega.');return;}
   const ttl=Math.min(Date.parse(data.expires_at)-Date.parse(data.server_time),300000);if(!Number.isFinite(ttl)||ttl<=0){show('La entrega ya caducó. Vuelve a consultar.');return;}
   const deadline=performance.now()+ttl;result.append(E('strong','cc318-success','Código disponible'));const value=E('output','cc318-code',data.code);value.setAttribute('aria-label','Código comercial autorizado');result.append(value);
   const copy=B('Copiar',async()=>{if(!alive()||performance.now()>=deadline){show('Por seguridad, vuelve a consultar el código.');return;}try{await navigator.clipboard.writeText(value.textContent);if(alive())copy.textContent='Copiado';}catch(_){if(alive())result.append(E('p','cc318-status','Mantén pulsado el código para copiarlo.'));}},true);result.append(copy);timer=setTimeout(()=>{if(alive())show('Por seguridad, vuelve a consultar el código.');},ttl);return;
  }
  result.append(E('p','cc318-status',messages[data.status]||'No se pudo confirmar la entrega. Vuelve a consultar.'));
  if(['AUTHENTICATOR','MANUAL','NO_CODE','MAIL_DISCONNECTED','ASSISTANCE_REQUIRED'].includes(data.status))assist(code);
 }
 form.addEventListener('submit',async e=>{e.preventDefault();const code=normalize(order.value);if(!code){show('Escribe un pedido válido, por ejemplo ORD-526272.');order.focus();return;}if(submit.disabled||!alive())return;
  order.value=code;prefill=code;const run=++sequence;controller?.abort();controller=new AbortController();const cancel=setTimeout(()=>controller.abort(),25000);after(()=>clearTimeout(cancel));
  clear();result.append(E('p','cc318-status','Consultando entrega autorizada…'));submit.disabled=true;submit.textContent='Consultando…';
  try{const data=await edge({action:'lookup',order_code:code},controller.signal);if(alive()&&run===sequence&&normalize(order.value)===code)display(data,code);}
  catch(error){if(alive()&&run===sequence)show(error.name==='AbortError'?'La consulta tardó demasiado. Puedes volver a intentarlo.':error.message);}
  finally{clearTimeout(cancel);if(alive()&&run===sequence){submit.disabled=false;submit.textContent='Obtener código';}}
 });
}
async function overview(s,target,render){target.textContent='Consultando tus datos…';try{const data=await s.rpc('overview');if(s.alive())render(data);}catch(e){if(s.alive()){target.replaceChildren(E('p','cc318-status','No se pudo consultar tu información.'),B('Volver a consultar',()=>void overview(s,target,render)));}}}
function supplier(s,requestsOnly=false){
 const {host,alive,rpc,ctx}=s;host.append(E('h2','cc318-title','Cuentas y entregas · STREAM BULL’S'));
 const tabs=E('nav','cc318-tabs');tabs.setAttribute('aria-label','Gestionar entregas');const body=E('div');host.append(tabs,body);let current=requestsOnly?'requests':tabChoice,data=null;
 function tabsView(){tabs.replaceChildren();for(const[id,label]of [['accounts','Mis cuentas y métodos'],['orders','Asignar pedidos'],['requests','Solicitudes pendientes']]){const b=B(label,()=>{current=id;tabChoice=id;paint();});b.setAttribute('aria-pressed',String(current===id));tabs.append(b);}}
 const refresh=()=>overview(s,body,d=>{data=d;paint();});
 async function save(form,action,payload){const b=form.querySelector('button[type=submit]'),status=form.querySelector('[role=status]');if(b.disabled||!alive())return;b.disabled=true;b.textContent='Guardando…';try{await rpc(action,payload);if(alive()&&form.isConnected){status.textContent='Guardado correctamente.';if(action!=='set_resource')void refresh();else{const code=form.elements.namedItem('code');if(code&&code.value.trim()===payload.code)code.value='';}}}catch(e){if(alive())status.textContent='No se guardó: '+String(e.message||'Vuelve a intentarlo.');}finally{if(alive()){b.disabled=false;b.textContent='Guardar';}}}
 function submit(form,fn){const b=E('button','cc166-primary','Guardar');b.type='submit';form.append(b);notice(form,'');form.addEventListener('submit',e=>{e.preventDefault();void fn();});}
 function consent(form){const label=E('label','cc318-check');const check=input('commercial_authorized','checkbox');check.required=true;label.append(check,E('span','','Confirmo que es una entrega comercial autorizada; no contiene contraseñas ni factores privados de autenticación.'));form.append(label);return check;}
 function paint(){if(!alive()||!data)return;tabsView();body.replaceChildren();
  if(current==='accounts'){
   const box=card(body,'Métodos de entrega por cuenta','Cada cuenta conserva su propia publicación, correo y método. Los cambios se aplican a sus pedidos asignados.');
   box.append(B('Gestionar inventario existente',()=>ctx.nav('business:STREAM_BULLS')));
   if(!data.accounts?.length){box.append(E('p','cc318-status','Registra primero una cuenta en el inventario de STREAM BULL’S.'));return;}
   const form=E('form','cc318-form');box.append(form);
   if(!data.accounts.some(a=>a.id===accountChoice))accountChoice=data.accounts[0].id;
   const choose=field(form,'Cuenta individual',select('account_id',data.accounts.map(a=>[a.id,a.service+' · '+a.code+' · '+(a.alias||'')]),accountChoice||data.accounts[0].id));
   accountChoice=choose.value;choose.onchange=()=>{accountChoice=choose.value;paint();};const account=data.accounts.find(a=>a.id===choose.value);
   const product=field(form,'Mi publicación',select('product_id',[['','Selecciona una publicación'],...(data.products||[]).map(p=>[p.id,p.service+' · '+p.title])],account.product_id||''));product.required=true;
   const method=field(form,'Método de entrega',select('method',methods,account.method||'MANUAL'));
   const mailWrap=E('div','cc318-mail-fields');form.append(mailWrap);const mail=field(mailWrap,'Mi correo conectado',select('connection_id',[['','Selecciona un buzón propio'],...(data.mailboxes||[]).filter(m=>m.status==='CONNECTED').map(m=>[m.id,m.email_address+' · '+(m.provider==='google'?'Gmail':'Outlook')])],account.connection_id||''));
   const sender=field(mailWrap,'Remitente comercial autorizado',input('authorized_sender','email',account.authorized_sender||''));sender.maxLength=320;
   const guide=E('details','cc318-guide');guide.append(E('summary','','Formato del correo comercial'));guide.append(E('p','','Solo se admite esta plantilla de entrega autorizada. Sustituye el ORD y el código comercial. La caducidad máxima es de 15 minutos.'));guide.append(E('pre','',`Asunto: CLAN CARTAN ENTREGA ORD-526272\n\nCLAN-CARTAN-DELIVERY/1\nOrder: ORD-526272\nAccount: ${account.code}\nPurpose: COMMERCIAL_DELIVERY\nCode: LICENSE-COMMERCIAL-EXAMPLE\nExpires: ${new Date(Date.now()+300000).toISOString()}`));mailWrap.append(guide);
   const toggle=()=>{mailWrap.hidden=method.value!=='AUTOMATIC';mail.required=sender.required=!mailWrap.hidden;};method.onchange=toggle;toggle();const approved=consent(form);
   submit(form,()=>save(form,'configure_account',{account_id:choose.value,product_id:product.value,method:method.value,connection_id:mail.value||null,authorized_sender:sender.value.trim(),commercial_authorized:approved.checked}));
  }else if(current==='orders'){
   const box=card(body,'Asignar una cuenta al pedido','El comprador solo introduce el ORD. Esta vinculación se configura aquí una vez. Reasignar conserva la vigencia y deja de utilizar la cuenta anterior.');
   const order=input('order_code','text',sellerOrder);order.placeholder='ORD-526272';order.required=true;order.maxLength=19;order.autocomplete='off';const id='cc318-own-orders';order.setAttribute('list',id);const list=E('datalist');list.id=id;for(const o of data.orders||[]){const option=E('option','',o.title);option.value=o.order_code;list.append(option);}box.append(list);
   const form=E('form','cc318-form');box.append(form);field(form,'Número de pedido de mi venta',order);order.onchange=()=>{sellerOrder=normalize(order.value)||order.value;};
   const account=field(form,'Cuenta configurada',select('account_id',[['','Selecciona una cuenta'],...(data.accounts||[]).filter(a=>a.method&&a.state==='ACTIVE').map(a=>[a.id,a.service+' · '+a.code+' · '+(a.alias||'')])]));account.required=true;
   submit(form,()=>{sellerOrder=normalize(order.value)||order.value;return save(form,'assign_order',{order_code:sellerOrder,account_id:account.value});});
   const own=(data.orders||[]).find(o=>o.order_code===normalize(sellerOrder));if(own)box.append(E('p','cc318-status','Estado: '+(own.lifecycle||'PENDING')+' · Vencimiento: '+date(own.valid_until)));
   const resource=card(body,'Entrega directa o manual','Solo licencias y códigos comerciales que tienes derecho a distribuir. Nunca introduzcas OTP, TOTP, códigos de recuperación ni contraseñas.');const rf=E('form','cc318-form');resource.append(rf);
   const ro=field(rf,'Número de pedido',input('order_code','text',sellerOrder));ro.required=true;ro.maxLength=19;const value=field(rf,'Código comercial autorizado',input('code'));value.required=true;value.minLength=8;value.maxLength=128;value.autocomplete='off';const approved=consent(rf);
   submit(rf,()=>save(rf,'set_resource',{order_code:normalize(ro.value)||ro.value,code:value.value.trim(),commercial_authorized:approved.checked}));
   const extra=E('details','cc318-guide');extra.append(E('summary','','Suspender, cancelar o confirmar una renovación'));body.append(extra);
   const sf=E('form','cc318-form');extra.append(sf);const so=field(sf,'Número de pedido',input('order_code','text',sellerOrder));so.required=true;const st=field(sf,'Estado de la consulta',select('state',[['ACTIVE','Activo'],['SUSPENDED','Suspendido'],['CANCELLED','Cancelado']]));submit(sf,()=>save(sf,'set_state',{order_code:normalize(so.value)||so.value,state:st.value}));
   const nf=E('form','cc318-form');extra.append(nf);const rootOrder=field(nf,'Pedido original',input('order_code','text',sellerOrder)),paid=field(nf,'Otro ORD pagado para esta renovación',input('renewal_order_code'));rootOrder.required=paid.required=true;nf.append(E('p','cc318-status','El servidor verificará comprador, publicación y pago. No se añaden días sin otra compra confirmada.'));submit(nf,()=>save(nf,'renew_order',{order_code:normalize(rootOrder.value)||rootOrder.value,renewal_order_code:normalize(paid.value)||paid.value}));
  }else{
   const box=card(body,'Solicitudes pendientes','Asistencia de compradores con pedidos vigentes. Las verificaciones del titular se atienden por su procedimiento oficial, sin divulgar factores privados.');
   const rows=data.requests||[];if(!rows.length)box.append(E('p','cc318-status','No tienes solicitudes pendientes.'));
   for(const r of rows){const row=E('article','cc318-request');row.append(E('strong','',r.order_code),E('p','',r.service+' · '+date(r.created_at)));const b=B('Marcar atendida',async()=>{b.disabled=true;try{await rpc('resolve_request',{order_code:r.order_code,request_id:r.id});if(alive())void refresh();}catch(e){if(alive()){b.disabled=false;row.append(E('p','cc318-status','No se pudo actualizar la solicitud.'));}}});row.append(b);box.append(row);}
  }
 }
 void refresh();s.footer();
}
function mailboxes(s){const {host,alive,after,rpc,edge}=s;const box=card(host,'Mis correos conectados','Conecta únicamente buzones exclusivos para entregas comerciales. No uses un buzón personal. La autorización se realiza directamente en Google o Microsoft, sin compartir contraseñas con CLAN CARTAN.');
 const label=E('label','cc318-check'),dedicated=input('dedicated_mailbox','checkbox');label.append(dedicated,E('span','','Confirmo que el buzón es exclusivo para entregas comerciales autorizadas.'));box.append(label);const guide=E('a','cc318-help','Cómo configurar Gmail y Outlook');guide.href='https://www.clancartan.com/correo-configuracion.html';guide.target='_blank';guide.rel='noopener noreferrer';box.append(guide);const privacy=E('a','','Privacidad de las conexiones de correo');privacy.href='https://www.clancartan.com/correo-privacidad.html';privacy.target='_blank';privacy.rel='noopener noreferrer';box.append(privacy);const actions=E('div','cc318-actions');box.append(actions);const status=notice(box,'Consultando disponibilidad de conexiones…'),list=E('div');box.append(list);let providers={},data=null;
 const load=async()=>{try{const c=await edge({action:'oauth_status'});if(!alive())return;data=c;providers=c.providers||{};paint();}catch(e){if(alive()){status.textContent='No se pudieron consultar las conexiones.';list.replaceChildren(B('Volver a consultar',()=>void load()));}}};
 const connect=async(provider,b)=>{if(!dedicated.checked){status.textContent='Confirma que usarás un buzón exclusivo de entregas.';dedicated.focus();return;}const popup=window.open('about:blank','cc318OAuth','popup,width=560,height=720');b.disabled=true;status.textContent='Preparando autorización oficial…';
  let message=null,poll=null;const finish=()=>{if(message)window.removeEventListener('message',message);clearInterval(poll);if(alive())b.disabled=false;};after(()=>{finish();try{popup?.close();}catch(_){}});
  try{const r=await edge({action:'oauth_start',provider,dedicated_mailbox:true});if(!alive()){popup?.close();return;}const url=new URL(r.authorization_url);if(url.protocol!=='https:'||!['accounts.google.com','login.microsoftonline.com'].includes(url.hostname))throw Error('Autorización no disponible.');
   message=event=>{if(event.origin!==new URL(s.ctx.root).origin||event.source!==popup||event.data?.type!=='cc318-mail-result')return;finish();if(alive()){status.textContent=event.data.ok?'Correo conectado.':'No se completó la autorización. Puedes volver a intentarlo.';void load();}};window.addEventListener('message',message);
   if(popup){popup.location.href=url.href;poll=setInterval(()=>{if(popup.closed){finish();if(alive())void load();}},1000);}else window.location.assign(url.href);
  }catch(e){finish();popup?.close();if(alive())status.textContent=e.message;}
 };
 function paint(){actions.replaceChildren();for(const [provider,caption]of [['google','Conectar Gmail'],['microsoft','Conectar Outlook']]){const b=B(caption,()=>void connect(provider,b),true);b.disabled=!data.can_connect||!providers[provider]?.configured;actions.append(b);}const missing=['google','microsoft'].filter(p=>!providers[p]?.configured);status.textContent=!data.can_connect?'Puedes revisar y desconectar tus propios buzones. Para conectar otro necesitas ser Súper reseller con membresía vigente.':missing.length?'ADMIN debe habilitar la autorización de '+missing.map(p=>p==='google'?'Google':'Microsoft').join(' y ')+'. Las conexiones no se simulan.':'Elige el proveedor para autorizar tu buzón de entregas.';
  list.replaceChildren();for(const m of data.mailboxes||[]){const row=E('article','cc318-request');row.append(E('strong','',m.email_address),E('p','',(m.provider==='google'?'Gmail':'Outlook')+' · '+({CONNECTED:'Conectado',REAUTH_REQUIRED:'Requiere volver a autorizar',DISCONNECTED:'Desconectado'}[m.status]||m.status)));if(m.status!=='DISCONNECTED'){const b=B('Desconectar',async()=>{if(!confirm('¿Desconectar este buzón? Sus cuentas dejarán de consultar automáticamente hasta reconectarlo.'))return;b.disabled=true;try{await edge({action:'oauth_disconnect',connection_id:m.id});if(alive())void load();}catch(e){if(alive()){b.disabled=false;status.textContent=e.message;}}});row.append(b);}list.append(row);}
  if(!(data.mailboxes||[]).length)list.append(E('p','cc318-status','Todavía no tienes correos conectados.'));
 }
 void load();s.footer();
}
function admin(s){const box=card(s.host,'Entregas y conexiones · Supervisión','Estados de pedidos y autorizaciones de correo. Los tokens, buzones completos y códigos de entrega no se muestran al administrador.');const guide=E('a','cc318-help','Configurar conexiones Gmail y Outlook');guide.href='https://www.clancartan.com/correo-configuracion.html';guide.target='_blank';guide.rel='noopener noreferrer';box.append(guide);const content=E('div');box.append(content);content.textContent='Consultando…';
 void s.rpc('admin_overview').then(data=>{if(!s.alive())return;content.replaceChildren();const connected=(data.connections||[]).filter(m=>m.status==='CONNECTED').length;content.append(E('p','cc318-status',connected+' correos conectados · '+(data.orders||[]).length+' pedidos consultados'));
 for(const o of data.orders||[]){const row=E('article','cc318-request');row.append(E('strong','',o.order_code),E('p','',o.service+' · '+o.lifecycle+' · '+date(o.valid_until)));content.append(row);}
 }).catch(()=>{if(s.alive())content.textContent='No se pudo consultar la supervisión.';});s.footer();}
window.cc318Render=(page,view,ctx)=>{if(!['codes','delivery','mailboxes','delivery-requests','delivery-admin'].includes(view))return false;const s=scope(page,ctx);if(view==='codes')buyer(s);else if(view==='mailboxes')mailboxes(s);else if(view==='delivery-admin'&&ctx.admin)admin(s);else if(ctx.super&&!ctx.admin){if(view==='mailboxes')mailboxes(s);else supplier(s,view==='delivery-requests');}else{s.host.append(E('p','cc318-status','Esta sección requiere permisos de proveedor.'));s.footer();}return true;};
function prefillOwner(){const uid=window.CC_V53_SESSION?.userId;if(owner!==uid){reset();owner=uid;}}
window.cc318PrefillCode=code=>{prefillOwner();prefill=normalize(code)||'';};window.cc318PrefillDelivery=code=>{prefillOwner();sellerOrder=normalize(code)||'';tabChoice='orders';};
function init(){if(new URL(location.href).searchParams.get('cc_codes')==='1'){window.cc318CodeIntent=true;if(window.cc318OpenCode)window.cc318OpenCode();else if(!window.CC_V53_SESSION?.jwt)window.cc77Auth?.(false);}
 new MutationObserver(()=>{if(root&&(!root.isConnected||root.closest('[hidden]'))){root.replaceChildren();cleanup();}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});document.addEventListener('cc192-session-ended',reset);document.dispatchEvent(new Event('cc318-ready'));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
