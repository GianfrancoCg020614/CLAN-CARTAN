/* V190 · Sincronización automática de solicitudes y acreditaciones sin mover dinero. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const sql=fs.readFileSync('supabase/migrations/20261026041500_cc_admin_manual_verified_recharge_v189.sql','utf8');
const loader=fs.readFileSync('scripts/v151-portal-polish.js','utf8');
const html=fs.readFileSync('index.html','utf8');

new vm.Script(js,{filename:'v166-portal-roles.js'});
assert.match(js,/window\.setInterval\(\(\)=>\{/,'Existe actualización automática');
assert.match(js,/\},12000\);/,'Actualiza aproximadamente cada 12 segundos');
assert.match(js,/void loadAdminRecharges\(true,true\)/,'ADMIN consulta cambios aun con la cola en estado ready');
assert.match(js,/void loadOwnPendingRequest\(true,true\)/,'Cliente consulta cambio de estado de su solicitud');
assert.match(js,/void refreshOwnWalletBalance\(\)/,'Billetera y portada muestran el saldo real actualizado');
assert.match(js,/rechargeQueueBusy=true/,'Evita consultas simultáneas de la cola');
assert.match(js,/ownPendingBusy=true/,'Evita consultas simultáneas del cliente');
assert.match(js,/cc_manual_recharge_requests\?select=id,service,amount_pen,status,created_at,payer_reference&user_id=eq\./);
assert.doesNotMatch(js,/cc_manual_recharge_requests\?select=[^'\n]*&status=eq\.PENDING/,'La lectura incluye aprobadas y rechazadas');
assert.match(js,/next\.status==='APPROVED'/,'Detecta aprobación');
assert.match(js,/if\(creditChanged\)void load\(\)/,'Vuelve a consultar saldo y movimientos tras aprobación');
assert.match(js,/ownPending\?\.status==='APPROVED'/,'Muestra aprobación al cliente');
assert.match(js,/ownPending\?\.status==='REJECTED'/,'Muestra rechazo al cliente');
assert.match(js,/saveAdminReviewDrafts\(\)/,'Preserva campos escritos por ADMIN al actualizar');
assert.match(js,/restoreAdminReviewDrafts\(rechargeDrafts\)/,'Restaura campos escritos por ADMIN');
assert.match(js,/previousState!=='ready'\|\|prevRows!==JSON\.stringify\(rows\)/,'No redibuja una cola idéntica');
assert.match(js,/rpc\/cc_admin_decide_manual_recharge_v189/,'La aprobación sigue exclusivamente en el RPC validado');
assert.match(sql,/p_confirmed_received is distinct from true/i,'El servidor exige comprobar pago');
assert.match(sql,/v_req\.user_id=v_admin/i,'Ningún ADMIN acredita su propia cuenta');
assert.match(sql,/create unique index if not exists cc_verified_receipt_reference_unique_global/,'No repetir referencias');
assert.match(js,/p_confirmed_received:approve\?true:false/,'El cliente nunca autoacredita al crear solicitudes');
assert.match(loader,/v166-portal-roles\.js\?v=190/);
assert.match(html,/scripts\/v151-portal-polish\.js\?v=190/);
console.log('PASS V190: ADMIN y cliente sincronizados, sin duplicados y sin borrar borradores.');
