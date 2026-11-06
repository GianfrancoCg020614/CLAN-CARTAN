// Módulos reales; todos los datos y guardados se simulan. Nunca se conecta a Supabase.
import fs from 'node:fs';
import {businessDialogFixture} from './fixture-v311-business-dialogs.mjs';
const read=p=>fs.readFileSync(p,'utf8');
export function usabilityFixture(kind='cochera'){
 let html=businessDialogFixture(kind==='cochera'?'cochera':'alquiler');html=html.slice(0,html.lastIndexOf('<script>'));
 if(kind==='contabilidad')html+='<style>'+read('styles/v161-3-mi-alquiler.css')+'</style><script>'+read('scripts/v161-3-mi-alquiler.js')+'</script>';
 if(kind==='avisos')html+='<style>'+read('styles/v161-4-mi-alquiler.css')+'</style><script>'+read('scripts/v161-4-mi-alquiler.js')+'</script>';
 const common=`const wait=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],checks={};const input=(el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));};`;
 const probes={cochera:`
 const carts=[{id:1,alias:'José',state:'ACTIVE',owner_person_id:'p1',worker_person_id:'p2',daily_rate:4,currency:'PEN',business_type:'Emoliente'},{id:2,alias:'Ana',state:'RETIRED',owner_person_id:'p3',daily_rate:4,currency:'PEN',business_type:'Frutas'}];
 const people=[{id:'p1',full_name:'José Pérez',phone:'123'},{id:'p2',full_name:'Trabajador',phone:'+51987654321'},{id:'p3',full_name:'Ana'}];let changeResolve,saveResolve,staleResolve,hold=false,calls=0;
 const base=cc80.api;cc80.api=async(p,m,b)=>{
 if(p==='rpc/mc_change_cart_state'){calls++;return new Promise(r=>changeResolve=()=>{carts[0].state=b.p_new_state;r([]);});}
 if(p==='rpc/mc_create_cart'){calls++;return new Promise(r=>saveResolve=()=>r(3));}
 if(p==='rpc/cc_finance_wallet')return {balance_pen:22,pending_reversal_pen:5,available_pen:17};
 if(p.startsWith('mc_carts?')){if(hold){hold=false;return new Promise(r=>staleResolve=r);}return CC_V53_SESSION.userId==='new-user'?[{...carts[0],alias:'Cuenta nueva'}]:carts.map(c=>({...c}));}
 if(p.startsWith('mc_people?'))return people;if(p.startsWith('mc_movements?'))return [{cart_id:1,amount_local:12}];return base(p,m,b);};
 window.confirm=()=>true;const badge=document.createElement('span');badge.id='mc158-home-wallet';document.body.append(badge);
 await mc158Open();await wait(40);checks.realBalance=badge.textContent.includes('17.00');
 const search=q('#mc158search');input(search,'José');checks.accents=all('.mc158cart').length===1;checks.sameInput=q('#mc158search')===search;
 input(search,'C-001');checks.code=all('.mc158cart').length===1&&q('.mc158cart h3').textContent==='José';
 input(search,'');const state=q('#mc158state');state.value='RETIRED';state.dispatchEvent(new Event('change',{bubbles:true}));checks.stateFilter=all('.mc158cart').length===1&&q('.mc158cart h3').textContent==='Ana';
 q('[data-action=reload]').click();await wait(40);checks.filterPersists=q('#mc158state').value==='RETIRED'&&all('.mc158cart').length===1;
 const pay=q('[data-action=payment]');checks.noDebtDisabled=pay.disabled;pay.dispatchEvent(new MouseEvent('click',{bubbles:true}));checks.noDebtGuard=!q('#mc158dialog');
 input(q('#mc158search'),'inexistente');checks.empty=q('.mc314-empty')?.textContent.includes('coincidan')&&q('#mc158count').textContent.startsWith('0 de 2');input(q('#mc158search'),'');
 q('#mc158state').value='ALL';q('#mc158state').dispatchEvent(new Event('change',{bubbles:true}));checks.secondaryCollapsed=all('.mc314-more').every(d=>!d.open);
 window.open=url=>{window.__wa=url;return null;};q('.mc314-more').open=true;q('[data-action=whatsapp]').click();checks.whatsapp=__wa.startsWith('https://wa.me/51987654321?')&&q('#mc158notice a')?.href===__wa;
 const retire=q('[data-action=retire]');retire.click();retire.dispatchEvent(new MouseEvent('click',{bubbles:true}));await wait(10);checks.preventDouble=calls===1&&retire.disabled;changeResolve();await wait(50);
 q('[data-action=new]').click();await wait(20);const form=q('#mc158new');form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait(10);checks.saving=form.getAttribute('aria-busy')==='true'&&form.querySelector('[type=submit]').disabled;
 q('[data-action=close-dialog]').click();q('[data-action=new]').click();await wait(20);const fresh=q('#mc158new');input(fresh.elements.namedItem('alias'),'Nuevo borrador');saveResolve();await wait(60);checks.newDraftPreserved=q('#mc158new')===fresh&&fresh.elements.namedItem('alias').value==='Nuevo borrador';mc158Close();
 hold=true;const oldLoad=mc158Open();await wait(20);CC_V53_SESSION={...CC_V53_SESSION,userId:'new-user',jwt:'NEW-FIXTURE-JWT'};await mc158Open();staleResolve(carts);await oldLoad;checks.staleOwner=q('.mc158cart h3').textContent==='Cuenta nueva'&&q('#mc158state').value==='ALL';
 document.dispatchEvent(new Event('cc192-session-ended'));checks.logout=q('#mc158layer').style.display==='none'&&!q('.mc158cart');checks.onlySimulatedWrites=calls===2;
 `,contabilidad:`
 ma1611MiAlquiler.open();await wait(120);q('[data-area=finanzas]').click();await wait(140);const opener=q('[data-ma3-action=expense]');opener.focus();opener.click();await wait(40);
 const root=q('#ma3dialog'),panel=root?.querySelector('[role=dialog]');checks.opens=!!panel;checks.focus=panel.contains(document.activeElement);checks.named=!!panel.getAttribute('aria-label');
 const close=panel.querySelector('header button'),rect=close.getBoundingClientRect();checks.touch=rect.width>=44&&rect.height>=44;
 const bounds=panel.getBoundingClientRect();checks.top=panel.contains(document.elementFromPoint(bounds.left+20,Math.min(innerHeight-2,bounds.top+20)));
 const fields=all('#ma3dialog button,#ma3dialog input,#ma3dialog select').filter(x=>!x.disabled&&x.getBoundingClientRect().width>0),first=fields[0],last=fields.at(-1);last.focus();last.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));checks.tab=document.activeElement===first;
 first.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await wait(30);checks.escape=!q('#ma3dialog')&&!q('#ma1611layer').hidden;checks.restore=document.activeElement===opener;
 opener.click();await wait(30);checks.mobileFont=innerWidth>680||parseFloat(getComputedStyle(q('#ma3dialog input')).fontSize)>=16;ma1611MiAlquiler.close();checks.noOrphan=!q('#ma3dialog');
 `,avisos:`
 document.body.insertAdjacentHTML('beforeend','<div id="ma1611layer"><nav class="ma1611-nav"><button data-area="avisos" class="active">Avisos</button></nav><main id="ma1611content"></main></div>');
 const now=new Date(),dates=[0,30].map(n=>new Date(now.getTime()+n*86400000).toLocaleDateString('en-CA',{timeZone:'America/Lima'}));
 const c={account:{active:true},sessionId:'fixture-user',properties:[],units:[{id:1,code:'H-001'},{id:2,code:'H-002'}],tenants:[{id:'t1',full_name:'Juan Pérez'},{id:'t2',full_name:'Juan López'}],leases:[{id:'l1',unit_id:1,tenant_id:'t1',state:'ACTIVE',next_due_on:dates[0]},{id:'l2',unit_id:2,tenant_id:'t2',state:'ACTIVE',next_due_on:dates[1]}]};
 window.ma1612Enhance=(area,target)=>ma1614Enhance(area,target,c);window.ma1612OnOpen=()=>ma1612Enhance('avisos',q('#ma1611content'));
 ma1612Enhance('avisos',q('#ma1611content'));await wait(80);checks.all=all('.ma4-row').length===2;
 q('[data-ma4-action=urgent]').click();checks.urgent=all('.ma4-row').length===1;input(q('#ma4-search'),'Juan');checks.searchKeepsScope=all('.ma4-row').length===1&&q('[data-ma4-action=urgent]').getAttribute('aria-pressed')==='true';
 q('[data-ma4-action=refresh]').click();await wait(80);checks.refreshKeepsScope=all('.ma4-row').length===1&&q('#ma4-search').value==='Juan';q('[data-ma4-action=all]').click();checks.allAgain=all('.ma4-row').length===2;input(q('#ma4-search'),'ZZZZZZZZ');checks.empty=all('.ma4-row').length===0&&q('#ma4-results').textContent.includes('coincidan');
 `};
 return html+'<script>(async()=>{'+common+'try{await wait(100);'+probes[kind]+`checks.noWrites=__writes.length===0;checks.noErrors=__errors.length===0;checks.noOverflow=document.documentElement.scrollWidth<=innerWidth+1;}catch(e){checks.error=String(e.stack||e)}const out=document.createElement('output');out.id='cc314-result';out.dataset.status=Object.values(checks).every(v=>v===true)?'pass':'fail';out.textContent=JSON.stringify(checks);document.body.append(out);})();</script></body></html>`;
}
