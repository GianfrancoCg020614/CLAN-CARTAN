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
   if(buttons[1]){
    if(buttons[1].textContent!=='Acceder a precio distribuidor')buttons[1].textContent='Acceder a precio distribuidor';
    // El botón conserva el flujo real de membresía, sin activación ficticia.
    buttons[1].type='button';
    buttons[1].onclick=function(event){
     event.preventDefault();
     event.stopPropagation();
     // Priorizar el panel de membresía real; no abrir el modal informativo.
     if(typeof window.cc166OpenStreamMembership==='function'){
      window.cc166OpenStreamMembership();
     }else if(!window.CC_V53_SESSION?.jwt){
      window.cc77Auth?.(false);
     }else{
      window.cc79StreamBenefits?.();
     }
    };
   }
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

// Ajustes móviles del catálogo público: sólo se activan si la vista está presente.
function polishStreamCatalog(){
 const roots=[...document.querySelectorAll('main,section,article,div')].filter(el=>
  el.children.length>0 && el.children.length<18 &&
  /CATÁLOGO PÚBLICO|BUSCA TU PRODUCTO/i.test(el.textContent||'') &&
  el.querySelector('input'));
 const search=roots.sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0];
 if(!search)return;
 const scope=search.closest('main')||search.parentElement?.parentElement;
 if(!scope||scope.id==='cc77home')return;
 scope.classList.add('cc217-stream-catalog');
 // En móviles, los accesos administrativos no deben tapar el catálogo.
 for(const btn of scope.querySelectorAll('button,a')){
  const label=(btn.textContent||'').trim();
  if(/^(abrir cobra ya|solicitudes reseller)$/i.test(label))btn.classList.add('cc217-catalog-admin-action');
 }
 const fakeNotice=[...scope.querySelectorAll('p,div,span')].find(el=>
  el.children.length===0 && /estas imágenes son SOLO ejemplos|aún no hay publicaciones activas verificadas/i.test(el.textContent||''));
 if(fakeNotice){
  fakeNotice.closest('article')?.classList.add('cc217-example-notice');
  // Si no hay publicaciones verificadas, los ejemplos no son productos disponibles.
  const section=fakeNotice.closest('section');
  if(section && /0 publicaciones verificadas/i.test(section.textContent||'')){
   section.classList.add('cc217-empty-catalog');
  }
 }
}
function installCatalogPolish(){
 if(document.getElementById('cc217-catalog-style'))return;
 const style=document.createElement('style');
 style.id='cc217-catalog-style';
 style.textContent=`
@media(max-width:700px){
.cc217-stream-catalog{max-width:100%;overflow-x:clip}
.cc217-stream-catalog button{max-width:100%;white-space:normal;overflow-wrap:anywhere}
.cc217-stream-catalog input{min-width:0;max-width:100%;box-sizing:border-box}
.cc217-stream-catalog .cc217-example-notice{border-radius:14px;box-shadow:none}
.cc217-stream-catalog h1,.cc217-stream-catalog h2{overflow-wrap:anywhere}
.cc217-stream-catalog .cc217-empty-catalog{max-width:100%;min-width:0}
.cc217-stream-catalog .cc217-empty-catalog button{min-height:42px}
.cc217-stream-catalog .cc217-empty-catalog img{max-width:100%;height:auto}
.cc217-stream-catalog .cc217-catalog-admin-action{position:static!important;inset:auto!important;transform:none!important;display:inline-flex!important;align-items:center;justify-content:center;width:auto!important;max-width:100%;font-size:clamp(12px,3.2vw,15px)!important;padding:10px 14px!important;margin:4px!important;line-height:1.3!important;vertical-align:middle}
.cc217-stream-catalog .cc217-catalog-admin-action:focus-visible{outline:2px solid #13b9ad;outline-offset:3px}
}`;
 document.head.appendChild(style);
}


// V283: selector monetario real en encabezado, usando el módulo compartido.
function ensureHomeCurrency(){
 const top=document.querySelector('#cc77home .cc77top');
 if(!top || top.querySelector('[data-cc-currency-selector]'))return;
 const holder=document.createElement('div');
 holder.className='cc283-home-currency';
 holder.setAttribute('data-cc-currency-selector','');
 holder.setAttribute('aria-label','Selector de moneda');
 const actions=top.querySelector(':scope > .cc77actions');
 if(actions)top.insertBefore(holder,actions);else top.appendChild(holder);
 const mount=()=>window.ClanCartanCurrency?.mountAll?.();
 if(window.ClanCartanCurrency){mount();return;}
 if(!document.querySelector('script[data-cc283-currency-loader]')){
  const script=document.createElement('script');
  script.src='scripts/shared-currency-selector.js';
  script.dataset.cc283CurrencyLoader='true';
  script.onload=mount;
  script.onerror=()=>{holder.textContent='Moneda no disponible';};
  document.head.appendChild(script);
 }
}

function init(){

 // V296: one final responsive theme layer, without image overlays or duplicate borders.
 if(!document.getElementById('cc296-final-style')){
  const style=document.createElement('style');
  style.id='cc296-final-style';
  style.textContent=String.raw`
  html body #cc77home#cc77home{
   background:#020d1e url('assets/clan-neon-landscape-v256.svg') center top / cover no-repeat!important;
   overflow-x:hidden!important;overscroll-behavior-x:none!important;
  }
  html body #cc77home#cc77home .cc77top{
   background:linear-gradient(115deg,rgba(0,13,27,.97),rgba(0,44,65,.94),rgba(0,16,33,.97))!important;
   border:0!important;border-bottom:2px solid #26e8f5!important;border-radius:0 0 36px 36px!important;
   box-shadow:0 8px 30px #00121fbf,0 0 16px #00eaff55!important;
  }
  html body #cc77home#cc77home .cc77intro{
   background:transparent url('assets/cc-home-cinematic-hero.avif') center center / contain no-repeat!important;
   border:0!important;outline:0!important;box-shadow:none!important;
   margin-top:6px!important;margin-bottom:12px!important;
  }
  html body #cc77home#cc77home .cc77intro::before,
  html body #cc77home#cc77home .cc77intro::after{content:none!important;display:none!important}
  html body #cc77home#cc77home .cc77cards{
   display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;
   gap:clamp(12px,1.1vw,20px)!important;align-items:stretch!important;
  }
  html body #cc77home#cc77home .cc77cards>article{
   position:relative!important;box-sizing:border-box!important;outline:none!important;
   border:2px solid #41f4ff!important;border-radius:40px!important;
   background:linear-gradient(170deg,rgba(3,37,56,.96),rgba(0,13,30,.97))!important;
   box-shadow:0 0 17px #00edff78,0 15px 25px #000a!important;
   overflow:hidden!important;
  }
  html body #cc77home#cc77home .cc77cards>article::before,
  html body #cc77home#cc77home .cc77cards>article::after{content:none!important;display:none!important}
  html body #cc77home#cc77home .cc77cards>article .cc77actions{border:0!important;box-shadow:none!important;background:transparent!important}
  html body #cc77home#cc77home .cc77cards>article button{
   border-radius:999px!important;background:linear-gradient(110deg,#00f5e4,#25c9f6)!important;
   color:#001c2a!important;cursor:pointer!important;
  }
  html body #cc77home#cc77home .cc77foot{position:relative!important;min-height:auto!important}
  html[data-cc-theme="light"] body #cc77home#cc77home{
   color:#17364a!important;background:#e8f6fb url('assets/clan-neon-landscape-v256.svg') center top / cover no-repeat!important;
  }
  html[data-cc-theme="light"] body #cc77home#cc77home .cc77top{background:linear-gradient(110deg,#e5fbffed,#b7e9f5f0,#e7f9ffee)!important}
  html[data-cc-theme="light"] body #cc77home#cc77home .cc77cards>article{
   color:#13364a!important;background:linear-gradient(160deg,#f7fffff2,#c5ebf7f4)!important;
   box-shadow:0 0 17px #008dac65,0 15px 25px #22547c26!important;
  }
  @media(max-width:1100px){
   html body #cc77home#cc77home .cc77cards{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  }
  @media(max-width:650px){
   html body #cc77home#cc77home .cc77cards{grid-template-columns:minmax(0,1fr)!important}
   html body #cc77home#cc77home .cc77intro{
    height:clamp(165px,45vw,220px)!important;
    background-image:url('assets/cc-home-cinematic-mobile.avif')!important;
   }
   html body #cc77home#cc77home .cc77cards>article{border-radius:28px!important;min-height:0!important}
   html body #cc77home#cc77home .cc77top{border-radius:0 0 22px 22px!important}
  }
  `;
  document.body.appendChild(style);
 }
 // One real currency control, never inject a competing second select.
 const top=document.querySelector('#cc77home .cc77top');
 if(top){
  const existing=top.querySelectorAll('select');
  const currencySelects=[...existing].filter(sel=>
   [...sel.options].some(opt=>opt.value==='PEN')&&
   [...sel.options].some(opt=>opt.value==='USD'));
  if(currencySelects.length===0)ensureHomeCurrency();
  else {
   const added=top.querySelector('.cc283-home-currency');
   if(added && !added.contains(currencySelects[0]))added.remove();
  }
 }
 const footer=document.querySelector('#cc77home .cc77foot');
 if(footer&&!footer.querySelector('.cc295-credit')){
  const credit=document.createElement('div');
  credit.className='cc295-credit';
  credit.textContent='Creado por CLAN CARTAN';
  credit.style.cssText='font-weight:800;letter-spacing:.11em;text-transform:uppercase;margin-top:8px;color:#57ecf6';
  footer.appendChild(credit);
 }
 const grid=document.querySelector('#cc77home .cc77cards');if(!grid)return;
 apply();
 installCatalogPolish();polishStreamCatalog();
 // El catálogo puede montarse después de la portada; observar inserciones sin bucles.
 let catalogPending=false;
 const catalogObserver=new MutationObserver(()=>{
  if(catalogPending)return;
  catalogPending=true;
  requestAnimationFrame(()=>{catalogPending=false;polishStreamCatalog();});
 });
 catalogObserver.observe(document.body,{childList:true,subtree:true});
 const obs=new MutationObserver(()=>{if(busy)return;busy=true;queueMicrotask(()=>{try{apply();}finally{busy=false;}})});
 obs.observe(grid,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
