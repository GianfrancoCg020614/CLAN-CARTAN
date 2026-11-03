import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import assert from 'node:assert/strict';
import {cleanupFixture} from './fixture-v312-cleanup.mjs';import {runChromeFixture} from './chrome-fixture.mjs';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);assert.ok(chrome,'Chrome requerido');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc312-'));
try{const file=path.join(dir,'cleanup.html');fs.writeFileSync(file,cleanupFixture());const result=await runChromeFixture(chrome,file,'cc312-result');assert.match(result,/data-status="pass"/,result);console.log('PASS V312: billetera única, rutas, saldo/bono separados e historial CSV/PDF; sin escrituras reales.');}
finally{fs.rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});}
