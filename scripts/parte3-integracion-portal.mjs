/** Integración progresiva con la autenticación EXISTENTE del portal CLAN CARTAN.
 * No duplica el registro ni modifica saldos. No crea sesiones por su cuenta.
 */
export function estadoSesionPortal(sesion) {
  if (!sesion || typeof sesion !== 'object' || !sesion.userId || !sesion.jwt) {
    return {autenticado:false,motivo:'Inicia sesión en el portal original para consultar tu billetera REAL.'};
  }
  return {autenticado:true,userId:sesion.userId};
}
export function avisoBilleteraPendiente(mount) {
  if (!mount) return;
  mount.textContent='La consulta de la billetera REAL aún no está disponible en este entorno. No se muestran saldos ficticios.';
}
