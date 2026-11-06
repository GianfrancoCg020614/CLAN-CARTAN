// Solo navegador aislado: sin red, pagos, cuentas o credenciales reales.
import fs from 'node:fs';import {panelFixture} from './fixture-v308-panel.mjs';
export function walletAccessFixture(mode='insufficient'){
 let html=panelFixture(mode==='admin'?'admin':'reseller');html=html.slice(0,html.lastIndexOf('<script>'));
 const setup=`
 window.__balance=${mode==='zero'?0:mode==='exact'?25:['insufficient','pending','credited'].includes(mode)?8:30};window.__cost=25;window.__stream=${mode==='active'};window.__writes=[];window.__confirm=true;window.__login=0;window.__catalog=0;window.__walletCalls=0;window.__walletFail=false;window.__hold=false;window.__waiting=[];
 window.confirm=()=>__confirm;window.alert=()=>{};window.cc77Auth=()=>__login++;window.cc169OpenCatalog=()=>__catalog++;window.cc169RefreshCatalog=()=>{};
 try{sessionStorage.getItem('test');}catch(_){const mem=new Map();Object.defineProperty(window,'sessionStorage',{value:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v),removeItem:k=>mem.delete(k)}});}
 let uuid=0;if(!crypto.randomUUID)crypto.randomUUID=()=>('32600000-0000-4000-8000-'+String(++uuid).padStart(12,'0'));
 const native=cc80.api;cc80.api=async(p,m,b)=>{
 if(p.startsWith('cc_manual_recharge_requests?'))return ${JSON.stringify(mode)}==='pending'?[{id:'pending-rec',status:'PENDING',amount_pen:20}]:[];
 if(p==='rpc/cc_finance_wallet'){__walletCalls++;if(__walletFail)throw Error('Offline');const result={balance_pen:__balance+5,pending_reversal_pen:5,available_pen:__balance};if(__hold)return new Promise(resolve=>__waiting.push(()=>resolve(result)));return result;}
 if(p==='rpc/cc_finance_rates')return ['COBRA_YA','MI_COCHERA','MI_ALQUILER','STREAM_BULLS'].map(service=>({service,amount_pen:service==='STREAM_BULLS'?__cost:15}));
 if(p==='rpc/cc_portal_my_business_access_v316')return {business_access:['COBRA_YA','MI_COCHERA','MI_ALQUILER','STREAM_BULLS'].map(service=>({service,status:service==='COBRA_YA'||service==='STREAM_BULLS'&&__stream?'ACTIVE':'INACTIVE',active_until:service==='COBRA_YA'||__stream?'2099-12-31':null}))};
 if(p==='rpc/cc_finance_activate_membership'){__writes.push({p,b});if(__stream)return {service:'STREAM_BULLS',status:'ALREADY_ACTIVE',amount_pen:0,charged:false,active_until:'2099-12-31'};if(b.p_expected_amount_pen!==__cost||__balance<__cost)throw Error('Saldo o tarifa');await new Promise(r=>setTimeout(r,35));__balance-=__cost;__stream=true;return {service:'STREAM_BULLS',amount_pen:__cost,active_until:'2099-12-31'};}
 if(p==='rpc/cc_finance_pay_membership')throw Error('Una activación no puede renovar');
 return native(p,m,b);};
 `;
 const probe=`(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],checks={};try{
 await wait(450);window.cc166OpenPanel?.();await wait(50);
 checks.allHeaders=all('.cc326-wallet-summary').length>=5;
 checks.netBalance=all('.cc326-wallet-summary').every(e=>e.textContent.includes('S/ '+__balance.toFixed(2)));
 checks.mainAvailable=${JSON.stringify(mode)}==='admin'||q('.cc166-metric [data-cc-wallet-amount]')?.textContent==='S/ '+__balance.toFixed(2);
 checks.otherPlatformDoesNotUnlock=__stream||${JSON.stringify(mode)}==='admin'||!!q('.cc326-distributor-cta');
 if(${JSON.stringify(mode)}==='active'||${JSON.stringify(mode)}==='admin'){
  checks.noActivation=q('.cc326-distributor-cta')===null;await cc326OpenStreamActivation();checks.noModal=!q('#cc326-activation');
 }else if(${JSON.stringify(mode)}==='failure'){
  __walletFail=true;await cc326Wallet.refresh(true);await wait(70);const calls=__walletCalls;await wait(100);checks.noRetryLoop=__walletCalls===calls;checks.unknownNotZero=all('.cc326-wallet-summary').every(e=>e.textContent.includes('Saldo sin verificar'));checks.noWrites=__writes.length===0;
 }else if(${JSON.stringify(mode)}==='switch'){
  __hold=true;const old=cc326Wallet.refresh(true);await wait(20);CC_V53_SESSION={userId:'new-user',jwt:'NEW-FIXTURE'};__hold=false;__balance=2;await cc326Wallet.refresh(true);__waiting.splice(0).forEach(fn=>fn());await old;await wait(70);checks.newOwnerOnly=all('.cc326-wallet-summary').every(e=>e.textContent.includes('S/ 2.00'));
 }else if(${JSON.stringify(mode)}==='race'){
  __hold=true;const pending=cc326Wallet.refresh(true);await wait(20);CC_V53_SESSION=null;document.dispatchEvent(new Event('cc192-session-ended'));__waiting.splice(0).forEach(fn=>fn());await pending;await wait(70);checks.logoutClears=all('.cc326-wallet-summary').length===0&&!q('#cc326-activation');
 }else{
  q('.cc326-distributor-cta').click();await wait(130);
  checks.compact=!!q('#cc326-activation')&&q('[data-field=price]').textContent.includes('S/ 25.00');
  checks.shortfall=q('[data-field=shortfall]').textContent==='S/ '+Math.max(0,25-__balance).toFixed(2);
  if(${JSON.stringify(mode)}==='credited'){__balance=30;await cc326Wallet.refresh(true);await wait(40);checks.creditConfirmed=!q('[data-action=activate]').disabled&&q('[data-field=shortfall]').textContent==='S/ 0.00';}
  if(['insufficient','zero','pending'].includes(${JSON.stringify(mode)})){
   checks.noCharge=q('[data-action=activate]').disabled&&__writes.length===0;if(${JSON.stringify(mode)}==='pending')checks.pendingHonest=q('[data-pending]').textContent.includes('Recarga en verificación');
   q('[data-action=recharge]').click();await wait(40);checks.existingWallet=!q('#cc326-activation')&&!!q('#cc166-content');
  }else if(${JSON.stringify(mode)}==='price-change'){
   __cost=30;q('[data-action=activate]').click();await wait(100);checks.priceRechecked=__writes.length===0&&q('[data-message]').textContent.includes('tarifa cambió');
  }else{
   __confirm=false;q('[data-action=activate]').click();await wait(80);checks.cancelled=__writes.length===0&&q('[data-message]').textContent.includes('cancelada');__confirm=true;
   q('[data-action=activate]').click();q('[data-action=activate]').click();await wait(240);
   checks.oneCharge=__writes.length===1&&__balance===${mode==='exact'?0:5};checks.closed=!q('#cc326-activation')&&__catalog===1;
   checks.refreshed=all('.cc326-wallet-summary').every(e=>e.textContent.includes('S/ '+__balance.toFixed(2)))&&!q('.cc326-distributor-cta');
  }
 }
 checks.noOverflow=document.documentElement.scrollWidth<=innerWidth+1;checks.noErrors=__errors.length===0;
 const d=q('#cc326-activation');if(d){const r=d.getBoundingClientRect();checks.dialogFits=r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1;}
 }catch(e){checks.error=String(e.stack||e)}const out=document.createElement('output');out.id='cc326-result';out.dataset.status=Object.values(checks).every(x=>x===true)?'pass':'fail';out.textContent=JSON.stringify(checks);document.body.append(out);})();`;
 const hosts='<div id="app"><header class="cc117-header"></header><section id="productos"><div class="v23-catalog-section"><div class="section-head"></div></div></section></div><div id="mc158layer"><header class="mc158head"><div>MI COCHERA</div></header></div><div id="ma1611layer"><div class="ma1611-brand"><div>MI ALQUILER</div></div></div><div id="cy53layer"><div class="cc127-cobra-brand"><div>COBRA YA</div></div></div>';
 return html+hosts+'<style>'+fs.readFileSync('styles/v326-wallet-access.css','utf8')+'</style><script>'+setup+'</script><script>'+fs.readFileSync('scripts/v326-wallet-access.js','utf8')+'</script><script>'+probe+'</script></body></html>';
}
