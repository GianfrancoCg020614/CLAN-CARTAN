/* V169 · Mi perfil editable desde la cuenta REAL; Chrome solo usa mocks.
 * No altera personas, saldo, documento, consentimiento ni autenticación.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido');
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const css=fs.readFileSync('styles/v166-portal-roles.css','utf8')+'\n'+fs.readFileSync('styles/v169-catalogo-perfil.css','utf8');
const setup=[
 'window.CC_V53_SESSION={userId:"fake-account",jwt:"test-token",root:"https://example.invalid",key:"publishable"};',
 'window.__save=[];window.__profile={full_name:"Cliente inicial",phone_e164:"+51900000001",region:"Lima",province:"Lima",district:"Santa Anita"};',
 'window.cc95RenderUser=()=>{};',
 'window.fetch=async(path)=>({ok:true,json:async()=>({id:window.CC_V53_SESSION.userId,email:"cliente@example.com"})});',
 'window.cc80={api:async(path,method,body)=>{',
 'if(path.startsWith("cc_user_details?"))return path.includes("other-account")?[]:[window.__profile];',
 'if(path==="rpc/cc_portal_save_my_profile"){window.__save.push(body);window.__profile={full_name:body.p_full_name,phone_e164:body.p_phone_e164,region:body.p_region,province:body.p_province,district:body.p_district};return {saved:true};}',
 'if(path==="rpc/cc_portal_my_stream_orders")return [];',
 'if(path==="rpc/cc_my_real_wallet_movements")return [];',
 'return [];},open:()=>{}};'
].join('\n');
const probe=[
 'setTimeout(()=>{try{',
 'const buttons=[...document.querySelectorAll("#cc166-nav button")];',
 'const nav=buttons.find(b=>b.textContent.includes("Mi perfil"));nav?.click();',
 'setTimeout(()=>{try{',
 'const form=document.querySelector("#cc169-profile-form");',
 'const name=form?.querySelector("input[name=full_name]"),phone=form?.querySelector("input[name=phone]");',
 'const initiallyCorrect=name?.value==="Cliente inicial"&&phone?.value==="+51900000001";',
 'const emailReadonly=[...form.querySelectorAll("input")].some(i=>i.readOnly&&i.value==="cliente@example.com");',
 'name.value="Nombre actualizado";phone.value="+51912345678";form.querySelector("input[name=district]").value="Miraflores";',
 'form.requestSubmit();',
 'setTimeout(()=>{try{',
 'const savedOnce=window.__save.length===1;',
 'const payload=window.__save[0]||{};',
 'const fieldsOK=payload.p_full_name==="Nombre actualizado"&&payload.p_phone_e164==="+51912345678"&&payload.p_district==="Miraflores";',
 'const singleProfile=document.querySelectorAll("#cc169-profile-form").length===1;',
 'const refreshed=document.querySelector("#cc169-profile-form input[name=full_name]")?.value==="Nombre actualizado";',
 'const noOtherBusinessChanged=typeof window.cc166PurchaseProductFromCatalog==="function"&&!!document.querySelector(".cc167-tabs");',
 'const checks={initiallyCorrect,emailReadonly,savedOnce,fieldsOK,singleProfile,refreshed,noOtherBusinessChanged};',
 'const n=document.createElement("output");n.id="profile-smoke";n.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";n.textContent=JSON.stringify(checks);document.body.append(n);',
 '}catch(e){const n=document.createElement("output");n.id="profile-smoke";n.dataset.status="fail";n.textContent=String(e);document.body.append(n)}',
 '},350);',
 '}catch(e){const n=document.createElement("output");n.id="profile-smoke";n.dataset.status="fail";n.textContent=String(e);document.body.append(n)}',
 '},220);',
 '}catch(e){const n=document.createElement("output");n.id="profile-smoke";n.dataset.status="fail";n.textContent=String(e);document.body.append(n)}',
 '},300);'
].join('\n');
const html=[
 '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>'+css+'</style></head><body>',
 '<div id="cc77home"><header class="cc77top"><div class="cc77actions"></div></header></div>',
 '<script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script>',
 '</body></html>'
].join('\n');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc169-profile-'));
try{
 const file=path.join(dir,'profile.html');fs.writeFileSync(file,html);
 const res=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--window-size=390,844','--virtual-time-budget=3300','--dump-dom','file://'+file],
  {encoding:'utf8',timeout:25000,maxBuffer:12*1024*1024});
 assert.equal(res.status,0,'Chrome error: '+String(res.stderr).slice(-430));
 const mark=res.stdout.match(/<output id="profile-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(mark,'El perfil no ejecutó el smoke test');
 assert.equal(mark[1],'pass','Falló Mi perfil V169: '+mark[2]);
 console.log('PASS Mi perfil V169 · lectura y guardado mock, correo protegido, una ficha central.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
