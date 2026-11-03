import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {operationsFixture} from './fixture-v309-operations.mjs';
import {runChromeFixture} from './chrome-fixture.mjs';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc309-'));
try{const file=path.join(dir,'operations.html');fs.writeFileSync(file,operationsFixture());const result=await runChromeFixture(chrome,file,'cc309-result');assert.match(result,/data-status="pass"/,result);console.log('PASS V309: recargas, bonos, estados ocupados, mensajes y filtros de pedidos; operaciones simuladas sin red.');}
finally{fs.rmSync(dir,{recursive:true,force:true});}
