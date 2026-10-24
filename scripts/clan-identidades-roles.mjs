/* CLAN CARTAN - alias de cuentas, NO autorizaciones.
 * Nunca usar alias ni correo como fuente de permisos.
 * Los roles efectivos se conceden desde la identidad Auth verificada,
 * con decisión explícita de ADMIN y registro de auditoría del servidor.
 */
export const CUENTAS = Object.freeze({
 CLAN1: Object.freeze({proposito:'ADMIN',entorno:'PRODUCTION'}),
 CLAN2: Object.freeze({proposito:'SUPER_RESELLER_PENDIENTE_APROBACION_ADMIN',entorno:'PRODUCTION'}),
 CLAN3: Object.freeze({proposito:'PRUEBAS',entorno:'STAGING'})
});
export function puedeConcederSuperReseller({actorEsAdminVerificado,aprobacionExpresa,destinoConfirmado,entorno}) {
 return actorEsAdminVerificado===true &&
   aprobacionExpresa===true &&
   destinoConfirmado===true &&
   entorno==='PRODUCTION';
}
