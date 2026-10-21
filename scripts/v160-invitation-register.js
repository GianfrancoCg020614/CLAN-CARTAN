/* V160: enlace de referido → alta de nuevo RESELLER con código ya colocado.
 * Sin permisos regalados ni comisiones automáticas. No altera cuentas existentes.
 */
(function(){
 'use strict';
 const valid=/^(COBRA|BULL|COCHERA)[1-9][0-9]{0,11}$/;
 function setup(){
   const params=new URLSearchParams(window.location.search);
   const code=String(params.get('ref')||'').trim().toUpperCase();
   if(!valid.test(code))return;
   const input=document.getElementById('cc110-invite');
   const kind=document.getElementById('cc111-business');
   const help=document.getElementById('cc110-invite-hint');
   if(!input||!kind)return;
   input.value=code;
   const business=code.startsWith('COCHERA')?'MI_COCHERA':code.startsWith('BULL')?'STREAM_BULLS':'COBRA_YA';
   kind.value=business;
   if(help)help.textContent='Invitación '+code+' cargada. Completa tu registro; se verificará antes de crear la cuenta.';
   const session=window.CC_V53_SESSION;
   if(session?.jwt)return; // nunca cerrar sesión ni iniciar otro registro sobre una sesión activa
   if(typeof window.cc77Auth==='function'){
     window.cc77Auth(true);
     const email=document.getElementById('cc-real-email');
     if(email)email.focus({preventScroll:true});
   }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});
 else setup();
})();