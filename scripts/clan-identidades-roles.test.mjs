import {test} from 'node:test';
import assert from 'node:assert/strict';
import {esCodigoRegistroClan,mostrarIdentidadClan,puedeConcederSuperReseller} from './clan-identidades-roles.mjs';
test('CLAN correlativo identifica registro, no rol',()=>{
 assert.deepEqual(mostrarIdentidadClan({codigo:'CLAN2',rol:'AFILIADO'}),{codigoRegistro:'CLAN2',rolComercial:'AFILIADO'});
 assert.deepEqual(mostrarIdentidadClan({codigo:'CLAN2',rol:'SUPER_RESELLER'}),{codigoRegistro:'CLAN2',rolComercial:'SUPER_RESELLER'});
});
test('no se aceptan claves CLAN o numeración no válidas',()=>{
 for(const c of ['CLAN0','CLAN-2','CLAN02','COBRA1','CLAN'])assert.equal(esCodigoRegistroClan(c),false);
 assert.equal(esCodigoRegistroClan('CLAN7'),true);
});
test('rol SUPER RESELLER solo por decisión explícita ADMIN y entorno oficial',()=>{
 assert.equal(puedeConcederSuperReseller({actorEsAdminVerificado:true,aprobacionExpresa:true,destinoConfirmado:true,entorno:'PRODUCTION'}),true);
 assert.equal(puedeConcederSuperReseller({actorEsAdminVerificado:false,aprobacionExpresa:true,destinoConfirmado:true,entorno:'PRODUCTION'}),false);
});
