/* CLAN CARTAN V146 · Recargas de cuenta personal verificadas por ADMIN.
 * No realiza cobros, no genera QR inventados y nunca acredita por captura.
 */
(function(){
'use strict';
const get=id=>document.getElementById(id);
const sess=()=>window.CC_V53_SESSION;
const money=x=>'S/ '+Number(x||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
let saving=false;
function install(){
 const wallet=get('cc80wallet'),existing=get('cc136manual');
 if(!wallet||!existing)return;
 if(!get('cc146binance')){
  const box=document.createElement('section');box.id='cc146binance';box.className='cc136manual cc132-movements';
  box.innerHTML='<h3>BINANCE · Recarga con comprobación manual</h3>'+
   '<p>La transferencia se realiza a la cuenta indicada en el QR personal. El saldo no se acredita automáticamente: el ADMIN primero confirma el abono y su referencia real. Esta opción es distinta de Binance Merchant.</p>'+
   '<div id="cc146qrWrap" style="display:none;text-align:center"><img id="cc146qr" src="assets/qr-binance-personal.png" alt="QR personal de Binance Pay" loading="lazy" style="max-width:260px;width:100%;height:auto;border-radius:16px"></div>'+
   '<p id="cc146qrState" role="status">Comprobando disponibilidad del QR personal…</p>'+
   '<small>Para pagos en USDT, consulta el equivalente en soles con ADMIN antes de transferir. Nunca se acredita dinero por capturas ni referencias sin cotejo.</small>';
  existing.after(box);
  const qr=get('cc146qr');qr.addEventListener('load',()=>{
   get('cc146qrWrap').style.display='block';
   get('cc146qrState').textContent='Verifica que el destinatario del QR corresponda a tu prestador antes de efectuar el pago. Comunica la referencia al ADMIN.';
  });
  qr.addEventListener('error',()=>{
   get('cc146qrWrap').style.display='none';
   get('cc146qrState').textContent='El QR personal de Binance aún no está cargado. No envíes fondos hasta que aparezca un destinatario confirmado.';
  });
  if(qr.complete){if(qr.naturalWidth>0)get('cc146qrWrap').style.display='block';
    else get('cc146qrState').textContent='QR Binance pendiente: no envíes dinero hasta su publicación.';}
 }
 if(!sess()?.jwt||!sess()?.isAdmin||get('cc146admin'))return;
 const pane=document.createElement('section');pane.id='cc146admin';pane.className='cc136manual cc132-movements';
 pane.innerHTML='<h3>ADMIN · Acreditar recarga personal comprobada</h3>'+
 '<p>Utiliza esta función solo después de comprobar el movimiento recibido directamente en la cuenta Lemon/DALE o Binance. Nunca acredites a partir de una simple captura del cliente.</p>'+
 '<div class="cc136form">'+
 '<label>Correo del destinatario<input type="email" id="cc146email" autocomplete="off" placeholder="Correo confirmado"></label>'+
 '<label>Negocio<select id="cc146service"><option value="COBRA_YA">COBRA YA</option><option value="STREAM_BULLS">STREAM BULL’S</option></select></label>'+
 '<label>Cuenta que recibió el pago<select id="cc146provider"><option value="BINANCE_PERSONAL">Binance personal · USDT</option><option value="LEMON_DALE_PERSONAL">Lemon / DALE personal · PEN</option></select></label>'+
 '<label id="cc146amountLabel">Importe confirmado recibido (USDT)<input type="number" id="cc146amount" min="0.00000001" max="1000" step="any" inputmode="decimal"></label>'+
 '<label id="cc146rateLabel">Tipo de cambio PEN por USDT<input type="number" id="cc146rate" min="1" max="15" step="0.000001" inputmode="decimal" placeholder="Tasa real comprobada"></label>'+
 '<label>ID único de transacción verificada<input id="cc146tx" maxlength="120" autocomplete="off" placeholder="Referencia del movimiento original"></label>'+
 '<label>Concepto / observación<input id="cc146note" maxlength="200" value="Depósito recibido y verificado por ADMIN"></label></div>'+
 '<p id="cc146converted">Acreditación estimada: —</p>'+
 '<label style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="cc146confirm" style="width:auto"> Confirmo que cotejé importe, destinatario y referencia con el movimiento realmente recibido en mi cuenta.</label>'+
 '<button type="button" id="cc146credit">Confirmar y acreditar una sola vez</button>'+
 '<p id="cc146status" role="status" aria-live="polite"></p>';
 const sibling=get('cc143report')||get('cc143bonus')||get('cc136admin')||existing;
 sibling.after(pane);
 const provider=get('cc146provider'),rate=get('cc146rate'),amount=get('cc146amount');
 function redraw(){
  const lemon=provider.value==='LEMON_DALE_PERSONAL';
  get('cc146amountLabel').firstChild.textContent='Importe confirmado recibido ('+(lemon?'PEN':'USDT')+')';
  get('cc146rateLabel').hidden=lemon;
  if(lemon)rate.value='1';
  else if(rate.value==='1')rate.value='';
  const pen=Number(amount.value)*Number(lemon?1:rate.value);
  get('cc146converted').textContent=Number.isFinite(pen)&&pen>0?'Se acreditarán '+money(Math.round(pen*100)/100)+' de saldo real confirmado':'Acreditación estimada: —';
 }
 provider.addEventListener('change',redraw);rate.addEventListener('input',redraw);amount.addEventListener('input',redraw);redraw();
 get('cc146credit').addEventListener('click',async()=>{
  if(saving)return;
  const email=get('cc146email').value.trim();
  const received=Number(amount.value),fx=Number(provider.value==='LEMON_DALE_PERSONAL'?1:rate.value);
  const reference=get('cc146tx').value.trim(),note=get('cc146note').value.trim();
  const checked=get('cc146confirm').checked;
  if(!checked||!email.includes('@')||!Number.isFinite(received)||received<=0||!Number.isFinite(fx)||fx<=0||reference.length<8){
   get('cc146status').textContent='Verifica el pago y completa correo, importe, tasa y referencia.';return;
  }
  if(!confirm('¿Cotejaste un ingreso real de '+received+' '+(provider.value==='BINANCE_PERSONAL'?'USDT':'PEN')+'? Se acreditará '+money(received*fx)+' a '+email+' en '+get('cc146service').value+'.'))return;
  saving=true;get('cc146credit').disabled=true;get('cc146status').textContent='Registrando acreditación auditada…';
  try{
   const balance=await window.cc80.api('rpc/cc_admin_credit_verified_personal_payment','POST',{
    p_recipient_email:email,p_service:get('cc146service').value,p_provider:provider.value,
    p_received_amount:received,p_rate_pen_per_unit:fx,p_provider_transaction_id:reference,
    p_confirmed_received:true,p_note:note||null
   });
   get('cc146status').textContent='Recarga confirmada y registrada. Nuevo saldo real: '+money(balance)+'. Referencia: '+reference;
   get('cc146confirm').checked=false;get('cc146tx').value='';
   get('cc143reportRefresh')?.click();
   if(window.cc116RefreshBalances)void window.cc116RefreshBalances();
  }catch(e){get('cc146status').textContent='No se acreditó: '+String(e.message||e);}
  finally{saving=false;get('cc146credit').disabled=false;}
 });
}
function hook(){
 install();
 const old=window.cc80?.open;
 if(typeof old==='function'&&!window.cc146WalletHook){
  window.cc146WalletHook=true;
  window.cc80.open=function(...args){const r=old.apply(this,args);install();return r;};
 }
 document.addEventListener('click',event=>{
  if(event.target.closest?.('#cc92-admin-button,#cc136adminRefresh'))setTimeout(install,300);
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
})();