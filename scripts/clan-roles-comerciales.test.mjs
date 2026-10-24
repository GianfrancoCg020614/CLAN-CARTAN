import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluarActivacionReseller,puedeAprobarSuperReseller,vencimientoReseller} from './clan-roles-comerciales.mjs';
test('RESELLER: S/25 pago verificado da un año y precios de afiliado',()=>{
 const r=evaluarActivacionReseller({importeCentimos:2500,estadoPago:'VERIFIED',referenciaPago:'pago-unico',fechaActivacion:'2026-10-23T15:00:00.000Z'});
 assert.equal(r.aprobado,true);assert.equal(r.rol,'RESELLER');assert.equal(r.precioAplicable,'AFFILIATE');
 assert.equal(r.venceEn,'2027-10-23T15:00:00.000Z');
});
test('no activar por TEST, pendiente, duplicado ni importe distinto',()=>{
 const base={importeCentimos:2500,estadoPago:'VERIFIED',referenciaPago:'pagovalido',fechaActivacion:'2026-10-23T00:00:00.000Z'};
 for(const change of [{estadoPago:'TEST'},{estadoPago:'PENDING'},{yaProcesada:true},{referenciaPago:''},{importeCentimos:2400}])
 assert.equal(evaluarActivacionReseller({...base,...change}).aprobado,false);
});
test('SUPER RESELLER exige ADMIN verificado y aprobación expresa',()=>{
 assert.equal(puedeAprobarSuperReseller({actorAdminVerificado:true,aprobacionExpresa:true}),true);
 assert.equal(puedeAprobarSuperReseller({actorAdminVerificado:false,aprobacionExpresa:true}),false);
 assert.equal(puedeAprobarSuperReseller({actorAdminVerificado:true,aprobacionExpresa:false}),false);
});
test('vencimiento al año respeta febrero y años bisiestos',()=>{
 assert.equal(vencimientoReseller('2028-02-29T00:00:00Z'),'2029-02-28T00:00:00.000Z');
});
