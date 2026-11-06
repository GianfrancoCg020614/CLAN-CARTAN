// Aísla el manejador real: todas las respuestas, identidades y saldos son ficticios.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const handler=source.slice(source.indexOf('async function activateBusiness('),source.indexOf('\nfunction memberships(',source.indexOf('async function activateBusiness(')));
async function scenario({active=false,intent='ACTIVATE',reply='paid',balance=100,double=false,confirm=true}={}){
 const calls=[],messages=[],keys=[],confirmations=[];let finish,gate=double?new Promise(r=>finish=r):Promise.resolve();
 const c={verified:true,data:{admin:false},businessActivationPending:null,services:[['STREAM_BULLS']],user:'buyer',token:'jwt',view:'home',app:{hidden:true},
 access:()=>({ok:active}),businessPeriod:()=>({end:'2099-01-01'}),monthlyPrice:()=>25,realBalance:()=>balance,price:n=>'S/ '+n,serviceName:()=> 'STREAM',notice:m=>messages.push(m),
 storedKey:(kind)=>{keys.push(kind);return {key:'fake-uuid',name:kind}},forgetKey:()=>{},session:()=>({userId:'buyer',jwt:'jwt'}),load:async()=>{},render:()=>{},
 api:async(p,m,b)=>{calls.push({p,b});await gate;return reply==='already'?{service:'STREAM_BULLS',status:'ALREADY_ACTIVE',charged:false,amount_pen:0,active_until:'2099-01-01'}:{service:'STREAM_BULLS',amount_pen:25,active_until:'2099-01-01'}},
 window:{confirm:m=>{confirmations.push(m);return confirm}}};
 vm.createContext(c);vm.runInContext(handler+';this.run=activateBusiness;',c);
 const first=c.run('STREAM_BULLS',null,intent);if(double){await c.run('STREAM_BULLS',null,intent);finish();}await first;
 return {calls,messages,keys,confirmations};
}
let x=await scenario();assert.equal(x.calls[0].p,'rpc/cc_finance_activate_membership');assert.match(x.confirmations[0],/ACTIVAR/);
x=await scenario({active:true});assert.equal(x.calls.length,0);assert.match(x.messages[0],/ya está activo/);
x=await scenario({active:true,intent:'RENEW'});assert.equal(x.calls[0].p,'rpc/cc_finance_pay_membership');assert.match(x.confirmations[0],/RENOVAR/);assert.equal(x.keys[0],'subscription-RENEW');
x=await scenario({reply:'already'});assert.equal(x.calls.length,1);assert.match(x.messages.at(-1),/ningún cobro adicional/);
x=await scenario({balance:0});assert.equal(x.calls.length,0);
x=await scenario({confirm:false});assert.equal(x.calls.length,0);
x=await scenario({double:true});assert.equal(x.calls.length,1);
const keys=new Map([['cc167:subscription:buyer:STREAM_BULLS','legacy-pending']]);
const context={user:'buyer',sessionStorage:{getItem:k=>keys.get(k),setItem:(k,v)=>keys.set(k,v),removeItem:k=>keys.delete(k)},window:{crypto:{randomUUID:()=> 'new-request'}}};vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function storedKey('),source.indexOf('\nasync function buyProduct(',source.indexOf('function storedKey(')))+';this.key=storedKey;this.done=forgetKey;',context);
const pending=context.key('subscription-RENEW','STREAM_BULLS');assert.equal(pending.key,'legacy-pending');context.done(pending.name);assert.equal(context.key('subscription-RENEW','STREAM_BULLS').key,'new-request');
console.log('PASS V325: activación y renovación explícitas, activo sin cobro, saldo cero, cancelación y doble clic.');
