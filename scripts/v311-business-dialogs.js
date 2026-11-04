/* V311: navegación de formularios existentes, sin permisos ni operaciones de datos. */
(function(){
'use strict';
if(window.cc311BusinessDialogsLoaded)return;window.cc311BusinessDialogsLoaded=true;
const specs=[['cy152modal','cy53close'],['mc158dialog','mc158close'],['ma1612dialog','ma1611close'],['ma3dialog','ma1611close'],['sb317dialog','sb195-attention']];
const records=new Map();let trigger=null,triggerAt=0;
const visible=node=>!!node?.isConnected&&node.getBoundingClientRect().width>0&&getComputedStyle(node).visibility!=='hidden';
const focusable=root=>[...root.querySelectorAll('button,input:not([type="hidden"]),select,textarea,a[href],[tabindex]')]
 .filter(node=>visible(node)&&!node.disabled&&node.tabIndex>=0&&!node.closest('[hidden],[inert]'));
const current=()=>[...document.querySelectorAll(specs.map(([id])=>'#'+id).join(','))].filter(visible).at(-1);
function scan(){
 let restore=null;
 for(const [node,record] of records){if(!node.isConnected){records.delete(node);restore=record;}}
 for(const [id,fallback] of specs){
  const node=document.getElementById(id);if(!node||records.has(node))continue;
  const panel=node.querySelector('[role="dialog"]')||node.querySelector('section');if(!panel)continue;
  const opener=Date.now()-triggerAt<1500&&trigger?.isConnected?trigger:document.activeElement;
  records.set(node,{opener,fallback});node.style.setProperty('z-index','2147483647','important');
  panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.tabIndex=-1;
  if(!panel.hasAttribute('aria-label'))panel.setAttribute('aria-label',panel.querySelector('h3')?.textContent||'Formulario');
  const close=panel.querySelector('header button');if(close){close.setAttribute('aria-label','Cerrar formulario');close.title='Cerrar formulario';close.dataset.cc311Close='';}
  const field=focusable(panel).find(el=>el.matches('input,select,textarea'));
  (field||focusable(panel)[0]||panel).focus({preventScroll:true});
 }
 if(restore&&!current()){
  const target=visible(restore.opener)&&restore.opener!==document.body&&restore.opener!==document.documentElement?restore.opener:document.getElementById(restore.fallback);
  if(visible(target))target.focus({preventScroll:true});
 }
}
function init(){
 const style=document.createElement('style');style.id='cc311-dialog-style';
 style.textContent='#cy152modal [data-cc311-close],#mc158dialog [data-cc311-close],#ma1612dialog [data-cc311-close],#ma3dialog [data-cc311-close],#sb317dialog [data-cc311-close]{min-width:44px;min-height:44px}[data-cc311-close]:focus-visible{outline:2px solid #55d3d2;outline-offset:3px}';document.head.append(style);
 document.addEventListener('click',event=>{const button=event.target.closest('button,a[href]');if(button){trigger=button;triggerAt=Date.now();}},true);
 document.addEventListener('keydown',event=>{
  const node=current();if(!node||!['Escape','Tab'].includes(event.key))return;
  const panel=node.querySelector('[role="dialog"]');if(!panel)return;
  if(event.key==='Escape'){
   const close=panel.querySelector('[data-cc311-close]');if(!close)return;
   event.preventDefault();event.stopImmediatePropagation();close.click();return;
  }
  const items=focusable(panel),first=items[0],last=items.at(-1);
  if(!items.length){event.preventDefault();panel.focus();return;}
  if(!panel.contains(document.activeElement)||event.shiftKey&&document.activeElement===first||!event.shiftKey&&document.activeElement===last){
   event.preventDefault();(event.shiftKey?last:first).focus();
  }
 },true);
 new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});scan();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
