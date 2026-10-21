// V151 · Portal financiero real: no mostrar rótulos DEMO y reparar formularios duplicados.
// Script idempotente. No borra usuarios, movimientos ni historiales.
import fs from 'node:fs';
const path='index.html';
let html=fs.readFileSync(path,'utf8');
const oldClient=`    cy105clientForm.elements.name.value=found.full_name||'';
    cy105clientForm.elements.phone.value=found.phone||'';
    cy105clientForm.dataset.foundClientId=found.client_id;
    cy105dniStatus.textContent='✓ Cliente encontrado. Se seleccionó automáticamente para el préstamo.';
    cy105goLoan(found.client_id);`;
const newClient=`    cy105clientForm.elements.name.value=found.full_name||'';
    cy105clientForm.elements.phone.value=found.phone||'';
    cy105clientForm.dataset.foundClientId=found.client_id;
    cy105dniStatus.textContent='Cliente encontrado. Comprobando nombre registrado…';
    const verified=await window.cc119ReconcileSavedClient?.(found.client_id,value);
    if(seq!==cy105lastLookup||cy105dniInput.value.trim()!==value)return;
    if(verified?.status==='found'&&verified.full_name){
     cy105clientForm.elements.name.value=verified.full_name;
     cy105dniStatus.textContent=verified.corrected
       ?'✓ Nombre corregido según consulta disponible. Contacto e historial conservados.'
       :'✓ Cliente reconocido. Nombre verificado.';
     if(verified.corrected)await refresh();
    }else{
     cy105dniStatus.textContent='Cliente reconocido. Consulta de identidad no disponible; datos conservados.';
    }
    cy105goLoan(found.client_id);`;
if(html.includes(oldClient))html=html.replace(oldClient,newClient);
else if(!html.includes('const verified=await window.cc119ReconcileSavedClient'))throw Error('No se encontró el flujo DNI anterior');
const literalReplacements=[
 ["Mensualidad de prueba: <b>S/ 15.00</b>","Mensualidad COBRA YA: <b>S/ 15.00</b>"],
 ["Saldo de prueba disponible: S/ ","Saldo consultado: S/ "],
 ["Los registros actuales son ficticios; abre COBRA YA desde el botón superior.","Gestiona COBRA YA y tus billeteras desde el panel de servicios."],
 ["RESELLER autenticado · registros de prueba","RESELLER autenticado · cartera privada"],
 ["Las contraseñas DEMO están deshabilitadas. Este es un piloto de autenticación Supabase.","Utiliza únicamente el inicio de sesión seguro de CLAN CARTAN."],
 ["Acceso comercial real en desarrollo. La autenticación ADMIN está disponible en esta versión piloto.","Accede a los módulos según el estado real de tus servicios."],
 ["Aún no tienes clientes registrados","Aún no tienes clientes registrados"],
];
for(const [a,b] of literalReplacements){if(a!==b)html=html.replaceAll(a,b);}
// Actualizar afirmaciones públicas del antiguo piloto sin inventar funciones.
html=html.replaceAll('El piloto usa exclusivamente saldos simulados sin valor monetario ni derecho al retiro.',
 'Las billeteras almacenan saldo interno para pagar servicios de CLAN CARTAN; las recargas por QR requieren verificación y acreditación por ADMIN. No hay retiros ni pagos de préstamos de terceros.');
html=html.replaceAll('No se habilitarán recargas con dinero real, transferencias monetarias ni retiros sin determinar previamente su viabilidad contractual, tributaria y regulatoria.',
 'Las recargas verificadas pueden destinarse al pago de servicios internos; el operador está sujeto a las obligaciones legales y contractuales correspondientes.');
html=html.replaceAll('Los precios indicados son reglas del piloto y deben actualizarse según condiciones publicadas.',
 'Los precios y condiciones aplicables se mostrarán antes de contratar cada servicio.');
// Duplicados de los módulos dinámicos generaban pantallas y controladores repetidos.
// Conservar la última referencia (la de versión más reciente).
const unique=new Set(['v119-clients.js','v136-manual-recharges.js','v146-personal-manual-topups.js','v148-manual-whatsapp.js','v150-dni-admin.js','v151-portal-polish.js']);
const best=new Map();
const scriptMatcher=new RegExp('<script src="scripts/(v[0-9]+-[a-z0-9-]+[.]js)[?]v=([0-9]+)"></script>[ ]*','g');
for(const [,name,version] of html.matchAll(scriptMatcher)){
 if(unique.has(name))best.set(name,Math.max(best.get(name)||0,Number(version)));
}
const seen=new Set();
html=html.replace(scriptMatcher,(tag,name,version)=>{
 if(!unique.has(name))return tag;
 if(Number(version)!==best.get(name)||seen.has(name))return '';
 seen.add(name);return tag;
});
// Inyectar antes del CIERRE real del documento; nunca dentro de HTML de cronogramas.
const newTag='<script src="scripts/v151-portal-polish.js?v=151"></script>';
html=html.replaceAll(newTag,'');
const closing=html.lastIndexOf('</body>');
if(closing<0||closing<html.length-500)throw Error('Cierre real de documento no encontrado');
html=html.slice(0,closing)+newTag+String.fromCharCode(10)+html.slice(closing);
html=html.replace(/name="cc-deploy-version" content="V[0-9]+-[0-9]+"/,'name="cc-deploy-version" content="V151-20261020"');
html=html.replace('scripts/v119-clients.js?v=150','scripts/v119-clients.js?v=151');
if(!html.includes('const verified=await window.cc119ReconcileSavedClient'))throw Error('Corrección de nombre no integrada');
for(const script of unique){const matches=html.match(new RegExp('<script src="scripts/'+script.replaceAll('.','\\.')+'\\?v=[^"]+"><\\/script>','g'))||[];if(matches.length!==1)throw Error('Cargador duplicado o ausente: '+script+' ('+matches.length+')');}
fs.writeFileSync(path,html);
console.log('V151: DNI existente verificable, UI comercial real, scripts únicos y dos recargas preservadas.');
