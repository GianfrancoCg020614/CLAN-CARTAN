/* CLAN CARTAN V148 — QR, YA PAGUÉ y envío de comprobante por WhatsApp.
   No acredita saldos. Solo registra aviso PENDING y abre WhatsApp del ADMIN.
*/
(function(){
'use strict';
const el=id=>document.getElementById(id);
const serviceName=v=>v==='STREAM_BULLS'?'STREAM BULL’S':'COBRA YA';
const currency=v=>'S/ '+Number(v||0).toFixed(2);
let sending=false;
function mount(){
 const qr=el('cc147manualQr'),legacy=el('cc136manual');
 if(!qr||!legacy||el('cc148manualFlow'))return;
 // El flujo anterior se conserva en código e historial, sin duplicar formularios al cliente.
 const old=legacy.querySelector('.cc136form'),oldButtons=legacy.querySelector('.cc136actions');
 if(old)old.hidden=true;if(oldButtons)oldButtons.hidden=true;
 const recipient=el('cc136recipient');if(recipient)recipient.hidden=true;
 const note=legacy.querySelector('.cc136warn');if(note)note.hidden=true;
 const header=legacy.querySelector('.cc136head p');if(header)header.textContent='Selecciona tu billetera, revisa el QR y comunica tu pago. ADMIN verificará el ingreso antes de acreditar.';
 const flow=document.createElement('div');flow.id='cc148manualFlow';
 flow.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:12px;align-items:end;margin:12px 0">'+
 '<label style="flex:1 1 180px">Billetera<select id="cc148service"><option value="COBRA_YA">COBRA YA</option><option value="STREAM_BULLS">STREAM BULL’S</option></select></label>'+
 '<label style="flex:1 1 180px">Monto a recargar (S/)<input type="number" id="cc148amount" min="1" max="1000" step="0.01" inputmode="decimal" placeholder="Ej. 15.00"></label></div>'+
 '<p id="cc148amountPreview" style="font-weight:700">Indica el monto antes de pagar.</p>';
 qr.insertBefore(flow,qr.querySelector('.cc147-qr-grid'));
 const button=document.createElement('button');button.id='cc148alreadyPaid';button.type='button';button.textContent='✓ YA PAGUÉ';button.style.cssText='display:block;margin:18px auto;padding:12px 28px;background:#12baa6;color:#051b20;border-radius:12px;font-weight:800';
 const grid=qr.querySelector('.cc147-qr-grid');grid.after(button);
 const modal=document.createElement('div');modal.id='cc148modal';modal.hidden=true;
 modal.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(1,8,20,.78);padding:18px;overflow-y:auto;align-items:center;justify-content:center';
 modal.innerHTML='<div role="dialog" aria-modal="true" aria-labelledby="cc148title" style="background:#0f1e32;border:1px solid #396782;border-radius:18px;padding:24px;max-width:520px;width:100%;margin:auto;color:#e9f4ff">'+
 '<h3 id="cc148title">Confirmar mi recarga</h3><p>Completa los datos del pago. Después envía tu comprobante por WhatsApp al ADMIN.</p>'+
 '<label style="display:block;margin:12px 0">Monto recargado (S/)<input id="cc148paidAmount" type="number" min="1" max="1000" step="0.01" inputmode="decimal" style="width:100%"></label>'+
 '<label style="display:block;margin:12px 0">Método de pago<select id="cc148method" style="width:100%"><option value="YAPE">Yape</option><option value="PLIN">Plin</option><option value="TRANSFERENCIA">Transferencia</option><option value="BINANCE">Binance Pay</option></select></label>'+
 '<label style="display:block;margin:12px 0">N.º de operación<input id="cc148operation" maxlength="120" autocomplete="off" placeholder="Número de operación o referencia real" style="width:100%"></label>'+
 '<p style="font-size:13px;color:#9fbace">No basta con enviar una captura. El ADMIN debe comprobar el depósito recibido antes de acreditar el saldo.</p>'+
 '<div style="display:flex;gap:10px;flex-wrap:wrap"><button id="cc148cancel" type="button">Cancelar</button><button id="cc148send" type="button" style="background:#1fcf9a;color:#04201a;font-weight:800">WhatsApp · Enviar comprobante</button></div>'+
 '<p id="cc148status" role="status" aria-live="polite"></p></div>';
 document.body.appendChild(modal);
 const amount=el('cc148amount'),preview=el('cc148amountPreview');
 amount.addEventListener('input',()=>{
  const n=Number(amount.value);
  preview.textContent=n>=1&&n<=1000?'Monto a recargar: '+currency(n)+' · verifica la cuenta antes de pagar':'Indica un monto entre S/ 1 y S/ 1,000.';
 });
 const oldService=el('cc136service');
 if(oldService)el('cc148service').value=oldService.value;
 button.addEventListener('click',()=>{
  const n=Number(amount.value);
  if(!Number.isFinite(n)||n<1||n>1000||Math.round(n*100)!==n*100){preview.textContent='Primero escribe un monto válido entre S/1 y S/1000.';amount.focus();return;}
  el('cc148paidAmount').value=n.toFixed(2);
  modal.hidden=false;modal.style.display='flex';el('cc148operation').focus();
 });
 const close=()=>{modal.hidden=true;modal.style.display='none'};
 el('cc148cancel').addEventListener('click',close);
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
 el('cc148send').addEventListener('click',async()=>{
  if(sending)return;
  const sess=window.CC_V53_SESSION;
  if(!sess?.jwt){el('cc148status').textContent='Primero inicia sesión para registrar tu recarga.';return;}
  const paid=Number(el('cc148paidAmount').value),expected=Number(amount.value);
  const method=el('cc148method').value,ref=el('cc148operation').value.trim();
  const service=el('cc148service').value;
  if(!Number.isFinite(paid)||paid<1||paid>1000||Math.abs(paid-expected)>.001||ref.length<5){
   el('cc148status').textContent='Revisa el monto (debe coincidir) y el número de operación.';return;
  }
  sending=true;el('cc148send').disabled=true;el('cc148status').textContent='Registrando solicitud pendiente…';
  try{
   const request=await window.cc80.api('rpc/cc_notify_manual_payment','POST',{
    p_service:service,p_method:method,p_amount:paid,p_operation:ref
   });
   if(!request)throw Error('No se confirmó el registro');
   const msg=['*CLAN CARTAN | SOLICITUD DE RECARGA*','', 'Hola ADMIN, ya realicé un pago. Solicito verificarlo.',
   'Billetera: *'+serviceName(service)+'*','Monto: *'+currency(paid)+'*',
   'Método: *'+method+'*','N.º de operación: *'+ref+'*',
   'Código de solicitud: '+request,'Código de usuario: '+sess.userId,
   '','*Adjunto mi comprobante de pago en este chat.*',
   'La acreditación queda pendiente de tu verificación.','https://www.clancartan.com/'].join('\n');
   const url='https://wa.me/51923319637?text='+encodeURIComponent(msg);
   el('cc148status').textContent='Solicitud registrada. Abriendo WhatsApp: adjunta allí tu comprobante y envía el mensaje.';
   const opened=window.open(url,'_blank','noopener,noreferrer');
   if(!opened){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Abrir WhatsApp y adjuntar comprobante';el('cc148status').append(' ',a);}
   close();
  }catch(e){el('cc148status').textContent='No se registró la solicitud: '+String(e.message||e);}
  finally{sending=false;el('cc148send').disabled=false;}
 });
}
function init(){mount();document.addEventListener('click',e=>{if(e.target.closest?.('#cc136goManual,#cc92-admin-button'))setTimeout(mount,150)});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();