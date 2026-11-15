/* V391: public USD reference only. No wallet, checkout, credentials or financial writes. */
(function(){
'use strict';
if(window.cc391Usd)return;
const ENDPOINT='https://open.er-api.com/v6/latest/USD',KEY='cc391:usd-pen',MAX_AGE=36*3600000;
let quote=null,inFlight=null,retryAt=0;
const nodes=new Set();
const valid=(q,now=Date.now())=>!!q&&Number.isFinite(q.penPerUsd)&&q.penPerUsd>0&&q.penPerUsd<1000&&Number.isFinite(q.asOf)&&q.asOf<=now+300000&&now-q.asOf<=MAX_AGE&&Number.isFinite(q.next)&&q.next>q.asOf&&q.next-q.asOf<=48*3600000;
const fresh=q=>valid(q)&&Date.now()<Math.min(q.next+300000,q.asOf+MAX_AGE);
const date=q=>new Intl.DateTimeFormat('es-PE',{dateStyle:'short',timeStyle:'short',timeZone:'America/Lima'}).format(new Date(q.asOf))+' (Lima)';
function formatPen(pen){return fresh(quote)&&Number.isFinite(Number(pen))&&Number(pen)>=0?'≈ US$ '+(Number(pen)/quote.penPerUsd).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):null;}
function paint(){
 for(const node of nodes){
  if(!node.isConnected){nodes.delete(node);continue;}
  const value=node.dataset.cc391Pen,hasValue=value!==undefined&&value!==''&&Number.isFinite(Number(value))&&Number(value)>=0;
  const message=node.dataset.cc391Rate!==undefined?(fresh(quote)?'US$ 1 = S/ '+quote.penPerUsd.toLocaleString('es-PE',{maximumFractionDigits:6})+' · '+date(quote)+' · Referencial; el cobro se realiza en soles.':'Tipo de cambio no disponible. El precio y el cobro en soles se mantienen.'):(hasValue?(formatPen(Number(value))||'USD referencial no disponible'):'Ingresa el precio en soles');
  if(node.textContent!==message)node.textContent=message;
 }
}
async function ensure(){
 if(fresh(quote)){paint();return quote;}
 if(inFlight)return inFlight;
 if(Date.now()<retryAt){paint();return null;}
 quote=null;paint();
 inFlight=Promise.resolve().then(async()=>{
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),6000);
  try{
   const response=await fetch(ENDPOINT,{signal:ctl.signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok)throw Error('Exchange source unavailable');
   const data=await response.json();
   const q={penPerUsd:data.rates?.PEN,asOf:data.time_last_update_unix*1000,next:data.time_next_update_unix*1000};
   if(data.result!=='success'||data.base_code!=='USD'||!fresh(q))throw Error('Invalid or outdated exchange quote');
   quote=q;retryAt=0;try{localStorage.setItem(KEY,JSON.stringify(q));}catch(_){}
   return q;
  }catch(_){retryAt=Date.now()+3600000;return null;}
  finally{clearTimeout(timer);inFlight=null;paint();}
 });return inFlight;
}
function amount(pen){const node=document.createElement('span');node.className='cc391-usd';node.dataset.cc391Pen=pen==null?'':String(pen);nodes.add(node);node.textContent='USD referencial: consultando…';queueMicrotask(()=>{paint();void ensure();});return node;}
function bind(input){const node=amount(input.value);input.addEventListener('input',()=>{node.dataset.cc391Pen=input.value;paint();});return node;}
function note(){const wrap=document.createElement('div');wrap.className='cc391-rate-note';const line=document.createElement('small');line.dataset.cc391Rate='';nodes.add(line);wrap.append(line);const source=document.createElement('a');source.href='https://www.exchangerate-api.com';source.target='_blank';source.rel='noopener noreferrer';source.textContent='Rates By Exchange Rate API';wrap.append(source);queueMicrotask(()=>{paint();void ensure();});return wrap;}
try{const cached=JSON.parse(localStorage.getItem(KEY)||'null');if(fresh(cached))quote=cached;}catch(_){}
const refresh=()=>{if(!document.hidden&&[...nodes].some(n=>n.isConnected))void ensure();};
window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);setInterval(refresh,60000);
window.cc391Usd=Object.freeze({amount,bind,note,ensure,formatPen});
})();
