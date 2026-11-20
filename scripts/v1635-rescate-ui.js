/* CLAN CARTAN · Rescate seguro de la interfaz V163.5 sobre main.
 * Recupera 4 tarjetas y modo claro/oscuro. NO modifica Auth, referidos,
 * consentimientos, billeteras, cobros, saldos ni RLS.
 */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const KEY='cc164-theme';
function theme(){
 const actions=el('cc77home')?.querySelector('.cc77top .cc77actions');if(!actions)return;
 let button=el('cc164-theme-toggle');if(!button){button=document.createElement('button');button.id='cc164-theme-toggle';button.type='button';button.className='cc164-theme-btn';actions.prepend(button);}
 // Same controller and existing preference for the homepage and all businesses.
 if(window.CCTheme){button.setAttribute('data-cc-theme-toggle','');window.CCTheme.set(window.CCTheme.get(),false);return;}
 let setting='dark';try{if(localStorage.getItem(KEY)==='light')setting='light';}catch{}
 const paint=()=>{document.documentElement.dataset.ccTheme=setting;button.textContent=setting==='dark'?'☀ Día':'☾ Noche';button.setAttribute('aria-label','Cambiar a modo '+(setting==='dark'?'día':'noche'));};
 button.onclick=()=>{setting=setting==='dark'?'light':'dark';try{localStorage.setItem(KEY,setting);}catch{}paint();};paint();
}
function rentalCard(){
 const card=el('ma1611card');
 if(!card||card.dataset.cc164Updated==='true')return;
 const desc=card.querySelector('.ma1611-card-copy p');
 if(desc)desc.textContent='Administra habitaciones y locales, inquilinos, contratos, pagos, medidores y vencimientos. Consulta avisos y reportes desde una sola cuenta.';
 const eyebrow=card.querySelector('.ma1611-card-copy small');
 if(eyebrow)eyebrow.textContent='GESTIÓN DE INMUEBLES · CONTRATOS Y COBROS';
 // No modificar botones del negocio ni activar transacciones financieras.
 card.dataset.cc164Updated='true';
}
function init(){
 theme();
 rentalCard();
 const home=el('cc77home');
 const cards=home?.querySelector('.cc77cards');
 if(!cards)return;
 const observer=new MutationObserver(()=>rentalCard());
 observer.observe(cards,{childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();

