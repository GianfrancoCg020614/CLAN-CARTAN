import {test} from 'node:test';
import assert from 'node:assert/strict';
import {puedeMigrarActivacion,SOURCES} from './parte34-adaptadores-legado.mjs';
const valid={service:'COBRA_YA',sourceVerified:true,realPaid:true,
 fulfillmentVerified:true,sourceRewardAlreadyPaid:false,
 sourceWalletReconciled:true,orderKey:'LEGACY-ORDER-123456',
 serviceReference:'SOURCE-RECEIPT-123456'};
test('sin comprobante de entrega nunca procesar recompensas',()=>{
 assert.equal(puedeMigrarActivacion({...valid,fulfillmentVerified:false}).safe,false);
});
test('sin conciliación de saldo REAL nunca procesar',()=>{
 assert.equal(puedeMigrarActivacion({...valid,sourceWalletReconciled:false}).safe,false);
});
test('una recompensa legacy ya pagada impide duplicar S/5',()=>{
 assert.equal(puedeMigrarActivacion({...valid,sourceRewardAlreadyPaid:true}).reason,'legacy_reward_collision');
});
test('pago con bono no genera premio',()=>{
 assert.equal(puedeMigrarActivacion({...valid,realPaid:false}).safe,false);
});
test('rechaza referencias sin trazabilidad',()=>{
 assert.equal(puedeMigrarActivacion({...valid,orderKey:'test'}).safe,false);
});
test('comprobantes adecuados solo autorizan puente backend, no cobro navegador',()=>{
 assert.equal(puedeMigrarActivacion(valid).safe,true);
});
test('servicios con flujo legacy desconocido permanecen identificados',()=>{
 assert.equal(SOURCES.MI_COCHERA.procedure,null);
 assert.equal(SOURCES.STREAM_BULLS.procedure,null);
});
