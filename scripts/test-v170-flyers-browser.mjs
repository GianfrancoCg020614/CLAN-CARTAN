/* Chrome: subida de flyer, validación JPG/PNG/WebP, miniatura y ampliación.
 * Archivo y sesión sintéticos: sin tocar Storage, usuarios ni datos reales.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido para verificar uploader');
const js=fs.readFileSync('scripts/v170-flyers-stream.js','utf8');
const css=fs.readFileSync('styles/v170-flyers-stream.css','utf8');
const seller='11111111-1111-4111-8111-111111111111',product='22222222-2222-4222-8222-222222222222';
const setup=[
 'window.CC_V53_SESSION={userId:'+JSON.stringify(seller)+',jwt:"JWT-SINTÉTICO",root:"https://fake.supabase.invalid",key:"sb_publishable_TEST"};',
 'window.__uploads=[];window.__links=[];',
 'window.fetch=async(url,args)=>{window.__uploads.push({url,method:args.method,headers:args.headers,size:args.body?.size});return {ok:true,json:async()=>({path:url})};};',
 'window.cc80={api:async(path,method,args)=>{if(path==="rpc/cc_portal_set_stream_product_flyer"){window.__links.push(args);return {updated:true,product_id:args.p_product_id,flyer_path:args.p_flyer_path};}return [];}};'
].join('\n');
const spec=[
 'const out=document.createElement("output");out.id="flyer-smoke";',
 'const step=document.createElement("output");step.id="flyer-step";step.textContent="initialized";document.body.append(step);',
 'window.onerror=(...args)=>{step.textContent="ONERROR "+args.slice(0,3).join(" / ")};',
 'window.onunhandledrejection=e=>{step.textContent="REJECTION "+String(e.reason)};',
 'function finish(checks){out.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";out.textContent=JSON.stringify(checks);document.body.append(out);}',
 'setTimeout(async()=>{try{',
 'const forms=document.querySelectorAll("#cc170-new-flyer");',
 'const present=forms.length===1;',
 'const file=new File([new Uint8Array([137,80,78,71,13,10,26,10,1,2,3,4,5,6,7,8])],"flyer.png",{type:"image/png"});',
 'const accepted=(await window.cc170Flyers.inspectFile(file))==="png";',
 'step.textContent="inspected";',
 'let maliciousRejected=false;try{await window.cc170Flyers.inspectFile(new File(["<svg/>"],"evil.png",{type:"image/png"}));}catch(e){maliciousRejected=true;}',
 'let executableRejected=false;try{await window.cc170Flyers.inspectFile(new File(["alert(1)"],"evil.svg",{type:"image/svg+xml"}));}catch(e){executableRejected=true;}',
 'const reader=new DataTransfer();reader.items.add(file);forms[0].files=reader.files;forms[0].dispatchEvent(new Event("change",{bubbles:true}));',
 'const selected=!!document.querySelector(".cc170-upload-preview img");',
 'const row=document.querySelector("#row");window.cc170Flyers.decorateRow(row,{id:'+JSON.stringify(product)+',seller_id:'+JSON.stringify(seller)+',title:"Netflix Pro",flyer_path:""});',
 'const mini=!!document.querySelector(".cc170-row-flyer .cc170-placeholder");',
 'step.textContent="uploading";',
 'await window.cc170Flyers.upload({id:'+JSON.stringify(product)+',seller_id:'+JSON.stringify(seller)+'},file);',
 'step.textContent="uploaded";',
 'const linked=window.__uploads.length===1&&window.__links.length===1;',
 'const uploaded=window.__uploads[0]||{},args=window.__links[0]||{};',
 'const correctPath=uploaded.url?.includes("/storage/v1/object/cc-stream-flyers/'+seller+'/'+product+'/")&&uploaded.url.endsWith(".png")&&args.p_flyer_path===uploaded.url.split("cc-stream-flyers/")[1];',
 'const authenticated=uploaded.headers?.Authorization==="Bearer JWT-SINTÉTICO"&&uploaded.headers?.["x-upsert"]==="false"&&uploaded.method==="POST";',
 'const previewPath='+JSON.stringify(seller+'/'+product+'/'+product+'.png')+';',
 'const url=window.cc170Flyers.urlFor(previewPath);',
 'const urlSafe=!!url&&!window.cc170Flyers.urlFor("../../secret.svg");',
 'const button=window.cc170Flyers.visual(previewPath,"Netflix Pro");',
 'const looksClickable=button.tagName==="BUTTON"&&!!button.querySelector("img");',
 'button.click();const expanded=!!document.querySelector("dialog.cc170-dialog");',
 'document.querySelector("dialog.cc170-dialog .cc170-close")?.click();',
 'finish({present,accepted,maliciousRejected,executableRejected,selected,mini,linked,correctPath,authenticated,urlSafe,looksClickable,expanded});',
 '}catch(e){finish({error:String(e?.stack||e),ok:false});}',
 '},350);'
].join('\n');
const html=['<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>'+css+'</style></head><body>',
 '<div id="cc166-panel"><main id="cc166-content"><form id="cc166-publish-form"><label>WhatsApp<input name="whatsapp"></label></form><div id="row"></div></main></div>',
 '<script>'+setup+'</script><script>'+js+'</script><script>'+spec+'</script></body></html>'
].join('\n');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc170-upload-'));
try{
 const file=path.join(dir,'uploader.html');fs.writeFileSync(file,html);
 const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
 '--window-size=390,844','--virtual-time-budget=2600','--dump-dom','file://'+file],
 {encoding:'utf8',timeout:30000,maxBuffer:12*1024*1024});
 assert.equal(run.status,0,'Chrome terminó con error: '+String(run.stderr).slice(-600));
 const marker=run.stdout.match(/<output id="flyer-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
 assert.ok(marker,'La prueba del flyer no produjo resultado: '+(run.stdout.match(/<output id="flyer-step"[^>]*>[^<]*/)?.[0]||'Sin marcador')+' / '+run.stdout.slice(-1400));
 assert.equal(marker[1],'pass','Falló el flujo del flyer: '+marker[2]);
 console.log('PASS V170 · formato real PNG, bloqueo SVG, foto local, Storage firmado, RPC, miniatura y ampliar.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
