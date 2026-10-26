import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('index.html','utf8');
const panel=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
const restore=html.slice(html.indexOf('async function restoreSupabaseSession(){'),html.indexOf('async function signIn(event)'));
const storage=html.slice(html.indexOf('const sessionStorageKey='),html.indexOf('async function refreshSupabaseSession(){'));
function authContext(api){
 const saved=new Map([['cc188-refresh-token','old-refresh']]);
 const accepted=[];
 const ctx=vm.createContext({window:{addEventListener(){}},sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},btn:{},status:{},api,acceptAuthenticatedSession:async jwt=>accepted.push(jwt)});
 vm.runInContext('let refreshToken=null;'+storage+restore,ctx);
 return {ctx,saved,accepted};
}
test('F5 renueva el token, guarda la rotación y revalida la identidad',async()=>{
 const {ctx,saved,accepted}=authContext(async(path,opts)=>{assert.match(path,/grant_type=refresh_token/);assert.equal(JSON.parse(opts.body).refresh_token,'old-refresh');return {access_token:'new-access',refresh_token:'new-refresh'};});
 await vm.runInContext('restoreSupabaseSession()',ctx);
 assert.deepEqual(accepted,['new-access']);assert.equal(saved.get('cc188-refresh-token'),'new-refresh');assert.equal(ctx.btn.disabled,false);
 vm.runInContext('window.cc188ClearSession()',ctx);assert.equal(saved.size,0);
});
test('sin token no restaura; error de red no borra una sesión recuperable',async()=>{
 const {ctx,saved,accepted}=authContext(async()=>{throw Error('sin red');});
 await vm.runInContext('restoreSupabaseSession()',ctx);assert.equal(accepted.length,0);assert.equal(saved.size,1);assert.match(ctx.status.textContent,/Vuelve a ingresar/);
 saved.clear();await vm.runInContext('restoreSupabaseSession()',ctx);assert.equal(accepted.length,0);
});
const decide=panel.slice(panel.indexOf('async function adminDecideRecharge('),panel.indexOf('function openAdminGrantRecharge('));
function rechargeContext(enabled=true){
 const calls=[],messages=[];
 const ctx=vm.createContext({data:{admin:true},verified:true,rechargeSaving:false,user:'admin',token:'jwt',session:()=>({jwt:'jwt'}),rechargeReady:{enabled},window:{confirm:()=>true},price:x=>String(x),notice:x=>messages.push(x),api:async(...args)=>{calls.push(args);return true;},loadAdminRecharges:async()=>{},rechargeState:'ready',auditState:'ready'});
 vm.runInContext(decide,ctx);return {ctx,calls,messages};
}
test('aprobar con campos vacíos envía null y la solicitud exacta',async()=>{
 const {ctx,calls}=rechargeContext();await vm.runInContext('adminDecideRecharge({request_id:"target-request",amount_pen:15},true,"","",true,{})',ctx);
 assert.equal(calls.length,1);assert.equal(calls[0][2].p_bank_tx,null);assert.equal(calls[0][2].p_bank,null);assert.equal(calls[0][2].p_request,'target-request');assert.equal(calls[0][2].p_confirmed_received,true);
});
for(const [name,enabled,confirmed,tx] of [['recepción deshabilitada',false,true,''],['sin confirmación',true,false,''],['referencia inválida',true,true,'123']])test('bloquea '+name,async()=>{
 const {ctx,calls}=rechargeContext(enabled);ctx.confirmed=confirmed;ctx.tx=tx;await vm.runInContext('adminDecideRecharge({request_id:"r",amount_pen:15},true,tx,"",confirmed,{})',ctx);assert.equal(calls.length,0);
});
test('rechazar no requiere campos bancarios ni recepción habilitada',async()=>{
 const {ctx,calls}=rechargeContext(false);await vm.runInContext('adminDecideRecharge({request_id:"r"},false,"","",false,{})',ctx);assert.equal(calls[0][2].p_approve,false);
});
test('todos los scripts inline conservan sintaxis válida',()=>{
 for(const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)){if(match[1].trim()&&!match[0].includes('application/ld+json'))new vm.Script(match[1]);}
});
