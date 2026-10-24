/* CLAN CARTAN: reglas puras de niveles comerciales.
 * La concesión de roles y confirmación de pagos ocurren exclusivamente en backend.
 */
export const RESELLER_ANUAL_PEN_CENTIMOS = 2500;
export const RESELLER_DURACION_MESES = 12;
export const ROLES = Object.freeze({AFILIADO:'AFFILIATE',RESELLER:'RESELLER',SUPER_RESELLER:'SUPER_RESELLER'});
export function vencimientoReseller(fechaActivacion) {
 const fecha = new Date(fechaActivacion);
 if(!Number.isFinite(fecha.getTime())) throw new Error('Fecha de activación inválida');
 const year=fecha.getUTCFullYear(),month=fecha.getUTCMonth(),day=fecha.getUTCDate();
 const first=new Date(Date.UTC(year,month+RESELLER_DURACION_MESES,1,fecha.getUTCHours(),fecha.getUTCMinutes(),fecha.getUTCSeconds(),fecha.getUTCMilliseconds()));
 const maxDay=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 first.setUTCDate(Math.min(day,maxDay));
 return first.toISOString();
}
export function evaluarActivacionReseller({importeCentimos,estadoPago,referenciaPago,yaProcesada=false,fechaActivacion}) {
 if(estadoPago!=='VERIFIED'||!referenciaPago||yaProcesada===true)
  return {aprobado:false,motivo:'Pago REAL no verificado, sin referencia o ya procesado'};
 if(!Number.isSafeInteger(importeCentimos)||importeCentimos!==RESELLER_ANUAL_PEN_CENTIMOS)
  return {aprobado:false,motivo:'La activación anual requiere S/ 25.00 verificados'};
 return {aprobado:true,rol:ROLES.RESELLER,precioAplicable:ROLES.AFILIADO,
         iniciaEn:new Date(fechaActivacion).toISOString(),venceEn:vencimientoReseller(fechaActivacion)};
}
export function puedeAprobarSuperReseller({actorAdminVerificado,aprobacionExpresa}) {
 return actorAdminVerificado===true&&aprobacionExpresa===true;
}
