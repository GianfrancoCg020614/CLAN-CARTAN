/* CLAN CARTAN V163.5 · cuatro negocios, tema claro/oscuro y vista unificada del saldo REAL.
 * No modifica fondos, no concede permisos, no envía publicidad, no afecta contabilidad.
 */
(function(){
'use strict';
const by=id=>document.getElementById(id);
const labels=Object.freeze([
 ['STREAM_BULLS',"STREAM BULL'S"],
 ['COBRA_YA','COBRA YA'],
 ['MI_COCHERA','MI COCHERA'],
 ['MI_ALQUILER','MI ALQUILER']
]);
const cash=v=>'S/ '+(v/100).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const safeStore=(key,value)=>{
 try{if(value===undefined)return window.localStorage.getItem(key);window.localStorage.setItem(key,value);}catch(_){return null;}
 return value;
};
function theme(){
 const key='cc164-theme',stored=safeStore(key);
 let current=stored==='light'?'light':'dark';
 const root=document.documentElement;
 const apply=()=>{
  root.dataset.ccTheme=current;
  const button=by('cc164-theme-toggle');
  if(button){
   button.textContent=current==='dark'?'☀️ Modo claro':'🌙 Modo oscuro';
   button.setAttribute('aria-label','Cambiar a modo '+(current==='dark'?'claro':'oscuro'));
   button.setAttribute('aria-pressed',String(current==='light'));
  }
 };
 const controls=by('cc77home')?.querySelector('.cc77top .cc77actions');
 if(controls&&!by('cc164-theme-toggle')){
  const toggle=document.createElement('button');
  toggle.id='cc164-theme-toggle';toggle.type='button';toggle.className='cc164-theme-btn';
  toggle.addEventListener('click',()=>{
   current=current==='dark'?'light':'dark';safeStore(key,current);apply();
  });
  controls.prepend(toggle);
 }
 apply();
}
function consentGate(){
 const terms=by('cc-v81-terms'),privacy=by('cc164-privacy'),btn=by('cc-real-button'),toggle=by('cc-register-toggle');
 if(!terms||!privacy||!btn||!toggle)return;
 const update=()=>{
  const register=btn.textContent.includes('Registrar mi cuenta');
  const blocked=register&&(!(terms.checked&&privacy.checked)||window.CC_PART1_SIGNUP_PENDING===true);
  btn.disabled=blocked;
  btn.setAttribute('aria-disabled',String(blocked));
 };
 terms.addEventListener('change',update);privacy.addEventListener('change',update);
 toggle.addEventListener('click',()=>queueMicrotask(update));
 window.ccParte1SyncRegisterButton=update;
 const observer=new MutationObserver(update);
 observer.observe(btn,{childList:true,subtree:true});
 update();
}
function rentalCard(){
 const card=by('ma1611card');if(!card||card.dataset.cc164Updated==='true')return;
 const paragraph=card.querySelector('.ma1611-card-copy p');
 if(paragraph)paragraph.textContent='Administra habitaciones y locales, inquilinos, contratos, pagos, medidores y vencimientos. Consulta avisos y reportes desde una sola cuenta.';
 const eyebrow=card.querySelector('.ma1611-card-copy small');
 if(eyebrow)eyebrow.textContent='GESTIÓN DE INMUEBLES · CONTRATOS Y COBROS';
 card.dataset.cc164Updated='true';
}
function walletShell(){
 const shell=by('cc95-user');
 if(!shell||!window.CC_V53_SESSION?.jwt)return null;
 let wrap=by('cc164-wallet');
 if(wrap)return wrap;
 wrap=document.createElement('section');wrap.id='cc164-wallet';wrap.className='cc164-wallet';
 wrap.setAttribute('aria-label','Billetera visual unificada; solo saldos reales verificados');
 wrap.innerHTML='<div class="cc164-wallet-top"><div><span class="cc164-kicker">MI SALDO REAL TOTAL</span><strong id="cc164-total">Consultando…</strong></div><button type="button" id="cc164-wallet-reload" aria-label="Actualizar saldo real" title="Actualizar saldos">↻</button></div>'+
 '<div class="cc164-balances" id="cc164-wallet-breakdown"></div><small class="cc164-wallet-note">Solo saldo real verificado · PEN. No incluye bonos de activación, recompensas pendientes ni recargas sin aprobar.</small>';
 const old=by('cc116-account-balances');
 if(old)old.after(wrap);else shell.append(wrap);
 by('cc164-wallet-reload').addEventListener('click',()=>{void refreshWallet();});
 return wrap;
}
let request=0;
async function refreshWallet(){
 const session=window.CC_V53_SESSION,host=walletShell();
 if(!session?.jwt||!session.userId||!host)return;
 const identity=session.userId,id=++request,reload=by('cc164-wallet-reload');
 if(reload)reload.disabled=true;
 const total=by('cc164-total');if(total)total.textContent='Actualizando…';
 try{
  const rows=await window.cc80.api('cc_real_service_wallets?select=service,balance_pen&user_id=eq.'+encodeURIComponent(identity));
  if(id!==request||window.CC_V53_SESSION?.userId!==identity)return;
  if(!Array.isArray(rows))throw Error('No se pudieron verificar los saldos');
  const amounts=new Map();
  for(const row of rows){
   if(!labels.some(([key])=>key===row.service))continue;
   const amount=Number(row.balance_pen);
   if(!Number.isFinite(amount)||amount<0||!Number.isSafeInteger(Math.round(amount*100)))throw Error('Saldo incompatible');
   amounts.set(row.service,Math.round(amount*100));
  }
  const sum=labels.reduce((a,[key])=>a+(amounts.get(key)||0),0);
  total.textContent=cash(sum);
  const list=by('cc164-wallet-breakdown');list.replaceChildren();
  for(const [key,name] of labels){
   const row=document.createElement('div');row.className='cc164-balance';
   const label=document.createElement('span');label.textContent=name;
   const value=document.createElement('strong');value.textContent=cash(amounts.get(key)||0);
   row.append(label,value);list.append(row);
  }
  host.classList.add('cc164-wallet-loaded');
  const old=by('cc116-account-balances');if(old)old.hidden=true;
 }catch(_){
  if(id!==request||window.CC_V53_SESSION?.userId!==identity)return;
  total.textContent='No disponible';
  const list=by('cc164-wallet-breakdown');if(list)list.textContent='No fue posible consultar los saldos. Usa ↻ para reintentar.';
  const old=by('cc116-account-balances');if(old)old.hidden=false;
 }finally{if(id===request&&reload)reload.disabled=false;}
}
function afterLogin(){walletShell();void refreshWallet();rentalCard();}
window.cc164AfterLogin=afterLogin;
window.cc164RefreshRealWallet=refreshWallet;
function previewBanner(){
 if(!window.CC_P1_IS_PREVIEW)return;
 const host=by('cc-real-login')?.querySelector('.cc-authbox');
 if(!host||by('cc-p1-preview-info'))return;
 const section=document.createElement('aside');
 section.id='cc-p1-preview-info';
 const title=document.createElement('strong');title.textContent='PARTE 1/7 · VISTA PREVIA SEGURA';
 const paragraph=document.createElement('p');
 paragraph.textContent='Esta vista mantiene el diseño de CLAN CARTAN. Las operaciones de cuenta real no se prueban aquí: aún falta conectar un Supabase de pruebas aislado.';
 const a=document.createElement('a');a.href='/pruebas/parte1.html';
 a.textContent='Abrir formulario de prueba sin datos reales ↗';
 section.append(title,paragraph,a);host.prepend(section);
}
function init(){
 theme();consentGate();rentalCard();previewBanner();
 const home=by('cc77home');
 if(home){
  const watch=new MutationObserver(()=>rentalCard());
  const cards=home.querySelector('.cc77cards');
  if(cards)watch.observe(cards,{childList:true});
 }
 if(window.CC_V53_SESSION?.jwt)afterLogin();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();