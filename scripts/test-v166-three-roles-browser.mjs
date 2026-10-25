/* V166 · Chrome smoke sin red ni credenciales: roles y controles interactivos. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Es obligatorio Chrome / Chromium para verificar V166');
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const css=fs.readFileSync('styles/v166-portal-roles.css','utf8');
const home='<div id="cc77home"><div class="cc77top"><div class="cc77actions"></div></div><div class="cc77cards"><article class="cc77card"><button>STREAM</button></article><article class="cc77card"><button>COBRA</button></article></div></div>';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc166-'));
try{
 for(const mode of ['reseller','super','admin']){
  const setup=[
   'window.CC_V53_SESSION={jwt:"TEST-ONLY-JWT",userId:"fake-user"};',
   'window.cc80={open(){},api:async function(path,method,body){',
   'if(path.indexOf("cc_admins?")===0)return '+(mode==='admin'?'[{user_id:"fake-user"}]':'[]')+';',
   'if(path.indexOf("cc_memberships?")===0)return '+(mode==='super'?'[{id:"stream-member",business_id:"stream-business",role:"SUPER_RESELLER",status:"ACTIVE"}]':'[]')+';',
   'if(path.indexOf("cc_subscriptions?")===0)return '+(mode==='super'?'[{membership_id:"stream-member",status:"ACTIVE",end_at:"2099-12-31"}]':'[]')+';',
   'if(path.indexOf("cc_businesses?")===0)return [{id:"stream-business",code:"STREAM_BULLS"}];',
   'if(path.indexOf("cc_real_service_wallets?")===0)return [{service:"COBRA_YA",balance_pen:12.50}];',
   'if(path.indexOf("cc_portal_super_resellers?")===0)return '+(mode==='super'?'[{user_id:"fake-user",enabled:true,admin_percent:20}]':'[]')+';',
   'if(path.indexOf("cc_portal_stream_products?")===0)return [{seller_id:"fake-user",title:"Netflix mensual",service:"Netflix",price_pen:12.5,stock:4,status:"ACTIVE"}];',
   'if(path.indexOf("rpc/cc_my_real_wallet_movements")===0)return [{service:"COBRA_YA",amount_pen:-3.50,movement_type:"PURCHASE",description:"Activación STREAM BULLS",occurred_at:"2026-10-25T12:00:00Z"}];',
   'return [];}};'
  ].join('\n');
  const check=[
   'setTimeout(()=>{const x=id=>document.getElementById(id),panel=x("cc166-panel");',
   'const rendered=!!panel&&!panel.hidden;',
   'const launcher=x("cc166-open-button");const launcherInstalled=!!launcher;',
   'panel?.querySelector(".cc166-x")?.click();const closes=panel?.hidden===true;',
   'launcher?.click();const reopens=panel?.hidden===false;',
   'const role=x("cc166-role")?.textContent||"";',
   'const oldHome=!!x("cc77home");',
   'const actualBalance=x("cc166-content")?.textContent.includes("S/ 12.50");',
   'const businessCount=document.querySelectorAll(".cc166-business").length===4;',
   'const menuAdmin=[...document.querySelectorAll(".cc166-navitem")].some(b=>b.textContent.includes("Administración"));',
   'const menuPublish=[...document.querySelectorAll(".cc166-navitem")].some(b=>b.textContent.includes("Publicaciones"));',
   'const controlsOK=!!window.cc166OpenPanel&&!!window.cc166RefreshPanel;',
   'const checks={rendered,launcherInstalled,closes,reopens,oldHome,actualBalance,businessCount,controlsOK,roleValid:',
   mode==='admin'?'role.includes("ADMIN"),adminValid:menuAdmin,superValid:menuPublish':mode==='super'?'role.includes("SÚPER"),adminValid:!menuAdmin,superValid:menuPublish':'role.includes("RESELLER"),adminValid:!menuAdmin,superValid:!menuPublish',
   ',mobileWidth:document.documentElement.scrollWidth<=innerWidth+3};',
   'const n=document.createElement("output");n.id="cc166-smoke";',
   'n.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";n.textContent=JSON.stringify(checks);document.body.append(n);',
   '},700);'
  ].join('\n');
  const html=['<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">','<style>',css,'</style></head><body>',home,'<script>',setup,'</script>','<script>',js,'</script>','<script>',check,'</script></body></html>'].join('\n');
  const file=path.join(dir,mode+'.html');fs.writeFileSync(file,html);
  const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size=390,844','--virtual-time-budget=3000','--dump-dom','file://'+file],{encoding:'utf8',timeout:25000,maxBuffer:10*1024*1024});
  assert.equal(run.status,0,'Chrome falló ('+mode+'): '+String(run.stderr).slice(-300));
  const m=run.stdout.match(/<output id="cc166-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
  assert.ok(m,'No se ejecutó la prueba '+mode);
  assert.equal(m[1],'pass','Panel '+mode+' inválido: '+m[2]);
  console.log('PASS rol '+mode+' en Chrome móvil; saldo real, navegación y módulos originales intactos.');
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
