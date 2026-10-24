import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repartoVentaVerificada} from './catalogo-comisiones.mjs';
test('20% por defecto sobre S/ 10: S/ 2 CLAN, S/ 8 vendedor',()=>{
 const r=repartoVentaVerificada({importeCentimos:1000,estadoPago:'VERIFIED'});
 assert.deepEqual([r.plataformaCentimos,r.vendedorCentimos],[200,800]);
});
test('ADMIN puede configurar 15% para un servicio',()=>{
 const r=repartoVentaVerificada({importeCentimos:1000,comisionBps:1500,estadoPago:'VERIFIED'});
 assert.deepEqual([r.plataformaCentimos,r.vendedorCentimos],[150,850]);
});
test('impedir comisiones sobre pagos no verificados',()=>{
 for(const estadoPago of ['PENDING','REVERSED','TEST',undefined])
  assert.throws(()=>repartoVentaVerificada({importeCentimos:1000,estadoPago}),/sin verificar/);
});
test('rechazar importes y porcentajes incorrectos',()=>{
 for(const importeCentimos of [-1,0,100.5,NaN])
  assert.throws(()=>repartoVentaVerificada({importeCentimos,estadoPago:'VERIFIED'}));
 for(const comisionBps of [-1,10001,20.5])
  assert.throws(()=>repartoVentaVerificada({importeCentimos:1000,comisionBps,estadoPago:'VERIFIED'}));
});
