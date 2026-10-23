#!/usr/bin/env node
/* Comprobación HTTP de solo lectura, nunca usa credenciales ni solicita DNI/OTP. */
import assert from 'node:assert/strict';
const url=process.argv.find(x=>x.startsWith('--url='))?.slice(6)||'';
assert.match(url,/^https:\/\/[a-z0-9-]+\.clan-cartan\.pages\.dev\/?$/,'Indica preview: --url=https://HASH.clan-cartan.pages.dev');
const base=url.endsWith('/')?url:url+'/';
const targets=[
 ['', 'CLAN CARTAN'],
 ['scripts/v161-1-mi-alquiler.js','ma1611'],
 ['scripts/v161-2-mi-alquiler.js','ma1612'],
 ['scripts/v161-3-mi-alquiler.js','ma3'],
 ['scripts/v161-4-mi-alquiler.js','WhatsApp'],
 ['scripts/v162-1-mi-alquiler-wallets.js','MI_ALQUILER'],
 ['scripts/v123-turnstile.js','cc123CaptchaToken'],
 ['assets/mi-alquiler-logo.svg','data:image/webp;base64,']
];
let ok=0;
for(const [path,marker] of targets){
 const response=await fetch(new URL(path,base),{headers:{'cache-control':'no-cache'}});
 assert.equal(response.status,200,'Falla HTTP '+path+': '+response.status);
 const body=await response.text();
 assert.ok(body.toLowerCase().includes(marker.toLowerCase()),'Recurso no corresponde al contenido esperado: '+path);
 ok++;
 console.log('PASS '+(path||'index.html'));
}
console.log('Preview V163.5: '+ok+'/'+targets.length+' recursos comprobados. Sin pruebas financieras ni login.');