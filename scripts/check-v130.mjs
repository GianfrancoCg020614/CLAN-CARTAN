// Validación vigente V130: verifica los contratos que siguen activos.
// La batería V100 se conserva como referencia histórica y ya no bloquea mejoras UX.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { Script } from "node:vm";
const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const html = read("index.html");
const js = read("scripts/v122-recharges.js");
const css = read("styles/v122-recharges.css");
const old = read("scripts/v113-wallet.js");
const readme = read("README.md");
assert.match(html, /<meta name="cc-deploy-version" content="V\d+-\d{8}">/, "Falta version de despliegue");
assert.match(html, /<link rel="canonical" href="https:\/\/www\.clancartan\.com\/">/, "Dominio canonico no valido");
assert.ok(readme.includes("CONTINUIDAD-V130-2026-10-18.md"), "Falta continuidad V130");
for (const file of ["scripts/v113-wallet.js","scripts/v116-account.js","scripts/v119-clients.js","scripts/v122-recharges.js","scripts/v123-turnstile.js","scripts/v127-wallet-switch.js"]) {
  const code = read(file);
  new Script(code, { filename:file });
  assert.ok(html.includes(file), "Recurso JS no cargado: " + file);
}
for (const file of ["styles/v122-recharges.css","styles/v128-cobra-premium.css"]) {
  assert.ok(html.includes(file), "Estilo no cargado: " + file);
  assert.ok(read(file).length > 100, "Estilo vacio: " + file);
}
assert.ok(html.includes("cc110-invite"), "Codigo de invitado eliminado");
assert.ok(html.includes("cc106otp"), "Verificacion de correo eliminada");
assert.ok(html.includes("cy119") || html.includes("cc119OpenNewClient"), "Alta de clientes Cobra Ya perdida");
assert.ok(html.includes("cc-consulta-dni") || read("scripts/v119-clients.js").includes("cc-consulta-dni"), "Consulta DNI de COBRA YA perdida");
assert.ok(!html.includes("const CCC_DEMO_PASSWORD="), "Credencial maestra demo prohibida");
assert.ok(!/sb_secret_[A-Za-z0-9_-]+/.test(html), "Posible clave secreta en HTML");
assert.ok(js.includes("cc_auto_topup_method_status"), "No se consulta el bloqueo del backend");
assert.ok(js.includes("LEMON_DALE:false,BINANCE:false"), "Los pagos deben iniciar deshabilitados");
assert.ok(js.includes("button.disabled=!enabled"), "El boton de recarga no respeta disponibilidad");
assert.ok(js.includes("No envíes fondos"), "Falta advertencia de pago no disponible");
assert.ok(js.includes("cc130RefreshAutomaticTopups"), "Falta recarga del estado de proveedores");
for(const legacyId of ["#cy113topup","#cc113sbTopup","#cc80wallet .cc113-central-topup","#cc122section .cc125-admin"]) {
  assert.ok(css.includes(legacyId), "Control manual heredado no oculto: " + legacyId);
}
assert.ok(old.includes("cc_request_test_topup"), "Falta traza del flujo de prueba para auditabilidad");
assert.ok(css.includes("display:none!important"), "Bloqueo visual heredado retirado");
console.log("V130: sintaxis, marca, formularios, billeteras y recargas solo automaticas conservadas.");
