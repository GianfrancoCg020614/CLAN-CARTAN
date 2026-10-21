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
/* V161: componentes compartidos, sin reescribir contabilidad ni habilitar cobros.
 * Selector único de MONEDA DE VISUALIZACIÓN; importes de alquiler/préstamo
 * mantienen su propia moneda contractual y las billeteras continúan en PEN. */
function activateSharedCurrency(){
 if(document.getElementById('cc161-unified-currency-loader'))return;
 const script=document.createElement('script');
 script.id='cc161-unified-currency-loader';
 script.src='scripts/shared-currency-selector.js?v=161';
 script.onload=()=>{
  let mounting=false;
  function mount(){
   if(mounting||!window.ClanCartanCurrency)return;
   mounting=true;
   try{
    const roots=[
      ['cc77home','cc161currencyHome'],
      ['mc158body','cc161currencyCochera'],
      ['cy55subscription','cc161currencyCobra']
    ];
    for(const [parentId,id] of roots){
      const parent=document.getElementById(parentId);
      if(!parent||document.getElementById(id))continue;
      const section=document.createElement('div');
      section.id=id;
      section.dataset.ccCurrencySelector='';
      section.style.cssText='padding:8px 10px;margin:8px 0;display:flex;justify-content:flex-end';
      section.title='Moneda de visualización. No cambia el valor de saldos ni cobros.';
      parent.prepend(section);
    }
    window.ClanCartanCurrency.mountAll();
   }finally{mounting=false;}
  }
  mount();
  const observer=new MutationObserver(()=>mount());
  observer.observe(document.body,{subtree:true,childList:true});
 };
 document.head.append(script);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',activateSharedCurrency,{once:true});
else activateSharedCurrency();
