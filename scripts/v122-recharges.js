/* CLAN CARTAN V122 - Solicitudes de pago manual reales. No acredita saldo sin conciliacion. */
(function(){
'use strict';
const get=id=>document.getElementById(id);
const urlBinance='https://app.binance.com/uni-qr/812BvNys';
const methods={LEMON_DALE:{name:'Lemon / DALE',note:'Transferencia en soles. Usa el QR de Lemon suministrado por el titular. El número DALE aún no está configurado.'},BINANCE:{name:'Binance',note:'Usuario Binance: User-f81cdb6a. Confirma la red, moneda e importe con el receptor antes de transferir.'}};
let working=false;
function mount(){
 if(get('cc122section'))return;
 const target=get('cc80wallet')||get('cc77home');if(!target)return;
 const box=document.createElement('section');box.id='cc122section';box.className='cc122-pay';
 box.innerHTML='<h3>Recargas reales · Lemon / DALE y Binance</h3><p>Elige billetera, importe y forma de pago. Las transferencias serán verificadas antes de acreditar saldo. Las billeteras actuales todavía muestran saldos de prueba.</p>'+
 '<label>Billetera<select id="cc122service"><option value="COBRA_YA">COBRA YA</option><option value="STREAM_BULLS">STREAM BULL’S</option></select></label>'+
 '<label>Importe en soles (PEN)<input id="cc122amount" type="number" min="1" max="1000" step="0.01" value="20"></label>'+
 '<label>Método<select id="cc122method"><option value="LEMON_DALE">Lemon / DALE</option><option value="BINANCE">Binance</option></select></label>'+
 '<div id="cc122payinfo" class="cc122-info"></div>'+
 '<button id="cc122create" type="button">Generar solicitud de recarga</button><p id="cc122status" role="status" aria-live="polite"></p>'+
 '<small>Crear una solicitud no confirma el pago. No se aceptan capturas como confirmación automática. No hay retiros, pagos de préstamos ni transferencias entre usuarios.</small>';
 target.appendChild(box);
 const service=get('cc122service'),amount=get('cc122amount'),method=get('cc122method'),info=get('cc122payinfo'),status=get('cc122status');
 function showMethod(){
  const k=method.value,m=methods[k];
  info.innerHTML='<strong>'+m.name+'</strong><p>'+m.note+'</p>'+
  (k==='LEMON_DALE'?'<img src="assets/v122-lemon-qr.png" alt="QR receptor de Lemon aportado por el titular. Verifica los datos en la app antes de transferir.">':
    '<img src="assets/v122-binance-qr.png" alt="QR Binance de recepción"><p><a href="'+urlBinance+'" target="_blank" rel="noopener noreferrer">Abrir Binance</a></p>');
 }
 method.addEventListener('change',showMethod);showMethod();
 get('cc122create').addEventListener('click',async()=>{
  if(working)return;
  const session=window.CC_V53_SESSION;
  if(!session?.jwt){status.textContent='Inicia sesión para generar una solicitud asociada a tu cuenta.';return;}
  const n=Number(amount.value);
  if(!Number.isFinite(n)||n<1||n>1000||Math.round(n*100)!==n*100){status.textContent='Importe válido: S/ 1 a S/ 1,000, con dos decimales.';return;}
  working=true;get('cc122create').disabled=true;status.textContent='Registrando solicitud pendiente…';
  try{
   const api=window.cc80?.api;if(typeof api!=='function')throw Error('Billetera no disponible');
   const id=await api('rpc/cc_create_pending_real_topup','POST',{p_service:service.value,p_amount:n,p_provider:method.value});
   status.textContent='Solicitud registrada: '+id+'. Estado: PENDIENTE de conciliación. No se ha acreditado saldo todavía.';
  }catch(e){status.textContent='No se registró: '+(e.message||e);}
  finally{working=false;get('cc122create').disabled=false;}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();