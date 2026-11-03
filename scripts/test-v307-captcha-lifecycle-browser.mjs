// Unit fixture only: token lifecycle, no real CAPTCHA solving or backend requests.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {runChromeFixture} from './chrome-fixture.mjs';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome obligatorio');
const js=fs.readFileSync('scripts/v123-turnstile.js','utf8');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc307-'));
const setup=`let clock=1000000,response='',resets=0,opts;Date.now=()=>clock;
window.turnstile={render:(target,options)=>{opts=options;return 'fixture-only-widget'},reset:()=>{resets++;response=''},getResponse:()=>response,isExpired:()=>false};
window.fetch=()=>{throw Error('No se permiten solicitudes en esta prueba unitaria')};`;
const check=`setTimeout(()=>{const checks={};const fails=fn=>{try{fn();return false}catch{return true}};
try{
 checks.requiresToken=fails(()=>cc123CaptchaToken());
 response='UNIT-ONLY-TOKEN-1';opts.callback(response);checks.firstUse=cc123CaptchaToken()===response;
 checks.rejectsReuse=fails(()=>cc123CaptchaToken());
 cc123ResetCaptcha();checks.resetCallsSDK=resets===1&&fails(()=>cc123CaptchaToken());
 response='UNIT-ONLY-TOKEN-2';opts.callback(response);clock+=240001;checks.rejectsAgedToken=fails(()=>cc123CaptchaToken())&&resets===2;
 response='UNIT-ONLY-TOKEN-3';opts.callback(response);response='UNIT-ONLY-DIFFERENT';checks.rejectsResponseMismatch=fails(()=>cc123CaptchaToken())&&resets===3;
 response='UNIT-ONLY-TOKEN-4';opts.callback(response);opts['expired-callback']();checks.expiryClearsToken=fails(()=>cc123CaptchaToken());
 response='UNIT-ONLY-TOKEN-5';opts.callback(response);opts['error-callback']();checks.errorClearsToken=fails(()=>cc123CaptchaToken());
}catch(e){checks.error=String(e)}
const output=document.createElement('output');output.id='cc307-result';output.dataset.status=Object.values(checks).every(x=>x===true)?'pass':'fail';output.textContent=JSON.stringify(checks);document.body.append(output);},60);`;
const html='<!doctype html><html><head><meta name="cc-turnstile-sitekey" content="UNIT-ONLY-SITEKEY"></head><body><div id="cc-real-login"><form><button id="cc-real-button">Ingresar</button></form></div><script>'+setup+'</script><script>'+js+'</script><script>'+check+'</script></body></html>';
try{const file=path.join(dir,'fixture.html');fs.writeFileSync(file,html);const result=await runChromeFixture(chrome,file,'cc307-result');assert.match(result,/data-status="pass"/,result);console.log('PASS V307: uso único, vigencia, respuesta del SDK y reinicios del CAPTCHA; fixture sin red.');}
finally{fs.rmSync(dir,{recursive:true,force:true});}
