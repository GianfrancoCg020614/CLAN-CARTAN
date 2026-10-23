import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s=fs.readFileSync('index.html','utf8');
const checker=fs.readFileSync('scripts/parte1-registro.js','utf8');
const marketing=fs.readFileSync('scripts/v161-marketing-account.js','utf8');
const required=[
 'id="cc-v81-terms" type="checkbox"',
 'id="cc164-privacy" type="checkbox"',
 'id="cc161-marketing" type="checkbox"',
 'ccParte1SyncRegisterButton()',
 'registrationPending',
 "const ccParte1LegalReady=()=>document.getElementById('cc-v81-terms').checked&&document.getElementById('cc164-privacy').checked",
 'data_processing_accepted:document.getElementById',
 "data_processing_version:'V164-20261023'",
 "window.CC_PART1_REGISTRATION?.validate",
 "async function signIn(event)",
 "async function register(event)",
 "cc90-resend",
 "cc91-confirm",
 "cc86-recovery-form",
 'scripts/v161-marketing-account.js?v=161'
];
for(const part of required)assert.ok(s.includes(part),'Falta requisito: '+part);
assert.ok(s.indexOf('scripts/parte1-registro.js?v=171')<s.indexOf('/* V52 pilot:'),'El helper debe cargarse antes del formulario');
assert.ok(!/id="cc161-marketing"[^>]*required/.test(s),'Marketing siempre voluntario');
assert.match(s,/if\(!ccParte1LegalReady\(\)\)\{ccParte1SyncRegisterButton\(\);return;\}/);
assert.ok(s.includes("const blocked=registrationPending||(registering&&!ccParte1LegalReady());"));
assert.ok(s.includes("finally{registrationPending=false;toggle.disabled=false;ccParte1SyncRegisterButton();window.cc123ResetCaptcha?.();}"));
assert.ok(!s.includes('CC_P1_IS_PREVIEW'),'Producción no debe bloquear la autenticación real con reglas de preview');
assert.ok(s.includes("const auth=await api('/auth/v1/token?grant_type=password'"),'Inicio de sesión real intacto');
assert.ok(s.includes("await api('/auth/v1/signup?redirect_to='"),'Signup existente se conserva');
assert.ok(s.includes("document.getElementById('cc90-resend').addEventListener"),'Reenviar OTP se conserva');
assert.ok(s.includes("const redirectTo=location.protocol==='https:'"),'Recuperación se conserva');
assert.ok(marketing.includes('rpc/cc_set_my_marketing_consent'),'Revocación del consentimiento se conserva');
assert.ok(checker.includes('data_processing_version'),'Consentimiento de datos declarado');
const sandbox={window:{}};
vm.runInNewContext(checker,sandbox,{timeout:1500});
const api=sandbox.window.CC_PART1_REGISTRATION;
assert.equal(api.legalAccepted(true,true),true);
assert.equal(api.legalAccepted(true,false),false);
assert.equal(api.legalAccepted(false,true),false);
const sample={
 email:'persona@prueba.test',password:'Contrase\u00f1aDePrueba123!',
 confirmPassword:'Contrase\u00f1aDePrueba123!',fullName:'Persona Ejemplo',
 documentNumber:'12345678',dial:'+51',phone:'987654321',
 region:'Lima',province:'Lima',district:'Santa Anita',
 preferredService:'COBRA_YA',termsAccepted:true,privacyAccepted:true,marketingAccepted:false
};
assert.equal(api.validate(sample).ok,true);
assert.equal(api.declaration(sample).marketing_consent,false);
assert.equal(api.validate({...sample,privacyAccepted:false}).ok,false);
assert.equal(api.declaration({...sample,privacyAccepted:false}),null);
assert.equal(api.declaration({...sample,marketingAccepted:true}).marketing_consent,true);
assert.equal(api.validate({...sample,password:'a'}).ok,false);
assert.equal(api.validate({...sample,preferredService:'UNAUTHORIZED'}).ok,false);
console.log('PASS PARTE 1 MAIN: registros seguros con privacidad y marketing voluntario; login/OTP/recovery preservados.');
