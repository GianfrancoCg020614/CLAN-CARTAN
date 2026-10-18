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
  ['etiqueta de prueba', 'Gestiona tus clientes y préstamos · Saldo de prueba'],
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
assert.ok(html.includes('content="V118-20261018"'),'Falta marca de versión V114');
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
assert.ok(html.includes('styles/v113-wallet.css'),'Falta CSS V114');
assert.ok(html.includes('scripts/v113-wallet.js'),'Falta la interfaz V114');
assert.ok(v113.includes('cy55.pay=async function'),'Falta activación de COBRA YA');
assert.ok(v113.includes('cc_request_test_topup'),'Falta recarga simulada');
assert.ok(v113.includes('cc_transfer_test_balance'),'Falta transferencia interna propia');
assert.ok(!html.includes('panel.insertBefore(actions,panel.firstChild)'),'Acciones de volver/cambiar cuenta duplicadas');
assert.ok(html.includes('if(!window.cc113)await cy55.status()'),'Evita pedir estado varias veces al abrir');
assert.ok(html.includes('class="cy114-nav"'),'Falta navegación simplificada');
assert.ok(v113.includes("setAttribute('aria-expanded'"),'Falta accesibilidad de paneles desplegables');
assert.ok(html.includes('No se pudieron consultar tus saldos.'),'No se informa el error de lectura de billeteras');
assert.ok(html.includes('Math.abs(Math.round(amount*100)-amount*100)>0.000001'),'La transferencia rechaza decimales correctos');
assert.ok(v113.includes('cy115refresh'),'Falta actualizar saldo en COBRA YA');
assert.ok(v113.includes('cc115streamRefresh'),'Falta actualizar saldo Stream Bull');
const v116=readFileSync(new URL('../scripts/v116-account.js',import.meta.url),'utf8');
new Script(v116,{filename:'v116-account.js'});
assert.ok(html.includes('styles/v116-account.css'),'Falta diseño de cuentas V116');
assert.ok(html.includes('scripts/v116-account.js'),'Falta script del perfil V116');
assert.ok(html.includes('id="cc116-account-balances"'),'Saldos no visibles en perfil');
assert.ok(html.includes('cc116OpenRecharge()'),'Botón de recarga no disponible');
const cobraCard=html.slice(html.indexOf('SISTEMA PARA PRESTAMISTAS'),html.indexOf('</article>',html.indexOf('SISTEMA PARA PRESTAMISTAS')));
assert.ok(!cobraCard.includes('cc77Auth(true)'),'Se duplicó Crear cuenta en COBRA YA');
assert.ok(html.includes('Tus códigos personales'),'No aparecen códigos por plataforma');
assert.ok(html.includes('cc116-code-row'),'Falta disposición de códigos');
const v117=readFileSync(new URL('../styles/v117-public-catalog.css',import.meta.url),'utf8');
assert.ok(html.includes('styles/v117-public-catalog.css?v=117'),'Falta estilo del catálogo público');
assert.ok(html.includes('cc117-search-title'),'Falta buscador destacado de productos');
assert.ok(html.includes('cc117-category-strip'),'Falta barra horizontal de categorías');
assert.ok(html.includes('cc117CategoryButton'),'Falta navegación real por categorías');
assert.ok(html.includes('cc117-store-header')===false,'Cabecera de catálogo duplicada');
assert.ok(html.includes('cc117-login')&&html.includes('cc77Auth(false)'),'Ingresar no usa cuenta única CLAN CARTAN');
assert.ok(html.includes('cc77Auth(true)'),'Crear cuenta no usa CLAN CARTAN');
assert.ok(html.includes('cc117-one-action'),'Se muestran botones repetidos en tarjetas');
const renderedStore=html.slice(html.indexOf('function renderStore(){'),html.indexOf('function clientsView(){'));
assert.ok(!renderedStore.includes('ccc-v49-guest-cta'),'Se sigue mostrando una invitación obligatoria al registro en el catálogo');
assert.ok(v117.includes('CLAN CARTAN V117'),'Los recursos visuales no tienen versión');
const v118=readFileSync(new URL('../styles/v118-logout.css',import.meta.url),'utf8');
assert.ok(v118.includes('CLAN CARTAN V118'),'Falta estilo de salida con icono');
assert.ok(html.includes('styles/v118-logout.css?v=118'),'Falta cargar icono de salida');
assert.equal((html.match(/aria-label="Cerrar sesión" title="Cerrar sesión"/g)||[]).length,2,'Portada y COBRA YA requieren iconos accesibles');
assert.ok(html.includes('cc118-profile-logout'),'Falta botón de cierre en perfil');
assert.ok(html.includes('cy114-change cc118-logout'),'Falta botón de cierre en COBRA YA');
assert.ok(!html.includes('>Cambiar cuenta</button>'),'Cambiar cuenta sigue usando texto');
assert.ok(v118.includes('#cc54logout{display:none!important}'),'El antiguo cierre flotante no está oculto');
console.log('V118: ' + inline.length + ' scripts válidos, registro manual con invitación y OTP 8, DNI COBRA YA conservado.');
