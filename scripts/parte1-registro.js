/* CLAN CARTAN · Parte 1/7 · Validador compartido para registro.
 * No utiliza red, cookies, almacenamiento ni realiza operaciones financieras.
 * Los consentimientos se guardan solo mediante el flujo Auth existente del servidor.
 */
(function(root){
'use strict';
const POLICY=Object.freeze({
 termsVersion:'V161-20261021',
 privacyVersion:'V161-20261021',
 dataProcessingVersion:'V164-20261023'
});
const trim=value=>String(value??'').trim();
const allowed=new Set(['STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER']);
function legalAccepted(terms,privacy){return terms===true&&privacy===true;}
function validate(data){
 const d=data||{},email=trim(d.email).toLowerCase(),password=String(d.password??'');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)||email.length>254)
  return {ok:false,code:'EMAIL',message:'Escribe un correo electrónico válido.'};
 if(password.length<12||password.length>128)
  return {ok:false,code:'PASSWORD',message:'La contraseña debe tener entre 12 y 128 caracteres.'};
 if(password!==String(d.confirmPassword??''))
  return {ok:false,code:'CONFIRM',message:'Las contraseñas no coinciden.'};
 const fullName=trim(d.fullName).replace(/\s+/g,' ');
 if(fullName.length<5||fullName.length>180||!fullName.includes(' '))
  return {ok:false,code:'NAME',message:'Escribe tus nombres y apellidos completos.'};
 const documentNumber=trim(d.documentNumber);
 if(documentNumber.length<4||documentNumber.length>30)
  return {ok:false,code:'DOCUMENT',message:'Verifica el número de documento.'};
 const dial=trim(d.dial),phone=trim(d.phone).replace(/\D/g,'');
 if(!/^\+[0-9]{1,4}$/.test(dial)||phone.length<6||phone.length>15)
  return {ok:false,code:'PHONE',message:'Verifica el prefijo internacional y el número de celular.'};
 if(!trim(d.region)||!trim(d.province)||!trim(d.district))
  return {ok:false,code:'LOCATION',message:'Completa los datos de tu ubicación.'};
 if(!legalAccepted(d.termsAccepted,d.privacyAccepted))
  return {ok:false,code:'LEGAL',message:'Revisa los Términos y la Política de privacidad para continuar.'};
 if(d.preferredService!==undefined&&!allowed.has(String(d.preferredService)))
  return {ok:false,code:'SERVICE',message:'Selecciona uno de los cuatro negocios.'};
 return {ok:true,code:'OK',message:'Datos válidos para continuar con el registro.'};
}
function declaration(input){
 const d=input||{};
 if(!legalAccepted(d.termsAccepted,d.privacyAccepted))return null;
 return Object.freeze({
   legal_accepted:true,
   terms_version:POLICY.termsVersion,
   privacy_version:POLICY.privacyVersion,
   data_processing_accepted:true,
   data_processing_version:POLICY.dataProcessingVersion,
   marketing_consent:d.marketingAccepted===true
 });
}
root.CC_PART1_REGISTRATION=Object.freeze({POLICY,validate,legalAccepted,declaration,services:Object.freeze([...allowed])});
})(window);
