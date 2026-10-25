/* V172 · Chrome: publicar y editar DOS precios en la MISMA publicación.
 * Datos sintéticos, sin inventarios ni movimientos reales.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido');
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const css=fs.readFileSync('styles/v166-portal-roles.css','utf8');
const setup=[
 'window.CC_V53_SESSION={userId:"fake-super",jwt:"fake-super-jwt"};',
 'window.confirm=()=>true;',
 'window.__publishes=[];window.__edits=[];',
 'window.__products=[];window.__prices=[];',
 'window.__prompts=["16","10"];window.prompt=()=>window.__prompts.shift()??null;',
 'window.cc80={open(){},api:async(path,method,data)=>{',
 'if(path.startsWith("cc_admins?"))return [];',
 'if(path.startsWith("cc_memberships?"))return [{id:"member",business_id:"stream",role:"SUPER_RESELLER",status:"ACTIVE"}];',
 'if(path.startsWith("cc_subscriptions?"))return [{membership_id:"member",status:"ACTIVE",start_at:"2026-01-01",end_at:"2099-12-31"}];',
 'if(path.startsWith("cc_businesses?"))return [{id:"stream",code:"STREAM_BULLS"}];',
 'if(path.startsWith("cc_portal_super_resellers?"))return [{enabled:true,user_id:"fake-super",admin_percent:20}];',
 'if(path.startsWith("cc_portal_stream_products?"))return window.__products.map(p=>({...p}));',
 'if(path==="rpc/cc_portal_my_stream_prices")return window.__prices.map(p=>({...p}));',
 'if(path==="rpc/cc_portal_publish_stream_product_v2"){window.__publishes.push(data);',
 'const id="11111111-1111-4111-8111-111111111111";',
 'window.__products.push({id,seller_id:"fake-super",service:data.p_service,title:data.p_title,duration_days:data.p_duration_days,price_pen:data.p_price_pen,stock:data.p_stock,status:"ACTIVE",description:data.p_description,flyer_path:null});',
 'window.__prices.push({id,public_price_pen:data.p_price_pen,distributor_price_pen:data.p_distributor_price_pen});',
 'return id;}',
 'if(path==="rpc/cc_portal_update_stream_prices"){window.__edits.push(data);',
 'window.__products[0].price_pen=data.p_public_price_pen;',
 'window.__prices[0].public_price_pen=data.p_public_price_pen;',
 'window.__prices[0].distributor_price_pen=data.p_distributor_price_pen;',
 'return {updated:true,id:data.p_product_id};}',
 'if(path==="rpc/cc_portal_my_stream_orders")return [];',
 'if(path==="rpc/cc_my_real_wallet_movements")return [];',
 'if(path.startsWith("cc_plans?"))return [{business_id:"stream",code:"STREAM_365",price_pen:25,is_active:true}];',
 'return [];}};'
].join('\n');
const probe=[
 'setTimeout(()=>{try{',
 'const $=q=>document.querySelector(q),$$=q=>document.querySelectorAll(q);',
 'const role=$("#cc166-role")?.textContent.includes("SÚPER RESELLER");',
 'const nav=[...$$(".cc166-navitem")].find(b=>b.textContent.includes("Publicar"));nav?.click();',
 'const form=$("#cc166-publish-form");',
 'const twoFields=!!form?.elements.namedItem("price")&&!!form?.elements.namedItem("distributor");',
 'const values={title:"Netflix 30 días",price:"12.00",distributor:"8.00",cost:"6.00",stock:"5",whatsapp:"51912345678"};',
 'for(const [name,value] of Object.entries(values))if(form?.elements.namedItem(name))form.elements.namedItem(name).value=value;',
 'form?.requestSubmit();',
 'setTimeout(()=>{try{',
 'const publishedOnce=window.__publishes.length===1&&window.__products.length===1;',
 'const body=window.__publishes[0]||{};',
 'const pricesSent=body.p_price_pen===12&&body.p_distributor_price_pen===8&&body.p_cost_pen===6;',
 'const publishedView=$("#cc166-content")?.textContent.includes("Público S/ 12.00")&&',
 '$("#cc166-content")?.textContent.includes("Reseller S/ 8.00");',
 'const edit=[...$$(".cc167-stock-row button")].find(b=>b.textContent.includes("Editar precios"));edit?.click();',
 'setTimeout(()=>{try{',
 'const onePriceUpdate=window.__edits.length===1&&window.__products.length===1;',
 'const updated=window.__edits[0]||{};',
 'const correctUpdate=updated.p_public_price_pen===16&&updated.p_distributor_price_pen===10;',
 'const refreshed=$("#cc166-content")?.textContent.includes("Público S/ 16.00")&&',
 '$("#cc166-content")?.textContent.includes("Reseller S/ 10.00");',
 'const noTrial=!$("#cc166-content")?.textContent.includes("Probar 7 días");',
 'const noScroll=document.documentElement.scrollWidth<=innerWidth+5;',
 'const checks={role,twoFields,publishedOnce,pricesSent,publishedView,onePriceUpdate,correctUpdate,refreshed,noTrial,noScroll};',
 'const out=document.createElement("output");out.id="cc172-publish-smoke";out.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";out.textContent=JSON.stringify(checks);document.body.append(out);',
 '}catch(e){failure(e)}',
 '},320);',
 '}catch(e){failure(e)}',
 '},340);',
 '}catch(e){failure(e)}',
 '},450);',
 'function failure(e){const out=document.createElement("output");out.id="cc172-publish-smoke";out.dataset.status="fail";out.textContent=String(e?.stack||e);document.body.append(out);}'
].join('\n');
const html=['<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>'+css+'</style></head><body>',
 '<div id="cc77home"><div class="cc77top"><div class="cc77actions"></div></div></div>',
 '<script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script></body></html>'
].join('\n');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc172-publish-'));
try{
 const file=path.join(dir,'test.html');fs.writeFileSync(file,html);
 const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu',
 '--disable-dev-shm-usage','--window-size=390,844','--virtual-time-budget=3700','--dump-dom','file://'+file],
 {encoding:'utf8',timeout:30000,maxBuffer:15*1024*1024});
 assert.equal(run.status,0,'Chrome: '+String(run.stderr).slice(-600));
 const m=run.stdout.match(/<output id="cc172-publish-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(m,'No se ejecutó test de publicación: '+run.stdout.slice(-450));
 assert.equal(m[1],'pass','V172 Publicación: '+m[2]);
 console.log('PASS V172 · Publicación con 2 tarifas, edición sobre producto único, sin transacciones reales.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
