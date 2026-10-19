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
})();
