/* CLAN CARTAN — Códigos de registro CLAN y roles comerciales independientes.
 * CLAN1, CLAN2, ... identifican registros, NO autorizan roles ni entornos.
 * La asignación es del servidor, basada en Auth y registro persistente.
 */
export function esCodigoRegistroClan(codigo) {
 return typeof codigo === 'string' && /^CLAN[1-9][0-9]{0,14}$/.test(codigo);
}
export function mostrarIdentidadClan({codigo,rol}) {
 if(!esCodigoRegistroClan(codigo)) throw new Error('Código CLAN inválido');
 const roles=new Set(['ADMIN','AFILIADO','RESELLER','SUPER_RESELLER']);
 if(!roles.has(rol))throw new Error('Rol comercial inválido');
 return Object.freeze({codigoRegistro:codigo,rolComercial:rol});
}
export function puedeConcederSuperReseller({actorEsAdminVerificado,aprobacionExpresa,destinoConfirmado,entorno}) {
 return actorEsAdminVerificado===true &&
   aprobacionExpresa===true &&
   destinoConfirmado===true &&
   entorno==='PRODUCTION';
}
