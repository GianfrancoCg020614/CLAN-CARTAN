/* V177 · Contrato no negociable de permisos y finanzas. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const sql=fs.readFileSync('supabase/migrations/20261026002000_cc_portal_admin_publish_guard_v177.sql','utf8');
const loader=fs.readFileSync('scripts/v151-portal-polish.js','utf8');
const postpay=fs.readFileSync('supabase/migrations/20261026004600_cc_super_postpay_approval_v178.sql','utf8');
const annual=fs.readFileSync('supabase/migrations/20261026010000_cc_super_annual_validation_v179.sql','utf8');
const index=fs.readFileSync('index.html','utf8');
const grantSql=fs.readFileSync('supabase/migrations/20261026020000_cc_admin_assisted_recharge_v181.sql','utf8');
const inlineSql=fs.readFileSync('supabase/migrations/20261026014000_cc_portal_admin_inline_roles_v180.sql','utf8');
const checks=[
 [js.includes("function adminAssistedRechargeForm(page)")&&js.includes("function openAdminGrantRecharge(person)")&&js.includes("function openAdminGrantBonus(person)"),'ADMIN puede otorgar recarga y bono desde la ficha'],
 [js.includes("api('rpc/cc_admin_create_manual_recharge_for_user'")&&js.includes("cc_admin_decide_manual_recharge"),'Recarga asistida queda pendiente antes de acreditación bancaria'],
 [grantSql.includes("exists(select 1 from public.cc_admins where user_id=actor)")&&grantSql.includes("p_target=actor"),'RPC solo ADMIN y prohibido otorgarse a sí mismo'],
 [grantSql.includes("status='PENDING'")&&grantSql.includes("p_request"),'Recarga deduplicada y pendiente, sin alterar saldos'],
 [js.includes("cc180-role-editor") && js.includes("Cambiar a Reseller") && js.includes("Autorizar Súper reseller"),'Los cambios se hacen en la ficha del usuario'],
 [js.includes("person.paid_until") && js.includes("const paid=!!"), 'Permisos especiales solo tras el pago anual'],
 [inlineSql.includes("elsif not p_enabled then") && inlineSql.includes("set role='RESELLER'"),'Se permite bajar Súper reseller pendiente a Reseller sin activar membresía'],
 
 [annual.includes("p.code='STREAM_365' and p.price_pen>0"),'Se verifica un plan anual comercial pagado'],
 [annual.includes("'paid_until',s.paid_until"),'ADMIN ve únicamente vencimiento pagado'],
 [js.includes("person.paid_until") && !js.includes("const paid=!!(person.access_until"),'La interfaz no confunde activación gratuita con pago real'],
 
 [js.includes("['bonuses','◇','Bonos']") && js.includes("['sales','◈','Supervisar pedidos']"),'ADMIN administra bonos y supervisa'],
 [js.includes("...(superRole?[['publish','▣','Mis publicaciones']"),'Solo el Súper reseller muestra publicar'],
 [js.includes("if(data.admin||!data.super)return overview(page)"),'Publicación bloqueada en front para ADMIN'],
 [js.includes("if(!data.admin){const b=button("),'ADMIN no marca pedidos entregados'],
 [js.includes("if(enable&&!paid)") && js.includes("Primero debe activar su membresía anual"),'Súper reseller requiere pago anual antes de autorización'],
 [sql.includes("ADMIN supervisa; la publicación corresponde exclusivamente a Súper reseller"),'ADMIN bloqueado por la base de datos'],
 [sql.includes("revoke execute on function public.cc_portal_publish_stream_product("),'No hay atajo a RPC antigua de publicación'],
 [sql.includes("'user_id',u.id"),'Los bonos de otros negocios usan identificador del usuario registrado'],
 [postpay.includes('revoke execute on function public.cc_portal_admin_assign_stream_role'), 'La RPC antigua ya no asigna Súper reseller antes del pago'],
 [postpay.includes('not exists(')&&postpay.includes('update public.cc_portal_super_resellers'), 'Autorizaciones previas a pago quedan deshabilitadas'],
 [js.includes("SÚPER RESELLER · APROBACIÓN PENDIENTE"), 'El usuario pagado ve el estado real hasta aprobación ADMIN'],
 [js.includes("rpc/cc_submit_manual_recharge") && js.includes("data.profile?.full_name"),'Recarga manual usa datos del perfil'],
 [js.includes("rpc/cc_auto_topup_method_status") && js.includes("No disponible"),'Recarga automática muestra estado del proveedor'],
 [js.includes("cc177-return-panel") && js.includes("Atrás") && js.includes("Cerrar"),'Cerrar, volver y navegación en un panel'],
 [loader.includes("scripts/v166-portal-roles.js?v=184") && loader.includes("styles/v177-panel-unico.css?v=184"),'Frontend sin caché antigua'],
 [index.includes("scripts/v151-portal-polish.js?v=184"),'Portada enlazada a V177']
];
let failures=0;
for(const [ok,desc] of checks){if(!ok){console.error('FAIL:',desc);failures++;}}
assert.equal(failures,0,'Contrato V177 incumplido');
console.log('PASS V177 · '+checks.length+' comprobaciones de permisos, bonos, finanzas y navegación.');
