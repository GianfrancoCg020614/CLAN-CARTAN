import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('scripts/v161-2-mi-alquiler.js','utf8');
const doc={readyState:'loading',getElementById(){return null;},addEventListener(){}};
const user={jwt:'jwt-de-prueba',userId:'00000000-0000-4000-8000-000000000042'};
let calls=0, resolveFirst, resolveSecond;
const firstRequest=new Promise(resolve=>{resolveFirst=resolve;});
const secondRequest=new Promise(resolve=>{resolveSecond=resolve;});
const window={
 CC_V53_SESSION:user,
 cc80:{api:(path)=>{
  assert.equal(path,'rpc/ma_ensure_account');
  calls++;
  return calls===1?firstRequest:secondRequest;
 }}
};
vm.runInNewContext(source,{window,document:doc,console,Date,Intl});
assert.equal(typeof window.ma1612OnOpen,'function','El panel debe exportar carga de datos');
const first=window.ma1612OnOpen();
const second=window.ma1612OnOpen();
assert.equal(typeof first?.then,'function','La primera recarga debe devolver una Promise');
assert.equal(typeof second?.then,'function','La recarga simultánea también debe ser esperable');
assert.equal(calls,1,'Dos aperturas simultáneas no deben duplicar la consulta de cuenta');
let done=false;
first.then(()=>{done=true;});
await Promise.resolve();
assert.equal(done,false,'No se puede declarar terminada una carga antes del backend');
resolveFirst({active:false,role:'RESELLER',subscription_until:null,suspended:false});
await Promise.all([first,second]);
assert.equal(done,true,'La carga debe esperar la respuesta de Supabase');
const third=window.ma1612OnOpen();
assert.equal(calls,2,'Una actualización posterior puede consultar de nuevo');
resolveSecond({active:false,role:'RESELLER',subscription_until:null,suspended:false});
await third;

const alerts=fs.readFileSync('scripts/v161-4-mi-alquiler.js','utf8');
const money=fs.readFileSync('scripts/v161-3-mi-alquiler.js','utf8');
assert.ok(money.includes('window.ma1614Invalidate?.()'),'Un movimiento financiero debe invalidar las alertas almacenadas');
const alertsWindow={CC_V53_SESSION:user,cc80:{api:async()=>{reads++;return [];}}};
let reads=0;
vm.runInNewContext(alerts,{window:alertsWindow,document:doc,console,Date,Intl,TextEncoder,Uint8Array,Blob});
const fixture={account:{active:true},sessionId:user.userId,leases:[],units:[],tenants:[],properties:[]};
const node={innerHTML:''};
assert.equal(alertsWindow.ma1614Enhance('avisos',node,fixture),true);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(reads,4,'Avisos consultan los cuatro libros protegidos');
assert.equal(alertsWindow.ma1614Enhance('avisos',node,fixture),true);
assert.equal(reads,4,'Lectura repetida sin cambios reutiliza la caché');
alertsWindow.ma1614Invalidate();
assert.equal(alertsWindow.ma1614Enhance('avisos',node,fixture),true);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(reads,8,'Después de un pago, la siguiente apertura actualiza el saldo del aviso');
console.log('PASS V163.5: recargas esperables, solicitudes simultáneas deduplicadas, avisos renovados después de movimientos.');