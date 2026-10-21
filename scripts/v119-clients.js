/* CLAN CARTAN V119 · Alta con DNI primero y corrección verificable de clientes COBRA YA.
   Consulta DNI para membresías activas con autorización automática del backend. Actualiza solo el nombre verificado; conserva los otros campos. */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
function getSession(){return window.CC_V53_SESSION;}
function canManage(){const s=getSession();return !!(s?.jwt && (s.isReseller||s.isAdmin));}
function openNew(){
 if(!canManage()){window.alert('Primero activa tu acceso a COBRA YA para registrar clientes.');return;}
 const layer=byId('cc119newClientModal');if(!layer)return;
 layer.hidden=false;
 const dni=byId('cy105dni');
 if(dni)setTimeout(()=>dni.focus({preventScroll:true}),50);
}
function closeNew(){const modal=byId('cc119newClientModal');if(modal)modal.hidden=true;}
window.cc119OpenNewClient=openNew;
window.cc119CloseNewClient=closeNew;
const escapeHtml=text=>String(text??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function consentMessage(reason){
 if(['monthly_limit','quota_exhausted','plan_exhausted'].includes(reason))return 'El cupo de consultas de DNI está agotado. Corrige el nombre manualmente o vuelve a verificar cuando haya cupo.';
 if(reason==='daily_limit')return 'Alcanzaste el límite diario de consultas. Puedes corregir manualmente y verificar otro día.';
 if(reason==='not_authorized'||reason==='operator_not_approved')return 'Tu membresía no está activa para esta consulta. Puedes ingresar los datos manualmente.';
 if(reason==='provider_not_configured')return 'El proveedor de consultas aún no está disponible. Puedes corregir manualmente.';
 if(reason==='not_found')return 'No se encontró ese DNI. Verifica que esté bien escrito.';
 return 'La consulta DNI no está disponible en este momento. El registro manual sigue funcionando.';
}
async function queryVerifiedName(dni){
 const ses=getSession();if(!ses?.jwt)throw Error('La sesión terminó. Vuelve a ingresar.');
 const response=await fetch(ses.root+'/functions/v1/cc-consulta-dni',{
  method:'POST',headers:{apikey:ses.key,Authorization:'Bearer '+ses.jwt,'Content-Type':'application/json'},
  body:JSON.stringify({dni})
 });
 const payload=await response.json().catch(()=>({status:'manual',reason:'provider_unavailable'}));
 if(!response.ok && payload.status==='unauthorized')throw Error('La sesión expiró. Vuelve a iniciar sesión.');
 return payload;
}
// V151: si un DNI ya se guardó manualmente con nombre equivocado, conciliar
// automáticamente SOLO el nombre, sin tocar teléfono, correo, préstamos ni demás datos.
window.cc119ReconcileSavedClient=async function(clientId,dni){
 const ses=getSession();
 if(!ses?.jwt||!ses.userId||!/^[0-9]{8}$/.test(dni)||!clientId)return {status:'manual'};
 try{
  const verified=await queryVerifiedName(dni);
  if(verified.status!=='found'||!verified.full_name)return verified;
  const official=String(verified.full_name).trim().replace(/\\s+/g,' ').slice(0,160);
  const url=ses.root+'/rest/v1/cy_clients?id=eq.'+encodeURIComponent(clientId)+
    '&owner_id=eq.'+encodeURIComponent(ses.userId)+
    '&document_number=eq.'+encodeURIComponent(dni)+
    '&select=id,full_name';
  const before=await fetch(url,{headers:{apikey:ses.key,Authorization:'Bearer '+ses.jwt}});
  if(!before.ok)return {status:'manual',reason:'lookup_failed'};
  const rows=await before.json().catch(()=>[]);
  if(!Array.isArray(rows)||rows.length!==1)return {status:'manual',reason:'client_not_found'};
  if(official.localeCompare(String(rows[0].full_name||'').trim(),'es',{sensitivity:'base'})===0)
   return {status:'found',full_name:official,corrected:false};
  const response=await fetch(url,{method:'PATCH',headers:{
   apikey:ses.key,Authorization:'Bearer '+ses.jwt,'Content-Type':'application/json',Prefer:'return=representation'
  },body:JSON.stringify({full_name:official})});
  const updated=await response.json().catch(()=>[]);
  if(!response.ok||!Array.isArray(updated)||updated.length!==1)
   return {status:'manual',reason:'update_failed'};
  return {status:'found',full_name:official,corrected:true};
 }catch(_){return {status:'manual',reason:'provider_unavailable'};}
};

async function updateClient(id,original,changes){
 const ses=getSession();if(!ses?.jwt||ses.userId!==original.owner_id)throw Error('No tienes permiso para modificar los datos de este cliente.');
 const res=await fetch(ses.root+'/rest/v1/cy_clients?id=eq.'+encodeURIComponent(id)+'&owner_id=eq.'+encodeURIComponent(ses.userId),{
  method:'PATCH',headers:{apikey:ses.key,Authorization:'Bearer '+ses.jwt,'Content-Type':'application/json',Prefer:'return=representation'},
  body:JSON.stringify(changes)
 });
 const result=await res.json().catch(()=>null);
 if(!res.ok)throw Error(result?.message||result?.error||'No se pudo guardar.');
 if(!Array.isArray(result)||result.length!==1)throw Error('No se confirmó la actualización. Verifica tus permisos.');
}
function closeEdit(){
 const overlay=byId('cc119editModal');if(overlay)overlay.remove();
}
window.cc119CloseEditClient=closeEdit;
window.cc119EditClient=function(client,refresh,notice){
 const ses=getSession();
 if(!ses?.jwt||ses.userId!==client.owner_id){window.alert('Solo puedes editar clientes de tu propia cartera.');return;}
 closeEdit();
 const overlay=document.createElement('div');
 overlay.id='cc119editModal';overlay.className='cc119-overlay cc119-edit-overlay';
 overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','cc119editTitle');
 overlay.innerHTML='<section class="cc119-edit-panel">'+
  '<div class="cc119-new-heading"><span class="cc119-cobra-logo" role="img" aria-label="Logo COBRA YA"></span><div><small>COBRA YA · CORRECCIÓN DE CLIENTE</small><h3 id="cc119editTitle">Corregir datos del cliente</h3></div><button type="button" class="cc119-close" id="cc119editClose" aria-label="Cerrar" title="Cerrar">✕</button></div>'+
  '<form id="cc119editForm" class="cc119-edit-form">'+
  '<label>DNI / documento<input name="doc" maxlength="20" autocomplete="off" inputmode="numeric"></label>'+
  '<label>Nombres y apellidos<input name="name" required minlength="2" maxlength="160" autocomplete="off"></label><label>Alias / apodo (opcional)<input name="alias" maxlength="80" autocomplete="off" placeholder="Ej. Don Pepe"></label>'+
  '<label>WhatsApp<input name="phone" type="tel" maxlength="25" autocomplete="off"></label>'+
  '<label>Correo electrónico<input name="email" type="email" maxlength="254" autocomplete="off"></label>'+
  '<label>Dirección (opcional)<input name="address" maxlength="300" autocomplete="street-address"></label>'+
  '<label>Distrito / ciudad (opcional)<input name="district" maxlength="120"></label>'+
  '<label>Referencia (opcional)<input name="address_reference" maxlength="300"></label>'+
  '<label>Observaciones (opcional)<textarea name="notes" maxlength="500" rows="2"></textarea></label>'+
  '<small>Consulta disponible para membresías activas; si el proveedor no responde, puedes continuar manualmente.</small>'+
  '<button type="button" id="cc119checkDni" class="cc119-verify">Verificar DNI ahora</button>'+
  '<div id="cc119compare" class="cc119-compare" hidden><small>Resultado de la consulta DNI</small><div><span>Nombre registrado:</span><strong id="cc119original"></strong></div><div><span>Nombre encontrado:</span><strong id="cc119official"></strong></div></div>'+
  '<p id="cc119editStatus" role="status" aria-live="polite"></p>'+
  '<div class="cc119-edit-actions"><button type="button" class="cc119-secondary" id="cc119editCancel">Cancelar</button><button class="cc119-primary" id="cc119editSave" type="submit">Guardar corrección</button></div>'+
  '</form></section>';
 document.body.appendChild(overlay);
 const form=byId('cc119editForm'),status=byId('cc119editStatus'),comparison=byId('cc119compare');
 const doc=form.elements.doc,name=form.elements.name,alias=form.elements.alias,phone=form.elements.phone,email=form.elements.email,address=form.elements.address,district=form.elements.district,reference=form.elements.address_reference,notes=form.elements.notes;
 doc.value=client.document_number||'';name.value=client.full_name||'';alias.value=client.alias||'';phone.value=client.phone||'';email.value=client.email||'';address.value=client.address||'';district.value=client.district||'';reference.value=client.address_reference||'';notes.value=client.notes||'';
 function say(text){status.textContent=text;}
 byId('cc119editClose').onclick=closeEdit;byId('cc119editCancel').onclick=closeEdit;
 overlay.addEventListener('click',event=>{if(event.target===overlay)closeEdit();});
 doc.addEventListener('input',()=>{comparison.hidden=true;resultName='';if(!verifying)byId('cc119checkDni').disabled=false;});
 let resultName='',verifying=false;
 byId('cc119checkDni').addEventListener('click',async()=>{
  const dni=doc.value.trim();
  if(!/^[0-9]{8}$/.test(dni)){say('Ingresa los 8 dígitos del DNI peruano para consultar.');return;}
  if(verifying)return;
  verifying=true;
  const button=byId('cc119checkDni');button.disabled=true;comparison.hidden=true;
  say('Consultando DNI con API Perú…');
  try{
   const response=await queryVerifiedName(dni);
   if(!document.body.contains(overlay))return;
   if(doc.value.trim()!==dni){say('El DNI o la autorización cambió durante la consulta. Vuelve a verificar.');return;}
   if(response.status==='found'&&typeof response.full_name==='string'&&response.full_name.trim()){
    resultName=response.full_name.trim().replace(/\s+/g,' ');
    byId('cc119original').textContent=name.value;
    byId('cc119official').textContent=resultName;
    comparison.hidden=false;
    if(resultName.localeCompare(name.value.trim(),'es',{sensitivity:'base'})===0){
     say('✓ Identidad verificada. El nombre coincide.');
     button.disabled=false;
    }else{
     say('Guardando nombre verificado sin modificar contacto ni otros datos…');
     try{
      if(doc.value.trim()!==dni)throw Error('DNI o autorización cambiaron; no se guardó la corrección.');
      await updateClient(client.id,client,{full_name:resultName});
      if(!document.body.contains(overlay))return;
      name.value=resultName;
      client.full_name=resultName;
      await refresh();
      say('✓ Nombre oficial corregido y guardado. Teléfono, correo y demás datos conservados.');
      notice('✓ Nombre actualizado tras verificación autorizada de DNI.');
     }catch(error){say('Se consultó el DNI, pero no pudo guardarse la corrección: '+(error.message||error));}
     button.disabled=false;
    }
   }else{resultName='';say(consentMessage(response.reason||response.status));button.disabled=false;}
  }catch(e){resultName='';say(e.message||'Falló la consulta; puedes corregir manualmente.');}
  finally{verifying=false;if(document.body.contains(overlay))button.disabled=false;}
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const full=name.value.trim().replace(/\s+/g,' ');
  const number=doc.value.trim(),digits=phone.value.replace(/[^0-9]/g,''),mail=email.value.trim().toLowerCase();
  if(full.length<2){say('Revisa nombres y apellidos.');name.focus();return;}
  if(number && number.length>20){say('Documento demasiado largo.');return;}
  if(digits&&(digits.length<8||digits.length>15)){say('WhatsApp debe incluir 8 a 15 dígitos con código de país.');return;}
  if(mail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)){say('Correo no válido.');return;}
  if(number!==String(client.document_number||'').trim()&&!window.confirm('Cambiaste el documento. ¿Confirmas que pertenece a este mismo cliente?'))return;
  const button=byId('cc119editSave');button.disabled=true;say('Guardando corrección…');
  try{
   await updateClient(client.id,client,{full_name:full,alias:alias.value.trim().slice(0,80)||null,document_number:number||null,phone:digits?'+'+digits:null,email:mail||null,
    address:address.value.trim()||null,district:district.value.trim()||null,address_reference:reference.value.trim()||null,notes:notes.value.trim()||null});
   closeEdit();
   await refresh();
   notice('✓ Cliente actualizado. Se conservaron sus préstamos y abonos.');
  }catch(error){say('No fue posible guardar: '+(error.message||error));button.disabled=false;}
 });
 name.focus({preventScroll:true});
};
// V149: mantener un solo formulario emergente y situar la autorización junto al DNI.
function simplifyNewClientDialog(){
 const modal=byId('cc119newClientModal'),dni=byId('cy105dni'),status=byId('cy105dniStatus');
 if(!modal||!dni||!status||modal.dataset.dniSimplified==='yes')return;
 // Sin casillas por cliente: el servidor verifica el permiso ADMIN documentado.
 const repeated=modal.querySelector('.cc119-manual-note');
 if(repeated)repeated.remove();
 const intro=modal.querySelector('.cy105note');
 if(intro)intro.textContent='Ingresa el DNI y pulsa Verificar DNI ahora. Disponible con membresía activa. Sin cupo, continúa manualmente.';
 const label=dni.closest('label');
 if(label&&label.firstChild?.nodeType===Node.TEXT_NODE)label.firstChild.textContent='DNI peruano (8 dígitos) u otro documento:';
 if(!modal.querySelector('#cc119verifyNewDni')){
  const btn=document.createElement('button');btn.type='button';btn.id='cc119verifyNewDni';btn.className='cc119-verify';btn.textContent='Verificar DNI ahora';
  btn.addEventListener('click',()=>{const value=dni.value.trim();if(!/^\d{8}$/.test(value)){status.textContent='Ingresa 8 dígitos de DNI.';return;}dni.dispatchEvent(new Event('input',{bubbles:true}));dni.dispatchEvent(new Event('change',{bubbles:true}));});
  dni.closest('label')?.insertAdjacentElement('afterend',btn);
 }
 modal.dataset.dniSimplified='yes';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',simplifyNewClientDialog);
else simplifyNewClientDialog();

document.addEventListener('keydown',event=>{
 if(event.key!=='Escape')return;
 if(byId('cc119editModal'))closeEdit();
 else if(!byId('cc119newClientModal')?.hidden)closeNew();
});
})();
