/* V161: preferencia publicitaria separada; el usuario puede revocarla cuando quiera.
   La falta de autorización NO impide iniciar sesión ni usar los tres módulos. */
(function(){
'use strict';
async function mount(){
 const session=window.CC_V53_SESSION;
 const root=document.getElementById('cc79logged');
 if(!root||!session?.jwt)return;
 const uid=session.userId;
 const before=document.getElementById('cc161-marketing-account');
 if(before)before.remove();
 const card=document.createElement('section');card.id='cc161-marketing-account';card.className='cc116-code-panel';
 card.style.cssText='margin-top:14px;padding:15px;border-radius:15px;border:1px solid #406b7d;background:#0b2130;color:#f0f6fc;';
 const title=document.createElement('strong');title.textContent='Comunicaciones publicitarias';
 const row=document.createElement('label');row.style.cssText='display:flex;align-items:flex-start;gap:10px;margin-top:10px;font-size:13px;';
 const input=document.createElement('input');input.type='checkbox';input.style.cssText='width:18px;height:18px;flex-shrink:0;';
 const text=document.createElement('span');text.textContent='Autorizo comunicaciones publicitarias de CLAN CARTAN por correo y WhatsApp.';
 const status=document.createElement('small');status.style.cssText='display:block;opacity:.75;margin-top:8px;';status.setAttribute('role','status');status.textContent='Consultando tu preferencia…';
 row.append(input,text);card.append(title,row,status);root.append(card);
 input.disabled=true;
 try{
   const response=await window.cc80.api('cc_marketing_consents?select=authorized&user_id=eq.'+encodeURIComponent(uid));
   if(window.CC_V53_SESSION?.userId!==uid||!card.isConnected)return;
   input.checked=Boolean(response?.[0]?.authorized);status.textContent=input.checked?'Autorización activa. Puedes desactivarla.':'No has autorizado comunicaciones publicitarias.';
   input.disabled=false;
 }catch(e){status.textContent='No pudimos consultar tu preferencia. Actualiza la página para intentar nuevamente.';return;}
 input.addEventListener('change',async()=>{
   if(window.CC_V53_SESSION?.userId!==uid){input.disabled=true;return;}
   const next=input.checked;input.disabled=true;status.textContent='Guardando tu preferencia…';
   try{
    await window.cc80.api('rpc/cc_set_my_marketing_consent','POST',{p_authorized:next});
    status.textContent=next?'Autorización publicitaria guardada.':'Autorización publicitaria revocada.';
   }catch(e){input.checked=!next;status.textContent='No se guardó el cambio: '+String(e.message||e);}
   finally{input.disabled=false;}
 });
}
window.cc161MountMarketingConsent=mount;
})();
