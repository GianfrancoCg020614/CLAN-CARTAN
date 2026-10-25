/* V173 Chrome · renovar sesión JWT sin perder pestaña ni crear operaciones.
 * Un panel, cuatro negocios, membresía real y visitantes no autenticados.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido');
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const css=fs.readFileSync('styles/v166-portal-roles.css','utf8');
const setup=[
 'window.CC_V53_SESSION={userId:"synthetic-reseller",jwt:"jwt-before"};',
 'window.__requests=[];window.__login=0;window.cc77Auth=()=>window.__login++;',
 'window.cc80={open(){},api:async function(path,method,data){',
 'window.__requests.push(path);',
 'if(path.startsWith("cc_admins?"))return [];',
 'if(path.startsWith("cc_memberships?"))return [{id:"stream-membership",business_id:"stream-business",role:"RESELLER",status:"PENDING"}];',
 'if(path.startsWith("cc_businesses?"))return [{id:"stream-business",code:"STREAM_BULLS"}];',
 'if(path.startsWith("cc_subscriptions?"))return [];',
 'if(path.startsWith("cc_plans?"))return [{business_id:"stream-business",code:"STREAM_365",price_pen:25,is_active:true}];',
 'if(path==="rpc/cc_portal_my_stream_orders")return [];',
 'if(path==="rpc/cc_portal_my_stream_prices")return [];',
 'if(path==="rpc/cc_my_real_wallet_movements")return [];',
 'return [];}};'
].join('\n');
const probe=[
 'setTimeout(()=>{try{',
 'const x=id=>document.getElementById(id),panel=x("cc166-panel");',
 'const initialCount=document.querySelectorAll("#cc166-panel").length;',
 'const tab=document.querySelectorAll("#cc166-content .cc167-tab")[1];tab?.click();',
 'const oldBusiness=x("cc166-content")?.textContent.includes("COBRA YA");',
 'const previousJwt=window.CC_V53_SESSION.jwt;',
 'window.CC_V53_SESSION.jwt="jwt-after";window.cc166OpenPanel();',
 'setTimeout(()=>{try{',
 'const stayedBusiness=x("cc166-content")?.querySelector(".cc166-section-title h2")?.textContent==="COBRA YA";',
 'const newSessionUsed=previousJwt!==window.CC_V53_SESSION.jwt;',
 'const stillOnePanel=document.querySelectorAll("#cc166-panel").length===1&&initialCount===1;',
 'window.cc166OpenStreamMembership();',
 'const membershipContent=x("cc166-content")?.textContent||"";',
 'const correctMembership=membershipContent.includes("STREAM BULL’S")&&membershipContent.includes("365 días")&&membershipContent.includes("S/ 25.00");',
 'const noTrial=!membershipContent.includes("Probar 7 días")&&!membershipContent.includes("S/ 0");',
 'window.CC_V53_SESSION=null;window.cc166OpenStreamMembership();',
 'const guestRequestsLogin=window.__login===1;',
 'const noMoneyOperations=window.__requests.every(req=>!req.includes("cc_portal_buy_stream_membership")&&!req.includes("cc_portal_purchase_stream_product")&&!req.includes("cc_portal_admin_start_stream_trial"));',
 'const noOverflow=document.documentElement.scrollWidth<=innerWidth+5;',
 'const checks={oldBusiness,stayedBusiness,newSessionUsed,stillOnePanel,correctMembership,noTrial,guestRequestsLogin,noMoneyOperations,noOverflow};',
 'const out=document.createElement("output");out.id="cc173-smoke";out.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";out.textContent=JSON.stringify(checks);document.body.append(out);',
 '}catch(e){failure(e)}',
 '},450);',
 '}catch(e){failure(e)}',
 '},400);',
 'function failure(e){const out=document.createElement("output");out.id="cc173-smoke";out.dataset.status="fail";out.textContent=String(e?.stack||e);document.body.append(out);}'
].join('\n');
const html=[
 '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>'+css+'</style></head><body>',
 '<div id="cc77home"><div class="cc77top"><div class="cc77actions"></div></div></div>',
 '<script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script>',
 '</body></html>'
].join('\n');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc173-session-'));
try{
 const file=path.join(dir,'session.html');fs.writeFileSync(file,html);
 const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--window-size=390,844','--virtual-time-budget=2800','--dump-dom','file://'+file],
 {encoding:'utf8',timeout:28000,maxBuffer:12*1024*1024});
 assert.equal(run.status,0,'Chrome falló: '+String(run.stderr).slice(-450));
 const result=run.stdout.match(/<output id="cc173-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(result,'Sin resultado de sesión V173: '+run.stdout.slice(-470));
 assert.equal(result[1],'pass','V173: '+result[2]);
 console.log('PASS V173 · mismo panel tras renovación JWT, 4 pestañas, plan real y acceso invitado.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
