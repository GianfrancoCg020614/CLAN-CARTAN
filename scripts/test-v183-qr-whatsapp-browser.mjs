/* V183 · QR existentes y WhatsApp con ID de solicitud auténtica en móvil. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Se requiere Chrome');
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const otherFlow=fs.readFileSync('scripts/v148-manual-whatsapp.js','utf8');
assert.ok(js.includes('https://wa.me/51923319637?text='),'La recarga nueva dirige al WhatsApp correcto');
assert.ok(otherFlow.includes('https://wa.me/51923319637?text='),'El flujo anterior usa el mismo WhatsApp');
assert.ok(!js.includes('51923391637'),'No reintroducir el número anterior');
const css=['styles/v166-portal-roles.css','styles/v171-admin-simple.css','styles/v176-admin-console.css','styles/v177-panel-unico.css'].map(s=>fs.readFileSync(s,'utf8')).join('\n');
const qr1=fs.readFileSync('assets/qr-dale-gianfranco.svg','utf8');
assert.match(qr1,/<svg /);assert.ok(fs.statSync('assets/qr-binance-personal.png').size>200,'QR Binance ausente');
const id='11111111-2222-4333-8444-555555555555';
const setup=[
 'window.CC_V53_SESSION={jwt:"test-jwt",userId:"test-user",displayName:"Cliente Registrado"};',
 'window.__calls=[];window.__pending=[{id:"'+id+'",service:"STREAM_BULLS",amount_pen:30,status:"PENDING"}];',
 'window.confirm=()=>true;',
 'window.cc80={open(){},api:async function(p,m,b){window.__calls.push({p,m,b});',
 'if(p.startsWith("cc_admins?"))return [];',
 'if(p.startsWith("cc_businesses?"))return [{id:"stream",code:"STREAM_BULLS"}];',
 'if(p.startsWith("cc_user_details?"))return [{full_name:"Cliente Registrado"}];',
 'if(p.startsWith("cc_manual_recharge_requests?"))return window.__pending;',
 'if(p.startsWith("cc_real_service_wallets?"))return [{service:"STREAM_BULLS",balance_pen:0}];',
 'if(p.startsWith("cc_memberships?")||p.startsWith("cc_subscriptions?")||p.startsWith("cc_portal_super_resellers?")||p.startsWith("cc_portal_stream_products?")||p.startsWith("cc_plans?"))return [];',
 'if(p==="rpc/cc_portal_my_stream_orders"||p==="rpc/cc_portal_my_stream_prices"||p==="rpc/cc_my_real_wallet_movements")return [];',
 'if(p==="rpc/cc_submit_manual_recharge")return "'+id+'";',
 'return [];}};'
].join('\n');
const probe=[
 'const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);',
 'function report(o){const x=document.createElement("output");x.id="cc183-test";x.dataset.status=Object.values(o).every(Boolean)?"pass":"fail";x.textContent=JSON.stringify(o);document.body.append(x)}',
 'function fail(e){report({error:String(e?.stack||e),valid:false})}',
 'setTimeout(()=>{try{',
 'const samePanel=!!$("#cc166-panel");',
 '[...$$(".cc166-navitem")].find(x=>x.textContent.includes("Billetera"))?.click();',
 '[...$$(".cc175-tab")].find(x=>x.textContent==="Recarga manual")?.click();',
 'setTimeout(()=>{try{',
 'const requestLoaded=$("#cc166-content")?.textContent.includes("'+id+'");',
 'const link=$("#cc166-content .cc183-whatsapp");',
 'const url=link?.getAttribute("href")||"";',
 'const waDestination=url.startsWith("https://wa.me/51923319637?text=");',
 'const message=decodeURIComponent(url.split("text=")[1]||"");',
 'const messageCorrect=message.includes("YA PAGUE CON SOLICITUD '+id+', y te envio mi comprobante.");',
 'const qrBtns=$$("#cc166-content .cc183-qr-button");',
 'const twoQr=qrBtns.length===2;',
 'qrBtns[0]?.click();',
 'const modal=document.querySelector(".cc183-qr-dialog");',
 'const lemonCorrect=modal?.querySelector("img")?.getAttribute("src")==="assets/qr-dale-gianfranco.svg";',
 'const warning=modal?.textContent.includes("NO es un QR de Yape");',
 'modal?.querySelector("button")?.click();',
 'const closed=!document.querySelector(".cc183-qr-dialog");',
 'qrBtns[1]?.click();',
 'const binanceCorrect=document.querySelector(".cc183-qr-dialog img")?.getAttribute("src")?.startsWith("assets/qr-binance-personal.png");',
 'document.querySelector(".cc183-qr-dialog button")?.click();',
 'const noDuplicate=document.querySelector(".cc177-recharge-form button[type=submit]")?.disabled===true;',
 'const noRealCredits=!window.__calls.some(x=>/cc_credit_|cc_admin_decide_manual_recharge/.test(x.p));',
 'const fitsMobile=document.documentElement.scrollWidth<=innerWidth+5;',
 'report({samePanel,requestLoaded,waDestination,messageCorrect,twoQr,lemonCorrect,warning,closed,binanceCorrect,noDuplicate,noRealCredits,fitsMobile});',
 '}catch(e){fail(e)}},450);',
 '}catch(e){fail(e)}},500);'
].join('\n');
const html='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+
 '<div id="cc77home"><div class="cc77top"><div class="cc77actions"></div></div></div>'+
 '<script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script></body></html>';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc183-qr-'));
try{
 const file=path.join(dir,'test.html');fs.writeFileSync(file,html);
 const p=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=390,844','--virtual-time-budget=3600','--dump-dom','file://'+file],{encoding:'utf8',timeout:35000,maxBuffer:12*1024*1024});
 assert.equal(p.status,0,p.stderr.slice(-600));
 const m=p.stdout.match(/<output id="cc183-test" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(m,'Sin resultado Chrome '+p.stdout.slice(-800));
 assert.equal(m[1],'pass',m[2]);
 console.log('PASS V183: QR Lemon/Binance, WhatsApp real, solicitud persistida, sin duplicar ni acreditar.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
