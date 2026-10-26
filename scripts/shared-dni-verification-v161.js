/* CLAN CARTAN — módulo DNI para COBRA YA / MI COCHERA / MI ALQUILER.
   Interfaz segura: requiere sesión, consulta en servidor, no almacena DNI localmente.
   El servicio backend autoriza consulta y cupo. No expone APIPERU_TOKEN.
*/
(function(){
'use strict';
const PROJECT='https://pqalxtrcyrpmwqdlibqd.supabase.co';
const ENDPOINTS=Object.freeze({COBRA_YA:'cc-consulta-dni',MI_COCHERA:'mc-verify-dni',MI_ALQUILER:'ma-verify-dni'});
const REASONS=Object.freeze({
 operator_not_approved:'Consulta automática no autorizada todavía. Contacte a ADMIN o complete los datos manualmente.',
 subscription_inactive:'La suscripción de Mi Cochera está inactiva. Complete los datos manualmente.',
 quota_exhausted:'Cupo mensual agotado. Complete los datos manualmente.',
 monthly_limit:'Cupo mensual agotado. Complete los datos manualmente.',
 daily_limit:'Límite diario alcanzado. Complete los datos manualmente.',
 provider_not_configured:'Servicio de consulta sin configurar. Complete los datos manualmente.',
 provider_unavailable:'Proveedor no disponible. Complete los datos manualmente.',
 authorization_unavailable:'Autorización no disponible. Complete los datos manualmente.',
 quota_unavailable:'Control de cupos no disponible. Complete los datos manualmente.',
 not_found:'No se encontró el DNI. Revise el número o complete los datos manualmente.',
 save_unavailable:'Se obtuvo una respuesta, pero no pudo guardarse. No se confirma verificación.',
 invalid_dni:'Ingrese los ocho dígitos del DNI.'
});
const validDni=x=>/^\d{8}$/.test(String(x||''));
async function verify({service,dni,accessToken,anonKey}={}){
 if(!ENDPOINTS[service])return {status:'manual',message:'Módulo desconocido.'};
 if(!validDni(dni))return {status:'manual',message:REASONS.invalid_dni};
 if(!accessToken||!anonKey)return {status:'manual',message:'Inicie sesión para consultar.'};
 try{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),13000);
  let response;
  try{response=await fetch(PROJECT+'/functions/v1/'+ENDPOINTS[service],{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+accessToken,apikey:anonKey},
   body:JSON.stringify({dni}),signal:controller.signal
  });}finally{clearTimeout(timer);}
  const data=await response.json().catch(()=>({}));
  if(response.ok&&(data.status==='found'||data.status==='saved')&&typeof data.full_name==='string'&&data.full_name.trim()){
   return {status:'found',full_name:data.full_name.trim(),remaining:data.remaining??null};
  }
  return {status:'manual',message:REASONS[data.reason]||REASONS[data.status]||'No se pudo verificar. Complete los datos manualmente.',reason:data.reason||data.status||'unknown'};
 }catch(_){return {status:'manual',message:'No se pudo conectar. Complete los datos manualmente.'};}
}
function mount({root,service,getSession}={}){
 if(!root||!ENDPOINTS[service]||typeof getSession!=='function')return false;
 const input=root.querySelector('[data-cc-dni]');
 const btn=root.querySelector('[data-cc-verify-dni]');
 const name=root.querySelector('[data-cc-full-name]');
 const message=root.querySelector('[data-cc-dni-status]');
 if(!input||!btn||!name||!message)return false;
 btn.addEventListener('click',async()=>{
  btn.disabled=true;message.textContent='Verificando DNI…';
  try{
   const credentials=await getSession();
   const result=await verify({service,dni:input.value,accessToken:credentials?.accessToken,anonKey:credentials?.anonKey});
   if(result.status==='found'){name.value=result.full_name;name.dispatchEvent(new Event('input',{bubbles:true}));message.textContent='Identidad consultada. Verifique los datos antes de guardar.';}
   else message.textContent=result.message;
  }finally{btn.disabled=false;}
 });
 return true;
}
window.ClanCartanDNI=Object.freeze({verify,mount,validDni});
})();