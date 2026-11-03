import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {businessDialogFixture} from './fixture-v311-business-dialogs.mjs';
import {runChromeFixture} from './chrome-fixture.mjs';
const chrome=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);assert.ok(chrome,'Chrome requerido');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cc311-'));
try{for(const kind of ['cobra','cochera','alquiler']){const file=path.join(dir,kind+'.html');fs.writeFileSync(file,businessDialogFixture(kind));const out=await runChromeFixture(chrome,file,'cc311-result');assert.match(out,/data-status="pass"/,out);console.log('PASS V311 '+kind+': formularios, foco, Tab/Escape y regreso; sin guardados.');}}
finally{fs.rmSync(dir,{recursive:true,force:true});}
