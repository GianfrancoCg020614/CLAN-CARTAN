/* V152: conciliación de solicitudes manuales y auditoría en el panel ADMIN.
 * Leer una solicitud NO acredita dinero. ADMIN coteja extracto real y confirma por separado.
*/
(function(){
'use strict';
const $=id=>document.getElementById(id),sess=()=>window.CC_V53_SESSION;
const admin=()=>!!(sess()?.jwt&&sess().isAdmin);
const money=x=>'S/ '+Number(x||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const node=(tag,txt)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);return e;};
let loading=false;
async function reload(){
 if(!admin()||loading||!$('cy152adminList'))return;
 loading=true;const host=$('cy152adminList');host.replaceChildren();
 host.append(node('p','Consultando operaciones…'));
 try{
  const rows=await window.cc80.api('rpc/cc_admin_manual_notification_queue','POST',{p_limit:50});
  if(!admin())return;
  host.replaceChildren();if(!Array.isArray(rows))throw Error('Respuesta de servidor inválida');
  const count=rows.reduce((o,r)=>(o[r.status]=(o[r.status]||0)+1,o),{PENDING:0,VERIFIED:0,REJECTED:0});
  $('cy152adminMetrics').textContent=count.PENDING+' pendientes · '+count.VERIFIED+' verificadas · '+count.REJECTED+' rechazadas (últimas '+rows.length+' solicitudes)';
  if(!rows.length){host.append(node('p','No hay solicitudes de recarga registradas.'));return;}
  for(const r of rows){
   const article=node('article');article.className='cc136entry';
   article.append(node('strong',money(r.amount_pen)+' · '+r.service+' · '+r.method));
   article.append(node('p','Estado: '+({PENDING:'Pendiente de verificación',VERIFIED:'Acreditada tras verificación',REJECTED:'Rechazada'}[r.status]||r.status)));
   article.append(node('small','Cuenta: '+r.recipient_email+' · N.º '+r.operation_number));
   article.append(node('small','Solicitud '+r.request_id+' · '+new Date(r.created_at).toLocaleString('es-PE')));
   if(r.status==='PENDING'){
    const btn=node('button','Preparar revisión sin acreditar');btn.type='button';
    btn.onclick=()=>{
     const credit=$('cc146admin');if(!credit){$('cy152adminStatus').textContent='Abre el área de acreditaciones de ADMIN.';return;}
     $('cc146email').value=r.recipient_email;
     $('cc146service').value=r.service;
     $('cc146provider').value=r.method==='BINANCE'?'BINANCE_PERSONAL':'LEMON_DALE_PERSONAL';
     $('cc146provider').dispatchEvent(new Event('change'));
     $('cc146tx').value=r.operation_number;
     $('cc146confirm').checked=false;
     $('cc146note').value=('Solicitud '+r.request_id+' · '+r.method+' · verificación externa pendiente').slice(0,200);
     if(r.method!=='BINANCE')$('cc146amount').value=r.amount_pen;
     else $('cc146amount').value=''; // La cantidad recibida en USDT NO es el importe solicitado en PEN.
     $('cc146amount').dispatchEvent(new Event('input'));
     $('cc146status').textContent='Verifica en la cuenta receptora el ingreso, importe y referencia. Para Binance ingresa los USDT y la tasa real. Ninguna captura acredita saldo.';
     credit.scrollIntoView({behavior:'smooth',block:'start'});
    };
    article.append(btn);
   }
   host.append(article);
  }
 }catch(e){host.replaceChildren(node('p','No se pudieron cargar solicitudes: '+String(e.message||e)));}
 finally{loading=false;}
}
function mount(){
 if(!admin()||$('cy152adminReconcile'))return;
 const report=$('cc143report');if(!report)return;
 const box=node('section');box.id='cy152adminReconcile';
 box.className='cy152-reconcile';
 const heading=node('h4','Conciliación de recargas manuales');
 const info=node('p','Los comprobantes son avisos del cliente, no dinero recibido. Solo ADMIN acredita una vez tras cotejar el ingreso externo.');
 const metrics=node('p','Cargando…');metrics.id='cy152adminMetrics';
 const buttons=node('div');buttons.className='cy152-actions';
 const refresh=node('button','↻ Actualizar solicitudes y auditoría');refresh.type='button';refresh.onclick=()=>{
  void reload();$('cc143reportRefresh')?.click();
 };
 const status=node('p');status.id='cy152adminStatus';status.setAttribute('role','status');
 buttons.append(refresh);box.append(heading,info,metrics,buttons,status);
 const list=node('div');list.id='cy152adminList';box.append(list);
 report.append(box);
 // Reutilizar el historial del cliente/ADMIN en lugar de agregar una segunda tabla.
 const manual=$('cc151operations');if(manual)report.append(manual);
 void reload();
}
function init(){
 mount();
 if(window.cc80?.open){
  const prior=window.cc80.open;
  if(!window.cy152AdminHook){window.cy152AdminHook=true;
   window.cc80.open=function(...args){const r=prior.apply(this,args);mount();return r;};}
 }
 document.addEventListener('click',e=>{if(e.target.closest?.('#cc143reportRefresh,#cc151reload'))void reload();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&admin())void reload();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();