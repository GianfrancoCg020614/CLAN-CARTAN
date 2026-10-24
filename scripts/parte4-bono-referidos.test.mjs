import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluarBonoReferido,mesLima} from './parte4-bono-referidos.mjs';
const base={invitadorId:'usuario-invita',referidoId:'usuario-nuevo',servicio:'STREAM_BULLS',fechaActivacion:'2026-10-24T04:00:00Z',activacionConfirmada:true,pagoRealVerificado:true};
test('primera activación del mes: S/5 sin aprobación ADMIN',()=>{
 const r=evaluarBonoReferido(base);
 assert.equal(r.aprobado,true);assert.equal(r.importeCentimos,500);assert.equal(r.requiereAprobacionAdmin,false);
 assert.equal(r.mes,'2026-10');
});
test('mismo referido en 4 plataformas: misma clave mensual y un solo premio',()=>{
 const keys=['STREAM_BULLS','COBRA_YA','MI_COCHERA','MI_ALQUILER'].map(servicio=>evaluarBonoReferido({...base,servicio}).claveUnica);
 assert.equal(new Set(keys).size,1);
 assert.equal(evaluarBonoReferido({...base,servicio:'COBRA_YA',yaRecompensadoEnMes:true}).aprobado,false);
});
test('un mes siguiente permite un premio nuevo',()=>{
 const b=evaluarBonoReferido({...base,fechaActivacion:'2026-11-24T04:00:00Z'});
 assert.equal(b.aprobado,true);assert.notEqual(b.claveUnica,evaluarBonoReferido(base).claveUnica);
});
test('mes calendario corresponde a Perú incluso en cambio UTC',()=>{
 assert.equal(mesLima('2026-11-01T02:00:00Z'),'2026-10');
});
test('rechazar pagos ficticios, bonos, pendientes y autoinvitaciones',()=>{
 for(const cambio of [{activacionConfirmada:false},{pagoRealVerificado:false},{pagadoConBono:true},{referidoId:'usuario-invita'},{invitadorId:''}])
 assert.equal(evaluarBonoReferido({...base,...cambio}).aprobado,false);
});
