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
// V108: se retira expresamente el DNI automático del registro general.
const nameOrder=html.indexOf('id="cc-v81-name"');
const dniOrder=html.indexOf('id="cc-v81-doc"');
assert.ok(nameOrder>0 && dniOrder>nameOrder,'CLAN CARTAN debe tener su formulario manual original');
assert.ok(!html.includes('cc107consent'),'Registro general NO debe consultar DNI automáticamente');
assert.ok(!html.includes('cc-dni-registro'),'Función de DNI público no debe usarse en el portal');
assert.ok(html.includes('rpc/cy_lookup_dni_saved'),'COBRA YA debe conservar la consulta de DNI');
assert.ok(html.includes('content="V113-20261018"'),'Falta marca de versión V111');
assert.ok(html.includes('id="cc111-business"'),'Falta selector del negocio para el código propio');
assert.ok(html.includes('invite_business:document.getElementById(\'cc111-business\').value'),'El registro no comunica el negocio elegido');
assert.ok(html.includes('Puedes registrarte sin código'),'No se informa que el código es opcional');
const codeBoxes=html.slice(html.indexOf('<div id="cc106otp"'),html.indexOf('</div>',html.indexOf('<div id="cc106otp"')));
assert.equal((codeBoxes.match(/aria-label="Dígito [0-9]+"/g)||[]).length,8,'Deben ser ocho casillas para OTP de Supabase');
assert.ok(html.includes("if(!/^\\d{8}$/.test(token))"),'OTP de 8 dígitos no validado');
assert.ok(html.includes('slice(0,otpInputs.length)'),'Pegado completo de OTP no soportado');
assert.ok(html.includes('8 dígitos recibidos'),'Texto del OTP de ocho dígitos no actualizado');
const referralField=html.indexOf('id="cc110-invite"');
const confirmationField=html.indexOf('id="cc-v81-confirm"');
assert.ok(referralField>confirmationField,'Código de invitado debe estar en el registro');
assert.ok(html.includes("invitation_code:invitationCode||null"),'No se envía el código validado al registro');
assert.ok(html.includes('/rest/v1/rpc/cc_validate_invitation_code'),'Falta validación del servidor de referidos');
assert.ok(html.includes('/rest/v1/rpc/cc_my_invitation_codes'),'Los afiliados no pueden consultar sus códigos');
assert.ok(html.includes('cc110ShowMyInvitationCodes();'),'Falta mostrar los códigos al ingresar');
assert.ok(html.includes('^(COBRA|BULL)'),'Falta formato COBRA / BULL');
assert.ok(html.includes('commercialRole:commercialRole'),'Etiqueta de roles comerciales faltante');
const v113=readFileSync(new URL('../scripts/v113-wallet.js',import.meta.url),'utf8');
new Script(v113,{filename:'v113-wallet.js'});
assert.ok(html.includes('styles/v113-wallet.css'),'Falta CSS V113');
assert.ok(html.includes('scripts/v113-wallet.js'),'Falta la interfaz V113');
assert.ok(v113.includes('cy55.pay=async function'),'Falta activación de COBRA YA');
assert.ok(v113.includes('cc_request_test_topup'),'Falta recarga simulada');
assert.ok(v113.includes('cc_transfer_test_balance'),'Falta transferencia interna propia');
console.log('V113: ' + inline.length + ' scripts válidos, registro manual con invitación y OTP 8, DNI COBRA YA conservado.');
