/* CLAN CARTAN V142 · auditoría completa de cambios de saldo REAL (sin mezclar TEST).
 * No crea operaciones. Paginación por ID en servidor: consulta todo el historial nuevo.
 */
(function(){
'use strict';
const get=id=>document.getElementById(id);
const user=()=>window.CC_V53_SESSION?.userId||null;
const money=n=>'S/ '+Math.abs(Number(n||0)).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=t=>new Intl.DateTimeFormat('es-PE',{timeZone:'America/Lima',dateStyle:'short',timeStyle:'short'}).format(new Date(t));
const type={SUBSCRIPTION:'Suscripción',RENEWAL:'Renovación',BONUS:'Bono',BONUS_REVERSAL:'Reversión de bono',
 BONUS_REVERSAL_PENDING:'Reversión pendiente',PURCHASE:'Compra',REFUND:'Reembolso',
 DISCOUNT:'Descuento',TRANSFER:'Transferencia',RECHARGE:'Recarga',BALANCE_CHANGE:'Movimiento de saldo',
 ADJUSTMENT:'Ajuste'};
let entries=[],cursor=null,loadedUser=null,loading=false,finished=false,token=0;
function el(tag,cls,txt){const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x;}
function put(parent,tag,cls,txt){const x=el(tag,cls,txt);parent.appendChild(x);return x;}
function reset(){entries=[];cursor=null;finished=false;loadedUser=user();token++;render();}
function render(){
 const list=get('cc142list'),status=get('cc142status');if(!list)return;
 list.replaceChildren();
 if(loadedUser!==user()){entries=[];cursor=null;finished=false;loadedUser=user();}
 for(const row of entries){
  const article=put(list,'article','cc142-entry');
  const top=put(article,'div','cc142-top');
  put(top,'strong','',row.concept||type[row.event_type]||row.event_type);
  put(top,'time','',date(row.recorded_at));
  const financial=put(article,'div','cc142-amounts');
  const signed=(Number(row.amount_pen)<0?'- ':Number(row.amount_pen)>0?'+ ':'');
  put(financial,'b',Number(row.amount_pen)<0?'cc142-minus':'cc142-plus',
      row.affects_balance?signed+money(row.amount_pen):'Sin cambio de saldo');
  put(financial,'span','',type[row.event_type]||row.event_type);
  const balances=put(article,'div','cc142-balances');
  put(balances,'span','','Antes: '+money(row.balance_before));
  put(balances,'span','','Después: '+money(row.balance_after));
  put(article,'small','','Billetera: '+(row.service==='COBRA_YA'?'COBRA YA':"STREAM BULL’S")+
   ' · Estado: '+row.status+' · Ref: '+row.reference);
  if(row.related_payment_ref)put(article,'small','','Pago relacionado: '+row.related_payment_ref);
  if(row.original_reference)put(article,'small','','Operación original: '+row.original_reference);
  if(row.referred_user_id)put(article,'small','','Reseller referido (ID): '+row.referred_user_id);
  if(row.notional_amount_pen)put(article,'small','','Descuento / importe informativo: '+money(row.notional_amount_pen)+' (no acredita fondos)');
  if(row.reason)put(article,'small','','Motivo: '+row.reason);
 }
 if(!entries.length&&!loading)put(list,'p','cc142-empty',
  user()?'Aún no hay asientos en el nuevo historial auditado. Los registros anteriores siguen disponibles arriba.':'Ingresa a tu cuenta para consultar.');
 if(status)status.textContent=loading?'Consultando historial...':
  entries.length+' asientos cargados'+(finished?' · fin del historial':' · existen páginas anteriores');
 const more=get('cc142more'),refresh=get('cc142refresh'),exportButton=get('cc142csv');
 if(more){more.disabled=loading||finished||!user();more.hidden=!entries.length||finished;}
 if(refresh)refresh.disabled=loading||!user();
 if(exportButton)exportButton.disabled=!entries.length;
}
async function load(restart=false){
 if(loading||!user()||!window.cc80?.api)return;
 if(restart)reset();
 if(finished)return;
 const uid=user(),generation=++token;
 loading=true;render();
 try{
  const result=await window.cc80.api('rpc/cc_my_real_financial_audit','POST',
   {p_before_id:cursor,p_limit:40});
  if(uid!==user()||generation!==token)return;
  if(!Array.isArray(result))throw Error('Respuesta de auditoría inválida');
  entries.push(...result);
  if(result.length<40)finished=true;
  if(result.length)cursor=result[result.length-1].id;
 }catch(e){
  if(uid===user())get('cc142status').textContent='No se pudo leer auditoría: '+(e?.message||'error de conexión');
 }finally{loading=false;if(uid===user())render();}
}
function csvSafe(value){let v=String(value??'');if(/^\s*[=+@-]/.test(v))v="'"+v;return '"'+v.replaceAll('"','""')+'"';}
function exportCsv(){
 if(!entries.length)return;
 const rows=[['Fecha','Billetera','Concepto','Tipo','Monto PEN','Saldo anterior','Saldo posterior','Estado',
  'Referencia','Pago relacionado','Reseller referido','Descuento informativo','Motivo'],...entries.map(r=>[
  date(r.recorded_at),r.service,r.concept,r.event_type,Number(r.amount_pen).toFixed(2),
  Number(r.balance_before).toFixed(2),Number(r.balance_after).toFixed(2),r.status,r.reference,
  r.related_payment_ref,r.referred_user_id,r.notional_amount_pen,r.reason])];
 const csv='\ufeff'+rows.map(r=>r.map(csvSafe).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const link=el('a');link.href=url;link.download='CLAN-CARTAN-auditoria-'+new Date().toISOString().slice(0,10)+'.csv';
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function mount(){
 if(get('cc142financial'))return;
 const host=get('cc132movements')||get('cc80wallet');
 if(!host)return;
 const section=el('section','cc142-panel');section.id='cc142financial';
 const heading=put(section,'div','cc142-heading');
 put(heading,'h4','','Auditoría financiera · saldos antes y después');
 put(section,'p','cc142-intro','Registra cada cambio de saldo real desde V142. '+
 'El historial anterior permanece arriba. Aquí no se muestran operaciones de prueba ni se acredita dinero.');
 const bar=put(section,'div','cc142-bar');
 const refresh=put(bar,'button','','↻ Actualizar auditoría');refresh.type='button';refresh.id='cc142refresh';
 const csv=put(bar,'button','','Excel (cargados)');csv.type='button';csv.id='cc142csv';
 const list=put(section,'div','cc142-list');list.id='cc142list';
 const foot=put(section,'div','cc142-foot');
 const state=put(foot,'span','','');state.id='cc142status';state.setAttribute('role','status');
 const more=put(foot,'button','','Ver anteriores');more.type='button';more.id='cc142more';
 const note=put(section,'small','cc142-note','Incluye bonos, renovaciones, reembolsos, transferencias y descuentos informativos cuando se registren. '+
  'Sin facturas SUNAT. El detalle del origen de operaciones antiguas puede requerir conciliación.');
 host.appendChild(section);
 refresh.addEventListener('click',()=>void load(true));
 more.addEventListener('click',()=>void load(false));
 csv.addEventListener('click',exportCsv);
 loadedUser=user();render();if(user())void load(true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.cc142OpenAudit=()=>{mount();get('cc142financial')?.scrollIntoView({behavior:'smooth'});void load(true);};
})();
