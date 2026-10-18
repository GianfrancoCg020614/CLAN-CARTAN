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
 '<h3>Recargar billetera · Lemon/DALE o Binance Pay</h3>'+
 '<p>Selecciona tu billetera y método. Lemon recibe soles; Binance Pay recibe USDT. El saldo real se registra por separado de cualquier saldo de prueba.</p>'+
 '<label>Billetera<select id="cc122service"><option value="COBRA_YA">COBRA YA</option><option value="STREAM_BULLS">STREAM BULL’S</option></select></label>'+
 '<label>Medio de pago<select id="cc122method"><option value="LEMON_DALE">Lemon / DALE · soles (PEN)</option><option value="BINANCE">Binance Pay · USDT (internacional)</option></select></label>'+
 '<label id="cc124amountLabel" for="cc122amount">Importe a pagar (PEN)</label>'+
 '<input id="cc122amount" type="number" min="1" max="1000" step="0.01" value="20" inputmode="decimal">'+
 '<div id="cc124quote" class="cc122-info" role="status" aria-live="polite"></div>'+
 '<div id="cc122payinfo" class="cc122-info"></div>'+
 '<div id="cc123realBalances" role="status">Saldo real: inicia sesión para consultar.</div>'+
 '<button id="cc123refreshReal" type="button">Actualizar saldo real</button>'+
 '<button id="cc122create" type="button">Generar solicitud de recarga</button>'+
 '<p id="cc122status" role="status" aria-live="polite"></p>'+
 '<small>Solo se acreditará una operación tras verificación independiente del pago, importe, destinatario y referencia. Una captura o el botón de recarga no confirman ningún cobro. No se permiten retiros, pagos de préstamos ni transferencias entre personas.</small>';
 host.appendChild(box);
 const method=el('cc122method'),service=el('cc122service'),amount=el('cc122amount'),info=el('cc122payinfo'),status=el('cc122status'),quotation=el('cc124quote'),button=el('cc122create'),amountLabel=el('cc124amountLabel');
 function session(){return window.CC_V53_SESSION;}
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
  if(!quote){quotation.textContent='Cotización no disponible. No envíes USDT hasta ver un importe y equivalente confirmados.';return;}
  const n=Number(amount.value);
  if(!Number.isFinite(n)||n<0.5||Math.round(n*100)!==Math.round(n*10000)/100){
   quotation.textContent='Introduce un importe USDT válido, con hasta 2 decimales.';return;
  }
  const equivalent=Math.round(n*Number(quote.rate_pen_per_usdt)*100)/100;
  quotation.textContent='Cotización informativa: 1 USDT = S/ '+Number(quote.rate_pen_per_usdt).toFixed(4)+
  ' · '+fmt(n,'USDT')+' ≈ S/ '+equivalent.toFixed(2)+
  ' · Fuente: '+quote.source+
  ' · Vigente hasta '+new Date(quote.valid_until).toLocaleTimeString('es-PE')+
  '. El importe definitivo quedará fijado en la solicitud.';
 }
 async function loadQuote(){
  const serial=++quoteReq;quote=null;
  if(method.value!=='BINANCE')return;
  if(!session()?.jwt){quotation.textContent='Inicia sesión para consultar la tasa USDT/PEN verificada.';return;}
  quotation.textContent='Consultando tasa USDT/PEN…';
  try{
   const rows=await api()('rpc/cc_current_usdt_pen_quote','POST',{});
   if(serial!==quoteReq||method.value!=='BINANCE')return;
   const latest=Array.isArray(rows)?rows[0]:null;
   if(!latest||!Number.isFinite(Number(latest.rate_pen_per_usdt)))throw Error('No existe una tasa vigente configurada en el servidor.');
   quote=latest;
   preview();
  }catch(e){if(serial===quoteReq)quotation.textContent='Cotización no disponible: '+(e.message||e)+'. No pagues todavía.';}
 }
 function renderMethod(){
  status.textContent='';
  ++quoteReq;quote=null;
  const binance=method.value==='BINANCE';
  amountLabel.textContent=binance?'Importe a pagar (USDT)':'Importe a pagar (PEN, soles)';
  amount.min=binance?'0.5':'1';amount.max=binance?'1000':'1000';amount.step='0.01';amount.value=binance?'10':'20';
  if(binance){
   info.innerHTML='<strong>Binance Pay · USDT</strong><p>Pago internacional exclusivamente en USDT. Usuario receptor indicado: <b>User-f81cdb6a</b>. Comprueba el destinatario antes de transferir.</p>'+
   '<p><a href="'+binanceUrl+'" target="_blank" rel="noopener noreferrer">Abrir código Binance Pay</a></p>'+
   '<p>El valor de la billetera se expresa en soles usando la cotización registrada en la solicitud. Las comisiones de red/plataforma, cuando apliquen, se informarán antes del pago.</p>';
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
 button.addEventListener('click',async()=>{
  if(creating)return;
  const ses=session();
  if(!ses?.jwt){status.textContent='Debes iniciar sesión para generar la solicitud.';return;}
  const n=Number(amount.value);
  if(!Number.isFinite(n)||Math.abs(n*100-Math.round(n*100))>0.000001||n<=0){status.textContent='Indica un importe válido de máximo dos decimales.';return;}
  const binance=method.value==='BINANCE';
  if(binance&&(!quote||new Date(quote.valid_until).getTime()<=Date.now()+15000)){status.textContent='No hay tasa vigente. Vuelve a consultar antes de pagar.';void loadQuote();return;}
  if(!binance&&(n<1||n>1000)){status.textContent='Recarga DALE: de S/ 1 a S/ 1000.';return;}
  if(binance&&n<0.5){status.textContent='Recarga Binance: mínimo 0.50 USDT.';return;}
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
    '. Estado PENDIENTE: no hay saldo acreditado hasta confirmar el pago externamente.';
   }else{
    const id=await api()('rpc/cc_create_pending_real_topup','POST',{p_service:service.value,p_amount:n,p_provider:'LEMON_DALE'});
    status.textContent='Solicitud '+id+' · DALE: pagar S/ '+n.toFixed(2)+
    '. Estado PENDIENTE: no hay saldo acreditado hasta confirmar el ingreso.';
   }
  }catch(e){status.textContent='No se registró: '+(e.message||e);}
  finally{creating=false;button.disabled=false;}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();
