/* V172 · Chrome móvil ADMIN: cuentas y roles sin pruebas gratuitas.
 * Mocks locales: nunca llama a Supabase ni a la billetera real.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido');
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const css=fs.readFileSync('styles/v166-portal-roles.css','utf8')+'\n'+fs.readFileSync('styles/v171-admin-simple.css','utf8');
const setup=[
 'window.CC_V53_SESSION={jwt:"fake-admin-jwt",userId:"fake-admin"};',
 'window.confirm=()=>true;window.__events=[];',
 'window.__accounts=[',
 '{registry_no:1,registry_code:"CLAN1",registry_alias:"CLAN1",email:"admin@example.com",display_name:"Administrador",is_admin:true,role_assigned:"ADMIN",membership_status:"ACTIVE",access_until:null,trial_until:null,trial_active:false,super_enabled:false},',
 '{registry_no:2,registry_code:"CLAN2",registry_alias:"CLAN CARTAN",email:"clancartan@gmail.com",display_name:"CLAN CARTAN",is_admin:false,role_assigned:"SUPER_RESELLER",membership_status:"PENDING",access_until:null,trial_until:null,trial_active:false,super_enabled:true},',
 '{registry_no:3,registry_code:"CLAN3",registry_alias:"LUIS CAR",email:"luiscar1425@gmail.com",display_name:"Luis Car",is_admin:false,role_assigned:"RESELLER",membership_status:"PENDING",access_until:null,trial_until:null,trial_active:false,super_enabled:false}',
 '];',
 'window.cc80={open(){},api:async(path,method,args)=>{',
 'if(path.startsWith("cc_admins?"))return [{user_id:"fake-admin"}];',
 'if(path==="rpc/cc_portal_admin_accounts_v2")return window.__accounts.map(a=>({...a}));',
 'if(path==="rpc/cc_portal_admin_assign_stream_role"){window.__events.push({type:"role",args});const row=window.__accounts.find(a=>a.email===args.p_email);row.role_assigned=args.p_role;row.super_enabled=args.p_role==="SUPER_RESELLER";return {assigned:true,role:args.p_role,membership_active:false};}',
 'if(path==="rpc/cc_portal_admin_start_stream_trial"||path==="rpc/cc_portal_admin_end_stream_trial")throw Error("Prohibido iniciar prueba");',
 'if(path==="rpc/cc_portal_my_stream_orders")return [];',
 'if(path==="rpc/cc_portal_my_stream_prices")return [];',
 'if(path==="rpc/cc_my_real_wallet_movements")return [];',
 'if(path.startsWith("cc_businesses?"))return [{id:"stream-business",code:"STREAM_BULLS"}];',
 'if(path.startsWith("cc_plans?"))return [{code:"STREAM_365",business_id:"stream-business",price_pen:25,is_active:true}];',
 'return [];}};'
].join('\n');
const probe=[
 'setTimeout(()=>{try{',
 'const $=q=>document.querySelector(q),$$=q=>document.querySelectorAll(q);',
 'const page=$("#cc166-content");',
 'const dashboardClean=page?.textContent.includes("Control de operaciones")&&!page?.textContent.includes("Herramientas avanzadas");',
 '[...$$(".cc166-navitem")].find(b=>b.textContent.includes("Usuarios"))?.click();',
 'const adminVisible=!!page&&!$("#cc166-panel")?.hidden&&!!$(".cc171-users");',
 'const correctTitle=page?.textContent.includes("Directorio de usuarios");',
 'const threeAccounts=$$(".cc171-person").length===3;',
 'const stableCodes=page?.textContent.includes("CLAN1")&&page?.textContent.includes("CLAN2")&&page?.textContent.includes("CLAN3");',
 'const expectedRoles=page?.textContent.includes("SÚPER RESELLER")&&page?.textContent.includes("RESELLER");',
 'const pendingLabel=page?.textContent.includes("Membresía pendiente o vencida");',
 'const noTrialUi=!page?.textContent.includes("prueba gratuita")&&!page?.textContent.includes("Probar 7 días")&&!page?.textContent.includes("Finalizar prueba");',
 'const noAdvanced=$(".cc171-advanced")===null&&!page?.textContent.includes("Herramientas avanzadas");',
 'const noRoleEditor=!page?.textContent.includes("Cambiar rol");',
 '[...$$(".cc166-navitem")].find(b=>b.textContent.includes("Súper reseller"))?.click();',
 'const approvalPage=page?.textContent.includes("Autorizaciones · Súper reseller");',
 'const luis=[...document.querySelectorAll(".cc176-approval-row")].find(x=>x.textContent.includes("LUIS CAR"));',
 'luis?.querySelector("button")?.click();',
 'setTimeout(()=>{try{',
 'const roleChanged=window.__events.length===1&&window.__events[0].type==="role"&&',
 'window.__events[0].args.p_email==="luiscar1425@gmail.com"&&window.__events[0].args.p_role==="SUPER_RESELLER";',
 'const changedInUi=[...$$(".cc176-approval-row")].some(x=>x.textContent.includes("LUIS CAR")&&x.textContent.includes("Autorizado"));',
 'const noWalletCalls=window.__events.every(x=>x.type==="role");',
 'const noOverflow=document.documentElement.scrollWidth<=innerWidth+5;',
 'const checks={dashboardClean,adminVisible,correctTitle,threeAccounts,stableCodes,expectedRoles,pendingLabel,noTrialUi,noAdvanced,noRoleEditor,approvalPage,roleChanged,changedInUi,noWalletCalls,noOverflow};',
 'const node=document.createElement("output");node.id="cc171-smoke";node.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";node.textContent=JSON.stringify(checks);document.body.append(node);',
 '}catch(e){failure(e)}',
 '},340);',
 '}catch(e){failure(e)}',
 '},500);',
 'function failure(e){const node=document.createElement("output");node.id="cc171-smoke";node.dataset.status="fail";node.textContent=String(e?.stack||e);document.body.append(node);}'
].join('\n');
const html=['<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>'+css+'</style></head><body>',
 '<div id="cc77home"><div class="cc77top"><div class="cc77actions"></div></div></div>',
 '<script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script></body></html>'
].join('\n');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc172-admin-'));
try{
 const file=path.join(dir,'test.html');fs.writeFileSync(file,html);
 const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=390,844','--virtual-time-budget=3300','--dump-dom','file://'+file],
 {encoding:'utf8',timeout:30000,maxBuffer:13*1024*1024});
 assert.equal(run.status,0,'Chrome: '+String(run.stderr).slice(-600));
 const m=run.stdout.match(/<output id="cc171-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(m,'No terminó el test de ADMIN: '+run.stdout.slice(-500));
 assert.equal(m[1],'pass','ADMIN V172: '+m[2]);
 console.log('PASS · ADMIN muestra 3 cuentas y roles sin pruebas gratis, sin cobro y en móvil.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
