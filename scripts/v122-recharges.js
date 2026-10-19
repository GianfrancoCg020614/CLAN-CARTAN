/* CLAN CARTAN V124. DALE recibe PEN, Binance Pay USDT.
 * Equivalencia PEN tomada exclusivamente del servidor, nunca del navegador.
 * Las solicitudes NO acreditan automáticamente pagos no verificados.
 */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const binanceUrl='https://app.binance.com/uni-qr/812BvNys';
const phone='923319637';
const fmt=(num,currency)=>new Intl.NumberFormat('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(num))+' '+currency;
let creating=false,quote=null,quoteReq=0;
function mount(){
 if(el('cc122section'))return;
 const host=el('cc80wallet')||el('cc77home');
 if(!host)return;
 const box=document.createElement('section');
 box.id='cc122section';box.className='cc122-pay';
 box.innerHTML=
 '<h3>Recarga automática · Lemon/DALE o Binance Pay</h3>'+
 '<p>Elige billetera y medio de pago. Solo se aceptan recargas con confirmación automática del proveedor; no hay comprobantes ni aprobación manual.</p>'+
 '<label>Billetera<select id="cc122service"><option value="COBRA_YA">COBRA YA</option><option value="STREAM_BULLS">STREAM BULL’S</option></select></label>'+
 '<label>Medio de pago<select id="cc122method"><option value="LEMON_DALE">Lemon / DALE · soles (PEN)</option><option value="BINANCE">Binance Pay · USDT (internacional)</option></select></label>'+
 '<label id="cc124amountLabel" for="cc122amount">Importe a pagar (PEN)</label>'+
 '<input id="cc122amount" type="number" min="1" max="1000" step="0.01" value="20" inputmode="decimal">'+
 '<div id="cc124quote" class="cc122-info" role="status" aria-live="polite"></div>'+
 '<div id="cc122payinfo" class="cc122-info"></div>'+
 '<div id="cc123realBalances" role="status">Saldo real: inicia sesión para consultar.</div>'+
 '<button id="cc123refreshReal" type="button">Actualizar saldo real</button>'+
 '<button id="cc122create" type="button" disabled>Recargas automáticas temporalmente no disponibles</button>'+
 '<p id="cc122status" role="status" aria-live="polite"></p>'+
 '<small>Solo se acreditará una operación tras verificación independiente del pago, importe, destinatario y referencia. Una captura o el botón de recarga no confirman ningún cobro. No se permiten retiros, pagos de préstamos ni transferencias entre personas.</small>';
 host.appendChild(box);
 const method=el('cc122method'),service=el('cc122service'),amount=el('cc122amount'),info=el('cc122payinfo'),status=el('cc122status'),quotation=el('cc124quote'),button=el('cc122create'),amountLabel=el('cc124amountLabel');
 function session(){return window.CC_V53_SESSION;}
 const availability={LEMON_DALE:false,BINANCE:false};
 async function loadAvailability(){
  if(!session()?.jwt){button.disabled=true;status.textContent='Inicia sesión para consultar métodos automáticos.';return;}
  try{
   const rows=await api()('rpc/cc_auto_topup_method_status','POST',{});
   for(const row of (Array.isArray(rows)?rows:[]))if(Object.hasOwn(availability,row.provider))availability[row.provider]=row.enabled===true;
  }catch(e){status.textContent='No se pudo comprobar la disponibilidad de recargas automáticas.';}
  renderAvailability();
 }
 function renderAvailability(){
  const enabled=availability[method.value]===true;
  button.disabled=!enabled;
  button.textContent=enabled?'Iniciar recarga automática':'Recarga automática temporalmente no disponible';
  if(!enabled)status.textContent='Este método está pendiente de conexión de confirmación automática. No envíes fondos; no hay acreditación inmediata disponible.';
 }
 window.cc130RefreshAutomaticTopups=loadAvailability;
 function api(){if(!window.cc80?.api)throw Error('API de billeteras no disponible');return window.cc80.api;}
 async function refreshBalances(){
  const slot=el('cc123realBalances'),ses=session();
  if(!ses?.jwt){slot.textContent='Saldo real: inicia sesión para consultar.';return;}
  const uid=ses.userId;slot.textContent='Consultando saldos reales…';
  try{
   const rows=await api()('cc_real_service_wallets?select=service,balance_pen&user_id=eq.'+encodeURIComponent(uid));
   if(session()?.userId!==uid)return;
   const money=service=>'S/ '+Number(rows.find(x=>x.service===service)?.balance_pen||0).toFixed(2);
   slot.textContent='Saldo real confirmado · COBRA YA '+money('COBRA_YA')+' · STREAM BULL’S '+money('STREAM_BULLS');
  }catch(e){slot.textContent='No se pudo consultar el saldo real: '+(e.message||e);}
 }
 el('cc123refreshReal').onclick=refreshBalances;
 window.cc123RefreshRealBalances=refreshBalances;
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&session()?.jwt)void refreshBalances();});
 if(session()?.jwt)void refreshBalances();

 function preview(){
  if(method.value!=='BINANCE')return;
  if(!quote||new Date(quote.valid_until).getTime()<=Date.now()+15000){
   quotation.textContent='Binance pausado: no hay cotización USDT/PEN vigente. No transfieras USDT hasta que esté disponible.';
   return;
  }
  const n=Number(amount.value);
  if(!Number.isFinite(n)||n<0.5||Math.abs(Math.round(n*100)-n*100)>0.000001){
   quotation.textContent='Introduce un importe USDT válido, con hasta dos decimales.';
   return;
  }
  if(n>Number(quote.available_usdt)){
   quotation.textContent='Monto superior a la liquidez verificada para esta tasa (máximo '+fmt(quote.available_usdt,'USDT')+').';
   return;
  }
  const equivalent=Math.round(n*Number(quote.rate_pen_per_usdt)*100)/100;
  const rate=Number(quote.rate_pen_per_usdt).toFixed(6);
  const gross=Number(quote.market_rate_pen_per_usdt).toFixed(6);
  quotation.textContent='Referencia de venta USDT/PEN: S/ '+gross+' por USDT · Costo estimado: '+
  Number(quote.conversion_cost_pct).toFixed(2)+'% · Margen comercial de protección: '+
  Number(quote.protection_margin_pct).toFixed(2)+'% · Tasa neta ofrecida: S/ '+rate+
  ' por USDT · '+fmt(n,'USDT')+' = S/ '+equivalent.toFixed(2)+
  ' de saldo previsto · Fuente: '+quote.source+
  ' · Vence '+new Date(quote.valid_until).toLocaleTimeString('es-PE')+
  '. La tasa y monto finales se bloquearán al generar la solicitud, si sigue vigente.';
 }
 async function loadQuote(){
  const serial=++quoteReq;quote=null;
  if(method.value!=='BINANCE')return;
  if(!session()?.jwt){quotation.textContent='Inicia sesión para consultar la tasa USDT/PEN verificada.';return;}
  quotation.textContent='Consultando tasa USDT/PEN…';
  try{
   const rows=await api()('rpc/cc_current_usdt_pen_quote_v125','POST',{});
   if(serial!==quoteReq||method.value!=='BINANCE')return;
   const latest=Array.isArray(rows)?rows[0]:null;
   if(!latest||!Number.isFinite(Number(latest.rate_pen_per_usdt))||!Number.isFinite(Number(latest.market_rate_pen_per_usdt))||!Number.isFinite(Number(latest.available_usdt)))throw Error('No existe cotización de venta reciente y ejecutable configurada en el servidor.');
   quote=latest;
   preview();
  }catch(e){if(serial===quoteReq)quotation.textContent='Cotización no disponible: '+(e.message||e)+'. No pagues todavía.';}
 }
 function renderMethod(){
  status.textContent='';
  ++quoteReq;quote=null;
  renderAvailability();
  const binance=method.value==='BINANCE';
  amountLabel.textContent=binance?'Importe a pagar (USDT)':'Importe a pagar (PEN, soles)';
  amount.min=binance?'0.5':'1';amount.max=binance?'1000':'1000';amount.step='0.01';amount.value=binance?'10':'20';
  if(binance){
   info.replaceChildren();
   const title=document.createElement('strong');title.textContent='Binance Pay · USDT';info.appendChild(title);
   const descr=document.createElement('p');descr.textContent='Pago internacional en USDT. Usuario receptor: User-f81cdb6a. Comprueba el destinatario.';
   info.appendChild(descr);
   const caution=document.createElement('p');
   caution.textContent='Crea primero una orden con cotización válida. No transfieras fondos sin conocer el importe exacto en USDT, el saldo en PEN y la vigencia. Los pagos por QR personal aún requieren conciliación independiente y no se acreditan automáticamente.';
   info.appendChild(caution);
   void loadQuote();
  }else{
   quotation.textContent='Soles (PEN) · S/ 1 pagado equivale a S/ 1 de recarga, siempre que el importe íntegro sea recibido y confirmado.';
   info.innerHTML='<strong>Lemon / DALE · Soles</strong><p>Número DALE: <a href="tel:'+phone+'">'+phone+'</a>. Confirma el titular en tu aplicación antes de pagar.</p>'+
   '<button type="button" id="cc122copyPhone">Copiar número DALE</button>';
  }
 }
 method.addEventListener('change',renderMethod);
 amount.addEventListener('input',preview);
 info.addEventListener('click',e=>{
  if(e.target?.id==='cc122copyPhone'){
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(phone).then(()=>status.textContent='Número DALE copiado.').catch(()=>status.textContent='DALE: '+phone);
   else status.textContent='DALE: '+phone;
  }
 });
 renderMethod();
 void loadAvailability();
 if(window.CC_V53_SESSION?.isAdmin){
  const adminPanel=document.createElement('details');
  adminPanel.className='cc125-admin';
  adminPanel.innerHTML='<summary>ADMIN · Publicar cotización USDT/PEN verificada</summary>'+
   '<p>Comprueba en Binance P2P Perú un anuncio de <b>compra de USDT</b>, su precio PEN/USDT, monto disponible y método de cobro. No uses un precio promedio ni de venta minorista sin liquidez.</p>'+
   '<label>Precio comprador observado (PEN por USDT)<input id="cc125gross" type="number" min="2" max="6" step="0.000001" placeholder="Precio comprobado, no estimado"></label>'+
   '<label>Volumen ejecutable en ese precio (USDT)<input id="cc125volume" type="number" min="0.50" max="1000" step="0.01" placeholder="Volumen real del anuncio"></label>'+
   '<label>Costos de conversión estimados (%)<input id="cc125cost" type="number" min="0.25" max="10" step="0.001" value="0.5"></label>'+
   '<label>Margen de protección comercial (%)<input id="cc125margin" type="number" min="2" max="20" step="0.001" value="2"></label>'+
   '<label>Referencia del anuncio, horario y medio de cobro (sin datos privados)<input id="cc125source" type="text" minlength="12" maxlength="160" placeholder="Ej.: oferta compradora P2P, hora, método de pago"></label>'+
   '<label class="cc125-check"><input id="cc125verify" type="checkbox"> Confirmo que revisé una oferta compradora ejecutable y liquidez suficiente.</label>'+
   '<button id="cc125publish" type="button">Publicar tasa durante 2 minutos</button>'+
   '<p id="cc125adminStatus" role="status" aria-live="polite"></p>';
  box.appendChild(adminPanel);
  el('cc125publish').onclick=async()=>{
   const done=el('cc125adminStatus'),publish=el('cc125publish');
   const fields=['cc125gross','cc125volume','cc125cost','cc125margin'];
   if(fields.some(id=>!el(id).value.trim())){done.textContent='Completa precio, volumen, costo y margen.';return;}
   if(!el('cc125verify').checked){done.textContent='Confirma haber revisado el anuncio realmente comprable.';return;}
   publish.disabled=true;done.textContent='Publicando cotización con control de riesgo…';
   try{
    const rows=await api()('rpc/cc_admin_publish_usdt_pen_quote','POST',{
     p_market_rate:Number(el('cc125gross').value),
     p_available_usdt:Number(el('cc125volume').value),
     p_cost_pct:Number(el('cc125cost').value),
     p_margin_pct:Number(el('cc125margin').value),
     p_reference:el('cc125source').value.trim(),
     p_confirm_checked:true
    });
    const row=Array.isArray(rows)?rows[0]:null;
    if(!row)throw Error('El servidor no confirmó la cotización.');
    done.textContent='Tasa neta publicada: S/ '+Number(row.net_pen_per_usdt).toFixed(6)+
     ' por USDT; vence '+new Date(row.expires_at).toLocaleTimeString('es-PE')+'.';
    if(method.value==='BINANCE')void loadQuote();
   }catch(e){done.textContent='No se publicó: '+(e.message||e);}
   finally{publish.disabled=false;}
  };
 }
 button.addEventListener('click',async()=>{
  if(creating)return;
  if(availability[method.value]!==true){renderAvailability();return;}
  const ses=session();
  if(!ses?.jwt){status.textContent='Debes iniciar sesión para generar la solicitud.';return;}
  const n=Number(amount.value);
  if(!Number.isFinite(n)||Math.abs(n*100-Math.round(n*100))>0.000001||n<=0){status.textContent='Indica un importe válido de máximo dos decimales.';return;}
  const binance=method.value==='BINANCE';
  if(binance&&(!quote||new Date(quote.valid_until).getTime()<=Date.now()+15000)){status.textContent='No hay tasa vigente. Vuelve a consultar antes de pagar.';void loadQuote();return;}
  if(!binance&&(n<1||n>1000)){status.textContent='Recarga DALE: de S/ 1 a S/ 1000.';return;}
  if(binance&&n<0.5){status.textContent='Recarga Binance: mínimo 0.50 USDT.';return;}
  if(binance&&n>Number(quote.available_usdt)){status.textContent='Monto superior a la liquidez cubierta por esta cotización.';return;}
  creating=true;button.disabled=true;status.textContent='Registrando solicitud…';
  try{
   if(binance){
    const res=await api()('rpc/cc_create_pending_usdt_topup','POST',{p_service:service.value,p_usdt:n});
    const row=Array.isArray(res)?res[0]:null;
    if(!row?.order_id)throw Error('La orden no devolvió datos completos.');
    status.textContent='Solicitud '+row.order_id+' · Pagar '+fmt(row.usdt_amount,'USDT')+
    ' · Tasa fijada: 1 USDT = S/ '+Number(row.rate_pen_per_usdt).toFixed(4)+
    ' · Crédito previsto: S/ '+Number(row.credited_pen).toFixed(2)+
    ' · Vence '+new Date(row.valid_until).toLocaleTimeString('es-PE')+
    '. Estado PENDIENTE: no se acredita saldo hasta confirmar el pago externamente. '+ 
    'Costos y margen incluidos en la tasa comercial publicada antes de la orden.';
   }else{
    const id=await api()('rpc/cc_create_pending_real_topup','POST',{p_service:service.value,p_amount:n,p_provider:'LEMON_DALE'});
    status.textContent='Solicitud '+id+' · DALE: pagar S/ '+n.toFixed(2)+
    '. Estado PENDIENTE: no hay saldo acreditado hasta confirmar el ingreso.';
   }
  }catch(e){status.textContent='No se registró: '+(e.message||e);}
  finally{creating=false;renderAvailability();}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
