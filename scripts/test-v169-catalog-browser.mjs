/* V169 · Smoke Chrome de catálogo público: datos verificados, cero checkout demo. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido');
const js=fs.readFileSync('scripts/v169-catalogo-unico.js','utf8');
const css=fs.readFileSync('styles/v169-catalogo-perfil.css','utf8');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc169-catalog-'));
try{
 for(const mode of ['authenticated','visitor','no-offers']){
  const offers=mode==='no-offers'?'[]':JSON.stringify([
   {id:'verified-id-1',title:'Netflix 30 días',service:'Netflix',description:'Acceso mensual',price_pen:9.5,stock:3,duration_days:30},
   {id:'verified-id-2',title:'Canva Pro 30 días',service:'Canva',description:'Edición',price_pen:11,stock:2,duration_days:30}
  ]);
  const setup=[
   'window.__payments=[];window.__login=0;',
   'window.fetch=async()=>({ok:true,json:async()=>'+offers+'});',
   'window.cc77Auth=()=>{window.__login++};window.cc77Store=()=>{};',
   'window.cc166PurchaseProductFromCatalog=(id,button,price)=>{window.__payments.push({id,price})};',
   mode==='authenticated'?'window.CC_V53_SESSION={userId:"synthetic",jwt:"synthetic"};':''
  ].join('\n');
  const fixture=[
   '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
   '<style>body{background:#08131c;color:white;margin:0;}'+css+'</style></head><body>',
   '<div id="app"><section id="productos"><div class="v23-catalog-section">',
   '<div class="section-head"><h3>Explora <span class="v23-count">5 ejemplos</span></h3></div>',
   '<div class="v23-product-grid"><article id="demo-offer" class="product">',
   '<div class="product-visual" onclick="window.__payments.push({id:\'DEMO\'})">Demo visual</div>',
   '<div class="v23-card-price"><strong>S/ 12.00</strong></div>',
   '<button onclick="window.__payments.push({id:\'DEMO\'})">Comprar DEMO</button></article></div>',
   '<div class="v23-shop-note">Informativo</div>',
   '</div></section></div>',
   '<script>'+setup+'</script><script>'+js+'</script>',
   '<script>setTimeout(()=>{try{',
   'const offers=document.querySelectorAll(".cc169-offer");',
   'const noDemo=!document.getElementById("demo-offer");',
   mode==='no-offers'
     ?'const sample=document.querySelector(".cc169-showcase");const safeSample=!!sample&&[...sample.querySelectorAll("button")].every(b=>b.disabled)&&!sample.textContent.includes("S/ 12.00");'
     :'const safeSample=!document.querySelector(".cc169-showcase");',
   mode==='no-offers'
     ?'const correctOffers=offers.length===0;'
     :'const correctOffers=offers.length===2&&offers[0].textContent.includes("S/ 9.50");',
   'const action=document.querySelector(".cc169-offer button");',
   'if(action)action.click();',
   'const buyingCorrect='+JSON.stringify(mode==='authenticated')+'?window.__payments.length===1&&window.__payments[0].id==="verified-id-1"&&window.__payments[0].price===9.5:',
   JSON.stringify(mode==='visitor')+'?window.__payments.length===0&&window.__login===1:window.__payments.length===0;',
   'const checks={correctOffers,noDemo,buyingCorrect,safeSample,noScroll:document.documentElement.scrollWidth<=innerWidth+5};',
   'const n=document.createElement("output");n.id="catalog-smoke";n.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";n.textContent=JSON.stringify(checks);document.body.append(n);',
   '}catch(e){const n=document.createElement("output");n.id="catalog-smoke";n.dataset.status="fail";n.textContent=String(e);document.body.append(n)}},650);</script>',
   '</body></html>'
  ].join('\n');
  const file=path.join(dir,mode+'.html');fs.writeFileSync(file,fixture);
  const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
   '--window-size=390,844','--virtual-time-budget=2500','--dump-dom','file://'+file],
   {encoding:'utf8',timeout:25000,maxBuffer:12*1024*1024});
  assert.equal(run.status,0,mode+' Chrome: '+String(run.stderr).slice(-420));
  const mark=run.stdout.match(/<output id="catalog-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
  assert.ok(mark,'Prueba sin resultado '+mode);
  assert.equal(mark[1],'pass',mode+' '+mark[2]);
  console.log('PASS catálogo V169 '+mode+' · checkout verificado/anon/ejemplos seguros');
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
