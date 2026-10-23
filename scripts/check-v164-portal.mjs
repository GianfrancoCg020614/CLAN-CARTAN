import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('scripts/v164-portal-4-negocios.js','utf8');
const css=fs.readFileSync('styles/v164-portal-4-negocios.css','utf8');
const marketing=fs.readFileSync('scripts/v161-marketing-account.js','utf8');
for(const word of ["cc164-privacy","id=\"cc161-marketing\"","data_processing_accepted","data_processing_version:'V164-20261023'","MI_ALQUILER","ma_accounts?select=invite_code","cc164AfterLogin?.()","styles/v164-portal-4-negocios.css?v=1641","scripts/v164-portal-4-negocios.js?v=1641"]){
 assert.ok(html.includes(word),'Falta función del portal: '+word);
}
for(const code of ['BULL1','BULL2','BULL3','BULL4','COBRA1','COBRA2','COBRA3','COBRA4','COCHERA1','COCHERA2','COCHERA3','ALQUILER1','ALQUILER2','ALQUILER3']) assert.ok(html.includes(code),'Ejemplo de código ausente: '+code);
assert.match(html,/if\(!document\.getElementById\('cc-v81-terms'\)\.checked\|\|!document\.getElementById\('cc164-privacy'\)\.checked\)throw Error/);
assert.match(html,/id="cc164-privacy" type="checkbox" required/);
assert.match(html,/id="cc161-marketing" type="checkbox"/);
assert.ok(!/id="cc161-marketing" type="checkbox" required/.test(html),'Publicidad nunca debe obligar a registrarse');
assert.match(html,/Autorizo comunicaciones publicitarias de CLAN CARTAN por correo y WhatsApp/);
assert.ok(marketing.includes("document.createElement('details')"),'Preferencias deben poder abrirse para revocar marketing');
assert.ok(html.includes("p_authorized:next")===false||marketing.includes('p_authorized:next'),'Revocación con RPC permanece');
assert.ok(js.includes("const blocked=register&&(!(terms.checked&&privacy.checked)||window.CC_PART1_SIGNUP_PENDING===true)"),'Botón no depende de publicidad y previene solicitudes duplicadas');
assert.ok(!js.includes('marketing.checked'),'Publicidad debe seguir opcional');
assert.ok(js.includes("localStorage.setItem(key,value)"),'Tema visual debe persistir');
assert.ok(js.includes("cc_real_service_wallets?select=service,balance_pen&user_id=eq."),'Saldos solo del usuario');
assert.ok(!js.includes('rpc/ma_transfer_real_balance')&&!js.includes('p_amount'),'Visual no mueve fondos');
assert.ok(js.includes("old.hidden=true")&&js.includes('MI SALDO REAL TOTAL'),'Reemplazar valores viejos por total REAL');
assert.ok(css.includes('repeat(4,minmax(0,1fr))'),'Cuatro tarjetas en escritorio');
assert.ok(css.includes('data-cc-theme="light"'),'Tema claro');
assert.ok(css.includes('data-cc-theme="light"] #ma1611layer'),'Tema claro MI ALQUILER');
const make=(textContent='')=>{
 const listeners=new Map();
 return {textContent,disabled:false,checked:false,attrs:{},addEventListener:(type,cb)=>listeners.set(type,cb),
  setAttribute(key,value){this.attrs[key]=value;},
  dispatch(type){listeners.get(type)?.();}};
};
const terms=make(),privacy=make(),submit=make('Registrar mi cuenta'),toggle=make();
const nodes=new Map([['cc-v81-terms',terms],['cc164-privacy',privacy],['cc-real-button',submit],['cc-register-toggle',toggle]]);
let onready;
const doc={readyState:'loading',getElementById:id=>nodes.get(id)||null,
 addEventListener(type,cb){if(type==='DOMContentLoaded')onready=cb;},
 documentElement:{dataset:{}}};
const storage=new Map();
const scope={
 window:{CC_V53_SESSION:null,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)}},
 document:doc,MutationObserver:class{observe(){}},
 queueMicrotask,console
};
vm.runInNewContext(js,scope);
assert.equal(typeof onready,'function');
onready();
assert.equal(doc.documentElement.dataset.ccTheme,'dark');
assert.equal(submit.disabled,true,'Registro debe iniciar inhabilitado');
terms.checked=true;terms.dispatch('change');assert.equal(submit.disabled,true,'Falta aceptar uso de datos');
privacy.checked=true;privacy.dispatch('change');assert.equal(submit.disabled,false,'Con las dos aceptaciones legales habilitar');
privacy.checked=false;privacy.dispatch('change');assert.equal(submit.disabled,true,'Revocar consentimiento necesario bloquea');
submit.textContent='Ingresar a CLAN CARTAN';terms.dispatch('change');
assert.equal(submit.disabled,false,'Inicio de sesión debe quedar operativo sin aceptar nuevas cláusulas');
console.log('PASS V164: 4 negocios, 14 formatos, referido real MI ALQUILER, billetera solo REAL, registro/privacidad y tema dual.');