// V112: pruebas HTTP contra API PUBLICA. SOLO LECTURA. No crea usuarios ni toca saldos.
// Alias comprobados en cc_clan_legacy_aliases de producción el 24/10/2026:
// COBRA2/BULL1 vigentes; COBRA1 no registrado. No inventar invitaciones.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');
const config=html.match(/const root='(https:\/\/[^']+\.supabase\.co)';\s*const key='(sb_publishable_[^']+)';/);
assert.ok(config,'Falta configuración de la clave pública de Supabase');
const [,host,key]=config;
async function rpc(name,payload){
  const response=await fetch(host+'/rest/v1/rpc/'+name,{
    method:'POST',headers:{apikey:key,'Content-Type':'application/json'},
    body:JSON.stringify(payload),signal:AbortSignal.timeout(18000)
  });
  const raw=await response.text();
  let data;try{data=JSON.parse(raw)}catch{data=raw}
  return {status:response.status,ok:response.ok,data};
}
for(const [code,want] of [
  ['COBRA2',true],['cobra2',true],['BULL1',true],['bull1',true],['COBRA1',false],
  ['BULL999999999999',false],['COBRA1 OR 1=1',false],['',false]
]){
  const r=await rpc('cc_validate_invitation_code',{p_code:code});
  assert.equal(r.status,200,'Falló la validación pública de '+code+' (HTTP '+r.status+')');
  assert.ok(Array.isArray(r.data)&&r.data.length===1,'La validación debe dar una sola fila');
  assert.equal(r.data[0].valid,want,'Resultado inesperado para '+code);
  assert.deepEqual(Object.keys(r.data[0]).sort(),['business','valid'],'La RPC expuso campos adicionales');
}
const own=await rpc('cc_my_invitation_codes',{});
assert.ok(!own.ok,'La API deja leer códigos privados sin sesión');
console.log('V116: 8 comprobaciones públicas y restricción de códigos personales verificadas; sin crear datos.');
