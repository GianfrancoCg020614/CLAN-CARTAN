// MI ALQUILER V226.4 — pruebas estáticas sin credenciales ni datos reales.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
const read = name => readFileSync(new URL('./' + name, import.meta.url), 'utf8');
const modules = ['v161-1-mi-alquiler.js','v161-2-mi-alquiler.js','v161-3-mi-alquiler.js','v161-4-mi-alquiler.js'];
for (const name of modules) {
  const code = read(name);
  new Script(code, { filename: name });
  assert.match(code, /\b(?:ma161[1-4]|ma4|ma3)/, name + ': módulo incorrecto');
}
const core = read('v161-2-mi-alquiler.js');
const guard = "if(!account.active){target.innerHTML=locked();return;}";
const finance = "if(typeof window.ma1613Enhance==='function'";
const alerts = "if(typeof window.ma1614Enhance==='function'";
assert.ok(core.includes(guard), 'Falta bloqueo de membresía inactiva');
assert.ok(core.indexOf(guard) < core.indexOf(finance), 'Finanzas se ejecuta antes del bloqueo');
assert.ok(core.indexOf(guard) < core.indexOf(alerts), 'Avisos se ejecuta antes del bloqueo');
assert.ok(core.includes("Number(l.unit_id)===Number(id)"), 'Comparación inconsistente de unidad ocupada');
assert.ok(core.includes("Number(u.property_id)===Number(p.id)"), 'Comparación inconsistente de inmueble');
for (const rpc of ['ma_ensure_account','ma_add_property','ma_add_unit','ma_save_tenant','ma_start_lease','ma_end_lease']) {
  assert.ok(core.includes(rpc), 'Falta operación: ' + rpc);
}
assert.ok(read('v161-3-mi-alquiler.js').includes('ma_record_payment'), 'Falta registro de cobros');
console.log('MI ALQUILER V226.4: módulos, bloqueo de membresía, IDs y RPC esenciales verificados.');
