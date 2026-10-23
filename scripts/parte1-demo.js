/* Parte 1/7: demostración totalmente local y sin acceso a backend. */
(function(){
'use strict';
const by=id=>document.getElementById(id);
const rules=window.CC_PART1_REGISTRATION;
const form=by('p1-form'),submit=by('p1-submit'),status=by('p1-status');
const terms=by('p1-terms'),privacy=by('p1-privacy'),marketing=by('p1-marketing');
const service=by('p1-service'),choice=by('p1-service-description');
const descriptions=Object.freeze({
 STREAM_BULLS:'STREAM BULL’S · Catálogo de servicios digitales y afiliaciones.',
 COBRA_YA:'COBRA YA · Administración de cobranzas, cuotas y préstamos.',
 MI_COCHERA:'MI COCHERA · Control de cocheras, espacios y operaciones.',
 MI_ALQUILER:'MI ALQUILER · Propiedades, inquilinos, contratos y cobros.'
});
function update(){
 submit.disabled=!rules.legalAccepted(terms.checked,privacy.checked);
 submit.setAttribute('aria-disabled',String(submit.disabled));
 by('p1-marketing-status').textContent=marketing.checked?'Publicidad: autorizada solo en esta demostración.':'Publicidad: no autorizada. El registro sigue disponible.';
 choice.textContent=descriptions[service.value]||'Selecciona un negocio.';
}
for(const e of [terms,privacy,marketing,service])e.addEventListener('change',update);
form.addEventListener('submit',e=>{
 e.preventDefault();
 if(submit.disabled){return;}
 const outcome=rules.validate({
  email:by('p1-email').value,password:by('p1-pass').value,confirmPassword:by('p1-confirm').value,
  fullName:by('p1-name').value,documentNumber:by('p1-document').value,
  dial:by('p1-dial').value,phone:by('p1-phone').value,
  region:by('p1-region').value,province:by('p1-province').value,district:by('p1-district').value,
  termsAccepted:terms.checked,privacyAccepted:privacy.checked,marketingAccepted:marketing.checked,
  preferredService:service.value
 });
 status.textContent=outcome.ok?
 '✓ Formulario validado. Esta es una SIMULACIÓN LOCAL: no se creó ninguna cuenta ni se enviaron datos a Supabase.':
 'Revisa el formulario: '+outcome.message;
 status.dataset.state=outcome.ok?'ok':'error';
 if(outcome.ok){by('p1-pass').value='';by('p1-confirm').value='';}
});
update();
})();
