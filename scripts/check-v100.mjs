// Validación estática sin dependencias ni acceso a bases de datos.
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.ok(inline.length >= 10, 'Faltan scripts del portal');
inline.forEach((match, idx) => {
  try { new Script(match[1], { filename: 'inline-' + idx + '.js' }); }
  catch (error) { throw new Error('Error de sintaxis en script ' + idx + ': ' + error.message); }
});

const required = [
  ['registro Supabase', '/auth/v1/signup?redirect_to='],
  ['redirección Cloudflare', 'https://clan-cartan.pages.dev/'],
  ['renovación sesión', 'refreshSupabaseSession'],
  ['cronogramas Cobra Ya', 'rpc/cy_correct_loan'],
  ['prórroga Cobra Ya', 'cy_extend_loan_one_month'],
  ['etiqueta de prueba', 'COBRA YA · REGISTROS DE PRUEBA'],
  ['filtros con datos corregidos', 'state.loans.forEach(x=>{const group=statusForLoan(x).group;']
];
for (const [name, fragment] of required) {
  assert.ok(html.includes(fragment), 'Falta ' + name);
}
assert.ok(!html.includes("const CCC_DEMO_PASSWORD="), 'Existe una contraseña maestra demo');
assert.ok(/<meta name="cc-deploy-version" content="V[0-9]+-[0-9]{8}">/.test(html), 'Falta marca verificable de despliegue');
assert.ok(!html.includes('gc.kis.v2.scr.kaspersky-labs.com'), 'Dependencia antivirus inyectada ajena al proyecto');
assert.ok(html.includes('<link rel="canonical" href="https://www.clancartan.com/">'), 'Falta dominio canónico de CLAN CARTAN');
assert.ok(html.includes('www.ClanCartan.com'), 'Falta dirección comercial visible');
assert.ok(html.includes("rpc/cy_lookup_dni_saved"), 'Falta autocompletado restringido por DNI');
assert.ok(html.includes('cy105goLoan'), 'Falta acceso directo del cliente al préstamo');
assert.ok(html.includes('cy105dniStatus'), 'Falta el indicador accesible de consulta de DNI');

assert.ok(!/sb_secret_[A-Za-z0-9_-]+/.test(html), 'Posible clave Supabase secreta');

// V102: invariantes comerciales que no deben perderse en nuevas versiones.
const invariants = [
  ['registro e inicio de sesión', "textContent.includes('Registrar mi cuenta')"],
  ['suscripción voluntaria', "function lnAutoRenewDue(){return 0;}"],
  ['confirmación de mensualidad', "¿Confirmas pagar VOLUNTARIAMENTE S/ 15"],
  ['deshabilitar retiros Cobra Ya', "function lnOpenWithdrawal(){return notify("],
  ['acceso a billeteras exclusivas', "cc_transfer_test_balance"],
  ['catalogo sin registro', "CATÁLOGO PÚBLICO · SIN REGISTRO"],
  ['registro de contraseña robusta', 'if(password.length<12)'],
  ['recuperación de contraseña robusta', 'if(pw.length<12||'],
  ['ayuda de contraseña robusta', 'La contraseña debe tener al menos 12 caracteres']
];
for (const [label,fragment] of invariants) {
  assert.ok(html.includes(fragment), 'Regla perdida: ' + label);
}
const roleBlock=html.slice(html.indexOf('const ROLE_SECTIONS='),html.indexOf('const PANEL_NAMES='));
assert.ok(roleBlock && !roleBlock.includes("'withdrawals'"), 'Retiros visibles en navegación');
assert.ok(!html.includes('onclick="lnOpenWithdrawal()"'), 'Botón de retiro Cobra Ya activo');
assert.ok(!html.includes('onclick="requestWithdrawal()"'), 'Botón de retiro Stream Bulls activo');
assert.ok(!html.includes("Descuento AUTOMÁTICO DEMO"), 'Mensualidad automática heredada');
assert.ok(!html.includes("window.setInterval(()=>{const n=lnAutoRenewDue()"), 'Temporizador de cobro automático');
console.log('V105: ' + inline.length + ' scripts con sintaxis válida, reglas de acceso y pagos voluntarios verificadas de forma estática.');
