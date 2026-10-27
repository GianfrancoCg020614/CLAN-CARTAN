/* V217 · Aplicar portada aprobada sin sustituir controles, enlaces ni funciones originales. */
(function(){
'use strict';
const names=[
 {key:'cobra',matcher:/cobra\s*ya|cobraya/i,title:'COBRA YA',tag:'Control de préstamos',description:'Administra tus préstamos, registra pagos, controla vencimientos y mantén tus cobranzas organizadas.'},
 {key:'cochera',matcher:/mi\s*cochera/i,title:'MI COCHERA',tag:'Gestión de vehículos',description:'Controla el ingreso, salida y permanencia de autos, motos y carritos con registros organizados.'},
 {key:'alquiler',matcher:/mi\s*alquiler/i,title:'MI ALQUILER',tag:'Administración de habitaciones',description:'Gestiona tus cuartos, inquilinos, mensualidades y pagos pendientes desde un solo lugar.'},
 {key:'stream',matcher:/stream\s*bull/i,title:"STREAM BULL'S",tag:'Entretenimiento y servicios digitales',description:'Netflix, HBO, Disney+, YouTube, ChatGPT y otras plataformas desde un solo catálogo.'}
];
let busy=false;
function apply(){
 const home=document.getElementById('cc77home');const grid=home?.querySelector('.cc77cards');if(!grid)return;
 const intro=home.querySelector('.cc77intro');
 if(intro){
  const title=intro.querySelector('h1');const lead=intro.querySelector('p');
  if(title&&title.textContent!=='CLAN CARTAN')title.textContent='CLAN CARTAN';
  if(lead&&lead.textContent!=='Soluciones digitales para tu día a día')lead.textContent='Soluciones digitales para tu día a día';
 }
 const found={};
 for(const card of [...grid.children]){
  const heading=card.querySelector('h2');if(!heading)continue;
  const current=heading.textContent||'';
  const item=names.find(n=>n.matcher.test(current));if(!item)continue;
  found[item.key]=card;
  card.classList.add('cc217-'+item.key);
  if(heading.textContent!==item.title)heading.textContent=item.title;
  const tag=card.querySelector('.cc77tag,.ma1611-card-copy small');
  if(tag&&tag.textContent!==item.tag)tag.textContent=item.tag;
  const desc=card.querySelector('.cc78service + p,.ma1611-card-copy p');
  if(desc&&desc.textContent!==item.description)desc.textContent=item.description;
  if(item.key==='stream'){
   const buttons=card.querySelectorAll('.cc77actions button');
   if(buttons[0]&&buttons[0].textContent!=='Ver catálogo público')buttons[0].textContent='Ver catálogo público';
   if(buttons[1]&&buttons[1].textContent!=='Acceder a precio distribuidor')buttons[1].textContent='Acceder a precio distribuidor';
  }else{
   const button=card.querySelector('.cc77actions button,.ma1611-card-copy button,.ma1611-card > button');
   if(button&&button.textContent!=='Ingresar')button.textContent='Ingresar';
  }
 }
 // Mover los elementos originales conserva sus onclick, datos, permisos y referencias.
 const ordered=names.map(n=>found[n.key]).filter(Boolean);
 const actual=[...grid.children].filter(c=>ordered.includes(c));
 if(ordered.length>=3&&!ordered.every((node,i)=>actual[i]===node))ordered.forEach(node=>grid.appendChild(node));
}
function init(){
 const grid=document.querySelector('#cc77home .cc77cards');if(!grid)return;
 apply();
 const obs=new MutationObserver(()=>{if(busy)return;busy=true;queueMicrotask(()=>{try{apply();}finally{busy=false;}})});
 obs.observe(grid,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
