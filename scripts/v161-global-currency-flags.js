/* V161 · Monedas internacionales con bandera en toda la interfaz.
   ÚNICAMENTE presentación: no modifica códigos ISO, valores, saldos, tasas ni operaciones. */
(function(){
'use strict';
const names=Object.freeze({
 PEN:['🇵🇪','Sol peruano'],USD:['🇺🇸','Dólar estadounidense'],EUR:['🇪🇺','Euro'],
 MXN:['🇲🇽','Peso mexicano'],CLP:['🇨🇱','Peso chileno'],COP:['🇨🇴','Peso colombiano'],
 ARS:['🇦🇷','Peso argentino'],BOB:['🇧🇴','Boliviano'],BRL:['🇧🇷','Real brasileño'],
 UYU:['🇺🇾','Peso uruguayo'],PYG:['🇵🇾','Guaraní'],CAD:['🇨🇦','Dólar canadiense'],
 GBP:['🇬🇧','Libra esterlina'],GTQ:['🇬🇹','Quetzal'],CRC:['🇨🇷','Colón costarricense'],
 DOP:['🇩🇴','Peso dominicano'],VES:['🇻🇪','Bolívar venezolano'],USDT:['🪙','Tether USDT']
});
const hasFlag=/\p{Regional_Indicator}|\p{Extended_Pictographic}/u;
const labels=code=>names[code]?names[code][0]+' '+code+' — '+names[code][1]:code;
window.CC_CURRENCY_FLAGS=names;
window.cc161CurrencyLabel=labels;
function enrichOption(option){
 const code=String(option.value||'').trim().toUpperCase();
 if(!names[code])return;
 const current=option.textContent.trim();
 if(hasFlag.test(current))return;
 // Conservar etiquetas específicas de negocio, código ISO y valor original.
 option.textContent=names[code][0]+' '+current;
}
function enrichText(el){
 if(!el||el.children.length||el.isContentEditable)return;
 const code=(el.textContent||'').trim().toUpperCase();
 if(!Object.prototype.hasOwnProperty.call(names,code))return;
 if(el.closest('button,[role=button],code,pre,[data-no-currency-flag]'))return;
 el.textContent=names[code][0]+' '+code;
}
function process(root){
 const parent=root?.nodeType===1?root:document;
 if(parent.matches?.('option'))enrichOption(parent);
 if(parent.matches?.('td,th,[data-currency-code]'))enrichText(parent);
 parent.querySelectorAll?.('select option').forEach(enrichOption);
 parent.querySelectorAll?.('td,th,[data-currency-code]').forEach(enrichText);
}
let queued=false;
function schedule(){
 if(queued)return;queued=true;
 requestAnimationFrame(()=>{queued=false;process(document);});
}
function init(){
 process(document);
 const observer=new MutationObserver(changes=>{
  if(changes.some(c=>c.type==='childList'&&c.addedNodes.length||c.type==='attributes'&&c.attributeName==='value'))schedule();
 });
 observer.observe(document.body,{subtree:true,childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
