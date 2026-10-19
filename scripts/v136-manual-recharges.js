/* CLAN CARTAN V136 · Solicitudes de recarga MANUAL REAL.
 * Nunca acreditamos a partir del formulario ni de comprobantes proporcionados por cliente.
 * SQL decide autorización del cobrador y ADMIN coteja la transacción con extracto bancario.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const walletServices={COBRA_YA:'COBRA YA',STREAM_BULLS:'STREAM BULL’S'};
const session=()=>window.CC_V53_SESSION;
const api=(path,body)=>{if(!window.cc80?.api)throw Error('Servicio de billetera no disponible');return window.cc80.api(path,'POST',body||{});};
const money=v=>'S/ '+Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=v=>new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'short',timeStyle:'short'}).format(new Date(v));
let readiness={enabled:false},saving=false,adminSaving=false;
function message(msg,id='cc136message'){const node=$(id);if(node)node.textContent=msg;}
function text(parent,tag,value,className){
 const n=document.createElement(tag);n.textContent=String(value??'');
 if(className)n.className=className;
 parent.appendChild(n);return n;
}
async function loadReadiness(){
 ensureAdmin();
 readiness={enabled:false};
 try{
  if(session()?.jwt){
   const rows=await api('rpc/cc_manual_recharge_public_status');
   if(Array.isArray(rows)&&rows.length)readiness=rows[0];
  }
 }catch(e){console.warn('Disponibilidad recarga manual:',e?.message);}
 renderReady();
}
function renderReady(){
 const pane=$('cc136recipient');if(!pane)return;
 pane.replaceChildren();
 if(!session()?.jwt){
  message('Inicia sesión para registrar una solicitud.');return;
 }
 if(!readiness.enabled){
  text(pane,'strong','Cuenta recaudadora Lemon pendiente de autorización');
  text(pane,'p',readiness.message||'No hagas transferencias hasta confirmar el método de recepción autorizado.');
  text(pane,'small','Puedes dejar preparada una solicitud, pero no equivale a un pago.');
  return;
 }
 text(pane,'strong','Cuenta recaudadora Lemon autorizada');
 text(pane,'p',readiness.destination);
 try{
  const uri=new URL(readiness.qr_url);
  if(uri.protocol==='https:'){
   const img=document.createElement('img');img.src=uri.href;img.alt='QR Lemon autorizado para recarga';
   img.className='cc136qr';img.referrerPolicy='no-referrer';pane.appendChild(img);
  }
 }catch{
  text(pane,'p','El QR no está disponible: contacta al administrador.');
 }
 text(pane,'small','Transfiere el importe exacto y conserva el identificador bancario. La solicitud no acredita saldo hasta revisión.');
}
async function submit(){
 if(saving||!session()?.jwt)return;
 const amount=Number($('cc136amount').value);
 const name=$('cc136name').value.trim().replace(/\s+/g,' ');
 const ref=$('cc136ref').value.trim();
 const service=$('cc136service').value;
 if(!walletServices[service]||!Number.isFinite(amount)||amount<1||amount>1000||Math.abs(amount*100-Math.round(amount*100))>0.001){
  message('Indica billetera y monto válido de S/1 a S/1000.');return;
 }
 if(name.length<5||!name.includes(' ')){message('Escribe nombres y apellidos del depositante.');return;}
 if(!readiness.enabled && !confirm('La cuenta Lemon comercial NO está habilitada. Se registrará únicamente una solicitud pendiente. NO envíes dinero. ¿Continuar?'))return;
 saving=true;$('cc136submit').disabled=true;
 try{
  const id=await api('rpc/cc_submit_manual_recharge',{
   p_service:service,p_amount:amount,p_payer_name:name,p_payer_reference:ref||null
  });
  if(!id)throw Error('No se obtuvo identificador de solicitud');
  message('Solicitud '+String(id).slice(0,8)+' registrada. '+(readiness.enabled
   ?'Si ya pagaste, espera la verificación del ADMIN.':'NO envíes dinero: aún no hay cuenta Lemon comercial habilitada.'));
  $('cc136ref').value='';
  await history();await adminList();
 }catch(e){message('No se pudo registrar: '+String(e.message||e));}
 finally{saving=false;$('cc136submit').disabled=false;}
}
async function history(){
 const host=$('cc136history'),s=session();if(!host)return;
 host.replaceChildren();
 if(!s?.jwt){text(host,'p','Inicia sesión para ver tus solicitudes.');return;}
 try{
  const url='cc_manual_recharge_requests?select=id,service,amount_pen,status,created_at,payer_reference&user_id=eq.'+
    encodeURIComponent(s.userId)+'&order=created_at.desc&limit=12';
  const rows=await window.cc80.api(url);
  if(session()?.userId!==s.userId)return;
  if(!rows?.length){text(host,'p','Sin solicitudes manuales registradas.');return;}
  for(const r of rows){
   const entry=document.createElement('div');entry.className='cc136entry';
   text(entry,'span',money(r.amount_pen)+' · '+walletServices[r.service]+' · '+date(r.created_at));
   text(entry,'strong',({PENDING:'Pendiente de verificación',APPROVED:'Acreditada',REJECTED:'Rechazada'}[r.status]||r.status));
   host.append(entry);
  }
 }catch(e){text(host,'p','Historial no disponible; actualiza para reintentar.');}
}
async function decide(row,approved,txField,bankField,flag){
 if(adminSaving||!session()?.isAdmin)return;
 const tx=txField?.value?.trim()||'',bank=bankField?.value?.trim()||'';
 if(approved && !readiness.enabled){message('No está habilitada la cuenta Lemon comercial. No se puede acreditar.', 'cc136adminStatus');return;}
 if(approved && (!flag.checked||tx.length<8)){message('Confirma el depósito REAL y registra referencia única (8 o más caracteres).','cc136adminStatus');return;}
 if(!confirm(approved?'¿Verificaste el ingreso en Lemon autorizado y confirmas acreditar '+money(row.amount_pen)+' una sola vez?':'¿Rechazar solicitud sin acreditar dinero?'))return;
 adminSaving=true;message('Procesando...', 'cc136adminStatus');
 try{
  const applied=await api('rpc/cc_admin_decide_manual_recharge',{
   p_request:row.request_id,p_approve:approved,p_bank_tx:approved?tx:null,
   p_bank:approved?bank:null,p_confirmed_received:approved?flag.checked:false
  });
  message(applied?'Solicitud '+(approved?'acreditada':'rechazada')+' correctamente.':'Solicitud ya procesada.', 'cc136adminStatus');
  await Promise.all([adminList(),history()]);
  if(typeof window.cc123RefreshRealBalances==='function')void window.cc123RefreshRealBalances();
  if(typeof window.cc132OpenMovements==='function'&&$('cc132movements')){
   const btn=$('cc132reload');if(btn)btn.click();
  }
 }catch(e){message('No se procesó: '+String(e.message||e),'cc136adminStatus');}
 finally{adminSaving=false;}
}
function ensureAdmin(){
 if(!session()?.isAdmin||$('cc136admin'))return;
 const sec=$('cc136manual');if(!sec)return;
 const admin=document.createElement('section');admin.id='cc136admin';admin.className='cc136manual cc132-movements';
 admin.innerHTML='<h3>ADMIN · Recargas pendientes</h3><p>Verifica el depósito en la cuenta comercial autorizada. '+
  'Las solicitudes no representan dinero recibido.</p><p id="cc136adminStatus" role="status"></p>'+
  '<div id="cc136adminList"></div><button id="cc136adminRefresh" type="button">↻ Actualizar solicitudes</button>';
 sec.after(admin);$('cc136adminRefresh').addEventListener('click',()=>void adminList());
}
async function adminList(){
 ensureAdmin();
 const host=$('cc136adminList');if(!host||!session()?.isAdmin)return;
 host.replaceChildren();
 try{
  const rows=await api('rpc/cc_admin_manual_recharge_queue');
  if(!Array.isArray(rows)||!rows.length){text(host,'p','No hay solicitudes pendientes.');return;}
  for(const row of rows){
   const card=document.createElement('div');card.className='cc136admin-card';
   text(card,'strong',money(row.amount_pen)+' · '+walletServices[row.service]);
   text(card,'small',row.payer_name+' · '+date(row.created_at));
   text(card,'small','Solicitud: '+row.request_id);
   if(row.payer_reference)text(card,'small','Referencia declarada (NO verificada): '+row.payer_reference);
   const fields=document.createElement('div');fields.className='cc136admin-fields';
   const tx=document.createElement('input');tx.placeholder='ID único del depósito verificado';tx.maxLength=120;tx.setAttribute('aria-label','Identificador bancario verificado');
   const bank=document.createElement('input');bank.placeholder='Banco de origen (opcional)';bank.maxLength=64;bank.setAttribute('aria-label','Banco emisor');
   fields.append(tx,bank);card.append(fields);
   const wrapper=document.createElement('label');wrapper.className='cc136verify-label';
   const flag=document.createElement('input');flag.type='checkbox';
   wrapper.append(flag,document.createTextNode(' Verifiqué el ingreso real en la cuenta recaudadora autorizada'));card.append(wrapper);
   const buttons=document.createElement('div');buttons.className='cc136actions';
   const approve=document.createElement('button');approve.type='button';
   approve.disabled=!readiness.enabled;approve.textContent='Aprobar y acreditar';
   approve.addEventListener('click',()=>void decide(row,true,tx,bank,flag));
   const reject=document.createElement('button');reject.type='button';reject.textContent='Rechazar';
   reject.addEventListener('click',()=>void decide(row,false,tx,bank,flag));
   buttons.append(approve,reject);card.append(buttons);host.append(card);
  }
 }catch(e){text(host,'p','No se pudo cargar la cola ADMIN: '+String(e.message||e));}
}
function mount(){
 if($('cc136manual'))return;
 const host=$('cc80wallet')||$('cc77home');if(!host)return;
 const sec=document.createElement('section');sec.id='cc136manual';sec.className='cc136manual cc132-movements';
 sec.innerHTML='<div class="cc136head"><h3>Recarga manual · Solicitud real</h3>'+
  '<p>Cuando la cuenta Lemon comercial esté autorizada, podrás pagar con su QR. La acreditación requiere revisión del ADMIN.</p></div>'+
  '<div id="cc136recipient" class="cc136recipient"></div>'+
  '<div class="cc136form"><label>Billetera<select id="cc136service"><option value="COBRA_YA">COBRA YA</option>'+
  '<option value="STREAM_BULLS">STREAM BULL’S</option></select></label>'+
  '<label>Monto (S/)<input id="cc136amount" type="number" min="1" max="1000" step="0.01" inputmode="decimal" value="5"></label>'+
  '<label>Nombre completo del depositante<input id="cc136name" maxlength="120" autocomplete="name" placeholder="Nombres y apellidos"></label>'+
  '<label>Referencia declarada (opcional)<input id="cc136ref" maxlength="120" placeholder="N.º de operación, si lo tienes"></label></div>'+
  '<div class="cc136actions"><button id="cc136submit" type="button">Registrar solicitud</button>'+
  '<button id="cc136reload" type="button">↻ Actualizar</button></div>'+
  '<p class="cc136warn">Nunca se acredita saldo con capturas, nombres ni números escritos por el cliente. '+
  'Si no aparece el QR comercial autorizado, no transfieras dinero.</p>'+
  '<p id="cc136message" role="status" aria-live="polite"></p>'+
  '<details><summary>Mis solicitudes manuales</summary><div id="cc136history"></div></details>';
 host.appendChild(sec);
 $('cc136submit').addEventListener('click',()=>void submit());
 $('cc136reload').addEventListener('click',()=>void Promise.all([loadReadiness(),history(),adminList()]));
 ensureAdmin();
 void loadReadiness().then(()=>{void history();void adminList();});
 window.cc136OpenManualRecharge=(service)=>{
  if(!session()?.jwt){if(window.cc77Auth)window.cc77Auth(false);return;}
  if(window.cc80?.open)window.cc80.open();
  if(walletServices[service])$('cc136service').value=service;
  sec.scrollIntoView({behavior:'smooth',block:'start'});
  void loadReadiness();void history();void adminList();
 };
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session()?.jwt){void loadReadiness();void history();void adminList();}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
else mount();
})();