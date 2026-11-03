// Real public portal in Chrome, no login, no mocked API and no financial writes.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome obligatorio');
const root=process.cwd(),badResources=[],errors=[];
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.avif':'image/avif','.png':'image/png','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 const target=file===root?path.join(root,'index.html'):file;
 try{res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');res.end(fs.readFileSync(target));}
 catch{if(!req.url.startsWith('/favicon.ico'))badResources.push(req.url);res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port+'/';
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'cc304-'));
const browser=spawn(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe']});
let ws;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
try{
 const endpoint=await new Promise((resolve,reject)=>{let log='';const timer=setTimeout(()=>reject(Error('Chrome timeout '+log.slice(-300))),10000);browser.on('error',reject);browser.stderr.on('data',c=>{log+=c;const m=log.match(/DevTools listening on (ws:\/\/\S+)/);if(m){clearTimeout(timer);resolve(m[1]);}});});
 const target=await fetch('http://'+new URL(endpoint).host+'/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
 ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.addEventListener('open',r,{once:true});ws.addEventListener('error',j,{once:true});});
 let serial=0;const pending=new Map();
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>reject(Error(method+' timeout')),15000);pending.set(id,m=>{clearTimeout(timer);m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result);});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 await send('Runtime.enable');await send('Page.enable');
 const loaded=async()=>{for(let i=0;i<80;i++){if(await evaluate('!!document.querySelector("#cc77home .cc303-name")&&!!document.querySelector(".cc283-home-currency select")'))return;await pause(100);}throw Error('Portada no lista');};
 fs.mkdirSync('artifacts/v304',{recursive:true});
 const results=[];
 for(const width of [1920,1366,768,390,375]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:width>1100?1080:900,deviceScaleFactor:1,mobile:width<650});
  await send('Page.navigate',{url});await loaded();
  for(const theme of ['dark','light']){
   await evaluate(`document.documentElement.dataset.ccTheme!==${JSON.stringify(theme)}&&document.querySelector('#cc164-theme-toggle').click()`);await pause(100);
   const check=await evaluate(`(()=>{const h=document.querySelector('#cc77home'),cards=[...h.querySelector('.cc77cards').children],visible=e=>e.getBoundingClientRect().width>0;const buttons=cards.flatMap(c=>[...c.querySelectorAll('button')]);const sr=cards[3].querySelectorAll('button');return {width:innerWidth,theme:document.documentElement.dataset.ccTheme,noOverflow:document.documentElement.scrollWidth<=innerWidth+1&&h.scrollWidth<=innerWidth+1,singleCurrency:[...document.querySelectorAll('select')].filter(e=>visible(e)&&[...e.options].some(o=>o.value==='PEN')).length===1,realHeading:visible(h.querySelector('h1'))&&getComputedStyle(h.querySelector('h1')).clipPath==='none',headerClear:(()=>{const a=h.querySelector('.cc77brand').getBoundingClientRect(),b=h.querySelector('.cc283-home-currency').getBoundingClientRect();return Math.min(a.right,b.right)-Math.max(a.left,b.left)<=1||Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)<=1})(),fourCards:cards.length===4,columns:getComputedStyle(h.querySelector('.cc77cards')).gridTemplateColumns.split(' ').length,targets:buttons.every(b=>b.offsetHeight>=44&&b.offsetWidth>=44),streamAligned:Math.abs(sr[0].getBoundingClientRect().y-sr[1].getBoundingClientRect().y)<2,footer:h.textContent.includes('CREADA POR CLAN CARTAN')}})()`);
   assert.equal(check.noOverflow,true,JSON.stringify(check));assert.equal(check.singleCurrency,true,JSON.stringify(check));assert.equal(check.realHeading,true);assert.equal(check.fourCards,true);assert.equal(check.headerClear,true,JSON.stringify(check));assert.equal(check.targets,true);assert.equal(check.streamAligned,true);assert.equal(check.footer,true);assert.equal(check.columns,width>1100?4:width>650?2:1);assert.equal(check.theme,theme);
   if(width<650){assert.ok(await evaluate("document.querySelector('#cc77home .cc77cards>article').offsetHeight<360"),'Tarjeta móvil demasiado alta');assert.ok(await evaluate("[...document.querySelectorAll('#cc77home .cc77cards>article')].every(c=>c.querySelector('.cc78service-logo,.cc158-cochera-mark,.ma1611-card-icon').getBoundingClientRect().right+6<=c.querySelector('h2').getBoundingClientRect().left)"),'Logotipo móvil invade el título');assert.ok(await evaluate("document.querySelector('#cc77home .cc77top').offsetHeight<215"),'Cabecera móvil demasiado alta');}
   const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(`artifacts/v304/${width}-${theme}.png`,Buffer.from(shot.data,'base64'));results.push(check);
  }
 }
 // Theme and display currency survive reload; the real selector dispatches its change event.
 await evaluate(`(()=>{const s=document.querySelector('.cc283-home-currency select');s.value='USD';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 await send('Page.reload');await loaded();
 assert.equal(await evaluate("document.documentElement.dataset.ccTheme"),'light');
 assert.equal(await evaluate("document.querySelector('.cc283-home-currency select').value"),'USD');
 for(const action of ['login','signup','cobra','cochera','alquiler','distributor']){
  await evaluate("document.querySelector('#cc77home').scrollTop=100");
  await evaluate(`(()=>{const h=document.querySelector('#cc77home');const actions={login:()=>h.querySelector('[onclick="cc77Auth(false)"]').click(),signup:()=>h.querySelector('[onclick="cc77Auth(true)"]').click(),cobra:()=>h.querySelector('.cc217-cobra button').click(),cochera:()=>h.querySelector('.cc217-cochera button').click(),alquiler:()=>h.querySelector('.cc217-alquiler button').click(),distributor:()=>h.querySelector('.cc217-stream button:last-child').click()};actions[${JSON.stringify(action)}]()})()`);await pause(160);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#cc-real-login')).display!=='none'"),true,'Acceso protegido '+action);
  await evaluate("document.querySelector('#cc223-auth-close').click()");await pause(80);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#cc77home')).display!=='none'"),true,'Volver portada '+action);assert.equal(await evaluate("document.querySelector('#cc77home').scrollTop"),0,'Cabecera visible al regresar '+action);
 }
 await evaluate("cc77Auth(false);document.querySelector('#cc305-password-toggle').click()");
 assert.equal(await evaluate("document.querySelector('#cc-real-pass').type"),'text');
 await evaluate("document.querySelector('#cc305-password-toggle').click()");
 assert.equal(await evaluate("document.querySelector('#cc-real-pass').type"),'password');
 assert.equal(await evaluate("!!document.querySelector('#cc123turnstile')"),true,'Widget real de seguridad montado');
 await evaluate("cc77Auth(true)");
 for(const type of ['terms','privacy']){
  const legal=await evaluate(`(()=>{document.querySelector('#cc-real-login a[onclick*="${type}"]').click();const m=document.querySelector('#cc82-legal-modal'),r=m.getBoundingClientRect();return m.contains(document.elementFromPoint(r.width/2,r.height/2))&&document.querySelector('#cc82-legal-body').textContent.length>100})()`);
  assert.equal(legal,true,'Documento legal visible sobre registro '+type);
  await evaluate("document.querySelector('#cc82-legal-modal button').click()");
 }
 await evaluate("document.querySelector('#cc223-auth-close').click()");
 await evaluate("cc77Auth(false);document.querySelector('#cc-real-email').value='correo-invalido'");
 assert.equal(await evaluate("document.querySelector('#cc-real-email').checkValidity()"),false,'Correo inválido');
 await evaluate("document.querySelector('#cc223-auth-close').click();document.querySelector('.cc217-stream button').click()");await pause(350);
 assert.equal(await evaluate("!!document.querySelector('#productos .v23-catalog-section')?.getClientRects().length"),true,'Catálogo público');
 assert.equal(await evaluate("document.querySelector('#cc223-whatsapp').href.startsWith('https://wa.me/51923319637')"),true,'Contacto existente');
 assert.deepEqual(badResources,[],'Recursos locales rotos');assert.deepEqual(errors,[],'Excepciones JavaScript');
 fs.writeFileSync('artifacts/v304/results.json',JSON.stringify({results,publicFlows:6,themePersistence:true,currencyPersistence:true,invalidEmail:true,badResources,errors},null,2));
 console.log('PASS V304: 10 vistas reales, persistencia, 6 accesos protegidos, catálogo y consola; sin escrituras financieras.');
}finally{ws?.close();browser.kill('SIGTERM');server.close();for(let i=0;i<20&&browser.exitCode===null;i++)await pause(50);if(browser.exitCode===null)browser.kill('SIGKILL');fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
