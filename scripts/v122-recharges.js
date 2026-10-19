/* CLAN CARTAN V131 — SOLO recarga automática. Merchant Binance fiat PEN.
 * No exponer QR personales, numero DALE ni cuenta de tercero sin verificación.
 * La disponibilidad la determina el servidor; inhabilitado por defecto.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const EDGE='https://pqalxtrcyrpmwqdlibqd.supabase.co/functions/v1/cc-binance-create-order';
const availability={LEMON_DALE:false,BINANCE:false};
let busy=false, lastOrder=null;
function mount(){
 if($('cc122section'))return;
 const host=$('cc80wallet')||$('cc77home');
 if(!host)return;
 const root=document.createElement('section');root.id='cc122section';root.className='cc122-pay';
 root.innerHTML='<h3>Recarga automática · CLAN CARTAN</h3>'+
 '<p>Selecciona una billetera y un proveedor habilitado. No aceptamos comprobantes ni aprobación manual.</p>'+
 '<label for="cc122service">Billetera<select id="cc122service">'+
 '<option value="COBRA_YA">COBRA YA</option><option value="STREAM_BULLS">STREAM BULL’S</option></select></label>'+
 '<label for="cc122method">Medio de pago<select id="cc122method">'+
 '<option value="LEMON_DALE">Lemon / DALE · PEN</option>'+
 '<option value="BINANCE">Binance Pay Merchant · PEN convertido por Binance a USDT</option></select></label>'+
 '<label for="cc122amount">Monto a recargar (S/ PEN)<input id="cc122amount" type="number" min="1" max="10" step="0.01" value="1.00"></label>'+
 '<div id="cc122payinfo" class="cc122-info" role="status" aria-live="polite"></div>'+
 '<div id="cc123realBalances" role="status">Inicia sesión para consultar tu saldo real.</div>'+
 '<button id="cc123refreshReal" type="button">Actualizar saldos</button>'+
 '<button id="cc122create" type="button" disabled>Recarga automática temporalmente no disponible</button>'+
 '<p id="cc122status" role="status" aria-live="polite"></p>'+
 '<div id="cc131checkout"></div>'+
 '<small>El saldo solo aumenta cuando el proveedor confirma la transacción en el servidor. No envíes fondos a QR personales, números o direcciones que hayas visto anteriormente. Sin retiros, préstamos ni transferencias a terceros.</small>';
 host.appendChild(root);
 const session=()=>window.CC_V53_SESSION;
 const api=()=>{if(!window.cc80?.api)throw Error('API indisponible');return window.cc80.api;};
 const method=$('cc122method'),service=$('cc122service'),amount=$('cc122amount'),
 button=$('cc122create'),status=$('cc122status'),info=$('cc122payinfo'),checkout=$('cc131checkout');
 function render(){
  const current=method.value;
  const enabled=availability[current]===true && !busy;
  button.disabled=!enabled;
  button.textContent=busy?'Creando orden...':enabled?'Continuar a pago seguro':'Recarga automática temporalmente no disponible';
  checkout.replaceChildren();
  if(!enabled && !busy){
   info.textContent=current==='BINANCE'
     ?'Binance Merchant no está habilitado para crear órdenes verificables. No uses el QR personal.'
     :'Lemon / DALE todavía no dispone de confirmación automática autenticada. No transfieras dinero.';
   status.textContent='Este método aún no acepta fondos. No envíes fondos.';
  } else {
   info.textContent=current==='BINANCE'
     ?'Binance calculará el equivalente en USDT y presentará su checkout oficial. No pagues hasta obtener una orden única.'
     :'Medio de pago sujeto a integración oficial del proveedor.';
   status.textContent='';
  }
 }
 async function loadAvailability(){
  availability.LEMON_DALE=false;availability.BINANCE=false;
  if(!session()?.jwt){render();status.textContent='Inicia sesión para consultar disponibilidad.';return;}
  try{
   const rows=await api()('rpc/cc_auto_topup_method_status','POST',{});
   if(Array.isArray(rows)){
    // DALE permanece inactivo hasta disponer de endpoint autenticado propio.
    availability.BINANCE=rows.some(x=>x?.provider==='BINANCE' && x.enabled===true);
   }
  }catch{status.textContent='No se pudo comprobar si hay métodos automáticos activos.';}
  render();
 }
 window.cc130RefreshAutomaticTopups=loadAvailability;
 async function refreshBalances(){
  const el=$('cc123realBalances'),s=session();
  if(!s?.jwt){el.textContent='Inicia sesión para consultar saldos.';return;}
  const user=s.userId;el.textContent='Consultando saldos confirmados...';
  try{
   const rows=await api()('cc_real_service_wallets?select=service,balance_pen&user_id=eq.'+encodeURIComponent(user));
   if(session()?.userId!==user)return;
   const money=x=>'S/ '+Number(rows.find(r=>r.service===x)?.balance_pen||0).toFixed(2);
   el.textContent='Saldo real · COBRA YA '+money('COBRA_YA')+' · STREAM BULL’S '+money('STREAM_BULLS');
  }catch{el.textContent='No se pudo leer el saldo real.';}
 }
 window.cc123RefreshRealBalances=refreshBalances;
 $('cc123refreshReal').addEventListener('click',refreshBalances);
 method.addEventListener('change',render);
 service.addEventListener('change',()=>{lastOrder=null;checkout.replaceChildren();});
 amount.addEventListener('input',()=>{lastOrder=null;checkout.replaceChildren();});
 button.addEventListener('click',async()=>{
  if(busy||availability[method.value]!==true||method.value!=='BINANCE'){render();return;}
  const s=session();
  if(!s?.jwt){status.textContent='Tu sesión expiró. Vuelve a ingresar.';return;}
  const n=Number(amount.value);
  if(!Number.isFinite(n)||n<1||n>10||Math.abs(n*100-Math.round(n*100))>0.000001){
   status.textContent='Monto permitido durante el piloto: S/1.00 a S/10.00.';return;
  }
  busy=true;render();status.textContent='Solicitando orden verificada a Binance...';
  try{
   const response=await fetch(EDGE,{
    method:'POST',headers:{'Authorization':'Bearer '+s.jwt,'Content-Type':'application/json'},
    body:JSON.stringify({service:service.value,amountPen:n})
   });
   const data=await response.json();
   if(!response.ok||!data.checkoutUrl||!data.orderId)throw Error(data.error||'Orden no disponible');
   const url=new URL(data.checkoutUrl);
   if(url.protocol!=='https:'||!['pay.binance.com','app.binance.com'].includes(url.hostname))throw Error('Destino de checkout no permitido');
   lastOrder=data.orderId;
   status.textContent='Orden registrada: S/ '+n.toFixed(2)+' · Binance cobrará '+data.equivalentUsdt+' USDT. Tu saldo se acreditará únicamente tras confirmación automática.';
   checkout.replaceChildren();
   const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';
   link.textContent='Pagar con Binance Pay (orden verificada)';
   checkout.appendChild(link);
  }catch(e){status.textContent=e.message||'No se pudo crear la orden. No envíes fondos.';}
  finally{busy=false;button.disabled=availability[method.value]!==true;}
 });
 // Redirección desde ambos negocios a UNA recarga automática.
 document.addEventListener('click',event=>{
  const hit=event.target.closest?.('#cy113recharge,#cc114sbRecharge,#cy113topupGo,#cc113sbSend,#cc113centralSend');
  if(!hit)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  if(window.cc80?.open)window.cc80.open();
  if(hit.id==='cy113recharge')service.value='COBRA_YA';
  if(hit.id==='cc114sbRecharge')service.value='STREAM_BULLS';
  root.scrollIntoView({behavior:'smooth',block:'start'});
 },true);
 render();
 void loadAvailability();
 if(session()?.jwt)void refreshBalances();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session()?.jwt)void refreshBalances();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();