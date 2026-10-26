/* V177 · Prueba móvil sin red de recarga por cuenta y estado automático real. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Se requiere Chrome para el smoke test');
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const css=[
 'styles/v166-portal-roles.css',
 'styles/v171-admin-simple.css',
 'styles/v176-admin-console.css',
 'styles/v177-panel-unico.css'
].map(p=>fs.readFileSync(p,'utf8')).join('\n');
const setup=[
 'window.CC_V53_SESSION={jwt:"test-jwt",userId:"fake-affiliate",displayName:"Cliente Registrado"};',
 'window.confirm=()=>true;window.__calls=[];',
 'window.cc80={open(){},api:async(path,method,args)=>{window.__calls.push({path,args});',
 'if(path.startsWith("cc_admins?"))return [];',
 'if(path.startsWith("cc_businesses?"))return [{id:"b1",code:"STREAM_BULLS"},{id:"b2",code:"COBRA_YA"},{id:"b3",code:"MI_COCHERA"},{id:"b4",code:"MI_ALQUILER"}];',
 'if(path.startsWith("cc_user_details?"))return [{full_name:"Cliente Registrado",phone_e164:null}];',
 'if(path.startsWith("cc_real_service_wallets?"))return [{service:"STREAM_BULLS",balance_pen:0}];',
 'if(path.startsWith("cc_memberships?")||path.startsWith("cc_subscriptions?")||path.startsWith("cc_portal_super_resellers?")||path.startsWith("cc_portal_stream_products?")||path.startsWith("cc_plans?"))return [];',
 'if(path==="rpc/cc_portal_my_stream_orders"||path==="rpc/cc_portal_my_stream_prices"||path==="rpc/cc_my_real_wallet_movements")return [];',
 'if(path==="rpc/cc_auto_topup_method_status")return [{provider:"LEMON_DALE",enabled:false,status_text:"Proveedor no confirmado"}];',
 'if(path==="rpc/cc_submit_manual_recharge")return "11111111-1111-4111-8111-111111111111";',
 'return [];}};'
].join('\n');
const probe=[
 'const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);',
 'const report=obj=>{const o=document.createElement("output");o.id="cc177-test";o.dataset.status=Object.values(obj).every(Boolean)?"pass":"fail";o.textContent=JSON.stringify(obj);document.body.append(o);};',
 'function error(e){report({error:String(e?.stack||e),passed:false})}',
 'setTimeout(()=>{try{',
 'const sameShell=!!$("#cc166-panel")&&!!$(".cc166-sidebar")&&!!$(".cc166-workspace");',
 'const noAdminMenu=!Array.from($$(".cc166-navitem")).some(x=>x.textContent.includes("Súper reseller")||x.textContent.includes("Bonos")||x.textContent.includes("Publicaciones"));',
 'const close=[...$$("#cc166-top-actions button")].some(x=>x.textContent.includes("Cerrar"));',
 'const back=[...$$("#cc166-top-actions button")].some(x=>x.textContent.includes("Atrás"));',
 '[...$$(".cc166-navitem")].find(x=>x.textContent.includes("Billetera"))?.click();',
 '[...$$(".cc175-tab")].find(x=>x.textContent==="Recarga manual")?.click();',
 'const automaticName=$("#cc166-content")?.textContent.includes("Cliente Registrado");',
 'const manualHiddenNoUserName=!$$("#cc166-content input[autocomplete=name],#cc166-content input[name=user],#cc166-content input[name=payer_name]").length;',
 'const manualUserForm=!!$("#cc166-content .cc177-recharge-form");',
 'const form=$("#cc166-content .cc177-recharge-form");form?.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));',
 'setTimeout(()=>{try{',
 'const submitted=window.__calls.some(x=>x.path==="rpc/cc_submit_manual_recharge"&&x.args.p_payer_name==="Cliente Registrado"&&x.args.p_service==="STREAM_BULLS"&&x.args.p_amount===5);',
 'const noAutomaticCredit=!window.__calls.some(x=>/credit|topup_complete|wallet_credit/i.test(x.path));',
 '[...$$(".cc175-tab")].find(x=>x.textContent==="Recarga automática")?.click();',
 'setTimeout(()=>{try{',
 'const verifiedUnavailable=$("#cc166-content")?.textContent.includes("Proveedor no confirmado")&&$("#cc166-content")?.textContent.includes("No disponible");',
 'const noFakePayments=!Array.from($$("#cc166-content button")).some(x=>/pagar ahora|acreditar automáticamente/i.test(x.textContent));',
 '[...$$("#cc166-top-actions button")].find(x=>x.textContent.includes("Atrás"))?.click();',
 'const returnedToManual=$("#cc166-content")?.textContent.includes("Solicitar recarga manual");',
 'const noOverflow=document.documentElement.scrollWidth<=innerWidth+5;',
 'report({sameShell,noAdminMenu,close,back,automaticName,manualHiddenNoUserName,manualUserForm,submitted,noAutomaticCredit,verifiedUnavailable,noFakePayments,returnedToManual,noOverflow});',
 '}catch(e){error(e)}},260);',
 '}catch(e){error(e)}},260);',
 '}catch(e){error(e)}},460);'
].join('\n');
const html='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+
 '<div id="cc77home"><div class="cc77top"><div class="cc77actions"></div></div></div>'+
 '<script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script></body></html>';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc177-wallet-'));
try{
 const file=path.join(dir,'test.html');fs.writeFileSync(file,html);
 const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=390,844','--virtual-time-budget=3100','--dump-dom','file://'+file],{encoding:'utf8',timeout:35000,maxBuffer:12*1024*1024});
 assert.equal(run.status,0,'Chrome: '+String(run.stderr).slice(-700));
 const result=run.stdout.match(/<output id="cc177-test" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(result,'Sin salida de prueba V177');
 assert.equal(result[1],'pass','Error en V177: '+result[2]);
 console.log('PASS V177 · Panel común, nombre desde cuenta, recarga manual y proveedores automáticos seguros.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
