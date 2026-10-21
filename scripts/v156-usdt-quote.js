/* CLAN CARTAN V156 · Binance Pay personal USDT -> referencia de saldo PEN.
 * Los precios provienen ÚNICAMENTE de cotizaciones vigentes confirmadas por ADMIN.
 * No usa tasas ficticias, no ejecuta cobros ni mueve dinero sin liquidación verificada.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const api=(path,body)=>window.cc80.api(path,'POST',body||{});
const money=x=>'S/ '+Number(x).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const u=x=>Number(x).toLocaleString('es-PE',{maximumFractionDigits:8});
const safe=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const roundDown=x=>Math.floor((Number(x)+1e-10)*100)/100;
const tokens=[1,5,10,20,50];
let current=null,expiryTimer=null;
function rateActive(){
 return current && Number(current.rate_pen_per_usdt)>0 &&
 new Date(current.valid_until).getTime()>Date.now()+10000;
}
function quoteLabel(){
 if(!rateActive())return 'Sin cotización vigente · ADMIN debe comprobar una oferta ejecutable de venta USDT/PEN. No envíes fondos.';
 return 'Cotización referencial protegida, válida hasta '+new Date(current.valid_until).toLocaleTimeString('es-PE')+' (hora local). Sujeta a liquidación real verificada.';
}
function render(container){
 const info=container.querySelector('[data-quote-state]'),body=container.querySelector('tbody');
 if(!info||!body)return;
 info.textContent=quoteLabel();info.dataset.quoteReady=rateActive()?'true':'false';
 const net=Number(current?.rate_pen_per_usdt||0),max=Number(current?.available_usdt||0);
 const rows=[...tokens];
 const custom=Number(container.querySelector('[data-usdt-custom]')?.value||0);
 if(Number.isFinite(custom)&&custom>0&&!rows.includes(custom))rows.push(custom);
 body.replaceChildren();
 for(const amount of rows){
  const tr=document.createElement('tr');
  let estimate=rateActive()?roundDown(amount*net):null;
  let allowed=estimate!==null&&amount<=max&&estimate>=1&&estimate<=1000;
  const strings=[u(amount)+' USDT',allowed?money(estimate):rateActive()?'No disponible':'—'];
  strings.forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===1)td.style.fontWeight='750';tr.appendChild(td);});
  body.appendChild(tr);
 }
 const rateEl=container.querySelector('[data-quote-net]'),
 marketEl=container.querySelector('[data-quote-market]'),
 feesEl=container.querySelector('[data-quote-fees]'),
 protectEl=container.querySelector('[data-quote-protect]');
 if(rateEl)rateEl.textContent=rateActive()?money(net)+' por USDT':'—';
 if(marketEl)marketEl.textContent=rateActive()?money(current.market_rate_pen_per_usdt)+' por USDT':'—';
 if(feesEl)feesEl.textContent=rateActive()?Number(current.conversion_cost_pct)+' %':'—';
 if(protectEl)protectEl.textContent=rateActive()?Number(current.protection_margin_pct)+' %':'—';
}
function redrawAll(){
 document.querySelectorAll('.cc156quote').forEach(render);
 const admin=$('cc156quoteForCredit');if(admin)admin.textContent=quoteLabel();
}
async function refresh(){
 try{
  if(!window.CC_V53_SESSION?.jwt){current=null;redrawAll();return;}
  const rows=await api('rpc/cc_current_usdt_pen_quote_v125');
  current=Array.isArray(rows)&&rows[0]&&Number(rows[0].rate_pen_per_usdt)>0?rows[0]:null;
 }catch(e){current=null;}
 redrawAll();
 if(expiryTimer)clearTimeout(expiryTimer);
 if(rateActive()){
  const ms=Math.max(1000,new Date(current.valid_until).getTime()-Date.now()-9000);
  expiryTimer=setTimeout(()=>{current=null;redrawAll();},ms);
 }
}
function addQuote(parent,id){
 if(!parent||$(id))return;
 const box=document.createElement('section');box.id=id;box.className='cc156quote';
 box.innerHTML='<h4>BINANCE PAY · Conversión USDT a soles (PEN)</h4>'+
 '<p>El cliente envía USDT a la cuenta Binance indicada; CLAN CARTAN calcula el saldo PEN estimado según una cotización reciente, verificada y protegida.</p>'+
 '<p data-quote-state role="status" aria-live="polite"></p>'+
 '<div class="cc156summary">'+
 '<span>Mercado comprador <strong data-quote-market>—</strong></span>'+
 '<span>Costos de conversión <strong data-quote-fees>—</strong></span>'+
 '<span>Margen de protección <strong data-quote-protect>—</strong></span>'+
 '<span>Tasa para el cliente <strong data-quote-net>—</strong></span></div>'+
 '<div class="cc156table-wrap"><table><thead><tr><th>USDT enviados</th><th>Saldo PEN estimado</th></tr></thead><tbody></tbody></table></div>'+
 '<label class="cc156custom">Calcular otro importe en USDT <input data-usdt-custom type="number" min="0.00000001" max="1000" step="any" inputmode="decimal" placeholder="Ej. 3.5"></label>'+
 '<button type="button" class="cc156refresh">↻ Actualizar cotización</button>'+
 '<p class="cc156legal">Valores referenciales, no garantizados: pueden variar hasta verificar el importe USDT recibido y el PEN neto realmente liquidado. No se acredita más que ese neto. Las cuentas personales NO están habilitadas para cobrar comercialmente mientras falte autorización del proveedor.</p>';
 const grid=parent.querySelector('.cc147-qr-grid');
 if(grid)grid.after(box);else parent.appendChild(box);
 box.querySelector('[data-usdt-custom]').addEventListener('input',()=>render(box));
 box.querySelector('.cc156refresh').addEventListener('click',()=>void refresh());
 render(box);
}
function mountAdmin(){
 const panel=$('cc146admin');if(!panel||!window.CC_V53_SESSION?.isAdmin||$('cc156Admin'))return;
 const box=document.createElement('section');box.id='cc156Admin';box.className='cc136manual cc132-movements';
 box.innerHTML='<h3>ADMIN · Cotización y liquidación Binance USDT</h3>'+
 '<p>Antes de mostrar una tasa, verifica una oferta de compra ejecutable USDT/PEN con volumen suficiente. Se aplica una reserva mínima de 2 % más costos verificados. La cotización caduca en 2 minutos.</p>'+
 '<div class="cc156admin-grid">'+
 '<label>Oferta compradora real (PEN por 1 USDT)<input id="cc156market" type="number" min="2" max="6" step="0.000001" placeholder="Cotización realmente observada"></label>'+
 '<label>USDT disponibles en la oferta<input id="cc156available" type="number" min="0.5" max="1000" step=".01"></label>'+
 '<label>Costos reales de conversión (%)<input id="cc156cost" type="number" min=".25" max="10" step=".001" value="1.5"></label>'+
 '<label>Margen protector (%)<input id="cc156margin" type="number" min="2" max="20" step=".001" value="3"></label>'+
 '<label>Referencia comprobable de la oferta<input id="cc156source" maxlength="160" placeholder="Oferta compradora Binance P2P y medio de liquidación"></label></div>'+
 '<label class="cc156agree"><input id="cc156quoteConfirm" type="checkbox"> Verifiqué una oferta de compra real, ejecutable, con cantidad suficiente, costos y fuente.</label>'+
 '<button type="button" id="cc156publish">Publicar cotización protegida por 2 minutos</button><p id="cc156publishStatus" role="status"></p>'+
 '<h4>Liquidación y acreditación (solo dinero efectivamente recibido)</h4><p id="cc156quoteForCredit"></p>'+
 '<div class="cc156admin-grid">'+
 '<label>Correo del RESELLER<input id="cc156recipient" type="email" placeholder="Correo confirmado"></label>'+
 '<label>Billetera<select id="cc156service"><option value="COBRA_YA">COBRA YA</option><option value="STREAM_BULLS">STREAM BULL’S</option></select></label>'+
 '<label>USDT efectivamente recibidos<input id="cc156usdt" type="number" step="any" min="0.00000001" max="1000"></label>'+
 '<label>ID de transacción Binance<input id="cc156tx" maxlength="120" placeholder="Identificador real, único"></label>'+
 '<label>PEN netos liquidados tras venta y costos<input id="cc156settled" type="number" min="1" max="1000" step=".01"></label>'+
 '<label>Referencia de liquidación PEN<input id="cc156settlementRef" maxlength="120" placeholder="Comprobante de venta/liquidación"></label></div>'+
 '<p id="cc156expected" aria-live="polite">Acreditación: pendiente de liquidación comprobada.</p>'+
 '<label class="cc156agree"><input id="cc156receivedChecked" type="checkbox"> Comprobé los USDT recibidos en la cuenta Binance.</label>'+
 '<label class="cc156agree"><input id="cc156settledChecked" type="checkbox"> Comprobé que la conversión y el PEN neto indicado ya se liquidaron.</label>'+
 '<button type="button" id="cc156credit">Acreditar solamente PEN netos verificados</button>'+
 '<p id="cc156creditStatus" role="status" aria-live="polite">Cuenta personal Binance: cobros comerciales deshabilitados hasta verificar autorización del proveedor.</p>';
 panel.after(box);
 const market=$('cc156market'),cost=$('cc156cost'),margin=$('cc156margin');
 const publish=$('cc156publish'),credit=$('cc156credit');
 let policyAuthorized=false;
 const callPolicy=async()=>{
  try{
   const r=await window.cc80.api('cc_binance_personal_policy?select=commercial_authorized&id=eq.true');
   policyAuthorized=Array.isArray(r)&&r[0]?.commercial_authorized===true;
  }catch{policyAuthorized=false;}
  credit.disabled=!policyAuthorized;
  if(!policyAuthorized)$('cc156creditStatus').textContent='Bloqueado: falta autorización comercial de Binance para esta cuenta personal. No enviar dinero.';
 };
 void callPolicy();
 function expected(){
  const usdt=Number($('cc156usdt').value),settled=Number($('cc156settled').value);
  const ok=rateActive()&&usdt>0&&usdt<=Number(current.available_usdt)&&settled>=1;
  $('cc156expected').textContent=ok?'Máximo provisional a acreditar: '+money(Math.min(roundDown(usdt*Number(current.rate_pen_per_usdt)),Math.floor(settled*100)/100))+' (nunca superior al PEN neto liquidado)':'Sin liquidación neta verificada y cotización vigente no se acredita.';
 }
 [$('cc156usdt'),$('cc156settled')].forEach(x=>x.addEventListener('input',expected));
 publish.addEventListener('click',async()=>{
  if(!window.CC_V53_SESSION?.isAdmin)return;
  if(!$('cc156quoteConfirm').checked){$('cc156publishStatus').textContent='Confirma que comprobaste una oferta ejecutable.';return;}
  publish.disabled=true;
  try{
   const rows=await api('rpc/cc_admin_publish_usdt_pen_quote',{
    p_market_rate:Number(market.value),p_available_usdt:Number($('cc156available').value),
    p_cost_pct:Number(cost.value),p_margin_pct:Number(margin.value),
    p_reference:$('cc156source').value.trim(),p_confirm_checked:true
   });
   $('cc156publishStatus').textContent='Cotización protegida publicada. Tarifa al cliente: '+money(rows?.[0]?.net_pen_per_usdt)+' / USDT. Caduca en 2 minutos.';
   $('cc156quoteConfirm').checked=false;await refresh();expected();
  }catch(e){$('cc156publishStatus').textContent='No publicada: '+String(e.message||e);}
  finally{publish.disabled=false;}
 });
 credit.addEventListener('click',async()=>{
  if(!policyAuthorized)return;
  if(!rateActive()){ $('cc156creditStatus').textContent='Cotización vencida: actualiza y comprueba de nuevo.';return;}
  if(!$('cc156receivedChecked').checked||!$('cc156settledChecked').checked){$('cc156creditStatus').textContent='Confirma recepción USDT y liquidación PEN reales.';return;}
  const usdt=Number($('cc156usdt').value),net=Number($('cc156settled').value);
  if(!Number.isFinite(usdt)||usdt<=0||!Number.isFinite(net)||net<1)return;
  if(!window.confirm('¿Has verificado USDT realmente recibidos, PEN netos liquidados y comprobantes de ambas operaciones? La acreditación será única.'))return;
  credit.disabled=true;$('cc156creditStatus').textContent='Acreditando solo el saldo PEN neto verificado…';
  try{
   const result=await api('rpc/cc_admin_credit_verified_binance_personal',{
    p_recipient_email:$('cc156recipient').value.trim(),p_service:$('cc156service').value,
    p_received_usdt:usdt,p_transaction_reference:$('cc156tx').value.trim(),
    p_net_settled_pen:net,p_settlement_reference:$('cc156settlementRef').value.trim(),
    p_confirmed_received:true,p_confirmed_settled:true,p_note:'USDT y liquidación neta PEN cotejados por ADMIN'
   });
   $('cc156creditStatus').textContent='Acreditación comprobada: '+money(result.credited_pen)+' de saldo. Nuevo saldo: '+money(result.new_balance_pen)+'.';
   $('cc156receivedChecked').checked=false;$('cc156settledChecked').checked=false;$('cc156tx').value='';$('cc156settlementRef').value='';
   $('cc143reportRefresh')?.click();window.cc116RefreshBalances?.();await refresh();
  }catch(e){$('cc156creditStatus').textContent='No se acreditó: '+String(e.message||e);}
  finally{credit.disabled=!policyAuthorized;}
 });
 void refresh();
}
function install(){
 addQuote($('cc147manualQr'),'cc156ManualQuote');
 addQuote($('cc147autoQr'),'cc156AutoQuote');
 mountAdmin();
}
function hook(){
 install();
 const old=window.cc80?.open;
 if(typeof old==='function'&&!window.cc156Hooked){
  window.cc156Hooked=true;
  window.cc80.open=function(...args){const result=old.apply(this,args);install();void refresh();return result;};
 }
 document.addEventListener('click',e=>{
  if(e.target.closest?.('#cc136goManual,#cc92-admin-button,#cc114sbRecharge,#cy113recharge'))setTimeout(install,200);
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
})();
