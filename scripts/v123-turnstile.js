/* V305: real Cloudflare widget, reused by Supabase Auth; no secret in the browser.
 * Supabase CAPTCHA must also be enabled in Auth > Bot and Abuse Protection. */
(function(){
'use strict';
const sitekey=document.querySelector('meta[name="cc-turnstile-sitekey"]')?.content.trim();
const widgets=new Map();let loading=null,lastUsed='auth';
const shown=e=>!!e&&getComputedStyle(e).display!=='none';
function destination(){
 const recovery=document.getElementById('cc86-recovery');
 if(shown(recovery)&&document.getElementById('cc86-email')?.required)
  return {key:'recovery',anchor:recovery.querySelector('.cc86-actions')};
 const gate=document.getElementById('cc-real-login');
 if(shown(gate))return {key:'auth',anchor:document.getElementById('cc-real-button')};
 return null;
}
window.cc123CaptchaToken=function(){
 if(!sitekey)return undefined;
 const key=destination()?.key||'auth',widget=widgets.get(key);lastUsed=key;
 if(!widget?.token)throw Error('Completa la verificación de seguridad Cloudflare antes de continuar.');
 return widget.token;
};
window.cc123ResetCaptcha=function(key=lastUsed){
 const widget=widgets.get(key);if(!widget)return;
 widget.token='';
 if(widget.id!==undefined&&window.turnstile?.reset)window.turnstile.reset(widget.id);
};
if(!sitekey)return;
function load(){
 if(window.turnstile?.render)return Promise.resolve();
 if(loading)return loading;
 loading=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async=true;script.defer=true;
  script.onload=resolve;script.onerror=()=>{loading=null;reject(Error('Turnstile no disponible'));};
  document.head.append(script);
 });return loading;
}
function mount(){
 const dest=destination();if(!dest?.anchor||widgets.has(dest.key))return;
 const wrap=document.createElement('div');wrap.className='cc305-captcha';
 wrap.id=dest.key==='auth'?'cc123turnstile':'cc123turnstile-recovery';
 wrap.setAttribute('aria-label','Verificación de seguridad Cloudflare');
 const note=document.createElement('small');note.className='cc305-captcha-note';note.textContent='Verificación de seguridad';
 const target=document.createElement('div');wrap.append(note,target);dest.anchor.before(wrap);
 const widget={id:undefined,token:'',wrap};widgets.set(dest.key,widget);
 load().then(()=>{
  if(!target.isConnected)return;
  widget.id=window.turnstile.render(target,{sitekey,language:'es',theme:'auto',
   size:wrap.clientWidth<300?'compact':'flexible',
   callback:token=>{widget.token=token;note.textContent='Verificación de seguridad';},
   'expired-callback':()=>{widget.token='';note.textContent='La verificación venció. Complétala nuevamente.';},
   'error-callback':()=>{widget.token='';note.textContent='No se pudo verificar. Comprueba tu conexión y vuelve a intentarlo.';}
  });
 }).catch(()=>{
  note.textContent='No se pudo cargar la verificación. Comprueba tu conexión.';
  const retry=document.createElement('button');retry.type='button';retry.className='cc305-captcha-retry';retry.textContent='Reintentar verificación';
  retry.addEventListener('click',()=>{widgets.delete(dest.key);wrap.remove();mount();});wrap.append(retry);
 });
}
function init(){
 for(const id of ['cc-real-login','cc86-recovery']){
  const box=document.getElementById(id);if(box)new MutationObserver(mount).observe(box,{attributes:true,attributeFilter:['style','hidden']});
 }
 document.getElementById('cc86-forgot')?.addEventListener('click',()=>queueMicrotask(mount));
 mount();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
