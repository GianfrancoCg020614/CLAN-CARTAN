/* CLAN CARTAN V127 · Saldos reales y acceso único a la billetera personal.
 * No acredita dinero. Las cifras reales nunca se deducen de saldos ficticios.
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
 if(inFlight)return inFlight;const userId=session.userId;
 cobra.textContent='…';bull.textContent='…';
 inFlight=(async()=>{try{
  const rows=await cc80.api('cc_real_service_wallets?select=service,balance_pen&user_id=eq.'+encodeURIComponent(userId));
  if(window.CC_V53_SESSION?.userId!==userId)return;
  if(!Array.isArray(rows))throw Error('Saldo no disponible');
  for(const [service,field] of [['COBRA_YA',cobra],['STREAM_BULLS',bull]]){
   const amount=Number(rows.find(x=>x.service===service)?.balance_pen??0);field.textContent=Number.isFinite(amount)?money(amount):'No disponible';
  }
 }catch(error){if(window.CC_V53_SESSION?.userId===userId){cobra.textContent='No disponible';bull.textContent='No disponible';}}
 })().finally(()=>{inFlight=null;});return inFlight;
}
window.cc116RefreshBalances=refreshBalances;
window.cc116OpenRecharge=function(){
 if(!window.CC_V53_SESSION?.jwt){window.cc77Auth?.(false);return;}
 window.cc166OpenWallet?.('manual');
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

