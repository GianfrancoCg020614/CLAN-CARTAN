// Integración de billetera única con respuestas locales; no produce operaciones reales.
import fs from 'node:fs';
import {panelFixture} from './fixture-v308-panel.mjs';
export function cleanupFixture(){
 let html=panelFixture('reseller'),main=fs.readFileSync('scripts/v166-portal-roles.js','utf8');html=html.slice(0,html.lastIndexOf('<script>'));
 const base=(fs.readFileSync('index.html','utf8').match(/<script>\n(window\.cc80 = \{[\s\S]*?\n\};[\s\S]*?)<\/script>/)||[])[1];if(!base)throw Error('Falta adaptador cc80');
 const setup=`window.fetch=()=>{throw Error('Red prohibida')};window.__prints=0;window.print=()=>__prints++;window.__downloads=[];window.__blobs=[];
 URL.createObjectURL=b=>{__blobs.push(b);return 'blob:fixture-only'};URL.revokeObjectURL=()=>{};HTMLAnchorElement.prototype.click=function(){if(this.download)__downloads.push(this.download)};
 const savedAPI=cc80.api;${base}
 cc80.api=async(p,m,b)=>{
  __requests.push(p);
  if(p.startsWith('cc_admins?'))return window.CC_V53_SESSION.isAdmin?[{user_id:'fixture-user'}]:[];
  if(p.startsWith('cc_real_service_wallets?'))return [{service:'STREAM_BULLS',balance_pen:10},{service:'COBRA_YA',balance_pen:5},{service:'MI_COCHERA',balance_pen:2}];
  if(p.startsWith('mc_accounts?'))return [{user_id:'fixture-user',invite_code:'COCHERA-FIXTURE',country:'PE',subscription_until:'2099-12-31',bonus_pen:50,suspended:false}];
  if(p==='rpc/cc_finance_wallet')return {available_pen:17,pending_reversal_pen:0};if(p==='rpc/mc_ensure_account')return [{user_id:'fixture-user',subscription_until:'2099-12-31',currency:'PEN',bonus_pen:50}];
  if(p==='rpc/mc_sync_rents')return [];
  if(p==='rpc/cc_my_real_wallet_movements')return [{movement_id:'fixture-history',occurred_at:'2026-11-01T12:00:00Z',movement_type:'RECHARGE',service:'MI_COCHERA',amount_pen:2,affects_balance:true,status:'CREDITED',reference:'FIXTURE-REF',description:'Movimiento ficticio conservado'}];
  if(p.startsWith('rpc/')&&/transfer|grant|create|pay_|purchase|test_wallet/i.test(p)){throw Error('Ruta retirada o escritura prohibida: '+p);}
  return savedAPI(p,m,b);
 };`;
 html=html.replace('<div id="cc77home">','<section id="cc80wallet" hidden></section><span id="cc116-cobra"></span><span id="cc116-bull"></span><div id="cc77home">');
 html=html.replace('<script>'+main+'</script>','<script>'+setup+'</script><script>'+main+'</script>');
 html+='<style>'+fs.readFileSync('styles/v132-wallet-movements.css','utf8')+fs.readFileSync('styles/v158-mi-cochera.css','utf8')+'</style>';
 html+='<script>'+fs.readFileSync('scripts/v116-account.js','utf8')+'</script><script>'+fs.readFileSync('scripts/v132-wallet-movements.js','utf8')+'</script><script>'+fs.readFileSync('scripts/v158-mi-cochera.js','utf8')+'</script>';
 const probe=`(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(800);const q=s=>document.querySelector(s),checks={};
 try{
 cc80.open();checks.oldWalletRoutesToCurrent=!q('#cc166-panel').hidden&&q('.cc166-section-title')?.textContent.includes('Billetera');checks.oldHostHidden=q('#cc80wallet').hidden;
 window.cc116OpenRecharge();await wait(60);checks.rechargeRoutesCurrent=q('.cc175-tab.selected')?.textContent==='Recarga manual';
 window.cc166OpenWallet('summary');await wait(60);const balances=[...document.querySelectorAll('#cc166-panel .cc-wallet-tile strong')];
 checks.sharedRealBalance=balances[0]?.textContent.includes('17.00')===true;checks.bonusSeparate=balances[1]?.textContent.includes('50.00')===true&&!q('#cc166-content').textContent.includes('67.00');
 q('#cc166-panel').hidden=true;await window.mc158Open();checks.noTransferControl=!q('[data-action="transfer"]')&&!q('#mc158body').textContent.includes('Saldo total MI COCHERA');
 // Wallet access is centralized; use the visible module return control, then the existing wallet API.
 q('#mc158close').click();window.cc166OpenWallet('summary');checks.nativeWalletRoutesCurrent=q('#mc158layer').style.display==='none'&&!q('#cc166-panel').hidden;
 window.cc132OpenMovements();await wait(100);checks.historyOpens=q('#cc132movements').open&&q('#cc132movements').parentElement===document.body;checks.historyPreserved=q('#cc132tbody').textContent.includes('Movimiento ficticio conservado');
 const filter=q('#cc132service');checks.fourOrigins=filter.options.length===5;filter.value='MI_COCHERA';filter.dispatchEvent(new Event('change'));
 q('#cc132excel').click();await wait(30);const csv=await __blobs.at(-1)?.text();checks.csvPreserved=__downloads.some(x=>x.endsWith('.csv'))&&csv?.includes('MI COCHERA')&&csv?.includes('FIXTURE-REF');
 q('#cc132pdf').click();checks.pdfPreserved=__prints===1;
 q('#cc132close').click();await wait(60);checks.historyBack=!q('#cc132movements').open&&!q('#cc166-panel').hidden&&q('.cc175-tab.selected')?.textContent==='Movimientos';
 window.CC_V53_SESSION.isAdmin=true;window.cc166RefreshPanel();await wait(150);await window.mc158Open();checks.noDuplicateAdminForm=!q('#mc158grant');q('[data-action=\"bonuses\"]').click();await wait(80);checks.centralAdminBonuses=!q('#cc166-panel').hidden&&!!q('.cc177-bonus-form');
 checks.noTransferAPI=!__requests.some(p=>p.includes('transfer')||p.includes('test_wallet'));
 checks.noErrors=__errors.length===0;checks.noOverflow=document.documentElement.scrollWidth<=innerWidth+1;
 }catch(e){checks.error=String(e.stack||e)}
 const out=document.createElement('output');out.id='cc312-result';out.dataset.status=Object.values(checks).every(x=>x===true)?'pass':'fail';out.textContent=JSON.stringify(checks);document.body.append(out);
})();`;
 return html+'<script>'+probe+'</script></body></html>';
}
