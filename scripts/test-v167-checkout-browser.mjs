/* V167→V169 · Prueba del MISMO checkout atómico desde el catálogo público.
 * Chrome y mocks locales; no toca Supabase, órdenes ni billetera reales.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido');
const panel=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const adapter=fs.readFileSync('scripts/v169-catalogo-unico.js','utf8');
const css=fs.readFileSync('styles/v166-portal-roles.css','utf8')+'\n'+fs.readFileSync('styles/v169-catalogo-perfil.css','utf8');
const setup=[
 'window.CC_V53_SESSION={jwt:"synthetic",userId:"buyer-fake"};',
 'window.confirm=()=>true;',
 'window.__calls=[];window.__purchases=[];window.__catalogOpen=0;',
 'window.cc77Store=()=>{window.__catalogOpen++};',
 'window.fetch=async(path)=>({ok:true,json:async()=>[',
 '{id:"product-fake",seller_id:"seller-fake",service:"Netflix",title:"Netflix 30 días",description:"Acceso mensual",duration_days:30,stock:3,price_pen:9.5,status:"ACTIVE"}]});',
 'window.cc80={open(){},api:async function(path,method,body){',
 'if(path==="rpc/cc_portal_purchase_stream_product"){window.__calls.push({path,body});',
 'window.__purchases=[{id:"order-verified",buyer_id:"buyer-fake",seller_id:"seller-fake",title:"Netflix 30 días",price_pen:9.5,seller_whatsapp:"51912345678",status:"PAID_AWAITING_DELIVERY"}];',
 'return {order_id:"order-verified",status:"PAID_AWAITING_DELIVERY",price_pen:9.5,title:"Netflix 30 días",seller_whatsapp:"51912345678"};}',
 'if(path==="rpc/cc_portal_stream_price_for_me")return {id:"product-fake",seller_id:"seller-fake",service:"Netflix",title:"Netflix 30 días",price_pen:9.5,stock:3,status:"ACTIVE",price_tier:"PUBLIC"};',
 'if(path==="rpc/cc_portal_my_stream_orders")return window.__purchases;',
 'if(path.startsWith("cc_portal_stream_products?"))return [{id:"product-fake",seller_id:"seller-fake",service:"Netflix",title:"Netflix 30 días",description:"Acceso mensual",duration_days:30,stock:3,price_pen:9.5,status:"ACTIVE"}];',
 'if(path.startsWith("cc_real_service_wallets?"))return [{service:"STREAM_BULLS",balance_pen:60}];',
 'if(path.startsWith("cc_businesses?"))return [{code:"STREAM_BULLS",id:"stream-business"}];',
 'if(path.startsWith("cc_plans?"))return [{business_id:"stream-business",code:"STREAM_365",price_pen:25,is_active:true}];',
 'if(path==="rpc/cc_my_real_wallet_movements")return [{occurred_at:"2026-10-25T12:00:00Z",service:"STREAM_BULLS",description:"Recarga confirmada",amount_pen:60,movement_type:"RECHARGE"}];',
 'return [];}};'
].join('\n');
const check=[
 'const signal=document.createElement("output");signal.id="cc167-debug";signal.textContent="initialized";document.body.append(signal);',
 'window.onerror=(...args)=>{signal.textContent="ERROR "+args.slice(0,3).join(" / ")};',
 'window.onunhandledrejection=e=>{signal.textContent="REJECTION "+String(e.reason)};',
 'setTimeout(async()=>{try{',
 'const $=q=>document.querySelector(q), $$=q=>document.querySelectorAll(q);',
 'const role=($("#cc166-role")?.textContent||"").includes("AFILIADO");',
 'const noPublish=![...$$(".cc166-navitem")].some(b=>b.textContent.includes("Publicar"));',
 'const noDuplicateTabs=document.querySelectorAll(".cc167-tab").length===0;',
 'const top=Number(getComputedStyle($("#cc166-panel")).zIndex)>2147483638;',
 'const navBuy=[...$$(".cc166-navitem")].find(b=>b.textContent.includes("Catálogo"));navBuy?.click();',
 'setTimeout(()=>{',
 'signal.textContent="catalog rendered="+document.querySelectorAll(".cc169-offer").length;',
 'const usedOriginal=window.__catalogOpen>=1&&$("#cc166-panel")?.hidden===true;',
 'const singleCatalog=$$(".cc169-offer").length===1&&$$(".cc167-product").length===0;',
 'const button=$(".cc169-offer button");button?.click();',
 'setTimeout(()=>{',
 'const chargedOnce=window.__calls.length===1;',
 'const payload=window.__calls[0]?.body;',
 'const correctPrice=payload?.p_expected_price_pen===9.5&&payload?.p_product_id==="product-fake";',
 'const receipt=!!$(".cc167-receipt")&&$("#cc166-panel")?.hidden===false;',
 'const notify=[...$$(".cc167-receipt button")].some(b=>b.textContent.includes("WhatsApp"));',
 'const noOverflow=document.documentElement.scrollWidth<=innerWidth+5;',
 'const debug={count:$(".cc169-offer").length,status:$(".cc169-status")?.textContent?.slice(0,130)||null,catalogText:$("#productos")?.textContent?.slice(0,250)||null,bridge:typeof window.cc169OpenCatalog};',
 'const checks={role,noPublish,noDuplicateTabs,top,usedOriginal,singleCatalog,chargedOnce,correctPrice,receipt,notify,noOverflow,debug};',
 'const out=document.createElement("output");out.id="cc167-smoke";out.dataset.status=Object.values(checks).filter(v=>typeof v==="boolean").every(Boolean)?"pass":"fail";out.textContent=JSON.stringify(checks);document.body.append(out);',
 '},650);',
 '},270);',
 '}catch(e){const out=document.createElement("output");out.id="cc167-smoke";out.dataset.status="fail";out.textContent=String(e);document.body.append(out)}',
 '},300);'
].join('\n');
const html=[
 '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>'+css+'</style></head><body>',
 '<div id="cc77home"><header class="cc77top"><div class="cc77actions"></div></header></div>',
 '<div id="app"><section id="productos"><div class="v23-catalog-section">',
 '<div class="section-head"><h3>Explora <span class="v23-count">Referencias</span></h3></div>',
 '<div class="v23-product-grid"><article>Demo local, SIN venta</article></div>',
 '<div class="v23-shop-note"></div>',
 '</div></section></div>',
 '<script>'+setup+'</script><script>'+panel+'</script><script>'+adapter+'</script><script>'+check+'</script>',
 '</body></html>'
].join('\n');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc169-checkout-'));
try{
 const file=path.join(dir,'checkout.html');fs.writeFileSync(file,html);
 const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--window-size=390,844','--virtual-time-budget=3500','--dump-dom','file://'+file],
  {encoding:'utf8',timeout:25000,maxBuffer:12*1024*1024});
 assert.equal(run.status,0,'Chrome falló: '+String(run.stderr).slice(-500));
 const mark=run.stdout.match(/<output id="cc167-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(mark,'No se ejecutó checkout sintético. Estado: '+(run.stdout.match(/<output id="cc167-debug"[^>]*>[^<]*/)?.[0]||'ausente')+' / HTML: '+run.stdout.slice(-1700));
 assert.equal(mark[1],'pass','Fallo en compra desde catálogo único: '+mark[2]);
 console.log('PASS checkout V169 · AFILIADO compra desde catálogo público, recibo y WhatsApp.');
}finally{fs.rmSync(dir,{force:true,recursive:true});}
