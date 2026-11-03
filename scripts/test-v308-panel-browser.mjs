import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {panelFixture} from './fixture-v308-panel.mjs';
import {runChromeFixture} from './chrome-fixture.mjs';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
assert.ok(chrome,'Chrome requerido');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc308-'));
try{
 for(const role of ['admin','super','reseller']){
  const file=path.join(dir,role+'.html');fs.writeFileSync(file,panelFixture(role));
  const result=await runChromeFixture(chrome,file,'cc308-result');
  assert.match(result,/data-status="pass"/,result);
  console.log('PASS V308 '+role+': menú móvil, permisos, búsqueda y fichas; sin escrituras reales.');
 }
}finally{fs.rmSync(dir,{recursive:true,force:true});}
