// Solo invoca la detección autorizada. No contiene claves ni operaciones financieras.
export function createPoller({fetcher=fetch,logger=console.log}={}){
 return {
  async scheduled(_controller,env){
   if(!/^[a-f0-9]{64}$/i.test(env.CC_RECHARGE_POLL_TOKEN||''))throw Error('POLL_NOT_CONFIGURED');
   const response=await fetcher('https://pqalxtrcyrpmwqdlibqd.supabase.co/functions/v1/cc-recharge-mail',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+env.CC_RECHARGE_POLL_TOKEN},body:JSON.stringify({action:'scheduled_scan'}),redirect:'manual',signal:AbortSignal.timeout(140000)});
   if(!response.ok){const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(env.CC_RECHARGE_POLL_TOKEN))),x=>x.toString(16).padStart(2,'0')).join('').slice(0,12);let code='UNAVAILABLE';try{const d=await response.json();if(['AUTH_REQUIRED','REQUEST_FAILED','INVALID_REQUEST'].includes(d.error))code=d.error;}catch{}logger(JSON.stringify({event:'deposit_notice_poll',status:'BACKEND_UNAVAILABLE',http_status:response.status,code,credential_fingerprint:fingerprint}));throw Error('POLL_BACKEND_UNAVAILABLE');}
   const data=await response.json(),status=['WAITING_FOR_MAILBOX','PAUSED','BUSY','SUCCESS','ERROR'].includes(data.status)?data.status:'UNKNOWN';
   logger(JSON.stringify({event:'deposit_notice_poll',status,credited:0}));
   if(status==='ERROR'||status==='UNKNOWN')throw Error('POLL_REQUIRES_ATTENTION');
  },
  fetch(){return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});}
 };
}
export default createPoller();
