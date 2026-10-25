/* V173 · Catálogo robusto ante JWT vencido: público visible sin descuentos,
 * luego precio distribuidor al renovar sesión. Solo mocks en Chrome.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido');
const js=fs.readFileSync('scripts/v169-catalogo-unico.js','utf8');
const css=fs.readFileSync('styles/v169-catalogo-perfil.css','utf8');
const setup=[
 'window.CC_V53_SESSION={userId:"user-synthetic",jwt:"expired-jwt"};',
 'window.__requests=[];',
 'window.__public=[{id:"p1",title:"Netflix por 30 días",service:"Netflix",description:"Acceso",price_pen:12,public_price_pen:12,distributor_price_pen:null,price_tier:"PUBLIC",stock:3,duration_days:30}];',
 'window.__wholesale=[{id:"p1",title:"Netflix por 30 días",service:"Netflix",description:"Acceso",price_pen:8,public_price_pen:12,distributor_price_pen:8,price_tier:"DISTRIBUTOR",stock:3,duration_days:30}];',
 'window.fetch=async(url,options)=>{window.__requests.push({url,auth:options?.headers?.Authorization||""});',
 'if(options?.headers?.Authorization==="Bearer expired-jwt")return {ok:false,status:401};',
 'return {ok:true,status:200,json:async()=>options?.headers?.Authorization==="Bearer valid-jwt"?window.__wholesale:window.__public};',
 '};',
 'window.cc166PurchaseProductFromCatalog=()=>{throw Error("No debe comprar en prueba de catálogos");};'
].join('\n');
const probe=[
 'setTimeout(()=>{try{',
 'const $=q=>document.querySelector(q);',
 'const publicVisible=$(".cc169-offer")?.textContent.includes("S/ 12.00");',
 'const safeTier=$(".cc169-offer")?.textContent.includes("Precio público")&&!$(".cc169-offer")?.textContent.includes("S/ 8.00");',
 'const warning=$("#productos")?.textContent.includes("La sesión caducó");',
 'const guestFetched=window.__requests.some(r=>!r.auth);',
 'const initialRequests=window.__requests.length;',
 'window.CC_V53_SESSION.jwt="valid-jwt";window.dispatchEvent(new Event("focus"));',
 'setTimeout(()=>{try{',
 'const discountVisible=$(".cc169-offer")?.textContent.includes("S/ 8.00")&&$(".cc169-offer")?.textContent.includes("Precio distribuidor");',
 'const oldWarningGone=!$("#productos")?.textContent.includes("La sesión caducó");',
 'const validFetched=window.__requests.some(r=>r.auth==="Bearer valid-jwt");',
 'const noDuplicates=document.querySelectorAll(".cc169-offer").length===1;',
 'const noOverflow=document.documentElement.scrollWidth<=innerWidth+5;',
 'const checks={publicVisible,safeTier,warning,guestFetched,discountVisible,oldWarningGone,validFetched,noDuplicates,noOverflow,initialRequestsValid:initialRequests>=2};',
 'const out=document.createElement("output");out.id="cc173-catalog-smoke";out.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";out.textContent=JSON.stringify(checks);document.body.append(out);',
 '}catch(e){failure(e)}',
 '},350);',
 '}catch(e){failure(e)}',
 '},440);',
 'function failure(e){const out=document.createElement("output");out.id="cc173-catalog-smoke";out.dataset.status="fail";out.textContent=String(e?.stack||e);document.body.append(out);}'
].join('\n');
const html=[
 '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>'+css+'</style></head><body>',
 '<div id="app"><section id="productos"><div class="v23-catalog-section">',
 '<header class="section-head"><span class="v23-count">Esperando</span></header>',
 '<div class="v23-product-grid"><div>Ejemplo sin compra</div></div>',
 '<div class="v23-shop-note"></div></div></section></div>',
 '<script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script>',
 '</body></html>'
].join('\n');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc173-catalog-'));
try{
 const file=path.join(dir,'catalog.html');fs.writeFileSync(file,html);
 const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--window-size=390,844','--virtual-time-budget=2800','--dump-dom','file://'+file],
 {encoding:'utf8',timeout:28000,maxBuffer:12*1024*1024});
 assert.equal(run.status,0,'Chrome: '+String(run.stderr).slice(-700));
 const result=run.stdout.match(/<output id="cc173-catalog-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(result,'Sin test V173 catálogo: '+run.stdout.slice(-500));
 assert.equal(result[1],'pass','Fallback catálogo: '+result[2]);
 console.log('PASS V173 · JWT caducado ve público, sesión renovada ve distribuidor, un catálogo y móvil.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
