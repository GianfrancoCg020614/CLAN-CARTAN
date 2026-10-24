/* CLAN CARTAN | Parte 4: reglas puras para recompensa de referido.
 * No transfiere dinero. El servidor debe verificar el pago/activación y
 * ejecutar un asiento atómico e idempotente en la billetera REAL.
 */
export const REFERIDO_BONO_CENTIMOS = 500;
export const SERVICIOS_ACTIVACION = Object.freeze(['STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER']);
const servicios=new Set(SERVICIOS_ACTIVACION);
export function mesLima(instante) {
 const date=new Date(instante);
 if(!Number.isFinite(date.getTime()))throw new Error('Fecha de activación inválida');
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit'}).formatToParts(date);
 return parts.find(p=>p.type==='year').value+'-'+parts.find(p=>p.type==='month').value;
}
export function evaluarBonoReferido({
 invitadorId,referidoId,servicio,fechaActivacion,
 activacionConfirmada,pagoRealVerificado,pagadoConBono=false,
 yaRecompensadoEnMes=false
}={}){
 if(!invitadorId||!referidoId||invitadorId===referidoId) return {aprobado:false,motivo:'Invitación inválida'};
 if(!servicios.has(servicio))return {aprobado:false,motivo:'Servicio inválido'};
 if(activacionConfirmada!==true||pagoRealVerificado!==true||pagadoConBono===true)
   return {aprobado:false,motivo:'Activación sin pago REAL verificado'};
 if(yaRecompensadoEnMes===true)return {aprobado:false,motivo:'Referido ya recompensado este mes'};
 const mes=mesLima(fechaActivacion);
 return Object.freeze({aprobado:true,mes,importeCentimos:REFERIDO_BONO_CENTIMOS,
  claveUnica:'referido:'+invitadorId+':'+referidoId+':'+mes,
  requiereAprobacionAdmin:false});
}
