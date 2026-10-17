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
console.log('V100: ' + inline.length + ' scripts correctos; ' + required.length + ' controles estáticos correctos.');
