/* V173 · Auditoría de portada: no más S/20 ficticio ni ADMIN legado visible.
 * Ejecuta puente de beneficios con VM sin credenciales, sin recargas ni pagos.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('index.html','utf8');
const panel=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const loader=fs.readFileSync('scripts/v151-portal-polish.js','utf8');
const start=html.indexOf('function cc79StreamBenefits(){');
const end=html.indexOf('\n</script>',start);
assert.ok(start>0&&end>start,'Falta enlace de beneficios de STREAM BULL’S');
const fn=html.slice(start,end);
assert.ok(fn.includes('cc166OpenStreamMembership'),'El botón de beneficios no abre la membresía real');
for(const legacy of ['rpc/sb_my_affiliation_test','rpc/sb_pay_affiliation_test',
 'rpc/cc_request_test_topup','rpc/cc_admin_review_test_topup']){
 assert.ok(!html.includes(legacy),'Aún existe un flujo ficticio accesible: '+legacy);
}
assert.ok(!html.includes('id="cc93-confirm"'),'El formulario ficticio sigue en portada');
assert.ok(!html.includes('onclick="cc94RequestTopup()"'),'Aún existe recarga ficticia');
assert.ok(html.includes("if(adminBtn)adminBtn.style.display='none'; // Accesible"),
 'El antiguo botón ADMIN aún aparece en el menú principal');
assert.ok(html.includes('Los visitantes y afiliados ven precios públicos.'),'Precios públicos no explicados');
assert.ok(html.includes('S/ 25 por 365 días'),'Condiciones del plan anual no corregidas');
assert.ok(html.includes('COBRA YA, MI COCHERA y MI ALQUILER'),'Una cuenta para cuatro negocios');
assert.ok(html.includes('id="cc93-affiliate" hidden'),'Marcador de compatibilidad no inactivo');
assert.ok(html.includes('scripts/v151-portal-polish.js?v=192'),'El portal conserva versión antigua en caché');
assert.ok(loader.includes('scripts/v166-portal-roles.js?v=192')&&
 loader.includes('scripts/v169-catalogo-unico.js?v=1731'),'Scripts no versionados');
assert.ok(panel.includes('window.cc166OpenStreamMembership=()=>{')&&
 panel.includes("view='business:STREAM_BULLS'"),
 'No existe destino único de membresía');
let real=0,auth=0,panelOpen=0,alerts=0;
const win={CC_V53_SESSION:{jwt:'synthetic'},cc166OpenStreamMembership:()=>{real++;}};
const ctx={window:win,cc77Auth:()=>{auth++},alert:()=>{alerts++}};
vm.runInNewContext(fn+';cc79StreamBenefits();',ctx);
assert.equal(real,1,'Los beneficios no abren el panel STREAM real');
assert.equal(auth,0,'Se solicitó login pese a sesión activa');
win.CC_V53_SESSION=null;
vm.runInNewContext(fn+';cc79StreamBenefits();',ctx);
assert.equal(auth,1,'Sin sesión, la portada debe abrir inicio de sesión');
win.CC_V53_SESSION={jwt:'synthetic'};
delete win.cc166OpenStreamMembership;
win.cc166OpenPanel=()=>{panelOpen++};
vm.runInNewContext(fn+';cc79StreamBenefits();',ctx);
assert.equal(panelOpen,1,'Fallback de panel no responde');
assert.equal(alerts,0,'Se mostró error de flujo antiguo');
console.log('PASS V173 · portada sin ficticios, ADMIN antiguo oculto, beneficios al panel real, texto y caché coherentes.');
