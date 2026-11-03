import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {sellerFixture} from './fixture-v310-seller.mjs';
import {runChromeFixture} from './chrome-fixture.mjs';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc310-'));
try{for(const role of ['super','reseller']){const file=path.join(dir,role+'.html');fs.writeFileSync(file,sellerFixture(role));const out=await runChromeFixture(chrome,file,'cc310-result');assert.match(out,/data-status="pass"/,out);console.log('PASS V310 '+role+': publicaciones, entregas, compras y navegación; sin operaciones reales.');}}
finally{fs.rmSync(dir,{recursive:true,force:true});}
