/* Chrome E2E sintético: no entra a Supabase ni efectúa pagos. */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Se requiere Chrome');
const app=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const css=fs.readFileSync('styles/v166-portal-roles.css','utf8');
const setup=[
 'window.CC_V53_SESSION={jwt:"synthetic",userId:"buyer-fake"};',
 'window.confirm=()=>true;',
 'window.__calls=[];window.__purchases=[];',
 'window.cc80={open(){},api:async function(path,method,body){',
 'if(path==="rpc/cc_portal_purchase_stream_product"){window.__calls.push({path,body});',
 'window.__purchases=[{id:"order-verified",buyer_id:"buyer-fake",seller_id:"seller-fake",title:"Netflix 30 días",price_pen:9.5,seller_whatsapp:"51912345678",status:"PAID_AWAITING_DELIVERY"}];',
 'return {order_id:"order-verified",status:"PAID_AWAITING_DELIVERY",price_pen:9.5,title:"Netflix 30 días",seller_whatsapp:"51912345678"};}',
 'if(path==="rpc/cc_portal_my_stream_orders")return window.__purchases;',
 'if(path.startsWith("cc_portal_stream_products?"))return [{id:"product-fake",seller_id:"seller-fake",service:"Netflix",title:"Netflix 30 días",description:"Acceso 30 días",duration_days:30,stock:3,price_pen:9.5,status:"ACTIVE"}];',
 'if(path.startsWith("cc_real_service_wallets?"))return [{service:"STREAM_BULLS",balance_pen:60}];',
 'if(path.startsWith("cc_businesses?"))return [{code:"STREAM_BULLS",id:"stream-business"}];',
 'if(path.startsWith("cc_plans?"))return [{business_id:"stream-business",code:"STREAM_365",price_pen:25,is_active:true}];',
 'if(path==="rpc/cc_my_real_wallet_movements")return [{occurred_at:"2026-10-25T12:00:00Z",service:"STREAM_BULLS",description:"Recarga confirmada",amount_pen:60,movement_type:"RECHARGE"}];',
 'return [];}};'
].join('\n');
const checks=[
 'setTimeout(async()=>{try{',
 'const $=q=>document.querySelector(q);',
 'const affiliate=($("#cc166-role")?.textContent||"").includes("AFILIADO");',
 'const noPublish=![...document.querySelectorAll(".cc166-navitem")].some(e=>e.textContent.includes("Publicar"));',
 'const tabs=$$(".cc167-tab");function $$(q){return document.querySelectorAll(q)};',
 'const fourTabs=tabs.length===4;',
 'const root=$("#cc166-panel"),zIndex=Number(getComputedStyle(root).zIndex)>2147483638;',
 '[...$$(".cc166-navitem")].find(b=>b.textContent.includes("Comprar"))?.click();',
 'const available=$$(".cc167-product").length===1;',
 'const btn=[...$$(".cc167-product button")].find(b=>b.textContent==="Comprar");',
 'btn?.click();',
 'setTimeout(()=>{',
 'const chargedOnce=window.__calls.length===1;',
 'const paramsOK=window.__calls[0]?.body?.p_expected_price_pen===9.5&&window.__calls[0]?.body?.p_product_id==="product-fake";',
 'const receipt=!!$(".cc167-receipt");',
 'const notify=[...$$(".cc167-receipt button")].some(b=>b.textContent.includes("WhatsApp"));',
 'const noOverflow=document.documentElement.scrollWidth<=innerWidth+4;',
 'const checks={affiliate,noPublish,fourTabs,zIndex,available,chargedOnce,paramsOK,receipt,notify,noOverflow};',
 'const output=document.createElement("output");output.id="cc167-smoke";',
 'output.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";',
 'output.textContent=JSON.stringify(checks);document.body.append(output);',
 '},650);',
 '}catch(e){const output=document.createElement("output");output.id="cc167-smoke";output.dataset.status="fail";output.textContent=String(e);document.body.append(output);}',
 '},450);'
].join('\n');
const html=['<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>',css,'</style></head><body>',
 '<div id="cc77home"><header class="cc77top"><div class="cc77actions"></div></header></div>',
 '<script>',setup,'</script>','<script>',app,'</script>','<script>',checks,'</script>',
 '</body></html>'].join('\n');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc167-checkout-'));
try{
 const file=path.join(dir,'checkout.html');fs.writeFileSync(file,html);
 const res=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--window-size=390,844','--virtual-time-budget=3500','--dump-dom','file://'+file],
 {encoding:'utf8',timeout:25000,maxBuffer:12*1024*1024});
 assert.equal(res.status,0,'Chrome: '+String(res.stderr).slice(-400));
 const m=res.stdout.match(/<output id="cc167-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(m,'No se ejecutó checkout sintético');
 assert.equal(m[1],'pass','Falló checkout sintético: '+m[2]);
 console.log('PASS: AFILIADO, catálogo, saldo real, confirmación, recibo, WhatsApp y móvil');
}finally{fs.rmSync(dir,{force:true,recursive:true});}
