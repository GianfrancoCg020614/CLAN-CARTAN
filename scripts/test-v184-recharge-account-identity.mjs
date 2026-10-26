/* V184: privacidad del directorio y datos de cuenta en solicitudes ADMIN. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sql=fs.readFileSync('supabase/migrations/20261026030000_cc_recharge_account_identity_v184.sql','utf8');
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
assert.match(sql,/create or replace function public\.cc_admin_manual_recharge_queue_v184\(\)/i);
assert.match(sql,/where a\.user_id=\(select auth\.uid\(\)\)/i,'ADMIN verificable en el servidor');
assert.match(sql,/from public\.cc_manual_recharge_requests r\s+join auth\.users u on u\.id=r\.user_id/i,'Correo y usuario desde auth, no del depositante');
assert.match(sql,/left join public\.cc_portal_user_registry reg on reg\.user_id=r\.user_id/i,'N.º CLAN desde registro');
assert.match(sql,/left join public\.cc_user_details d on d\.user_id=r\.user_id/i,'Nombre del perfil registrado');
assert.match(sql,/where r\.status='PENDING'/,'Solo la cola pendiente');
assert.match(sql,/revoke all on function public\.cc_admin_manual_recharge_queue_v184\(\) from public,anon/i);
assert.match(sql,/grant execute on function public\.cc_admin_manual_recharge_queue_v184\(\) to authenticated/i);
assert.match(js,/api\('rpc\/cc_admin_manual_recharge_queue_v184','POST',\{\}\)/);
for(const name of ['registry_no','registry_code','registered_name','registered_email','payer_name','request_id']){
 assert.ok(js.includes('row.'+name),'Falta el campo '+name);
}
assert.match(js,/Depositante declarado \(NO verificado\)/,'No confundir pagador y solicitante');
assert.doesNotMatch(sql,/update public\.cc_real_service_wallets|insert into public\.cc_real_wallet_ledger/i,'No mover dinero al leer identidad');
console.log('PASS V184: titular, email, CLAN, autorización ADMIN, depósito separado y saldo intacto.');
