/* CLAN CARTAN V145 · evita ventas ficticias del catálogo histórico.
 * El catálogo público continúa visible; no genera pedidos ni cobra dinero.
 */
(function(){
'use strict';
const tell=()=>{const m='Las compras de STREAM BULL’S aún no tienen confirmación de pago comercial. Consulta el catálogo; no se generan pedidos ni se cobran fondos.';if(typeof window.notify==='function')window.notify(m,'error');else alert(m);};
const blocked=['openCheckout','buyProduct','openAutoRecharge','reviewExternalPayment','refundPaymentDemo','cc93PayAffiliation'];
for(const key of blocked){if(typeof window[key]==='function')window[key]=tell;}
const banner=document.getElementById('cc77demobanner');
if(banner)banner.textContent='STREAM BULL’S · catálogo informativo. Compras no habilitadas hasta validar el proveedor de pagos.';
window.cc92OpenAdmin=function(){
 const session=window.CC_V53_SESSION;
 if(!session?.jwt||session.isAdmin!==true){alert('Inicia sesión con una cuenta ADMIN autorizada.');return;}
 if(!window.cc80?.open){alert('No está disponible el panel financiero. Actualiza la página.');return;}
 window.cc80.open();
 setTimeout(()=>{
  const admin=document.getElementById('cc143bonus')||document.getElementById('cc136admin');
  if(admin)admin.scrollIntoView({behavior:'smooth',block:'start'});
 },450);
};
window.cc79StreamBenefits=function(){
 if(typeof window.notify==='function')window.notify('La afiliación STREAM BULL’S se habilitará cuando el pago pueda verificarse con el proveedor.','error');
 else alert('La afiliación STREAM BULL’S todavía no permite pagos verificados.');
};

})();
