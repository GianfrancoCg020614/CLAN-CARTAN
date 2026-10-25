/* V172 · Chrome: un catálogo, distintas tarifas para AFILIADO y RESELLER.
 * Todo sintético. Nunca cobra ni crea productos reales.
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
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc172-tier-'));
try{
 for(const mode of ['visitor','affiliate','pending-reseller','reseller','super-reseller']){
  const eligible=mode==='reseller'||mode==='super-reseller';
  const logged=mode!=='visitor';
  const amount=eligible?8:12;
  const row={id:'synthetic-product',service:'Netflix',title:'Netflix 30 días',description:'Mensual',
   duration_days:30,price_pen:amount,public_price_pen:12,
   distributor_price_pen:eligible?8:null,price_tier:eligible?'DISTRIBUTOR':'PUBLIC',
   stock:3,status:'ACTIVE',flyer_path:null};
  const setup=[
   'window.__catalogRequests=[];window.__checkout=[];window.__login=0;',
   logged?'window.CC_V53_SESSION={userId:"test-user",jwt:"signed-session-TEST"};':'',
   'window.cc166PurchaseProductFromCatalog=(id,button,amount)=>window.__checkout.push({id,amount});',
   'window.cc77Auth=()=>window.__login++;',
   'window.fetch=async(url,options)=>{window.__catalogRequests.push({url,headers:options.headers});',
   'return {ok:true,json:async()=>['+JSON.stringify(row)+']};};'
  ].join('\n');
  const probe=[
   'setTimeout(()=>{try{',
   'const cards=document.querySelectorAll(".cc169-offer");',
   'const card=cards[0];',
   'const oneCatalog=cards.length===1&&!document.querySelector(".cc169-showcase");',
   'const expectedAmount='+amount+';',
   'const amountOK=card?.textContent.includes("S/ "+expectedAmount.toFixed(2));',
   'const labelOK=card?.textContent.includes('+JSON.stringify(eligible?'Precio distribuidor':'Precio público')+');',
   'const publicReference='+JSON.stringify(eligible)+'?card?.textContent.includes("Precio al público: S/ 12.00"):!card?.textContent.includes("Precio al público: S/ 12.00");',
   'const rq=window.__catalogRequests;',
   'const rightRpc=rq.length>=1&&rq.every(r=>r.url.includes("cc_portal_public_catalog_v3"));',
   'const bearerCorrect='+JSON.stringify(logged)+'?rq.some(r=>r.headers.Authorization==="Bearer signed-session-TEST"):rq.every(r=>!r.headers.Authorization);',
   'const buy=card?.querySelector(".cc169-buy");buy?.click();',
   'const correctAction='+JSON.stringify(logged)+'?window.__checkout.length===1&&window.__checkout[0].amount===expectedAmount:window.__login===1&&window.__checkout.length===0;',
   'const noScroll=document.documentElement.scrollWidth<=innerWidth+5;',
   'const checks={oneCatalog,amountOK,labelOK,publicReference,rightRpc,bearerCorrect,correctAction,noScroll};',
   'const output=document.createElement("output");output.id="cc172-tier-smoke";output.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";output.textContent=JSON.stringify(checks);document.body.append(output);',
   '}catch(e){const output=document.createElement("output");output.id="cc172-tier-smoke";output.dataset.status="fail";output.textContent=String(e);document.body.append(output);}',
   '},700);'
  ].join('\n');
  const html=['<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
   '<style>'+css+'</style></head><body>',
   '<div id="app"><section id="productos"><div class="v23-catalog-section">',
   '<div class="section-head"><span class="v23-count">Ejemplos</span></div>',
   '<div class="v23-product-grid"><article id="demo">DEMO</article></div>',
   '<div class="v23-shop-note"></div></div></section></div>',
   '<script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script>',
   '</body></html>'
  ].join('\n');
  const file=path.join(dir,mode+'.html');fs.writeFileSync(file,html);
  const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--window-size=390,844','--virtual-time-budget=2600','--dump-dom','file://'+file],
   {encoding:'utf8',timeout:25000,maxBuffer:12*1024*1024});
  assert.equal(run.status,0,'Chrome '+mode+': '+String(run.stderr).slice(-400));
  const result=run.stdout.match(/<output id="cc172-tier-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
  assert.ok(result,'Sin resultado '+mode+': '+run.stdout.slice(-500));
  assert.equal(result[1],'pass',mode+' '+result[2]);
  console.log('PASS V172 · '+mode+' ve '+(eligible?'precio distribuidor':'precio público')+' y checkout correcto.');
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
