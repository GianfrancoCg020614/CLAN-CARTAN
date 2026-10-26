/* V177 · Contrato no negociable de permisos y finanzas. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const sql=fs.readFileSync('supabase/migrations/20261026002000_cc_portal_admin_publish_guard_v177.sql','utf8');
const loader=fs.readFileSync('scripts/v151-portal-polish.js','utf8');
const postpay=fs.readFileSync('supabase/migrations/20261026004600_cc_super_postpay_approval_v178.sql','utf8');
const index=fs.readFileSync('index.html','utf8');
const checks=[
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
 [loader.includes("scripts/v166-portal-roles.js?v=178") && loader.includes("styles/v177-panel-unico.css?v=177"),'Frontend sin caché antigua'],
 [index.includes("scripts/v151-portal-polish.js?v=178"),'Portada enlazada a V177']
];
let failures=0;
for(const [ok,desc] of checks){if(!ok){console.error('FAIL:',desc);failures++;}}
assert.equal(failures,0,'Contrato V177 incumplido');
console.log('PASS V177 · '+checks.length+' comprobaciones de permisos, bonos, finanzas y navegación.');
