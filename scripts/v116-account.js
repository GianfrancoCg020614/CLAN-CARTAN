/* CLAN CARTAN V116 · Saldos personales y recarga desde una sola acción.
 * Solo muestra saldos de prueba del usuario autenticado. No acredita dinero.
 */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const cobra=el('cc116-cobra'),bull=el('cc116-bull');
if(!cobra||!bull)return;
const money=n=>'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
let inFlight=null;
async function refreshBalances(){
 const session=window.CC_V53_SESSION;
 if(!session?.jwt){cobra.textContent='S/ --';bull.textContent='S/ --';return;}
 if(inFlight)return inFlight;
 const userId=session.userId;
 cobra.textContent='…';bull.textContent='…';
 inFlight=(async()=>{
  try{
   if(!window.cc80?.api)throw Error('Billeteras no disponibles');
   const list=await cc80.api('rpc/cc_my_test_wallets','POST',{});
   if(window.CC_V53_SESSION?.userId!==userId)return;
   if(!Array.isArray(list))throw Error('Formato inválido');
   for(const [service,field] of [['COBRA_YA',cobra],['STREAM_BULLS',bull]]){
    const balance=Number(list.find(item=>item.service===service)?.balance_test??0);
    field.textContent=Number.isFinite(balance)?money(balance):'No disponible';
   }
  }catch(error){
   if(window.CC_V53_SESSION?.userId!==userId)return;
   cobra.textContent='No disponible';bull.textContent='No disponible';
   console.warn('No se pudieron actualizar las billeteras personales:',error?.message||error);
  }
 })().finally(()=>{inFlight=null;});
 return inFlight;
}
window.cc116RefreshBalances=refreshBalances;
window.cc116OpenRecharge=function(){
 const session=window.CC_V53_SESSION;
 if(!session?.jwt){if(typeof cc77Auth==='function')cc77Auth(false);return;}
 if(!window.cc80?.open)return;
 cc80.open();
 const details=document.querySelector('#cc80wallet .cc113-central-topup');
 if(details){details.open=true;details.scrollIntoView({behavior:'smooth',block:'nearest'});}
 const service=el('cc113centralService');
 if(service&&!service.value)service.value='COBRA_YA';
 if(typeof refreshBalances==='function')void refreshBalances();
 const amount=el('cc113centralAmount');
 if(amount)amount.focus({preventScroll:true});
};
const originalRender=window.cc95RenderUser;
if(typeof originalRender==='function'){
 window.cc95RenderUser=function(...args){
  const result=originalRender.apply(this,args);
  if(window.CC_V53_SESSION?.jwt)void refreshBalances();
  return result;
 };
}
const originalWalletRefresh=window.cc80?.refresh;
if(typeof originalWalletRefresh==='function'){
 cc80.refresh=async function(...args){
  try{return await originalWalletRefresh.apply(this,args);}
  finally{if(window.CC_V53_SESSION?.jwt)await refreshBalances();}
 };
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&window.CC_V53_SESSION?.jwt)void refreshBalances();});
window.addEventListener('focus',()=>{if(window.CC_V53_SESSION?.jwt)void refreshBalances();});
if(window.CC_V53_SESSION?.jwt)void refreshBalances();
})();
