/* V181 · ADMIN otorga recarga y bono a usuarios ya registrados, sin facturación ficticia. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const browser=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(browser,'Requiere Chrome');
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const css=['styles/v166-portal-roles.css','styles/v171-admin-simple.css',
 'styles/v176-admin-console.css','styles/v177-panel-unico.css'].map(x=>fs.readFileSync(x,'utf8')).join('\n');
const setup=[
 'window.CC_V53_SESSION={jwt:"test-jwt",userId:"test-admin"};',
 'window.confirm=()=>true;window.__calls=[];',
 'window.__users=[',
 '{user_id:"11111111-1111-4111-8111-111111111111",registry_no:1,registry_code:"CLAN1",registry_alias:"CLAN1",email:"admin@test.local",is_admin:true,role_assigned:"ADMIN"},',
 '{user_id:"22222222-2222-4222-8222-222222222222",registry_no:2,registry_code:"CLAN2",registry_alias:"CLAN CARTAN",email:"clan@test.local",is_admin:false,role_assigned:"RESELLER",paid_until:null,super_enabled:false}',
 '];',
 'window.cc80={open(){},api:async function(p,method,b){window.__calls.push({p,b});',
 'if(p.startsWith("cc_admins?"))return [{user_id:"test-admin"}];',
 'if(p==="rpc/cc_portal_admin_accounts_v2")return window.__users;',
 'if(p==="rpc/cc_admin_manual_recharge_queue_v184")return [];',
 'if(p==="rpc/cc_admin_manual_recharge_status_v189")return [{enabled:false}];',
 'if(p==="rpc/cc_admin_create_manual_recharge_for_user")return b.p_request;',
 'if(p.startsWith("cc_businesses?"))return [{id:"stream",code:"STREAM_BULLS"}];',
 'if(p==="rpc/cc_portal_my_stream_orders"||p==="rpc/cc_portal_my_stream_prices"||p==="rpc/cc_my_real_wallet_movements")return [];',
 'return [];}};'
].join('\n');
const probe=[
 'const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);',
 'function findBtn(s){return [...$$("#cc166-content button")].find(e=>e.textContent.includes(s))}',
 'function done(obj){const el=document.createElement("output");el.id="cc181-smoke";el.dataset.status=Object.values(obj).every(Boolean)?"pass":"fail";el.textContent=JSON.stringify(obj);document.body.append(el)}',
 'function fail(e){done({error:String(e?.stack||e),passed:false})}',
 'setTimeout(()=>{try{',
 'const admin=!!$("#cc166-panel");',
 'const homeGrants=!!findBtn("Otorgar recarga")&&!!findBtn("Otorgar bono");',
 'const noAdminShop=!Array.from($$(".cc166-navitem")).some(x=>x.textContent.includes("Catálogo")||x.textContent.includes("Mis compras")||x.textContent.includes("Mis publicaciones"));',
 '[...$$(".cc166-navitem")].find(x=>x.textContent.includes("Usuarios"))?.click();',
 'const rows=$$(".cc171-person").length===2;',
 'const row=[...$$(".cc171-person")].find(x=>x.textContent.includes("CLAN2"));',
 'const userActions=row?.querySelectorAll(".cc181-user-actions button")||[];',
 'const buttonsOk=userActions.length===2;',
 'userActions[0]?.click();',
 'setTimeout(()=>{try{',
 'const accountSelected=$("#cc166-content .cc181-assist-fields select")?.value==="22222222-2222-4222-8222-222222222222";',
 'const noNameQuestion=!$("#cc166-content .cc181-assist-fields input[name=full_name]")&&!$("#cc166-content .cc181-assist-fields input[name=payer_name]");',
 'const bankerDisabled=$("#cc166-content")?.textContent.includes("Aprobación manual no disponible en el servidor");',
 'const form=$("#cc166-content .cc181-assist-fields");form?.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));',
 'setTimeout(()=>{try{',
 'const call=window.__calls.find(x=>x.p==="rpc/cc_admin_create_manual_recharge_for_user");',
 'const correctRequest=call?.b.p_target==="22222222-2222-4222-8222-222222222222"&&call?.b.p_service==="STREAM_BULLS"&&call?.b.p_amount===5;',
 'const noCashCredit=!window.__calls.some(x=>/cc_admin_decide_manual_recharge|cc_credit_verified_real_topup/.test(x.p));',
 '[...$$(".cc166-navitem")].find(x=>x.textContent.includes("Usuarios"))?.click();',
 'const row2=[...$$(".cc171-person")].find(x=>x.textContent.includes("CLAN2"));',
 '[...row2.querySelectorAll(".cc181-user-actions button")].find(x=>x.textContent.includes("Otorgar bono"))?.click();',
 'const bonusSelected=$("#cc166-content .cc177-bonus-form select")?.value==="clan@test.local";',
 'done({admin,homeGrants,noAdminShop,rows,buttonsOk,accountSelected,noNameQuestion,bankerDisabled,correctRequest,noCashCredit,bonusSelected});',
 '}catch(e){fail(e)}},250);',
 '}catch(e){fail(e)}},260);',
 '}catch(e){fail(e)}},500);'
].join('\n');
const html='<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body>'+
 '<div id="cc77home"><div class="cc77top"><div class="cc77actions"></div></div></div>'+
 '<script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script></body></html>';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc181-admin-'));
try{
 const file=path.join(dir,'test.html');fs.writeFileSync(file,html);
 const p=spawnSync(browser,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=390,844','--virtual-time-budget=3200','--dump-dom','file://'+file],{encoding:'utf8',timeout:35000,maxBuffer:14*1024*1024});
 assert.equal(p.status,0,p.stderr.slice(-1200));
 const m=p.stdout.match(/<output id="cc181-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(m,'Sin salida V181 '+p.stdout.slice(-500));
 assert.equal(m[1],'pass',m[2]);
 console.log('PASS V181: botones de ADMIN, cuenta preseleccionada, recarga pendiente, bono sin dinero ficticio.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
