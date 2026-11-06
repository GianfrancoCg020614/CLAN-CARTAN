import fs from 'node:fs';
export function cocheraScenario(mode='operations'){
const setup=`
window.CC_V53_SESSION={userId:'fixture-user',jwt:'FAKE-ONLY',isAdmin:false};
window.__errors=[];window.addEventListener('error',e=>__errors.push(e.message));
window.fetch=()=>{throw Error('Red prohibida en fixture')};
window.__calls=[];window.__walletFail=${mode==='wallet-failure'};window.__balanceFail=${mode==='balance-failure'};window.__historyPage=0;window.__holdHistory=false;window.__historyWaiting=[];window.__holdSave=false;window.__saveWaiting=[];window.__reloadFail=false;
const cart=(id,state='ACTIVE')=>({id,reseller_id:'fixture-user',alias:'Carrito '+id,state,owner_person_id:'p1',daily_rate:4,currency:'PEN',business_type:'Emoliente'});
window.__carts=${mode==='pagination'?'Array.from({length:201},(_,i)=>cart(i+1))':"[cart(1),cart(2,'RETIRED'),cart(3)]"};
window.__people=[{id:'p1',full_name:'José Prueba',document_number:'00000000',phone:'+51999999999'}];
window.__balances=__carts.map(c=>({cart_id:c.id,balance_local:c.id===1?201:c.id===2?9:0}));
const entry=i=>({id:'32800000-0000-4000-8000-'+String(i).padStart(12,'0'),occurred_on:'2026-11-01',created_at:'2026-11-01T00:00:00.000Z',label:'Movimiento ficticio '+i,amount_local:1,currency:'PEN'});
window.cc80={api:async(p,m,b)=>{__calls.push({p,m,b});
 if(p==='rpc/cc_finance_wallet'){if(__walletFail)throw Error('Offline');return {available_pen:8};}
 if(p==='rpc/mc_ensure_account')return [{subscription_until:${JSON.stringify(mode)}==='expired'?'2000-01-01':'2099-12-31',currency:'PEN',bonus_pen:0,suspended:false}];
 if(p==='rpc/mc_sync_rents')return 0;
 if(p==='rpc/mc_my_cart_balances_v328'){if(__balanceFail)throw Error('Offline');return __balances;}
 if(p.startsWith('mc_carts?')){if(__reloadFail)throw Error('No se pudo actualizar');const cursor=Number(new URLSearchParams(p.split('?')[1]).get('id')?.replace('gt.','')||0);return __carts.filter(c=>c.id>cursor).slice(0,200);}
 if(p.startsWith('mc_people?'))return p.includes('&id=gt.')?[]:__people;
 if(p.startsWith('mc_accounts?'))return [{country:'PE'}];
 if(p.startsWith('mc_movements?')){const result=__historyPage++===0?Array.from({length:100},(_,i)=>entry(200-i)):__historyPage===2?[entry(100)]:[];if(__holdHistory)return new Promise(resolve=>__historyWaiting.push(()=>resolve(result)));return result;}
 if(p==='rpc/mc_record_movement'){if(__holdSave)return new Promise(resolve=>__saveWaiting.push(()=>resolve('fixture-movement')));__balances.find(c=>c.cart_id===b.p_cart).balance_local+=b.p_amount;return 'fixture-movement';}
 if(p==='rpc/mc_create_cart'){__carts.push(cart(4));__balances.push({cart_id:4,balance_local:4});return 4;}
 if(p.startsWith('rpc/'))throw Error('RPC no prevista: '+p);
 return [];
}};window.confirm=()=>true;`;
const probe=`(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],checks={},click=s=>q(s).click(),writes=()=>__calls.filter(c=>/mc_record_movement|mc_create_cart|mc_change_cart_state/.test(c.p));try{await wait(120);await mc158Open();await wait(35);
 checks.completeBalance=['balance-failure','expired'].includes(${JSON.stringify(mode)})||q('.mc158cart .mc158debt')?.textContent==='S/ 201.00';
 checks.noGlobalHistoryFetch=!__calls.some(c=>c.p.startsWith('mc_movements?'));
 if(${JSON.stringify(mode)}==='balance-failure'){checks.noFalseDebt=!q('[data-action=payment]')&&!!q('[data-action=retry-open]');__balanceFail=false;click('[data-action=retry-open]');await wait(80);checks.safeRecovery=q('.mc158cart .mc158debt')?.textContent==='S/ 201.00';}
 else if(${JSON.stringify(mode)}==='expired'){checks.gated=!q('[data-action=new]')&&!__calls.some(c=>c.p==='rpc/mc_my_cart_balances_v328');}
 else if(${JSON.stringify(mode)}==='pagination'){checks.allPages=all('.mc158cart').length===201&&__calls.some(c=>c.p.includes('mc_carts?')&&c.p.includes('id=gt.200'));}
 else if(${JSON.stringify(mode)}==='wallet-failure'){checks.toolsRemain=!!q('[data-action=new]')&&all('.mc158cart').length===3;checks.unknownWallet=q('#mc158body').textContent.includes('Sin verificar');}
 else if(${JSON.stringify(mode)}==='history-race'){
  __holdHistory=true;click('[data-action=history]');await wait(20);click('[data-action=close-dialog]');click('[data-action=new]');const fresh=q('#mc158new');fresh.elements.alias.value='Borrador protegido';__historyWaiting.splice(0).forEach(fn=>fn());await wait(40);checks.staleIgnored=q('#mc158new')===fresh&&fresh.elements.alias.value==='Borrador protegido';
 }else if(${JSON.stringify(mode)}==='save-refresh-failure'){
  click('[data-action=payment]');q('#mc158pay').elements.amount.value=2;__reloadFail=true;q('#mc158pay').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait(70);checks.honestSaved=q('#mc158notice').textContent.includes('El registro se guardó')&&writes().length===1;
 }else{
  const state=q('#mc158state');state.value='DEBT';state.dispatchEvent(new Event('change',{bubbles:true}));checks.debtFilter=all('.mc158cart').length===2;
  const retired=all('.mc158cart').find(c=>c.querySelector('h3').textContent==='Carrito 2');checks.retiredSaleDisabled=retired.querySelector('[data-action=sale]').disabled;retired.querySelector('[data-action=sale]').dispatchEvent(new MouseEvent('click',{bubbles:true}));checks.retiredSaleGuard=!q('#mc158dialog');
  click('[data-action=history]');await wait(50);checks.historyScoped=all('#mc328history tr').length===100&&__calls.some(c=>c.p.includes('mc_movements?')&&c.p.includes('cart_id=eq.1'));
  click('#mc328more');await wait(50);click('#mc328more');await wait(40);checks.historyComplete=all('#mc328history tr').length===101&&q('#mc328more').hidden&&q('#mc328historyStatus').textContent.includes('completo');click('[data-action=close-dialog]');
  click('[data-action=payment]');let f=q('#mc158pay');f.elements.amount.value=202;f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait(25);checks.overpaymentBlocked=writes().length===0&&q('#mc158dialogStatus').textContent.includes('importe positivo');
  f.elements.amount.value=2;__holdSave=true;f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait(20);checks.singleSubmit=writes().length===1&&f.getAttribute('aria-busy')==='true';__holdSave=false;__saveWaiting.splice(0).forEach(fn=>fn());await wait(70);
  click('[data-action=sale]');f=q('#mc158sale');f.elements.quantity.value=2;f.elements.price.value='1.50';f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait(60);checks.productMath=writes().at(-1).b.p_amount===3;
  click('[data-action=new]');f=q('#mc158new');f.elements.ownerDoc.value='00000000';f.elements.ownerName.value='Propietario Ficticio';f.elements.business.value='Emoliente';f.elements.rate.value=4;f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await wait(70);checks.registered=writes().at(-1).p==='rpc/mc_create_cart'&&q('#mc158notice').textContent.includes('C-004');
 }
 checks.noErrors=__errors.length===0;checks.noOverflow=document.documentElement.scrollWidth<=innerWidth+1;
 }catch(e){checks.error=String(e.stack||e)}const out=document.createElement('output');out.id='cc328-result';out.dataset.status=Object.values(checks).every(v=>v===true)?'pass':'fail';out.textContent=JSON.stringify(checks);document.body.append(out);})();`;
return {setup,probe};
}
export function cocheraFixture(mode='operations'){
 const {setup,probe}=cocheraScenario(mode);
 const css=fs.readFileSync('styles/v158-mi-cochera.css','utf8');
 const js=fs.readFileSync('scripts/v158-mi-cochera.js','utf8');
 const helpers=fs.readFileSync('scripts/v311-business-dialogs.js','utf8');
 return '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="cc77home"></div><script>'+setup+'</script><script>'+js+'</script><script>'+helpers+'</script><script>'+probe+'</script></body></html>';
}
