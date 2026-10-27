// Prueba de navegación móvil MI ALQUILER con Chrome y respuestas simuladas; no toca datos reales.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido para prueba móvil');
const js=fs.readFileSync('scripts/v161-1-mi-alquiler.js','utf8');
const css=fs.readFileSync('styles/v161-1-mi-alquiler.css','utf8');
const fixture=`<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body>
<div id="cc77home"></div>
<script>window.CC_V53_SESSION={jwt:'jwt-sintetico',userId:'usuario-sintetico'};window.cc80={api:async(path)=>path==='rpc/ma_can_use'?true:[]};window.__writes=[];</script>
<script>${js}</script>
<script>
setTimeout(async()=>{
const out=document.createElement('output');out.id='ma-mobile-check';
try{
const button=document.getElementById('ma1611open');if(!button)throw Error('Falta botón de acceso');
button.click();
await new Promise(r=>setTimeout(r,300));
const layer=document.getElementById('ma1611layer');
const nav=[...document.querySelectorAll('#ma1611layer .ma1611-nav button')];
if(!layer||layer.hidden||nav.length!==5)throw Error('No abre Mi Alquiler con cinco secciones');
for(const b of nav){b.click();if(!b.classList.contains('active'))throw Error('No cambia sección '+b.dataset.area);}
const close=document.getElementById('ma1611close');
if(!close||getComputedStyle(close).width==='0px')throw Error('Botón de cierre no visible');
const width=document.documentElement.scrollWidth;
if(width>innerWidth+5)throw Error('Desbordamiento horizontal '+width+'/'+innerWidth);
close.click();if(!layer.hidden)throw Error('No cierra el diálogo');
out.dataset.status='pass';out.textContent=JSON.stringify({nav:nav.length,viewport:innerWidth,scrollWidth:width,closed:layer.hidden});
}catch(e){out.dataset.status='fail';out.textContent=String(e.stack||e);}
document.body.append(out);
},150);
</script></body></html>`;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ma-mobile-'));
try{
const file=path.join(dir,'index.html');fs.writeFileSync(file,fixture);
for(const size of ['390,844','320,700']){
const run=spawnSync(chrome,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--window-size='+size,'--virtual-time-budget=2200','--dump-dom','file://'+file],{encoding:'utf8',timeout:25000,maxBuffer:12*1024*1024});
assert.equal(run.status,0,'Chrome falló: '+String(run.stderr).slice(-300));
const match=run.stdout.match(/<output id="ma-mobile-check" data-status="(pass|fail)">([^<]*)<\/output>/);
assert.ok(match,'Sin resultado móvil '+size);
assert.equal(match[1],'pass',match[2]);
console.log('PASS MI ALQUILER móvil '+size+': '+match[2]);
}
}finally{fs.rmSync(dir,{recursive:true,force:true});}
