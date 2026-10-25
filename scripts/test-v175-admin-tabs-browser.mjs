/* V175 · Smoke navegador ADMIN: funciones en sus pestañas, sin administración anterior. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome/Chromium requerido');
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const css=fs.readFileSync('styles/v166-portal-roles.css','utf8')+'\n'+fs.readFileSync('styles/v171-admin-simple.css','utf8');
const setup=[
 'window.CC_V53_SESSION={userId:"test-admin",jwt:"jwt-admin"};',
 'window.__requests=[];window.cc80={open(){},api:async function(p,method,body){window.__requests.push(p);',
 'if(p.startsWith("cc_admins?"))return [{user_id:"test-admin"}];',
 'if(p==="rpc/cc_portal_admin_accounts_v2")return [{registry_no:1,registry_code:"CLAN1",registry_alias:"CLAN1",email:"admin@ejemplo.test",role_assigned:"ADMIN",is_admin:true}];',
 'if(p==="rpc/cc_admin_reseller_requests")return [{applicant_email:"solicitud@ejemplo.test",membership_status:"PENDING"}];',
 'if(p==="rpc/cc_admin_manual_recharge_queue")return [{request_id:"req-test",payer_name:"Cliente de prueba",service:"STREAM_BULLS",amount_pen:12,created_at:"2026-10-25T12:00:00Z"}];',
 'if(p==="rpc/cc_admin_financial_summary")return {cash_received_pen:18,paid_service_consumption_pen:7,real_wallet_liability_pen:11,free_bonus_granted_pen:0,free_bonus_available_pen:0,free_bonus_consumed_pen:0,refunded_service_pen:0};',
 'if(p==="rpc/cc_admin_wallet_financial_audit")return [{event_type:"RECARGA",concept:"Operación de prueba",amount_pen:18,recorded_at:"2026-10-25T12:00:00Z",balance_before:0,balance_after:18,service:"STREAM_BULLS",reference:"r-test",status:"VERIFIED"}];',
 'if(p==="rpc/cc_portal_my_stream_orders"||p==="rpc/cc_portal_my_stream_prices"||p==="rpc/cc_my_real_wallet_movements")return [];',
 'if(p.startsWith("cc_businesses?"))return [{id:"stream",code:"STREAM_BULLS"}];',
 'return [];}};'
].join('\n');
const probe=[
 'const $=q=>document.querySelector(q),$$=q=>document.querySelectorAll(q);',
 'function clickTab(label){const b=[...$$(".cc175-tab")].find(e=>e.textContent===label);if(!b)throw Error("Falta pestaña "+label);b.click();}',
 'function report(obj){const node=document.createElement("output");node.id="cc175-smoke";node.dataset.status=Object.values(obj).every(Boolean)?"pass":"fail";node.textContent=JSON.stringify(obj);document.body.append(node);}',
 'function fail(e){report({error:String(e?.stack||e),valid:false});}',
 'setTimeout(()=>{try{',
 'const noLegacy=!document.body.textContent.includes("Herramientas avanzadas")&&!document.body.textContent.includes("Administración anterior");',
 'const initial=$(".cc171-person")?.textContent.includes("CLAN1");',
 'clickTab("Solicitudes");',
 'setTimeout(()=>{try{',
 'const requests=$("#cc166-content")?.textContent.includes("solicitud@ejemplo.test");',
 'const adminNav=[...$$(".cc166-navitem")].find(e=>e.textContent.includes("Usuarios"));adminNav?.click();',
 'const registryKept=$(".cc171-person")?.textContent.includes("CLAN1");',
 '[...$$(".cc166-navitem")].find(e=>e.textContent.includes("Billetera"))?.click();',
 'clickTab("Recargas");',
 'setTimeout(()=>{try{',
 'const recharges=$("#cc166-content")?.textContent.includes("Cliente de prueba")&&$("#cc166-content")?.textContent.includes("S/ 12.00");',
 'const verificationButton=[...$$("#cc166-content button")].some(e=>e.textContent==="Verificar depósitos");',
 'clickTab("Auditoría");',
 'setTimeout(()=>{try{',
 'const audit=$("#cc166-content")?.textContent.includes("Operación de prueba")&&$("#cc166-content")?.textContent.includes("S/ 18.00");',
 'const noOtherOperations=window.__requests.every(p=>!p.includes("cc_portal_admin_assign_stream_role")&&!p.includes("cc_admin_decide_manual_recharge"));',
 'const noOverflow=document.documentElement.scrollWidth<=innerWidth+5;',
 'report({noLegacy,initial,requests,registryKept,recharges,verificationButton,audit,noOtherOperations,noOverflow});',
 '}catch(e){fail(e)}},240);',
 '}catch(e){fail(e)}},240);',
 '}catch(e){fail(e)}},240);',
 '}catch(e){fail(e)}},450);'
].join('\n');
const html='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+
 '<div id="cc77home"><div class="cc77top"><div class="cc77actions"></div></div></div>'+
 '<script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script></body></html>';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc175-tabs-'));
try{
 const file=path.join(dir,'test.html');fs.writeFileSync(file,html);
 const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=390,844','--virtual-time-budget=3200','--dump-dom','file://'+file],
 {encoding:'utf8',timeout:29000,maxBuffer:12*1024*1024});
 assert.equal(run.status,0,'Chrome: '+String(run.stderr).slice(-500));
 const m=run.stdout.match(/<output id="cc175-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(m,'Sin resultado de pestañas V175: '+run.stdout.slice(-650));
 assert.equal(m[1],'pass','V175: '+m[2]);
 console.log('PASS V175: Usuarios/Solicitudes, Billetera/Recargas/Auditoría sin accesos duplicados.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
