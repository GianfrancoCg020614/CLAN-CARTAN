/** CLAN CARTAN - cálculo puro de comisiones. No registra pagos ni acredita saldos. */
export const COMISION_PREDETERMINADA_BPS = 2000;
export function repartoVentaVerificada({importeCentimos,comisionBps=COMISION_PREDETERMINADA_BPS,estadoPago}) {
 if (estadoPago !== 'VERIFIED') throw new Error('No calcular comisión pagadera de una venta sin verificar');
 if (!Number.isSafeInteger(importeCentimos) || importeCentimos <= 0) throw new Error('Importe inválido');
 if (!Number.isSafeInteger(comisionBps) || comisionBps < 0 || comisionBps > 10000) throw new Error('Porcentaje inválido');
 const plataformaCentimos=Math.round(importeCentimos*comisionBps/10000);
 return Object.freeze({brutoCentimos:importeCentimos,plataformaCentimos,vendedorCentimos:importeCentimos-plataformaCentimos,comisionBps});
}
