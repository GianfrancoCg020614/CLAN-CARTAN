// Consultas de identidad simuladas: no contacta API Perú ni guarda registros.
import fs from 'node:fs';import {businessDialogFixture} from './fixture-v311-business-dialogs.mjs';
export function dniFixture(kind='cochera'){
 let html=businessDialogFixture(kind);html=html.slice(0,html.lastIndexOf('<script>'));
 if(kind==='alquiler')html+='<script>'+fs.readFileSync('scripts/v161-4-mi-alquiler.js','utf8')+'</script>';
 const setup=`Object.assign(window.CC_V53_SESSION,{root:'https://fixture.invalid',key:'FIXTURE-ONLY-PUBLIC-KEY'});window.__lookups=[];window.__internal=[];
 const originalAPI=cc80.api;cc80.api=(p,m,b)=>{if(p.includes('document_number=eq.'))return new Promise(resolve=>__internal.push({resolve,p}));return originalAPI(p,m,b)};
 window.fetch=(url,options)=>new Promise(resolve=>__lookups.push({resolve,url,options}));`;
 const probe=`(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(200);const q=s=>document.querySelector(s),checks={};const mc=${JSON.stringify(kind)}==='cochera';
 const openForm=async()=>{if(mc){await window.mc158Open();q('[data-action="new"]').click();}else{window.ma1611MiAlquiler.open();await wait(100);q('[data-area="inquilinos"]').click();q('[data-ma-action="new-tenant"]').click();}await wait(20);};
 const get=()=>{const form=q(mc?'#mc158new':'form[data-ma-form="tenant"]');return {form,doc:form.elements.namedItem(mc?'ownerDoc':'document'),kind:form.elements.namedItem(mc?'ownerKind':'kind'),name:form.elements.namedItem(mc?'ownerName':'name'),button:form.querySelector(mc?'[data-mc-verify="owner"]':'[data-ma4-dni]'),info:form.querySelector(mc?'#mc158lookupowner':'#ma4-dni-status')};};
 const start=async(fields,dni)=>{fields.doc.value=dni;fields.kind.value='DNI';fields.button.click();if(mc){await wait(10);const pending=__internal.at(-1);pending?.resolve([]);}await wait(20);};
 const reply=async(name)=>{const pending=__lookups.at(-1);pending?.resolve({ok:true,json:async()=>({status:'found',full_name:name})});await wait(30);};
 try{
 await openForm();let f=get();f.doc.value='123';f.button.click();await wait(20);checks.invalidExplained=f.info.textContent.includes('exactamente 8 dígitos')&&__lookups.length===0&&__internal.length===0;
 f.kind.value='CE';f.doc.value='11111111';f.button.click();await wait(20);checks.manualDocument=__lookups.length===0&&__internal.length===0;
 if(mc){f.kind.value='DNI';f.button.click();f.button.dispatchEvent(new Event('click',{bubbles:true}));await wait(10);checks.internalSingleRequest=__internal.length===1;__internal.at(-1)?.resolve([{full_name:'Nombre interno ficticio',verification_source:'API_PERU'}]);await wait(30);checks.internalResult=f.name.value==='Nombre interno ficticio'&&__lookups.length===0;}
 else{await start(f,'11111111');f.button.dispatchEvent(new Event('click',{bubbles:true}));checks.singleRequest=__lookups.length===1;await reply('Nombre ficticio verificado');checks.validResult=f.name.value==='Nombre ficticio verificado';}
 const prior=__lookups.length;await start(f,'22222222');checks.externalConnected=__lookups.length===prior+1;f.button.dispatchEvent(new Event('click',{bubbles:true}));checks.noDuplicateExternal=__lookups.length===prior+1;
 f.name.value='Edición del usuario';f.doc.value='33333333';await reply('Respuesta de documento anterior');checks.documentRace=f.name.value==='Edición del usuario';
 await start(f,'44444444');f.kind.value='CE';await reply('Respuesta con tipo anterior');checks.typeRace=f.name.value==='Edición del usuario';
 await start(f,'55555555');f.name.value='Nombre corregido manualmente';await reply('Nombre de proveedor');checks.manualNamePreserved=f.name.value==='Nombre corregido manualmente'&&f.info.textContent.includes('conserva');
 await start(f,'66666666');Object.assign(CC_V53_SESSION,{userId:'other-user',jwt:'OTHER-ONLY-JWT'});await reply('Respuesta de sesión anterior');checks.sessionRace=f.name.value==='Nombre corregido manualmente';Object.assign(CC_V53_SESSION,{userId:'fixture-user',jwt:'FIXTURE-ONLY-JWT'});
 await start(f,'77777777');document.getElementById(mc?'mc158dialog':'ma1612dialog').remove();await openForm();f=get();await reply('Respuesta de formulario cerrado');checks.closedFormRace=f.name.value==='';
 if(mc){const worker=f.form.elements.namedItem('workerDoc');worker.value='88888888';f.form.querySelector('[data-mc-verify=\"worker\"]').click();await wait(10);__internal.at(-1)?.resolve([{full_name:'Trabajador ficticio',verification_source:'API_PERU'}]);await wait(30);checks.workerField=f.form.elements.namedItem('workerName').value==='Trabajador ficticio'&&f.name.value==='';}
 checks.noRealNetwork=__lookups.every(x=>x.url.startsWith('https://fixture.invalid/functions/v1/'));checks.noWrites=__writes.length===0;checks.noErrors=__errors.length===0;
 }catch(e){checks.error=String(e.stack||e)}
 const out=document.createElement('output');out.id='cc313-result';out.dataset.status=Object.values(checks).every(x=>x===true)?'pass':'fail';out.textContent=JSON.stringify(checks);document.body.append(out);
})();`;
 return html+'<script>'+setup+'</script><script>'+probe+'</script></body></html>';
}
