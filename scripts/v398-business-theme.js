/* V398: shared visual preference only. No Auth, financial data or API requests. */
(function(){
'use strict';
if(window.CCTheme)return;
const KEY='cc164-theme',media=window.matchMedia('(prefers-color-scheme: dark)');
let explicit=null;
try{const saved=localStorage.getItem(KEY);if(saved==='light'||saved==='dark')explicit=saved;}catch{}
let value=explicit||(media.matches?'dark':'light'),scheduled=false;
function paintButton(b){
 const next=value==='dark'?'light':'dark',label='Cambiar a modo '+(next==='light'?'día':'noche');
 if(b.dataset.themeIcon!==next){
  const icon=window.CCIcons?.node(next==='light'?'sun':'moon');
  const text=next==='light'?'Día':'Noche';
  b.replaceChildren(icon|| (next==='light'?'☀':'☾'),text);
  b.dataset.themeIcon=next;
 }
 if(b.getAttribute('aria-label')!==label)b.setAttribute('aria-label',label);
 if(b.title!==label)b.title=label;
 if(b.getAttribute('aria-pressed')!==String(value==='light'))b.setAttribute('aria-pressed',String(value==='light'));
}
function apply(){
 document.documentElement.dataset.ccTheme=value;
 document.querySelectorAll('[data-cc-theme-toggle]').forEach(paintButton);
 window.dispatchEvent(new CustomEvent('cc-theme-change',{detail:{theme:value}}));
}
function set(next,persist=true){
 if(next!=='light'&&next!=='dark')return;
 if(persist){explicit=next;try{localStorage.setItem(KEY,next);}catch{}}
 value=next;apply();
}
function ensure(){
 scheduled=false;
 for(const [selector,hostSelector]of [
  ['#mc158layer','.mc395-toolbar'],['#cy53layer.cy371-layer','.cy371-main'],
  ['#ma1611layer.ma388-layer','.ma1612-top,.ma3-header,.ma4-head'],['#cc166-panel','#cc166-top-actions']
 ]){
  const root=document.querySelector(selector);if(!root)continue;
  let button=root.querySelector('[data-cc-theme-toggle]');
  if(!button){
   let host=root.querySelector(hostSelector);if(!host&&root.id==='ma1611layer')host=root.querySelector('#ma1611content');if(!host)continue;
   button=document.createElement('button');button.type='button';button.className='cc398-theme-button';button.setAttribute('data-cc-theme-toggle','');
   if(host.matches('.cy371-main,#ma1611content')){const bar=document.createElement('div');bar.className='cc398-theme-bar';bar.append(button);host.prepend(bar);}else host.append(button);
  }
  if(root.id==='ma1611layer'){
   const header=root.querySelector(hostSelector);if(header){let group=header.querySelector('.cc401-tools');if(!group){group=document.createElement('div');group.className='cc401-tools';const refresh=header.querySelector('[data-ma-action=reload],[data-ma3-action=refresh],[data-ma4-action=refresh]');if(refresh)group.append(refresh);header.append(group);}if(button.parentElement!==group)group.append(button);}
  }
  paintButton(button);
 }
 for(const group of document.querySelectorAll('.cc-wallet-overview'))group.classList.toggle('cc401-wide-values',[...group.querySelectorAll('.cc-wallet-tile strong')].some(n=>n.textContent.trim().length>12));
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(ensure);}}
window.CCTheme=Object.freeze({get:()=>value,set,toggle:()=>set(value==='dark'?'light':'dark')});
apply();
window.addEventListener('storage',e=>{if(e.key!==KEY)return;explicit=e.newValue==='light'||e.newValue==='dark'?e.newValue:null;set(explicit||(media.matches?'dark':'light'),false);});
media.addEventListener('change',()=>{if(!explicit)set(media.matches?'dark':'light',false);});
function init(){
 document.addEventListener('click',e=>{const b=e.target.closest('[data-cc-theme-toggle]');if(!b)return;e.preventDefault();window.CCTheme.toggle();});
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});ensure();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
