/* CLAN CARTAN V132 · Movimientos reales verificados por RPC / RLS.
 * No acredita saldos, no simula compras, no lee movimientos de otros usuarios.
 * Exporta CSV compatible con Excel y abre impresión para Guardar como PDF.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
/* V135: devoluciones, resumen mensual, constancias individuales y filtro de movimientos. */
const types={RECHARGE:'Recarga',TRANSFER:'Transferencia',PURCHASE:'Compra',SUBSCRIPTION:'Suscripción',REFUND:'Reembolso'};
const statuses={CREDITED:'Acreditada',COMPLETED:'Liberado',PENDING:'Pendiente',
 EXPIRED:'Expirada',FAILED:'Fallida',REJECTED:'Rechazada',DISPUTED:'En disputa',VERIFIED:'Verificada'};
const services={COBRA_YA:'COBRA YA',STREAM_BULLS:'STREAM BULL’S'};
const fmt=n=>'S/ '+Math.abs(Number(n||0)).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const datetime=s=>{
 const d=new Date(s);
 return Number.isNaN(d.valueOf())?'—':new Intl.DateTimeFormat('es-PE',{
  timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'
 }).format(d);
};
let loadedRows=[],loadedUser=null,inFlight=null,generation=0,page=1,requested=false;
const currentUser=()=>window.CC_V53_SESSION?.userId;
const str=x=>String(x==null?'':x);
const period=x=>{const d=new Date(x);if(Number.isNaN(d.valueOf()))return '';const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit'}).formatToParts(d);const y=parts.find(p=>p.type==='year')?.value, m=parts.find(p=>p.type==='month')?.value;return y&&m?y+'-'+m:'';};
const signed=n=>(Number(n)<0?'-':'+')+fmt(n);
const permitted=x=>Object.prototype.hasOwnProperty.call(services,x);
function mine(){
 const s=window.CC_V53_SESSION;
 return s?.jwt&&s.userId?s:null;
}
function visibleRows(){
 const service=$('cc132service')?.value||'ALL';
 const input=($('cc132search')?.value||'').toLocaleLowerCase('es-PE').trim();
 const type=$('cc135type')?.value||'ALL';
 const month=$('cc135month')?.value||'';
 const filter=loadedRows.filter(r=>{
  if(service!=='ALL' && r.service!==service)return false;
  if(type!=='ALL' && r.movement_type!==type)return false;
  if(month && period(r.occurred_at)!==month)return false;
  if(!input)return true;
  const found=[r.movement_id,datetime(r.occurred_at),types[r.movement_type],
   r.amount_pen, statuses[r.status],r.provider,r.reference,r.description,services[r.service]]
   .map(str).join(' ').toLocaleLowerCase('es-PE');
  return found.includes(input);
 });
 return filter;
}
function summary(rows){
 // Totales de movimientos visibles, no del saldo de cuenta. Pendientes fuera de cálculo.
 let incoming=0,outgoing=0,returned=0,transfers=0,unsettled=0;
 for(const r of rows){
  if(!r.affects_balance){unsettled++;continue;}
  const n=Number(r.amount_pen)||0;
  if(r.movement_type==='RECHARGE')incoming+=n;
  else if(r.movement_type==='REFUND')returned+=n;
  else if(r.movement_type==='TRANSFER')transfers+=n;
  else if(r.movement_type==='PURCHASE'||r.movement_type==='SUBSCRIPTION')outgoing+=Math.abs(n);
 }
 return {incoming,outgoing,returned,transfers,unsettled,net:incoming-outgoing+returned+transfers};
}
function updateSummary(rows){
 const data=summary(rows);
 const values={'cc135in':data.incoming,'cc135out':data.outgoing,
  'cc135ref':data.returned,'cc135net':data.net};
 for(const [id,n] of Object.entries(values)){
  const e=$(id);if(e)e.textContent=(n<0?'- ':'')+fmt(n);
 }
 const note=$('cc135summaryNote');
 if(note)note.textContent='Resumen del filtro · '+rows.length+' movimientos (últimos 500 como máximo) · '+
   data.unsettled+' sin acreditar. No representa el saldo disponible.';
}
function render(){
 const target=$('cc132tbody'),state=$('cc132state'),total=$('cc132total'),pageInfo=$('cc132pageInfo');
 if(!target)return;
 if(loadedUser!==currentUser()){loadedRows=[];requested=false;}
 target.replaceChildren();
 const all=visibleRows();
 updateSummary(all);
 const per=Number($('cc132perpage')?.value)||20;
 page=Math.min(Math.max(1,page),Math.max(1,Math.ceil(all.length/per)));
 const view=all.slice((page-1)*per,page*per);
 total.textContent=all.length+' de '+loadedRows.length+' movimientos reales · PEN';
 pageInfo.textContent='Página '+page+' de '+Math.max(1,Math.ceil(all.length/per));
 $('cc132prev').disabled=page<=1;
 $('cc132next').disabled=page*per>=all.length;
 $('cc132pdf').disabled=all.length===0;
 $('cc132excel').disabled=all.length===0;
 if(!mine()){state.textContent='Inicia sesión para ver tus movimientos.';return;}
 if(!requested){state.textContent='Pulsa Actualizar para consultar tus movimientos reales.';return;}
 state.textContent=loadedRows.length>=500?'Mostrando los últimos 500 registros; filtra antes de exportar.':
  all.length?'Movimientos confirmados y solicitudes con su estado real.':'No hay movimientos reales en este filtro.';
 if(!view.length){
  const tr=document.createElement('tr'),td=document.createElement('td');
  td.colSpan=7;td.className='cc132-empty';td.textContent='Todavía no existen movimientos reales para mostrar.';
  tr.appendChild(td);target.appendChild(tr);return;
 }
 for(const r of view){
  const tr=document.createElement('tr');
  const amount=Number(r.amount_pen)||0;
  const date=document.createElement('td');date.textContent=datetime(r.occurred_at);
  const type=document.createElement('td');
  const kind=document.createElement('span');kind.className='cc132-chip';kind.textContent=types[r.movement_type]||'Movimiento';
  type.appendChild(kind);
  const value=document.createElement('td');
  value.className=r.affects_balance?(amount>=0?'cc132-positive':'cc132-negative'):'cc132-unconfirmed';
  value.textContent=(r.affects_balance&&amount<0?'- ':r.affects_balance?'+ ':'Previsto ')+fmt(amount);
  const status=document.createElement('td');
  const pill=document.createElement('span');
  pill.className='cc132-pill cc132-'+(r.status==='CREDITED'||r.status==='COMPLETED'?'ok':
   r.status==='PENDING'||r.status==='VERIFIED'?'pending':'stopped');
  pill.textContent=statuses[r.status]||r.status;
  status.appendChild(pill);
  const business=document.createElement('td');business.textContent=services[r.service]||'—';
  const desc=document.createElement('td');
  desc.textContent=str(r.description||'Movimiento de billetera');
  if(r.reference){
   const small=document.createElement('small');small.textContent='Ref: '+str(r.reference);desc.appendChild(small);
  }
  const actions=document.createElement('td');
  const ticket=document.createElement('button');ticket.type='button';
  ticket.className='cc135-ticket';ticket.textContent='Ver';
  ticket.setAttribute('aria-label','Ver detalle de operación '+str(r.reference||r.movement_id));
  ticket.addEventListener('click',()=>printReceipt(r));
  actions.append(ticket);
  tr.append(date,type,value,status,business,desc,actions);
  target.appendChild(tr);
 }
}
async function reload(){
 const ses=mine(),state=$('cc132state');
 if(!ses){requested=false;loadedRows=[];loadedUser=null;render();return;}
 if(inFlight)return inFlight;
 const uid=ses.userId,request=++generation;
 state.textContent='Consultando movimientos reales...';
 $('cc132reload').disabled=true;
 inFlight=(async()=>{
  try{
   if(!window.cc80?.api)throw Error('Sesión sin API de billeteras');
   const rows=await window.cc80.api('rpc/cc_my_real_wallet_movements','POST',{p_service:null,p_limit:500});
   if(request!==generation||currentUser()!==uid)return;
   if(!Array.isArray(rows))throw Error('Formato de historial inválido');
   loadedRows=rows.filter(r=>permitted(r.service));
   loadedUser=uid;requested=true;page=1;render();
  }catch(e){
   if(request!==generation||currentUser()!==uid)return;
   loadedRows=[];requested=true;render();
   state.textContent='No se pudo consultar el historial. Prueba Actualizar.';
   console.warn('Movimientos no disponibles:',e?.message||e);
  }
 })().finally(()=>{inFlight=null;const b=$('cc132reload');if(b)b.disabled=false;});
 return inFlight;
}
function csvValue(value){
 let s=str(value);
 if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s; // Evita inyección de fórmulas en Excel.
 return '"'+s.replaceAll('"','""')+'"';
}
function exportCsv(){
 const all=visibleRows();if(!all.length)return;
 const headers=['Fecha','Billetera','Tipo','Monto PEN','Impacta saldo','Estado','Proveedor','Referencia','Descripción'];
 const entries=all.map(r=>[
  datetime(r.occurred_at),services[r.service]||'',
  types[r.movement_type]||r.movement_type,
  Number(r.amount_pen).toFixed(2),r.affects_balance?'Sí':'No',
  statuses[r.status]||r.status,r.provider,r.reference,r.description
 ]);
 const csv='\ufeff'+[headers,...entries].map(line=>line.map(csvValue).join(';')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
 const uri=URL.createObjectURL(blob),anchor=document.createElement('a');
 anchor.href=uri;anchor.download='CLAN-CARTAN-movimientos-'+new Date().toISOString().slice(0,10)+'.csv';
 document.body.appendChild(anchor);anchor.click();anchor.remove();
 setTimeout(()=>URL.revokeObjectURL(uri),3000);
}
function printReceipt(r){
 if(!r||!loadedRows.includes(r)||loadedUser!==currentUser()||!mine())return;
 const prev=document.querySelector('.cc132-print-sheet');if(prev)prev.remove();
 const sheet=document.createElement('div');sheet.className='cc132-print-sheet';
 const h=document.createElement('h1');h.textContent='CLAN CARTAN E.I.R.L. · Constancia de movimiento';
 const label=document.createElement('p');
 label.textContent='Registro interno de billetera. No es comprobante de pago tributario ni comprobante bancario.';
 const tbl=document.createElement('table'),body=document.createElement('tbody');
 const pairs=[['Movimiento',types[r.movement_type]||r.movement_type],
  ['Billetera',services[r.service]],['Fecha (Perú)',datetime(r.occurred_at)],
  ['Importe en soles',r.affects_balance?signed(r.amount_pen):'No acreditado · '+fmt(r.amount_pen)],
  ['Estado',statuses[r.status]||str(r.status)],
  ['Referencia',str(r.reference||r.movement_id)],
  ['Detalle',str(r.description||'—')]];
 for(const [k,v] of pairs){
  const tr=document.createElement('tr'),th=document.createElement('th'),td=document.createElement('td');
  th.textContent=k;td.textContent=str(v);tr.append(th,td);body.appendChild(tr);
 }
 tbl.appendChild(body);sheet.append(h,label,tbl);document.body.appendChild(sheet);
 const cleanup=()=>{sheet.remove();window.removeEventListener('afterprint',cleanup);};
 window.addEventListener('afterprint',cleanup,{once:true});
 try{window.print();}catch{cleanup();}
 setTimeout(cleanup,15000);
}
function exportPdf(){
 const all=visibleRows();if(!all.length)return;
 const old=document.querySelector('.cc132-print-sheet');if(old)old.remove();
 const print=document.createElement('div');print.className='cc132-print-sheet';
 const title=document.createElement('h1');title.textContent='CLAN CARTAN E.I.R.L. · Movimientos reales';
 const note=document.createElement('p');note.textContent='Emitido: '+datetime(new Date().toISOString())+
  ' · Registro de la billetera del usuario autenticado · Moneda PEN';
 const table=document.createElement('table');const head=document.createElement('thead'),hr=document.createElement('tr');
 for(const name of ['Fecha','Billetera','Tipo','Monto','Estado','Descripción']){
  const cell=document.createElement('th');cell.textContent=name;hr.appendChild(cell);
 }
 head.appendChild(hr);table.appendChild(head);
 const body=document.createElement('tbody');
 for(const r of all){
  const tr=document.createElement('tr');
  for(const txt of [
   datetime(r.occurred_at),services[r.service],
   types[r.movement_type]||r.movement_type,
   (r.affects_balance?(r.amount_pen<0?'- ':'+ '):'Previsto ')+fmt(r.amount_pen),
   statuses[r.status]||r.status,str(r.description)+' / '+str(r.reference)
  ]){
   const td=document.createElement('td');td.textContent=str(txt);tr.appendChild(td);
  }
  body.appendChild(tr);
 }
 table.appendChild(body);
 print.append(title,note,table);document.body.appendChild(print);
 const cleanup=()=>{print.remove();window.removeEventListener('afterprint',cleanup);};
 window.addEventListener('afterprint',cleanup,{once:true});
 try{window.print();}catch{cleanup();}
 // Respaldo por si el navegador no dispara afterprint al cancelar.
 setTimeout(cleanup,15000);
}
function mount(){
 if($('cc132movements'))return;
 const host=$('cc80wallet')||$('cc77home');
 if(!host)return;
 const sec=document.createElement('section');sec.id='cc132movements';sec.className='cc132-movements';
 sec.innerHTML=
 '<div class="cc132-head"><div><span class="cc132-label">CLAN CARTAN · HISTORIAL VERIFICADO</span>'+
 '<h3>Movimientos</h3><p>Recargas, reembolsos, transferencias y gastos de tus billeteras reales.</p></div>'+
 '<div class="cc132-exports"><button id="cc132pdf" type="button">PDF</button>'+
 '<button id="cc132excel" type="button">Excel (CSV)</button></div></div>'+
 '<div class="cc135-summary" aria-label="Resumen de movimientos filtrados">'+
 '<div><small>Recargas</small><strong id="cc135in">S/ 0.00</strong></div>'+
 '<div><small>Compras y suscripciones</small><strong id="cc135out">S/ 0.00</strong></div>'+
 '<div><small>Reembolsos</small><strong id="cc135ref">S/ 0.00</strong></div>'+
 '<div><small>Neto de movimientos</small><strong id="cc135net">S/ 0.00</strong></div></div>'+
 '<p id="cc135summaryNote" class="cc135-sum-note">Resumen del historial cargado; no es el saldo disponible.</p>'+
 '<div class="cc132-tools"><label>Buscar movimientos<input id="cc132search" type="search" placeholder="Fecha, importe, descripción o referencia"></label>'+
 '<label>Billetera<select id="cc132service"><option value="ALL">Ambas billeteras</option><option value="COBRA_YA">COBRA YA</option>'+
 '<option value="STREAM_BULLS">STREAM BULL’S</option></select></label>'+
 '<label>Tipo<select id="cc135type"><option value="ALL">Todos</option>'+
 '<option value="RECHARGE">Recargas</option><option value="PURCHASE">Compras</option>'+
 '<option value="SUBSCRIPTION">Suscripciones</option><option value="REFUND">Reembolsos</option>'+
 '<option value="TRANSFER">Transferencias</option></select></label>'+
 '<label>Mes<input id="cc135month" type="month" aria-label="Filtrar por mes"></label>'+
 '<label>Por página<select id="cc132perpage"><option value="10">10</option><option value="20" selected>20</option>'+
 '<option value="50">50</option></select></label><button id="cc132reload" type="button">↻ Actualizar</button></div>'+
 '<p class="cc132-total" id="cc132total"></p>'+
 '<div class="cc132-table-wrap"><table class="cc132-table"><thead><tr><th>Fecha</th><th>Tipo</th>'+
 '<th>Monto</th><th>Estado</th><th>Billetera</th><th>Descripción / Operación</th><th>Detalle</th></tr></thead>'+
 '<tbody id="cc132tbody"></tbody></table></div>'+
 '<div class="cc132-bottom"><span id="cc132state" role="status" aria-live="polite"></span>'+
 '<div class="cc132-pages"><button id="cc132prev" type="button">Anterior</button><span id="cc132pageInfo"></span>'+
 '<button id="cc132next" type="button">Siguiente</button></div></div>'+
 '<small class="cc132-note">Solo movimientos reales. Los depósitos pendientes no aumentan el saldo. '+
 'Las compras y suscripciones de prueba se mantienen separadas. El banco emisor solo aparece si fue verificado por el proveedor. '+
 'Los reembolsos son saldo interno, no retiros. Ver genera una constancia interna, no una factura SUNAT. '+
 'PDF abre impresión del navegador; Excel descarga CSV compatible.</small>';
 host.appendChild(sec);
 const balance=$('cc123realBalances');
 if(balance){
  const b=document.createElement('button');b.type='button';b.id='cc132jump';b.textContent='Ver movimientos';
  b.className='cc131-secondary';
  balance.after(b);
  b.addEventListener('click',()=>open());
 }
 $('cc132search').addEventListener('input',()=>{page=1;render()});
 $('cc132service').addEventListener('change',()=>{page=1;render()});
 $('cc135type').addEventListener('change',()=>{page=1;render()});
 $('cc135month').addEventListener('change',()=>{page=1;render()});
 $('cc132perpage').addEventListener('change',()=>{page=1;render()});
 $('cc132prev').addEventListener('click',()=>{if(page>1){page--;render()}});
 $('cc132next').addEventListener('click',()=>{page++;render()});
 $('cc132reload').addEventListener('click',()=>void reload());
 $('cc132excel').addEventListener('click',exportCsv);
 $('cc132pdf').addEventListener('click',exportPdf);
 window.cc132OpenMovements=open;
 render();
 if(mine())void reload();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mine())void reload()});
}
function open(service){
 if(!mine()){if(typeof window.cc77Auth==='function')window.cc77Auth(false);return;}
 if(window.cc80?.open)window.cc80.open();
 if(!$('cc132movements'))mount();
 if(!$('cc132movements'))return;
 $('cc132service').value=permitted(service)?service:'ALL';
 if(loadedUser!==currentUser()){loadedRows=[];requested=false;}
 page=1;render();
 $('cc132movements').scrollIntoView({behavior:'smooth',block:'start'});
 void reload();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
else mount();
})();