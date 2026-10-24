// STAGING COBRA YA. Solo usa la sesion autenticada en STAGING.
// Nunca recibe user_id desde el navegador ni permite cobrar desde producción.
export const STAGING_SUPABASE_URL='https://szcplebbqhtcgxhvmxdv.supabase.co';
const UUID4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validarCheckoutCobra({funding,requestId}){
 if(!['REAL','ACTIVATION_BONUS'].includes(funding)) throw Error('Origen de fondos no permitido');
 if(typeof requestId!=='string'||!UUID4.test(requestId))throw Error('Solicitud de compra invalida');
 return Object.freeze({funding,request_id:requestId});
}
export async function activarCobraEnStaging({supabaseCliente,funding,requestId,fetcher=fetch}){
 if(!supabaseCliente?.auth?.getSession)throw Error('Inicia sesion en STAGING');
 const {data,error}=await supabaseCliente.auth.getSession();
 if(error||!data?.session?.access_token)throw Error('Inicia sesion en STAGING');
 if(typeof data.session.user?.id!=='string')throw Error('Sesion invalida');
 const payload=validarCheckoutCobra({funding,requestId});
 const response=await fetcher(STAGING_SUPABASE_URL+'/functions/v1/cc-clan-cobra-checkout',{
  method:'POST',
  headers:{'Content-Type':'application/json','Authorization':'Bearer '+data.session.access_token},
  body:JSON.stringify(payload)
 });
 if(!response.ok)throw Error('No se completo la activacion: comprueba tu saldo y la vigencia.');
 const result=await response.json();
 if(result?.ok!==true||result.status!=='ACCESS_ACTIVE'||result.request_id!==requestId||
  typeof result.access_until!=='string'||!Number.isFinite(Date.parse(result.access_until)))
  throw Error('La respuesta de activacion no es valida');
 return result;
}
