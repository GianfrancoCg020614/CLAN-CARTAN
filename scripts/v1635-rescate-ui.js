/* CLAN CARTAN · Rescate seguro de la interfaz V163.5 sobre main.
 * Recupera 4 tarjetas y modo claro/oscuro. NO modifica Auth, referidos,
 * consentimientos, billeteras, cobros, saldos ni RLS.
 */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const KEY='cc164-theme';
function theme(){
 let setting='dark';
 try{if(localStorage.getItem(KEY)==='light')setting='light';}catch(_){}
 const home=el('cc77home');
 const actions=home?.querySelector('.cc77top .cc77actions');
 if(!actions)return;
 const existing=el('cc164-theme-toggle');
 const button=existing||document.createElement('button');
 if(!existing){
  button.id='cc164-theme-toggle';
  button.type='button';
  button.className='cc164-theme-btn';
  actions.prepend(button);
 }
 function paint(){
  document.documentElement.dataset.ccTheme=setting;
  button.textContent=setting==='dark'?'☀️ Modo claro':'🌙 Modo oscuro';
  button.setAttribute('aria-pressed',String(setting==='light'));
  button.setAttribute('aria-label','Cambiar a modo '+(setting==='dark'?'claro':'oscuro'));
 }
 if(!existing)button.addEventListener('click',()=>{
  setting=setting==='dark'?'light':'dark';
  try{localStorage.setItem(KEY,setting);}catch(_){}
  paint();
 });
 paint();
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

/* V215: descripciones públicas; no se tocan botones, eventos, sesión ni navegación. */
(function(){
 'use strict';
 function update(){
  const home=document.getElementById('cc77home');
  const grid=home?.querySelector('.cc77cards');if(!grid)return;
  const data=[
   ['Control de préstamos','Administra tus préstamos, registra pagos, controla vencimientos y mantén tus cobranzas organizadas.'],
   ['Gestión de vehículos','Controla el ingreso, salida y permanencia de autos, motos y carritos, con registros organizados.'],
   ['Administración de habitaciones','Gestiona tus cuartos, inquilinos, mensualidades y pagos pendientes desde un solo lugar.']
  ];
  const cards=[...grid.querySelectorAll(':scope > .cc77card')];
  cards.slice(0,3).forEach((card,i)=>{
   const heading=card.querySelector('.cc77tag');
   const desc=card.querySelector('p');
   if(heading&&heading.textContent!==data[i][0])heading.textContent=data[i][0];
   if(desc&&desc.textContent!==data[i][1])desc.textContent=data[i][1];
  });
  const rental=grid.querySelector('.ma1611-card');
  if(rental){
   const heading=rental.querySelector('.ma1611-card-copy small');
   const desc=rental.querySelector('.ma1611-card-copy p');
   if(heading)heading.textContent='Administración de habitaciones';
   if(desc)desc.textContent=data[2][1];
  }
 }
 function init(){update();const grid=document.querySelector('#cc77home .cc77cards');if(!grid)return;
  let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;update()})}).observe(grid,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
