// Pruebas aisladas: todas las escrituras se simulan en memoria, sin Supabase.
import fs from 'node:fs';
import {panelFixture} from './fixture-v308-panel.mjs';
export function operationsFixture(){
 const html=panelFixture('admin'),last=html.lastIndexOf('<script>');
 const setup=`window.fetch=()=>{throw Error('Red prohibida en fixture de operaciones')};window.confirm=()=>true;let fixtureSequence=0;Object.defineProperty(window.crypto,'randomUUID',{value:()=> '00000000-0000-4000-8000-'+String(++fixtureSequence).padStart(12,'0')});
 window.__mutations=[];let queue=[{request_id:'fixture-pending',registry_no:3,registry_code:'CLAN3',registered_name:'Reseller pendiente',registered_email:'reseller@ejemplo.test',amount_pen:5}];
 const originalAPI=window.cc80.api;
 window.cc80.api=async(p,m,b)=>{
  if(p==='rpc/cc_admin_grant_welcome_balance'){__mutations.push({p,b});return new Promise(resolve=>window.__resolveBonus=resolve);}
  if(p==='rpc/cc_admin_create_manual_recharge_for_user'){__mutations.push({p,b});return new Promise(resolve=>window.__resolveRecharge=()=>resolve(b.p_request));}
  if(p==='rpc/cc_admin_decide_manual_recharge_v189'){__mutations.push({p,b});queue=[];return true;}
  if(p==='rpc/cc_admin_manual_recharge_queue_v184')return queue;
  if(p==='rpc/cc_portal_my_stream_orders')return [
   {id:'fixture-wait',title:'Pedido pendiente ficticio',price_pen:5,status:'PAID_AWAITING_DELIVERY'},
   {id:'fixture-done',title:'Pedido entregado ficticio',price_pen:7,status:'FULFILLED'},
   {id:'fixture-refund',title:'Pedido reembolsado ficticio',price_pen:8,status:'REFUNDED'}];
  return originalAPI(p,m,b);
 };`;
 const probe=`(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(800);
 const q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],checks={};
 const go=label=>all('.cc166-navitem').find(x=>x.getAttribute('aria-label')===label).click();
 const submit=form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 try{
 q('.cc304-shortcuts').open=true;all('.cc304-shortcuts button').find(x=>x.textContent==='Otorgar recarga').click();await wait(40);
 checks.directRechargeOpens=q('.cc181-grant-form').open;
 go('Usuarios');await wait(40);const person=all('.cc171-person').find(x=>x.textContent.includes('CLAN3'));person.querySelector('.cc246-user-details').open=true;
 all('.cc171-person button').find(x=>x.textContent==='Otorgar recarga'&&x.closest('.cc171-person')===person).click();await wait(40);
 checks.personPreselected=q('.cc181-assist-fields select').value==='reseller-test';
 go('Bonos');let form=q('.cc177-bonus-form');form.querySelectorAll('select')[0].value='reseller@ejemplo.test';form.querySelector('input[type=number]').value='12.50';form.querySelector('input[type=text]').value='Motivo de prueba ficticia';
 window.cc166RefreshPanel();await wait(150);form=q('.cc177-bonus-form');
 checks.bonusDraftPreserved=form.querySelectorAll('select')[0].value==='reseller@ejemplo.test'&&form.querySelector('input[type=number]').value==='12.50'&&form.querySelector('input[type=text]').value==='Motivo de prueba ficticia';
 submit(form);await wait(30);window.cc166RefreshPanel();await wait(150);form=q('.cc177-bonus-form');
 checks.bonusBusyPreserved=form.querySelector('button[type=submit]').disabled;
 submit(form);await wait(20);checks.bonusSingleRequest=__mutations.filter(x=>x.p.includes('grant_welcome')).length===1;
 if(window.__resolveBonus)window.__resolveBonus(12.5);await wait(50);
 checks.bonusUnlocks=q('.cc177-bonus-form button[type=submit]').disabled===false;
 go('Resumen');q('.cc304-shortcuts').open=true;all('.cc304-shortcuts button').find(x=>x.textContent==='Otorgar recarga').click();await wait(40);
 form=q('.cc181-assist-fields');form.querySelector('select').value='reseller-test';form.querySelector('input[type=number]').value='9.25';submit(form);await wait(30);
 window.cc166RefreshPanel();await wait(150);form=q('.cc181-assist-fields');checks.rechargeBusyPreserved=form.querySelector('button[type=submit]').disabled;
 submit(form);await wait(20);checks.rechargeSingleRequest=__mutations.filter(x=>x.p.includes('create_manual')).length===1;
 if(window.__resolveRecharge)window.__resolveRecharge();await wait(90);
 checks.rechargeUnlocks=q('.cc181-assist-fields button[type=submit]').disabled===false;
 checks.pendingMessage=q('#cc166-content').textContent.includes('registrada como PENDIENTE');
 const review=q('.cc176-review');review.open=true;review.querySelector('input[aria-label="ID del depósito bancario verificado"]').value='FIXTURE-ONLY-123';review.querySelector('input[type=checkbox]').checked=true;all('.cc176-review button').find(x=>x.textContent==='Aprobar y acreditar').click();await wait(100);
 checks.decisionMessageSurvivesRefresh=q('#cc166-content').textContent.includes('Recarga verificada y acreditada por el servidor.');
 checks.queueUpdated=!q('.cc176-recharge-record');
 go('Supervisar pedidos');await wait(50);
 checks.reportsCollapsed=q('#cc194-liquidaciones')?.open===false;
 checks.menuNameStable=all('.cc166-navitem').some(x=>x.textContent.includes('Supervisar pedidos'));
 const filter=q('[aria-label="Filtrar pedidos por estado"]');checks.ordersTranslated=q('#cc166-content').textContent.includes('Pendiente de entrega')&&!q('#cc166-content').textContent.includes('PAID_AWAITING_DELIVERY');
 filter.value='FULFILLED';filter.dispatchEvent(new Event('change'));
 checks.orderFilter=all('.cc167-order-row').length===1&&q('.cc167-order-row').textContent.includes('fixture-done');
 window.cc166RefreshPanel();await wait(150);checks.filterPreserved=q('[aria-label="Filtrar pedidos por estado"]').value==='FULFILLED'&&all('.cc167-order-row').length===1;
 checks.adminCannotDeliver=!all('#cc166-content button').some(x=>/Marcar entregado|^Entregado$/.test(x.textContent));
 checks.noJSExceptions=__errors.length===0;
 checks.noOverflow=document.documentElement.scrollWidth<=innerWidth+1;
 }catch(e){checks.error=String(e.stack||e)}
 const output=document.createElement('output');output.id='cc309-result';output.dataset.status=Object.values(checks).every(x=>x===true)?'pass':'fail';output.textContent=JSON.stringify(checks);document.body.append(output);
})();`;
 return html.slice(0,last)+'<script>'+setup+'</script><script>'+fs.readFileSync('scripts/v194-sales.js','utf8')+'</script><script>'+probe+'</script></body></html>';
}
