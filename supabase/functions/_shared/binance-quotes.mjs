// Public market data only. Rates/credit amounts are validated and fixed again in Postgres.
export function createBinanceProtocol({rpc,remote,clock=Date.now}){
 let refreshInFlight=null;
 async function refresh(){
  const current=await rpc('cc393_market',{p_data:null},'',true);
  if(!current.enabled||!current.configured)throw Error('BINANCE_UNAVAILABLE');
  if(current.market)return current;
  if(refreshInFlight)return refreshInFlight;
  refreshInFlight=(async()=>{
   const [fxResponse,spotResponse]=await Promise.all([
    remote('https://open.er-api.com/v6/latest/USD'),
    remote('https://api.coinbase.com/v2/prices/USDT-USD/spot')
   ]);
   if(!fxResponse.ok||!spotResponse.ok)throw Error('MARKET_UNAVAILABLE');
   const [fx,spot]=await Promise.all([fxResponse.json(),spotResponse.json()]);
   const checked=clock(),spotAt=Date.parse(spotResponse.headers.get('date')||'');
   if(fx.result!=='success'||fx.base_code!=='USD'||!Number.isFinite(fx.rates?.PEN)||fx.rates.PEN<2||fx.rates.PEN>6||!Number.isFinite(fx.time_last_update_unix)||!Number.isFinite(fx.time_next_update_unix)||fx.time_last_update_unix*1000<checked-36*3600000||fx.time_last_update_unix*1000>checked+300000||fx.time_next_update_unix*1000<checked-300000||spot.data?.base!=='USDT'||spot.data?.currency!=='USD'||!/^\d+(?:\.\d{1,8})?$/.test(String(spot.data?.amount||''))||Number(spot.data.amount)<0.995||Number(spot.data.amount)>1.005||!Number.isFinite(spotAt)||spotAt<checked-180000||spotAt>checked+30000)throw Error('MARKET_UNAVAILABLE');
   return rpc('cc393_market',{p_data:{fx:fx.rates.PEN,spot:spot.data.amount,fx_at:new Date(fx.time_last_update_unix*1000).toISOString(),fx_next:new Date(fx.time_next_update_unix*1000).toISOString(),spot_at:new Date(spotAt).toISOString()}},'',true);
  })().finally(()=>{refreshInFlight=null;});
  return refreshInFlight;
 }
 return {refresh,async quote(account,body){
  if(!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(String(body.request_id||''))||!/^\d{1,4}(?:\.\d{1,8})?$/.test(String(body.usdt||''))||Number(body.usdt)<=0||Number(body.usdt)>1000)throw Error('INVALID_QUOTE');
  await refresh();
  let quote;try{quote=await rpc('cc393_service_quote',{p_user:account.id,p_request:body.request_id,p_usdt:String(body.usdt)},'',true);}catch(e){if(e.code==='P0393')throw Error('QUOTE_EXPIRED');throw e;}
  return rpc('cc393_accept_quote',{p_quote:quote},account.jwt);
 }};
}
