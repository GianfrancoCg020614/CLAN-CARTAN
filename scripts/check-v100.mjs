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
assert.ok(!/sb_secret_[A-Za-z0-9_-]+/.test(html), 'Posible clave Supabase secreta');

// V102: invariantes comerciales que no deben perderse en nuevas versiones.
const invariants = [
  ['registro e inicio de sesión', "textContent.includes('Registrar mi cuenta')"],
  ['suscripción voluntaria', "function lnAutoRenewDue(){return 0;}"],
  ['confirmación de mensualidad', "¿Confirmas pagar VOLUNTARIAMENTE S/ 15"],
  ['deshabilitar retiros Cobra Ya', "function lnOpenWithdrawal(){return notify("],
  ['acceso a billeteras exclusivas', "cc_transfer_test_balance"],
  ['catalogo sin registro', "CATÁLOGO PÚBLICO · SIN REGISTRO"]
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
console.log('V102: ' + inline.length + ' scripts con sintaxis válida, reglas de acceso y pagos voluntarios verificadas de forma estática.');
