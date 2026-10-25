/* V171 · Smoke Chrome local del nuevo panel ADMIN:
 * usuarios visibles, rol pendiente, prueba gratis, revocar, cambiar rol,
 * antiguo ADMIN oculto en Avanzadas, sin dinero ni cuentas reales.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido');
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const css=fs.readFileSync('styles/v166-portal-roles.css','utf8')+'\n'+
 fs.readFileSync('styles/v171-admin-simple.css','utf8');
const setup=[
 'window.CC_V53_SESSION={jwt:"fake-session",userId:"fake-admin"};',
 'window.confirm=()=>true;window.__events=[];',
 'window.__accounts=[',
 '{email:"admin@example.com",display_name:"Administrador",is_admin:true,role_assigned:"ADMIN",membership_status:"ACTIVE",access_until:null,trial_until:null,trial_active:false,super_enabled:false},',
 '{email:"clancartan@gmail.com",display_name:"CLAN CARTAN",is_admin:false,role_assigned:"SUPER_RESELLER",membership_status:"PENDING",access_until:null,trial_until:null,trial_active:false,super_enabled:true},',
 '{email:"luiscar1425@gmail.com",display_name:"Luis Car",is_admin:false,role_assigned:"RESELLER",membership_status:"PENDING",access_until:null,trial_until:null,trial_active:false,super_enabled:false}',
 '];',
 'window.cc80={open(){},api:async(path,method,args)=>{',
 'if(path.startsWith("cc_admins?"))return [{user_id:"fake-admin"}];',
 'if(path==="rpc/cc_portal_admin_accounts")return window.__accounts.map(x=>({...x}));',
 'if(path==="rpc/cc_portal_admin_start_stream_trial"){window.__events.push({type:"trial",args});const x=window.__accounts.find(x=>x.email===args.p_email);x.trial_active=true;x.trial_until="2099-11-02T23:59:00Z";x.access_until=x.trial_until;x.membership_status="ACTIVE";return {activated:true,ends_at:x.trial_until,charged_pen:0};}',
 'if(path==="rpc/cc_portal_admin_end_stream_trial"){window.__events.push({type:"end",args});const x=window.__accounts.find(x=>x.email===args.p_email);x.trial_active=false;x.access_until=null;x.membership_status="PENDING";return {ended:true,charged_pen:0};}',
 'if(path==="rpc/cc_portal_admin_assign_stream_role"){window.__events.push({type:"role",args});const x=window.__accounts.find(x=>x.email===args.p_email);x.role_assigned=args.p_role;x.super_enabled=args.p_role==="SUPER_RESELLER";return {assigned:true,role:args.p_role,membership_active:false};}',
 'if(path==="rpc/cc_portal_my_stream_orders")return [];',
 'if(path==="rpc/cc_my_real_wallet_movements")return [];',
 'if(path.startsWith("cc_businesses?"))return [{id:"stream-business",code:"STREAM_BULLS"}];',
 'if(path.startsWith("cc_plans?"))return [{code:"STREAM_365",business_id:"stream-business",price_pen:25,is_active:true}];',
 'return [];}};'
].join('\n');
const probe=[
 'setTimeout(()=>{try{',
 'const $=q=>document.querySelector(q), $$=q=>document.querySelectorAll(q);',
 'const page=$("#cc166-content");',
 'const adminVisible=!!page&&!$("#cc166-panel").hidden&&!!$(".cc171-users");',
 'const correctTitle=page?.textContent.includes("Usuarios y accesos");',
 'const threeAccounts=$$(".cc171-person").length===3;',
 'const pendingRoles=page?.textContent.includes("SÚPER RESELLER")&&page?.textContent.includes("RESELLER")&&page?.textContent.includes("Pendiente de membresía");',
 'const oldHidden=$(".cc171-advanced")?.open===false;',
 'const noCharges=window.__events.length===0;',
 'const firstTrial=[...$$(".cc171-person")].find(x=>x.textContent.includes("clancartan@gmail.com"))?.querySelector(".cc166-primary");',
 'firstTrial?.click();',
 'setTimeout(()=>{try{',
 'const startOnce=window.__events.filter(e=>e.type==="trial").length===1;',
 'const trialPayload=window.__events.find(e=>e.type==="trial")?.args;',
 'const rightAccount=trialPayload?.p_email==="clancartan@gmail.com"&&trialPayload?.p_days===7;',
 'const activeInUI=!![...$$(".cc171-person")].find(x=>x.textContent.includes("CLAN CARTAN")&&x.textContent.includes("Prueba activa"));',
 'const revoke=[...$$(".cc171-person")].find(x=>x.textContent.includes("CLAN CARTAN"))?.querySelector("button");',
 'revoke?.click();',
 'setTimeout(()=>{try{',
 'const ended=window.__events.some(e=>e.type==="end"&&e.args.p_email==="clancartan@gmail.com");',
 'const luis=[...$$(".cc171-person")].find(x=>x.textContent.includes("Luis Car"));',
 'const detail=luis?.querySelector("details");if(detail)detail.open=true;',
 'const select=detail?.querySelector("select");if(select)select.value="SUPER_RESELLER";',
 'detail?.querySelector("button")?.click();',
 'setTimeout(()=>{try{',
 'const roleChanged=window.__events.some(e=>e.type==="role"&&e.args.p_email==="luiscar1425@gmail.com"&&e.args.p_role==="SUPER_RESELLER");',
 'const changedInUi=[...$$(".cc171-person")].some(x=>x.textContent.includes("Luis Car")&&x.textContent.includes("SÚPER RESELLER"));',
 'const noWalletCalls=window.__events.every(e=>["trial","end","role"].includes(e.type));',
 'const noOverflow=document.documentElement.scrollWidth<=innerWidth+5;',
 'const checks={adminVisible,correctTitle,threeAccounts,pendingRoles,oldHidden,noCharges,startOnce,rightAccount,activeInUI,ended,roleChanged,changedInUi,noWalletCalls,noOverflow};',
 'const result=document.createElement("output");result.id="cc171-smoke";result.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";result.textContent=JSON.stringify(checks);document.body.append(result);',
 '}catch(e){failure(e)}',
 '},220);',
 '}catch(e){failure(e)}',
 '},220);',
 '}catch(e){failure(e)}',
 '},220);',
 '}catch(e){failure(e)}',
 '},400);',
 'function failure(e){const result=document.createElement("output");result.id="cc171-smoke";result.dataset.status="fail";result.textContent=String(e?.stack||e);document.body.append(result);}'
].join('\n');
const html=['<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>'+css+'</style></head><body>',
 '<div id="cc77home"><div class="cc77top"><div class="cc77actions"></div></div></div>',
 '<script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script></body></html>'
].join('\n');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc171-admin-'));
try{
 const filename=path.join(dir,'test.html');fs.writeFileSync(filename,html);
 const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu',
 '--disable-dev-shm-usage','--window-size=390,844','--virtual-time-budget=3300',
 '--dump-dom','file://'+filename],
 {encoding:'utf8',timeout:30000,maxBuffer:13*1024*1024});
 assert.equal(run.status,0,'Chrome: '+String(run.stderr).slice(-700));
 const m=run.stdout.match(/<output id="cc171-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(m,'No terminó el test V171: '+run.stdout.slice(-550));
 assert.equal(m[1],'pass','V171 ADMIN: '+m[2]);
 console.log('PASS · V171 ADMIN simple, 3 usuarios, prueba gratis, cancelación, cambio de rol, móvil; sin pagos.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
