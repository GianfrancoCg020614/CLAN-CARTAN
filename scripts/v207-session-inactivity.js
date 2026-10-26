/* CLAN CARTAN V207: inactivity timeout shared across tabs, including refresh. */
(()=>{'use strict';
const LIMIT=30*60*1000,WARNING=2*60*1000,KEY='cc_v207_last_activity';
let lastWrite=0,closing=false,shown=false;
const getLast=()=>{try{return Number(localStorage.getItem(KEY))||0}catch(_){return lastWrite}};
function touch(){if(!window.CC_V53_SESSION||closing)return;const now=Date.now();if(now-lastWrite<1200)return;lastWrite=now;try{localStorage.setItem(KEY,String(now))}catch(_){}}
function overlay(){let el=document.getElementById('cc207-idle-warning');if(el)return el;el=document.createElement('div');el.id='cc207-idle-warning';el.setAttribute('role','alertdialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-labelledby','cc207-title');el.style.cssText='position:fixed;inset:0;z-index:2147483646;background:rgba(9,19,30,.72);display:none;align-items:center;justify-content:center;padding:20px';el.innerHTML='<div style="max-width:420px;width:100%;background:#fff;color:#172338;border-radius:16px;padding:26px;box-shadow:0 18px 55px #0005;font:16px system-ui,sans-serif"><h2 id="cc207-title" style="margin:0 0 12px;font-size:22px">Tu sesión está por finalizar</h2><p id="cc207-text" style="line-height:1.5">Por seguridad, se cerrará tras 30 minutos de inactividad.</p><button type="button" id="cc207-continue" style="background:#087e8b;color:white;border:0;border-radius:9px;padding:12px 18px;font-weight:700;cursor:pointer">Continuar sesión</button></div>';document.body.appendChild(el);el.querySelector('#cc207-continue').addEventListener('click',()=>{touch();hide()});return el}
function hide(){shown=false;const el=document.getElementById('cc207-idle-warning');if(el)el.style.display='none'}
async function logout(){if(closing)return;closing=true;hide();try{localStorage.removeItem(KEY)}catch(_){}if(typeof window.ccV192Logout==='function')await window.ccV192Logout();else location.reload()}
function check(){if(closing)return;const session=window.CC_V53_SESSION;const saved=getLast();if(!session){hide();return}if(!saved){touch();return}const age=Math.max(0,Date.now()-saved);if(age>=LIMIT){void logout();return}if(age>=LIMIT-WARNING){const el=overlay();el.style.display='flex';shown=true;el.querySelector('#cc207-text').textContent='Tu sesión se cerrará en '+Math.max(1,Math.ceil((LIMIT-age)/60000))+' minuto(s) por inactividad.'}else if(shown)hide()}
for(const event of ['pointerdown','keydown','touchstart','wheel'])document.addEventListener(event,e=>{if(e.isTrusted&&window.CC_V53_SESSION)touch()},{passive:true,capture:true});
document.addEventListener('cc192-session-ready',()=>{const saved=getLast();if(!saved)touch();check()});
document.addEventListener('cc192-session-ended',()=>{hide();try{localStorage.removeItem(KEY)}catch(_){}});
window.addEventListener('storage',e=>{if(e.key===KEY)check()});
window.addEventListener('focus',check);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
setInterval(check,10000);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check);else check();
})();