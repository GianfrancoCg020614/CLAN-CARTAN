/* V182 · Regression: consulta ADMIN de recargas sin ambigüedad user_id. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20261026023000_cc_admin_manual_recharge_queue_fix_v182.sql','utf8');
const frontend=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
assert.match(sql,/create or replace function public\.cc_admin_manual_recharge_queue\(\)/i);
assert.match(sql,/where a\.user_id=\(select auth\.uid\(\)\)/i,'El filtro ADMIN debe calificar el alias');
assert.doesNotMatch(sql,/where\s+user_id\s*=/i,'Prohibidas las columnas PL/pgSQL ambiguas');
assert.match(sql,/r\.id,r\.order_id,r\.user_id,r\.service,r\.amount_pen/,'Columnas pendientes explícitas');
assert.match(sql,/where r\.status='PENDING'/,'Solo se muestran solicitudes pendientes');
assert.match(sql,/revoke all on function public\.cc_admin_manual_recharge_queue\(\) from public,anon/,'Solo autenticados pueden invocar');
assert.match(sql,/grant execute on function public\.cc_admin_manual_recharge_queue\(\) to authenticated/);
assert.match(frontend,/rpc\/cc_admin_manual_recharge_queue/,'Frontend llama a la cola real');
assert.match(frontend,/Recargas pendientes/,'ADMIN muestra recargas pendientes');
console.log('PASS V182: calificación de user_id, permisos y cola de recargas sin mutaciones.');
