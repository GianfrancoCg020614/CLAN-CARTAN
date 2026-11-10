// Detección y preconciliación exclusivamente. Ningún correo autoriza un asiento financiero.
const email=value=>(String(value||'').match(/<([^<>]+)>/)?.[1]||String(value||'')).trim().toLowerCase();
const authWords=/\b(otp|totp|2fa|mfa|password|passcode|login|sign[ -]?in|recovery|authenticat\w*|verification|verify|contraseñ\w*|autentica\w*|verificaci[oó]n|recuperaci[oó]n)\b/i;
export function parseDepositNotice(message,allowedSenders){
 const sender=email(message.from),text=String(message.text||'').slice(0,65536),subject=String(message.subject||'').slice(0,1000);
 if(!allowedSenders.includes(sender)||authWords.test(subject+' '+text)||!/dep[oó]sit|deposit|transferencia|received|recibid|recibiste|payment|pago/i.test(subject+' '+text))return null;
 const domain=sender.split('@').at(-1),authentication=String(message.authentication||'');
 const authenticated=/\bdkim=pass\b/i.test(authentication)&&/\bdmarc=pass\b/i.test(authentication)&&authentication.match(/\bheader\.from="?([A-Za-z0-9.-]+)/i)?.[1]?.toLowerCase()===domain;
 const amounts=[...text.matchAll(/(?:\b(PEN|USDT)\s*|S\/\s*)(\d{1,9}(?:[.,]\d{1,8})?)(?!\d|[.,]\d)/g)].map(m=>({currency:m[1]||'PEN',amount:m[2].replace(',','.')}));
 const unique=[...new Map(amounts.map(x=>[x.currency+':'+x.amount,x])).values()];const amount=unique.length===1?unique[0]:null;
 const transaction=text.match(/(?:transaction\s*(?:id|number)|(?:id|n[uú]mero)\s*(?:de\s*)?(?:operaci[oó]n|transacci[oó]n))\s*[:#]\s*([A-Za-z0-9_-]{8,128})/i)?.[1]||null;
 const rec=text.match(/\bREC-\d{6,15}\b/i)?.[0]?.toUpperCase()||null;
 const received=Date.parse(message.received_at);return {message_id:String(message.id).slice(0,500),sender,subject:subject.slice(0,180),sender_authenticated:authenticated,
 provider_hint:domain==='binance.com'||domain.endsWith('.binance.com')?'BINANCE':domain==='lemon.me'||domain.endsWith('.lemon.me')||domain==='lemoncash.com.ar'||domain.endsWith('.lemoncash.com.ar')?'LEMON':'UNKNOWN',
 amount_hint:amount?.amount||null,currency_hint:amount?.currency||null,transaction_hint:transaction,rec_hint:rec,received_at:Number.isFinite(received)?new Date(received).toISOString():null};
}
function textBody(payload){if(!payload)return '';if(payload.mimeType==='text/plain'){try{const raw=atob(String(payload.body?.data||'').replace(/-/g,'+').replace(/_/g,'/'));return new TextDecoder().decode(Uint8Array.from(raw,c=>c.charCodeAt(0)));}catch{return '';}}return(payload.parts||[]).filter(p=>p.mimeType==='text/plain').map(textBody).join('\n');}
export async function scanPaymentNotices({context,token,remote,clock=Date.now}){
 const limit=5;const senders=context.allowed_senders;if(senders.length>10||senders.some(v=>! /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v)))throw Error('INVALID_SENDERS');
 const headers={Authorization:'Bearer '+token};const events=[];let cursor=null,examined=0;
 const check=r=>{if(r.status===401||r.status===403)throw Error('MAIL_REAUTH_REQUIRED');if(!r.ok)throw Error('MAIL_SCAN_UNAVAILABLE');};
 if(context.provider==='google'){
  const query='in:inbox {'+senders.map(s=>'from:'+s).join(' ')+'} after:'+Math.floor(Date.parse(context.after)/1000);
  const list=await remote('https://gmail.googleapis.com/gmail/v1/users/me/messages?'+new URLSearchParams({q:query,maxResults:String(limit),fields:'messages(id),nextPageToken',...(context.cursor?{pageToken:context.cursor}:{})}),{headers});check(list);const data=await list.json();cursor=data.nextPageToken||null;
  for(const m of(data.messages||[]).slice(0,limit)){const response=await remote('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(m.id)+'?'+new URLSearchParams({format:'full',fields:'id,internalDate,payload(mimeType,headers(name,value),body(data,size),parts(mimeType,body(data,size)))'}),{headers});check(response);const v=await response.json();examined++;const h=name=>(v.payload?.headers||[]).find(x=>x.name.toLowerCase()===name)?.value||'';
   const event=parseDepositNotice({id:v.id,from:h('from'),subject:h('subject'),text:textBody(v.payload),authentication:h('authentication-results'),received_at:new Date(Number(v.internalDate)||clock()).toISOString()},senders);if(event)events.push(event);}
 }else if(context.provider==='microsoft'){
  const after=new Date(context.after).toISOString(),filter='receivedDateTime ge '+after+' and ('+senders.map(s=>"from/emailAddress/address eq '"+s+"'").join(' or ')+')';
  let url='https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?'+new URLSearchParams({'$filter':filter,'$top':String(limit),'$orderby':'receivedDateTime desc','$select':'id,from,subject,body,receivedDateTime,internetMessageHeaders'});
  if(context.cursor){const next=new URL(context.cursor);if(next.origin!=='https://graph.microsoft.com'||!next.pathname.startsWith('/v1.0/me/mailFolders/'))throw Error('INVALID_CURSOR');url=next.href;}
  const response=await remote(url,{headers:{...headers,Prefer:'outlook.body-content-type="text"'}});check(response);const data=await response.json();cursor=data['@odata.nextLink']||null;
  for(const v of(data.value||[]).slice(0,limit)){examined++;if(String(v.body?.contentType).toLowerCase()!=='text')continue;const event=parseDepositNotice({id:v.id,from:v.from?.emailAddress?.address,subject:v.subject,text:v.body.content,authentication:(v.internetMessageHeaders||[]).find(x=>x.name.toLowerCase()==='authentication-results')?.value,received_at:v.receivedDateTime},senders);if(event)events.push(event);}
 }else throw Error('INVALID_PROVIDER');
 return {events,cursor,examined};
}
