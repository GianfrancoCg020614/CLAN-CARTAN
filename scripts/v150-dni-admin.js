/* CLAN CARTAN V150 · Habilitación ADMIN de consulta automática DNI.
   Única ventana emergente; nunca crea consentimiento por cuenta del titular del DNI. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
function eligible(){return window.CC_V53_SESSION?.jwt&&window.CC_V53_SESSION?.isAdmin===true;}
function close(){const x=$('cc150dniAdminModal');if(x)x.remove();}
function open(){
 if(!eligible())return;
 close();
 const overlay=document.createElement('div');overlay.id='cc150dniAdminModal';
 overlay.style.cssText='position:fixed;inset:0;background:rgba(1,8,20,.82);z-index:100100;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto';
 overlay.setAttribute('role','presentation');
 const dialog=document.createElement('section');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','cc150dniTitle');
 dialog.style.cssText='width:min(100%,530px);background:#0f2033;color:#f2f9ff;border:1px solid #365674;border-radius:18px;padding:22px';
 dialog.innerHTML='<header style="display:flex;justify-content:space-between;align-items:center;gap:12px"><h3 id="cc150dniTitle">Consulta automática de DNI · ADMIN</h3><button type="button" id="cc150dniClose" aria-label="Cerrar">✕</button></header>'+
 '<p>Habilita una sola vez al RESELLER que cuente con sustento documentado para consultar datos de identificación. Después bastará escribir los 8 dígitos. Sin autorización documentada, seguirá el ingreso manual.</p>'+
 '<label style="display:block;margin:12px 0">Correo del RESELLER<input type="email" id="cc150dniEmail" autocomplete="off" placeholder="usuario@correo.com" style="width:100%"></label>'+
 '<label style="display:block;margin:12px 0">Sustento legal registrado<select id="cc150dniBasis" style="width:100%"><option value="CONSENT_DOCUMENTED">Consentimiento documentado del titular</option><option value="LEGAL_EXCEPTION_DOCUMENTED">Otra base legal documentada y evaluada</option></select></label>'+
 '<label style="display:block;margin:12px 0">Referencia de la evidencia<input id="cc150dniEvidence" maxlength="250" placeholder="Referencia interna verificable (mínimo 12 caracteres)" style="width:100%"></label>'+
 '<label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="cc150dniEnable" checked style="width:auto"> Habilitar consulta automática para este RESELLER</label>'+
 '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button type="button" id="cc150dniSave">Guardar configuración</button><button type="button" id="cc150dniCancel">Cancelar</button></div>'+
 '<p id="cc150dniFeedback" role="status" aria-live="polite"></p>';
 overlay.appendChild(dialog);document.body.appendChild(overlay);
 $('cc150dniClose').onclick=close;$('cc150dniCancel').onclick=close;
 overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
 $('cc150dniSave').onclick=async()=>{
  const email=$('cc150dniEmail').value.trim(),basis=$('cc150dniBasis').value,
        evidence=$('cc150dniEvidence').value.trim(),enable=$('cc150dniEnable').checked;
  const feedback=$('cc150dniFeedback');
  if(!email.includes('@')||evidence.length<12){feedback.textContent='Indica el correo y la referencia comprobable del sustento (mínimo 12 caracteres).';return;}
  if(!window.confirm((enable?'Habilitar':'Deshabilitar')+' las consultas automáticas de DNI para '+email+'? Debe existir una base legal y evidencia verificable.'))return;
  const btn=$('cc150dniSave');btn.disabled=true;feedback.textContent='Guardando configuración…';
  try{
   const result=await window.cc80.api('rpc/cc_admin_configure_dni_automation','POST',{
    p_operator_email:email,p_legal_basis:basis,p_evidence_reference:evidence,p_enable:enable
   });
   feedback.textContent=result===enable?'Configuración guardada. La consulta automática se verificará en el servidor para esta cuenta.':'Configuración recibida; revisa el estado en ADMIN.';
  }catch(e){feedback.textContent='No se guardó: '+String(e.message||e);}
  finally{btn.disabled=false;}
 };
}
function mount(){
 if(!eligible())return;
 const admin=$('cc143bonus')||$('cc136admin');
 if(!admin||$('cc150dniConfig'))return;
 const button=document.createElement('button');button.id='cc150dniConfig';button.type='button';button.textContent='⚙ Consulta automática DNI';button.title='Habilitación de API Perú por operador';
 admin.appendChild(button);button.onclick=open;
}
function init(){
 mount();
 const host=$('cc80wallet')||document.body;
 const observer=new MutationObserver(()=>{if(eligible()&&!$('cc150dniConfig'))mount();});
 observer.observe(host,{childList:true,subtree:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();