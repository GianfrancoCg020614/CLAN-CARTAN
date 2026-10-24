import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activarCobraEnStaging,validarCheckoutCobra,STAGING_SUPABASE_URL} from './parte3-cobra-checkout-client.mjs';
const id='11111111-1111-4111-8111-111111111111';
const session={auth:{getSession:async()=>({data:{session:{access_token:'signed-staging-user-token',user:{id:'mock-authenticated-user'}}},error:null})}};
test('checkout admite solo REAL o BONO y UUIDv4',()=>{
 assert.deepEqual(validarCheckoutCobra({funding:'REAL',requestId:id}),{funding:'REAL',request_id:id});
 assert.throws(()=>validarCheckoutCobra({funding:'STREAM_BULLS',requestId:id}));
 assert.throws(()=>validarCheckoutCobra({funding:'REAL',requestId:'fake-order'}));
});
test('usuario sin session no puede activar',async()=>{
 await assert.rejects(()=>activarCobraEnStaging({
  supabaseCliente:{auth:{getSession:async()=>({data:{session:null}})}},
  funding:'REAL',requestId:id,fetcher:()=>{throw Error('Cannot fetch without auth');}
 }),/Inicia sesion/);
});
test('no se recibe user_id del frontend; solo session bearer',async()=>{
 let called=0;
 const result=await activarCobraEnStaging({
  supabaseCliente:session,funding:'ACTIVATION_BONUS',requestId:id,
  fetcher:async(url,options)=>{
   called++;
   assert.equal(url,STAGING_SUPABASE_URL+'/functions/v1/cc-clan-cobra-checkout');
   assert.equal(options.method,'POST');
   assert.equal(options.headers.Authorization,'Bearer signed-staging-user-token');
   assert.deepEqual(JSON.parse(options.body),{funding:'ACTIVATION_BONUS',request_id:id});
   assert.equal(options.body.includes('user_id'),false);
   return {ok:true,json:async()=>({ok:true,status:'ACCESS_ACTIVE',request_id:id,access_until:'2026-11-23T13:00:00Z'})};
  }
 });
 assert.equal(called,1);assert.equal(result.status,'ACCESS_ACTIVE');
});
test('fallo HTTP nunca cuenta como activacion',async()=>{
 await assert.rejects(()=>activarCobraEnStaging({
  supabaseCliente:session,funding:'REAL',requestId:id,
  fetcher:async()=>({ok:false,status:409})
 }),/No se completo/);
});
test('respuesta del servidor debe coincidir con requestId',async()=>{
 await assert.rejects(()=>activarCobraEnStaging({
  supabaseCliente:session,funding:'REAL',requestId:id,
  fetcher:async()=>({ok:true,json:async()=>({ok:true,status:'ACCESS_ACTIVE',request_id:'otro',access_until:'2026-11-23T13:00:00Z'})})
 }),/no es valida/);
});
