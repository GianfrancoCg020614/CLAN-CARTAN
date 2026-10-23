import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read=path=>fs.readFileSync(path,'utf8');
const helper=read('scripts/parte1-registro.js');
const demo=read('pruebas/parte1.html');
const demoJS=read('scripts/parte1-demo.js');
const html=read('index.html');
const ui=read('scripts/v164-portal-4-negocios.js');
const indexHelper=html.indexOf('<script src="scripts/parte1-registro.js?v=171"></script>');
assert.ok(indexHelper>0,'La validación debe cargar antes del formulario real');
assert.ok(indexHelper<html.indexOf('/* V52 pilot:'),'Validador compartido debe cargar antes de Auth');
assert.match(html,/window\.CC_PART1_REGISTRATION\.validate\(\{/,'El registro real usa validación compartida');
assert.match(html,/registrationPending=true;window\.CC_PART1_SIGNUP_PENDING=true/,'Prevenir doble registro');
assert.match(html,/registrationPending=false;window\.CC_PART1_SIGNUP_PENDING=false/,'Restablecer bloqueo en error');
assert.match(html,/window\.ccParte1SyncRegisterButton\?\.\(\)/,'Sincronizar el botón al cambiar de estado');
assert.match(ui,/window\.CC_PART1_SIGNUP_PENDING===true/,'Bloquear mientras está solicitando alta');
assert.match(html,/window\.CC_P1_IS_PREVIEW=window\.location\.hostname\.endsWith\('\.clan-cartan\.pages\.dev'\)/,'Diferenciar previews Cloudflare');
for(const pattern of [
 'Registro real deshabilitado en esta vista previa',
 'Inicio de sesión real deshabilitado en esta vista previa',
 'No se envían correos reales desde la vista previa',
 'No se validan cuentas reales desde la vista previa',
 'La recuperación de cuentas reales no está habilitada en la vista previa.'
])assert.ok(html.includes(pattern),'Falta protección de preview: '+pattern);
assert.ok(ui.includes('function previewBanner()')&&ui.includes("'/pruebas/parte1.html'"));
assert.match(demo,/connect-src 'none'/,'La demo no puede contactar Supabase');
assert.match(demo,/form-action 'none'/,'La demo no hace envíos reales');
assert.match(demo,/<meta name="robots" content="noindex,nofollow">/);
assert.ok(!demo.includes('supabase.co')&&!demoJS.includes('fetch('),'No debe cargar o enviar datos de clientes');
assert.ok(!helper.includes('fetch(')&&!helper.includes('localStorage')&&!helper.includes('sessionStorage'),'Validador sin persistencia ni red');
for(const field of ['STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER'])assert.ok(demo.includes('value="'+field+'"'),'Debe existir el negocio '+field);
for(const field of ['p1-terms','p1-privacy','p1-marketing'])assert.ok(demo.includes('id="'+field+'"'));
assert.ok(!/id="p1-marketing"[^>]*required/.test(demo),'Publicidad nunca es obligatoria');
const sandbox={window:{}};
vm.runInNewContext(helper,sandbox,{timeout:1000});
const policy=sandbox.window.CC_PART1_REGISTRATION;
assert.equal(typeof policy?.validate,'function','Debe exportar el validador');
assert.equal(policy.legalAccepted(true,false),false);
assert.equal(policy.legalAccepted(false,true),false);
assert.equal(policy.legalAccepted(false,false),false);
assert.equal(policy.legalAccepted(true,true),true);
const valid={
 email:'persona@prueba.test',password:'PruebaSegura123!',confirmPassword:'PruebaSegura123!',
 fullName:'Persona Ejemplo',documentNumber:'12345678',dial:'+51',phone:'900000000',
 region:'Lima',province:'Lima',district:'Santa Anita',
 preferredService:'MI_ALQUILER',termsAccepted:true,privacyAccepted:true,marketingAccepted:false
};
assert.equal(policy.validate(valid).ok,true,'La publicidad desmarcada no bloquea');
assert.equal(policy.declaration(valid).marketing_consent,false);
assert.equal(policy.declaration({...valid,marketingAccepted:true}).marketing_consent,true);
assert.equal(policy.declaration({...valid,privacyAccepted:false}),null);
for(const [patch,expectedCode] of [
 [{email:'bad@'},'EMAIL'],[{password:'123'},'PASSWORD'],
 [{confirmPassword:'otra'},'CONFIRM'],[{fullName:'A'},'NAME'],
 [{documentNumber:''},'DOCUMENT'],[{dial:'+abc'},'PHONE'],
 [{region:''},'LOCATION'],[{termsAccepted:false},'LEGAL'],
 [{privacyAccepted:false},'LEGAL'],[{preferredService:'UNREGISTERED'},'SERVICE']
]){
 const out=policy.validate({...valid,...patch});
 assert.equal(out.code,expectedCode,'Validar fallo '+expectedCode);
 assert.equal(out.ok,false);
}
const pending=read('docs/PARTE1-ESTADO.md');
assert.match(pending,/Sin conexión a la base de datos real para las pruebas/);
assert.match(pending,/Supabase de staging todavía no configurado/);
console.log('PASS PARTE 1/7: validación, privacidad, publicidad opcional, prueba aislada, bloqueos de Auth y continuidad.');