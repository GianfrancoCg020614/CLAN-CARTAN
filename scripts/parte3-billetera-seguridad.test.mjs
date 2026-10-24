import assert from 'node:assert/strict';
import {test} from 'node:test';
import {cargarBilleteraClan} from './parte3-billetera-consulta.mjs';

function client({userId='usuario-propio',wallet={balance_pen:'27.00'},bonuses=[],ops=[],error=null}={}) {
 const history=[];
 return {
  history,
  auth:{getUser:async()=>({data:{user:{id:userId}},error:null})},
  from(table){
   const b={select(){return b},eq(field,id){history.push([table,field,id]);return b},order(){return b},limit(){return Promise.resolve({data:ops,error})},maybeSingle(){return Promise.resolve({data:wallet,error})},then(resolve,reject){return Promise.resolve({data:bonuses,error}).then(resolve,reject)}};
   return b;
  }
 };
}
test('nunca inventar saldo 0 si no existe billetera real',async()=>{
 await assert.rejects(()=>cargarBilleteraClan(client({wallet:null})),/no aprovisionada/);
});
test('la billetera usa el usuario autenticado y no devuelve bonos STREAM BULLS',async()=>{
 const c=client({bonuses:[{service:'STREAM_BULLS',balance_pen:'5.00'},{service:'MI_COCHERA',balance_pen:'2.00'}]});
 const data=await cargarBilleteraClan(c);
 assert.equal(data.saldoReal,'27.00');
 assert.deepEqual(data.bonosActivacion,[{service:'MI_COCHERA',balance_pen:'2.00'}]);
 assert.equal(c.history.length,3);
 assert.ok(c.history.every(([t,f,id])=>f==='user_id'&&id==='usuario-propio'));
});
test('error de Supabase no se presenta como saldo valido',async()=>{
 await assert.rejects(()=>cargarBilleteraClan(client({error:{message:'denied'}})),/No se pudo consultar/);
});
test('sesion inexistente se rechaza',async()=>{
 await assert.rejects(()=>cargarBilleteraClan({auth:{getUser:async()=>({data:{user:null}})},from(){}}),/Debes iniciar sesión/);
});
