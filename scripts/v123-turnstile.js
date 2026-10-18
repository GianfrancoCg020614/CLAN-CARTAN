/* CLAN CARTAN V123 - Turnstile: widget opcional por claves; protección SOLO con Siteverify del servidor Supabase Auth. */
(function(){
'use strict';
const meta=document.querySelector('meta[name="cc-turnstile-sitekey"]');
const sitekey=(meta?.content||'').trim();
let widgetId=null, token='';
window.cc123CaptchaToken=function(){
 if(!sitekey)return undefined; // SIN CLAVE REAL: Supabase Auth no debe anunciar protección CAPTCHA.
 if(!token)throw Error('Completa la verificación de seguridad Cloudflare antes de continuar.');
 return token;
};
window.cc123ResetCaptcha=function(){
 token='';
 if(widgetId!==null&&window.turnstile?.reset)window.turnstile.reset(widgetId);
};
if(!sitekey)return;
const script=document.createElement('script');
script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
script.async=true;
script.onerror=()=>console.warn('No pudo cargarse Cloudflare Turnstile.');
document.head.appendChild(script);
function render(){
 const form=document.getElementById('cc-real-form');
 if(!form||widgetId!==null)return;
 if(!window.turnstile?.render){setTimeout(render,200);return;}
 const wrap=document.createElement('div');wrap.id='cc123turnstile';wrap.setAttribute('aria-label','Verificación Cloudflare');wrap.style.cssText='padding:9px 0;min-height:70px;display:flex;justify-content:center;';
 const btn=document.getElementById('cc-real-button');
 btn?.before(wrap);
 widgetId=window.turnstile.render(wrap,{sitekey,theme:'dark',size:'flexible',
  callback:t=>{token=t;},'expired-callback':()=>{token='';},'error-callback':()=>{token='';}
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
})();
