/* Prueba Chrome sin cuentas, API, depósitos ni operaciones reales.
 * Verifica agrupación de controles, delegación de eventos y diseño móvil.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const chrome = ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  .find(p => fs.existsSync(p));
assert.ok(chrome, 'Chrome o Chromium es obligatorio para validar diseño móvil');
const js = fs.readFileSync('scripts/v1635-interfaz-limpia.js', 'utf8');
const css = fs.readFileSync('styles/v164-portal-4-negocios.css', 'utf8');
const html = [
 '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1">',
 '<style>body{margin:0;background:#0b1726}#cc80wallet{width:min(100%,390px);padding:10px;box-sizing:border-box}',
 css,'</style></head><body>',
 '<div id="cc80wallet">',
 '<section id="cc122section"><h3>Recarga automática</h3><div id="cc151operations"><h3>Solicitudes</h3><button id="reload">Actualizar</button></div></section>',
 '<section id="cc136manual"><h3>Recarga manual</h3><button id="legacy">Formulario antiguo</button></section>',
 '<section id="cc132movements"><h3>Movimientos</h3><button id="export">Exportar</button></section>',
 '<section id="cc147manualQr"><h3>QR manual</h3><div id="cc148manualFlow"><label>Monto<input id="cc148amount" type="number"></label></div>',
 '<div class="cc147-qr-grid" style="display:flex"><figure style="flex:1 1 230px">Lemon</figure><figure style="flex:1 1 230px">Binance</figure></div>',
 '<button id="cc148alreadyPaid">Ya pagué</button><p id="cc165warning">No envíes dinero sin autorización comercial.</p></section>',
 '<section id="cc143activate"><h3>Bono de bienvenida</h3><button id="bonus">Activar</button></section>',
 '<section id="cc136admin"><h3>ADMIN pendientes</h3><button id="approve">Revisar</button></section>',
 '<section id="cc143bonus"><h3>ADMIN bono</h3><button id="grant">Asignar</button></section>',
 '<section id="cc143report"><h3>ADMIN auditoría</h3><button id="audit">Auditoría</button></section>',
 '<section id="cc146admin"><h3>ADMIN acreditar</h3><button id="credit">Acreditar</button></section></div>',
 '<div id="mc158layer"><article class="mc158cart"><div class="mc158actions">',
 '<button data-action="payment">Cobrar</button><button data-action="sale">Hielo / venta</button>',
 '<button data-action="history">Historial</button><button data-action="whatsapp">WhatsApp</button>',
 '<button data-action="retire">Se retira</button></div></article></div>',
 '<script>',js,'</script>',
 '<script>document.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{',
 'let count=0;document.getElementById("mc158layer").addEventListener("click",e=>{if(e.target.dataset.action==="history")count++});',
 'const action=document.querySelector("[data-action=history]");action.click();',
 'const more=document.querySelector("#mc158layer .mc165-more");',
 'const methods=document.querySelector("#cc147manualQr > details.cc165-pay-methods");',
 'const ledger=document.querySelector("#cc151operations > details.cc165-fold");',
 'const checks={',
 'autoFolded:!!document.querySelector("#cc122section > details.cc165-fold"),',
 'operationsIndependent:!document.querySelector("#cc122section #cc151operations")&&!!ledger,',
 'methodsFolded:!!methods&&!methods.open,',
 'paymentButtonPreserved:!!methods.querySelector("#cc148alreadyPaid"),',
 'warningAlwaysVisible:!!document.querySelector("#cc147manualQr > #cc165warning"),',
 'historyExportPreserved:!!document.querySelector("#cc132movements #export"),',
 'adminControlsPreserved:!!document.querySelector("#cc146admin #credit"),',
 'singlePrimaryAction:document.querySelector(".mc158actions > button")?.dataset.action==="payment",',
 'moreOptionsFolded:!!more&&!more.open&&more.querySelectorAll("button").length===4,',
 'delegatedEventsStillWork:count===1,',
 'mobileQrStacked:getComputedStyle(document.querySelector(".cc147-qr-grid")).flexDirection==="column",',
 'noHorizontalOverflow:document.documentElement.scrollWidth<=window.innerWidth+2',
 '};const result=document.createElement("output");result.id="cc165-smoke";',
 'result.dataset.status=Object.values(checks).every(Boolean)?"pass":"fail";',
 'result.textContent=JSON.stringify(checks);document.body.appendChild(result);',
 '},150));</script></body></html>'
].join('\n');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc165-'));
try {
  const file = path.join(dir, 'fixture.html');
  fs.writeFileSync(file, html);
  const run = spawnSync(chrome, [
    '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--window-size=390,844', '--force-device-scale-factor=1',
    '--virtual-time-budget=3000', '--dump-dom', 'file://' + file
  ], { encoding: 'utf8', timeout: 30000, maxBuffer: 15 * 1024 * 1024 });
  assert.equal(run.status, 0, 'Chrome no terminó correctamente: ' + (run.stderr || '').slice(-700));
  const marker = run.stdout.match(/<output id="cc165-smoke" data-status="(pass|fail)">([^<]*)<\/output>/);
  assert.ok(marker, 'No se ejecutó la prueba del diseño móvil');
  assert.equal(marker[1], 'pass', 'Falló la prueba visual/interactiva: ' + marker[2]);
  console.log('PASS interfaz limpia en Chrome móvil: QR plegables, controles intactos, sin desbordamiento.');
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
