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

/* V216: textos correctos por negocio, nunca por posición. */
(function(){
'use strict';
const records=[
 {test:/stream\s*bull/i,tag:'Entretenimiento digital',desc:'Netflix, HBO, Disney+, YouTube, ChatGPT y más plataformas en un solo catálogo.'},
 {test:/cobra\s*ya|cobraya/i,tag:'Control de préstamos',desc:'Administra préstamos, pagos, vencimientos y cobranzas de forma organizada.'},
 {test:/mi\s*cochera/i,tag:'Control de vehículos',desc:'Registra y controla autos, motos y carritos, sus ingresos y salidas.'},
 {test:/mi\s*alquiler/i,tag:'Gestión de habitaciones',desc:'Administra cuartos, inquilinos, mensualidades y pagos pendientes.'}
];
function update(){
 const grid=document.querySelector('#cc77home .cc77cards');if(!grid)return;
 for(const card of grid.children){
  const h=card.querySelector('h2');const name=h?.textContent||'';
  const record=records.find(r=>r.test.test(name));if(!record)continue;
  const tag=card.querySelector('.cc77tag,.ma1611-card-copy small');
  const p=card.querySelector('.cc77card > p,.ma1611-card-copy p,.cc77service-desc');
  if(tag&&tag.textContent!==record.tag)tag.textContent=record.tag;
  if(p&&p.textContent!==record.desc)p.textContent=record.desc;
 }
}
function init(){update();const grid=document.querySelector('#cc77home .cc77cards');if(!grid)return;let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;update()})}).observe(grid,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
