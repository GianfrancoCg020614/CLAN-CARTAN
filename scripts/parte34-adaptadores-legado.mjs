/* Auditoría sin acceso a dinero: la adaptación de activaciones antiguas
 * solo puede ocurrir tras obtener evidencia del servidor de origen.
 */
export const SOURCES = Object.freeze({
 COBRA_YA: Object.freeze({procedure:'cc_pay_cobra_subscription_real',table:'cc_cobra_real_access_periods',kind:'LEGACY_REAL_SERVICE_WALLET'}),
 MI_ALQUILER: Object.freeze({procedure:'ma_activate_real_wallet',table:'ma_subscription_events',kind:'LEGACY_REAL_SERVICE_WALLET'}),
 MI_COCHERA: Object.freeze({procedure:null,table:'mc_subscription_events',kind:'LEGACY_BONUS_ONLY_VERIFIED'}),
 STREAM_BULLS: Object.freeze({procedure:null,table:null,kind:'NEEDS_DELIVERY_ADAPTER'})
});
export function puedeMigrarActivacion({
 service,sourceVerified=false,realPaid=false,fulfillmentVerified=false,
 sourceRewardAlreadyPaid=false,sourceWalletReconciled=false,
 orderKey,serviceReference
}={}){
 if(!Object.hasOwn(SOURCES,service))return {safe:false,reason:'unknown_service'};
 if(!sourceVerified||!realPaid||!fulfillmentVerified)
   return {safe:false,reason:'missing_independent_evidence'};
 if(sourceRewardAlreadyPaid)return {safe:false,reason:'legacy_reward_collision'};
 if(!sourceWalletReconciled)return {safe:false,reason:'wallet_not_reconciled'};
 if(!/^[a-zA-Z0-9:_-]{12,130}$/.test(orderKey||'')||
    !/^[a-zA-Z0-9:_-]{12,130}$/.test(serviceReference||''))
   return {safe:false,reason:'missing_stable_reference'};
 return {safe:true,reason:'ready_for_backend_only_bridge'};
}
