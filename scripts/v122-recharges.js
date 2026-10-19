/* CLAN CARTAN V131.2: RECARGAS AUTOMÁTICAS, UI basada en estados reales.
 * No se expone QR ni número personal hasta recibir instrucción firmada/verificada del proveedor.
 * No se acreditan fondos en el navegador, ni por nombre, monto o captura.
 */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const SUPABASE='https://pqalxtrcyrpmwqdlibqd.supabase.co';
const methods={LEMON_DALE:false,BINANCE:false};
const bins=new Set(['pay.binance.com','app.binance.com']);
const money=v=>'S/ '+Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const dates=v=>v?new Date(v).toLocaleString('es-PE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'—';
let creating=false,receipt=null,requestId=0;
const session=()=>window.CC_V53_SESSION;
function api(){if(!window.cc80?.api)throw Error('API de billetera no disponible');return window.cc80.api;}
function normalizeName(v){return String(v||'').trim().replace(/\s+/g,' ').slice(0,160);}
function render(){
 const method=el('cc122method').value;
 const enabled=methods[method]===true;
 const name=normalizeName(el('cc131payer').value);
 const amount=Number(el('cc122amount').value);
 const limit=method==='BINANCE'?10:1000;
 const validName=name.length>=5&&name.split(' ').length>=2&&!/[0-9<>]/.test(name);
 const validAmount=Number.isFinite(amount)&&amount>=1&&amount<=limit&&Math.abs(amount*100-Math.round(amount*100))<0.000001;
 const okay=enabled&&!creating&&validName&&validAmount&&Boolean(session()?.jwt);
 const button=el('cc122create');
 button.disabled=!okay;
 button.textContent=creating?'Preparando orden…':method==='LEMON_DALE'?'Continuar al QR':'Continuar a Binance Pay';
 const description=el('cc122payinfo');
 if(method==='LEMON_DALE'){
   description.textContent=enabled
    ?'Introduce el nombre de la cuenta desde la que pagarás. El QR y el plazo solo aparecen al crear una orden verificable.'
    :'Lemon/DALE aún no ofrece una confirmación de depósitos conectada a CLAN CARTAN. El QR y los envíos de dinero están desactivados.';
 }else{
   description.textContent=enabled
    ?'Binance Merchant mostrará el importe PEN y su equivalente USDT antes de confirmar.'
    :'Binance Pay Merchant sigue pendiente de habilitación. El QR personal no acredita recargas.';
 }
 const status=el('cc122status');
 if(!enabled)status.textContent='No envíes fondos: aún no podemos acreditar pagos automáticamente.';
 else if(!validName)status.textContent='Escribe nombres y apellidos completos del titular de la cuenta de pago.';
 else if(!validAmount)status.textContent='Ingresa un monto válido entre S/1 y S/'+limit+'.';
 else if(!session()?.jwt)status.textContent='Inicia sesión para recargar.';
 else if(!creating)status.textContent='Listo para crear una orden de pago verificada.';
}
function showReceipt(data) {
 const slot=el('cc131checkout');slot.replaceChildren();
 const title=document.createElement('strong');title.textContent='Orden generada · '+money(data.amountPen);
 slot.appendChild(title);
 const details=document.createElement('p');
 details.textContent='Referencia: '+data.merchantTradeNo+' · Vence: '+dates(data.expiresAt)+'. Espera la confirmación real del proveedor para que se acredite el saldo.';
 slot.appendChild(details);
 let dest;
 try{dest=new URL(data.checkoutUrl);}catch{throw Error('Enlace de pago inválido');}
 if(dest.protocol!=='https:'||!bins.has(dest.hostname))throw Error('Dominio de pago no permitido');
 const link=document.createElement('a');link.href=dest.href;link.target='_blank';link.rel='noopener noreferrer';
 link.className='cc131-pay-link';link.textContent='Abrir pago seguro en Binance';
 slot.appendChild(link);
 receipt=data.orderId;
}
async function loadMethods(){
 methods.LEMON_DALE=false;methods.BINANCE=false;
 if(!session()?.jwt){render();return;}
 try{
  const result=await api()('rpc/cc_auto_topup_method_status','POST',{});
  if(Array.isArray(result)){
   for(const row of result){
    if(Object.prototype.hasOwnProperty.call(methods,row.provider))methods[row.provider]=row.enabled===true;
   }
  }
 }catch{
  el('cc122status').textContent='No se pudo verificar la conexión con los proveedores.';
 }
 render();
}
async function loadBalances(){
 const box=el('cc123realBalances'),s=session();
 if(!s?.jwt){box.textContent='Saldo real: inicia sesión para consultar.';return;}
 const user=s.userId;box.textContent='Consultando saldos confirmados…';
 try{
  const rows=await api()('cc_real_service_wallets?select=service,balance_pen&user_id=eq.'+encodeURIComponent(user));
  if(session()?.userId!==user)return;
  const find=k=>money((Array.isArray(rows)?rows:[]).find(r=>r.service===k)?.balance_pen||0);
  box.textContent='COBRA YA '+find('COBRA_YA')+' · STREAM BULL’S '+find('STREAM_BULLS')+' (saldo real confirmado)';
 }catch{box.textContent='Saldos reales no disponibles.';}
}
async function loadHistory(){
 const target=el('cc131history'),s=session(),rid=++requestId;
 if(!s?.jwt){target.textContent='Inicia sesión para consultar tu historial.';return;}
 target.textContent='Consultando últimas recargas…';
 try{
  const url='cc_real_topup_orders?select=id,provider,service,amount_pen,status,created_at&user_id=eq.'+
   encodeURIComponent(s.userId)+'&order=created_at.desc&limit=8';
  const rows=await api()(url);
  if(rid!==requestId||session()?.userId!==s.userId)return;
  target.replaceChildren();
  if(!Array.isArray(rows)||!rows.length){target.textContent='Sin recargas reales anteriores.';return;}
  for(const row of rows){
   const item=document.createElement('div');item.className='cc131-history-row';
   const lhs=document.createElement('span');lhs.textContent=money(row.amount_pen)+' · '+row.service.replace('_',' ')+' · '+dates(row.created_at);
   const rhs=document.createElement('strong');rhs.textContent={
     CREDITED:'Acreditada',PENDING:'Pendiente',VERIFIED:'En verificación',EXPIRED:'Expirada',REJECTED:'Rechazada'
   }[row.status]||'En revisión';
   item.append(lhs,rhs);target.appendChild(item);
  }
 }catch{target.textContent='Historial no disponible por el momento.';}
}
async function createOrder(){
 if(creating||!methods[el('cc122method').value])return;
 const method=el('cc122method').value;
 const payerName=normalizeName(el('cc131payer').value);
 const amount=Number(el('cc122amount').value),service=el('cc122service').value;
 if(!payerName||!Number.isFinite(amount))return;
 const s=session();if(!s?.jwt){render();return;}
 if(method==='LEMON_DALE'){
  // Aún no existe API/webhook autenticado de depósitos recibidos en Lemon/DALE.
  // No presentar un QR personal ni crear solicitudes que aparenten garantía de cobro.
  el('cc122status').textContent='Lemon/DALE no admite recargas hasta conectar la conciliación verificada.';
  return;
 }
 creating=true;render();
 try{
  const response=await fetch(SUPABASE+'/functions/v1/cc-binance-create-order',{
   method:'POST',headers:{Authorization:'Bearer '+s.jwt,'Content-Type':'application/json'},
   body:JSON.stringify({service,amountPen:amount})
  });
  const data=await response.json();
  if(!response.ok||!data.orderId||!data.checkoutUrl)throw Error(data.error||'No se pudo generar la orden');
  showReceipt(data);
  el('cc122status').textContent='Orden pendiente. El saldo no se acreditará hasta confirmar el pago en Binance.';
  await loadHistory();
 }catch(e){el('cc122status').textContent='No fue posible generar el pago: '+String(e.message||e);}
 finally{creating=false;render();}
}
function mount(){
 if(el('cc122section'))return;
 const host=el('cc80wallet')||el('cc77home');if(!host)return;
 const root=document.createElement('section');
 root.id='cc122section';root.className='cc122-pay cc131-recharges';
 root.innerHTML=
 '<div class="cc131-heading"><span class="cc131-icon" aria-hidden="true">▦</span><div><h3>Recarga automática</h3>'+
 '<p>Recarga COBRA YA o STREAM BULL’S. Sin aprobación manual.</p></div></div>'+
 '<div id="cc123realBalances" class="cc131-balance">Saldo real: inicia sesión para consultar.</div>'+
 '<div class="cc131-instructions"><strong>Cómo funciona</strong><ol>'+
 '<li>Escribe el nombre completo que figura en tu cuenta de pago.</li>'+
 '<li>Indica el importe exacto de tu recarga.</li>'+
 '<li>Si el proveedor está conectado, selecciona «Continuar al QR».</li>'+
 '<li>La recarga se acredita únicamente tras verificar el depósito.</li>'+
 '</ol></div>'+
 '<div class="cc131-fields">'+
 '<label for="cc122service">Billetera<select id="cc122service"><option value="COBRA_YA">COBRA YA</option>'+
 '<option value="STREAM_BULLS">STREAM BULL’S</option></select></label>'+
 '<label for="cc122method">Forma de pago<select id="cc122method"><option value="LEMON_DALE">Lemon / DALE (PEN)</option>'+
 '<option value="BINANCE">Binance Pay Merchant (PEN)</option></select></label>'+
 '<label for="cc131payer">Nombre completo del depositante<input id="cc131payer" type="text" maxlength="160" autocomplete="name" placeholder="Nombres y apellidos tal como aparecen en tu cuenta"></label>'+
 '<small>El nombre ayuda a conciliar pagos, pero no demuestra que el depósito ocurrió.</small>'+
 '<label for="cc122amount">Monto a recargar (S/)<input id="cc122amount" type="number" inputmode="decimal" min="1" max="1000" step="0.01" placeholder="Ej. 15.00"></label>'+
 '</div>'+
 '<p id="cc122payinfo" class="cc131-provider-note"></p>'+
 '<div class="cc131-footer">'+
 '<button id="cc123refreshReal" type="button" class="cc131-secondary">↻ Actualizar saldo</button>'+
 '<button id="cc122create" type="button" disabled>Continuar al QR</button>'+
 '<button id="cc136goManual" type="button" class="cc131-secondary">Recarga manual</button></div>'+
 '<p id="cc122status" class="cc131-status" role="status" aria-live="polite"></p>'+
 '<div id="cc131checkout" class="cc131-checkout" role="status"></div>'+
 '<details class="cc131-historical"><summary>Mis solicitudes recientes</summary>'+
 '<div id="cc131history">Consulta tu historial al iniciar sesión.</div></details>'+
 '<small class="cc131-disclaimer">La recarga manual requiere revisión del ADMIN y cuenta comercial autorizada. Sin retiros ni transferencias entre usuarios. '+
 'Nunca pagues mediante QR personal mientras la confirmación automática no esté operativa.</small>';
 host.appendChild(root);
 const change=()=>{
  receipt=null;el('cc131checkout').replaceChildren();render();
 };
 el('cc122method').addEventListener('change',change);
 el('cc122service').addEventListener('change',change);
 el('cc122amount').addEventListener('input',change);
 el('cc131payer').addEventListener('input',change);
 el('cc122create').addEventListener('click',createOrder);
 el('cc136goManual').addEventListener('click',()=>window.cc136OpenManualRecharge?.(el('cc122service').value));
 el('cc123refreshReal').addEventListener('click',()=>{void loadBalances();void loadHistory();void loadMethods();});
 el('cc131history').closest('details').addEventListener('toggle',e=>{if(e.target.open)void loadHistory();});
 document.addEventListener('click',e=>{
  const target=e.target.closest?.('#cy113recharge,#cc114sbRecharge,#cy113topupGo,#cc113sbSend,#cc113centralSend');
  if(!target)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  if(window.cc80?.open)window.cc80.open();
  if(target.id==='cy113recharge')el('cc122service').value='COBRA_YA';
  if(target.id==='cc114sbRecharge')el('cc122service').value='STREAM_BULLS';
  root.scrollIntoView({behavior:'smooth',block:'start'});
 },true);
 window.cc130RefreshAutomaticTopups=loadMethods;
 window.cc123RefreshRealBalances=loadBalances;
 document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&session()?.jwt){void loadBalances();void loadHistory();void loadMethods();}
 });
 render();void loadMethods();void loadBalances();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();