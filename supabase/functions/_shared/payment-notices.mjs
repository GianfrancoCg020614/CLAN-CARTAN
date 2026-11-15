// Extrae metadatos de avisos. La conciliación del servidor decide si procede un crédito.
const email=value=>(String(value||'').match(/<([^<>]+)>/)?.[1]||String(value||'')).trim().toLowerCase();
const authWords=/\b(otp|totp|2fa|mfa|password|passcode|login|sign[ -]?in|recovery|authenticat\w*|verification|verify|contraseñ\w*|autentica\w*|verificaci[oó]n|recuperaci[oó]n)\b/i;
export function parseDepositNotice(message,allowedSenders){
 const sender=email(message.from),text=String(message.text||'').slice(0,65536),subject=String(message.subject||'').slice(0,1000);
 if(!allowedSenders.includes(sender)||authWords.test(subject+' '+text)||!/dep[oó]sit|deposit|transferencia|received|recibid|recibiste|payment|pago/i.test(subject+' '+text))return null;
 const domain=sender.split('@').at(-1),authentication=String(message.authentication||'');
 const authenticated=/\bdkim=pass\b/i.test(authentication)&&/\bdmarc=pass\b/i.test(authentication)&&authentication.match(/\bheader\.from="?([A-Za-z0-9.-]+)/i)?.[1]?.toLowerCase()===domain;
 // Preserve PEN normalization used by Lemon; never round incoming USDT to cents.
 const amounts=[...(subject+'\n'+text).matchAll(/(?:\b(PEN|USDT)\s*|S\/\s*)(\d{1,9}(?:[.,]\d{1,8})?)(?!\d|[.,]\d)|(?<![\d.,+\-])(\d{1,9}(?:[.,]\d{1,8})?)\s*\b(USDT)\b/gi)].map(m=>({currency:(m[1]||m[4]||'PEN').toUpperCase(),amount:(m[2]||m[3]).replace(',','.')}));
 const normalized=amounts.map(x=>{if(x.currency==='USDT'){const [whole,fraction='']=x.amount.split('.');return {...x,amount:whole.replace(/^0+(?=\d)/,'')+'.'+fraction.padEnd(8,'0')};}return {...x,amount:Number(x.amount).toFixed(2)};}).filter(x=>Number.isFinite(Number(x.amount)));const unique=[...new Map(normalized.map(x=>[x.currency+':'+x.amount,x])).values()];const amount=unique.length===1?unique[0]:null;
 const transaction=text.match(/(?:transaction\s*(?:id|number)|(?:id|n[uú]mero|c[oó]digo)\s*(?:de\s*(?:la\s*)?)?(?:operaci[oó]n|transacci[oó]n)|(?:operaci[oó]n|transacci[oó]n)\s*(?:n[uú]mero|id))\s*[:#-]?\s*([A-Za-z0-9_-]{6,128})/i)?.[1]||null;
 const rec=text.match(/\bREC-\d{6,15}\b/i)?.[0]?.toUpperCase()||null;
 const payerName=text.match(/(?:^|\n)\s*(?:nombre|origen|remitente|nombre\s+del\s+(?:remitente|pagador)|pagador|enviado\s+por)\s*[:：]?\s*([\p{L}][\p{L} .'-]{5,100})/imu)?.[1]?.trim()||null;
 const received=Date.parse(message.received_at);return {message_id:String(message.id).slice(0,500),sender,subject:subject.slice(0,180),sender_authenticated:authenticated,
 provider_hint:domain==='binance.com'||domain.endsWith('.binance.com')?'BINANCE':domain==='lemon.me'||domain.endsWith('.lemon.me')||domain==='lemoncash.com.ar'||domain.endsWith('.lemoncash.com.ar')?'LEMON':'UNKNOWN',
 amount_hint:amount?.amount||null,currency_hint:amount?.currency||null,transaction_hint:transaction,rec_hint:rec,payer_name_hint:payerName,received_at:Number.isFinite(received)?new Date(received).toISOString():null};
}
function decodeBody(part){try{const bin=atob(String(part?.body?.data||'').replace(/-/g,'+').replace(/_/g,'/'));return new TextDecoder().decode(Uint8Array.from(bin,c=>c.charCodeAt(0)));}catch{return '';}}
function textBody(payload){if(!payload)return '';const parts=(payload.parts||[]).map(textBody).filter(Boolean);const plain=parts.filter(x=>x.kind==='plain').map(x=>x.text).join('\n');if(plain)return {kind:'plain',text:plain};if(parts.length)return {kind:'html',text:parts.map(x=>x.text).join('\n')};const raw=decodeBody(payload);if(payload.mimeType==='text/plain')return {kind:'plain',text:raw};if(payload.mimeType==='text/html')return {kind:'html',text:raw.replace(/<\s*\/?\s*(?:p|div|li|tr|br|h[1-6])\b[^>]*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')};return {kind:'other',text:''};}
export async function scanPaymentNotices({context,token,remote,clock=Date.now}){
 const limit=5;const senders=context.allowed_senders;if(senders.length>10||senders.some(v=>! /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v)))throw Error('INVALID_SENDERS');
 const headers={Authorization:'Bearer '+token};const events=[];let cursor=null,examined=0;
 const check=r=>{if(r.status===401||r.status===403)throw Error('MAIL_REAUTH_REQUIRED');if(!r.ok)throw Error('MAIL_SCAN_UNAVAILABLE');};
 if(context.provider==='google'){
  const query='in:inbox {'+senders.map(s=>'from:'+s).join(' ')+'} after:'+Math.floor(Date.parse(context.after)/1000);
  const list=await remote('https://gmail.googleapis.com/gmail/v1/users/me/messages?'+new URLSearchParams({q:query,maxResults:String(limit),fields:'messages(id),nextPageToken',...(context.cursor?{pageToken:context.cursor}:{})}),{headers});check(list);const listText=await list.text();if(!listText.trim())throw Error('GMAIL_LIST_EMPTY');let data;try{data=JSON.parse(listText);}catch{throw Error('GMAIL_LIST_INVALID_JSON');}cursor=data.nextPageToken||null;
  for(const m of(data.messages||[]).slice(0,limit)){const response=await remote('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(m.id)+'?'+new URLSearchParams({format:'full',fields:'id,internalDate,payload'}),{headers});check(response);const messageText=await response.text();if(!messageText.trim())throw Error('GMAIL_MESSAGE_EMPTY');let v;try{v=JSON.parse(messageText);}catch{throw Error('GMAIL_MESSAGE_INVALID_JSON');}examined++;const h=name=>(v.payload?.headers||[]).find(x=>x.name.toLowerCase()===name)?.value||'';
   const event=parseDepositNotice({id:v.id,from:h('from'),subject:h('subject'),text:textBody(v.payload)?.text||'',authentication:h('authentication-results'),received_at:new Date(Number(v.internalDate)||clock()).toISOString()},senders);if(event)events.push(event);}
 }else if(context.provider==='microsoft'){
  const after=new Date(context.after).toISOString(),filter='receivedDateTime ge '+after+' and ('+senders.map(s=>"from/emailAddress/address eq '"+s+"'").join(' or ')+')';
  let url='https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?'+new URLSearchParams({'$filter':filter,'$top':String(limit),'$orderby':'receivedDateTime desc','$select':'id,from,subject,body,receivedDateTime,internetMessageHeaders'});
  if(context.cursor){const next=new URL(context.cursor);if(next.origin!=='https://graph.microsoft.com'||!next.pathname.startsWith('/v1.0/me/mailFolders/'))throw Error('INVALID_CURSOR');url=next.href;}
  const response=await remote(url,{headers:{...headers,Prefer:'outlook.body-content-type="text"'}});check(response);const data=await response.json();cursor=data['@odata.nextLink']||null;
  for(const v of(data.value||[]).slice(0,limit)){examined++;if(String(v.body?.contentType).toLowerCase()!=='text')continue;const event=parseDepositNotice({id:v.id,from:v.from?.emailAddress?.address,subject:v.subject,text:v.body.content,authentication:(v.internetMessageHeaders||[]).find(x=>x.name.toLowerCase()==='authentication-results')?.value,received_at:v.receivedDateTime},senders);if(event)events.push(event);}
 }else throw Error('INVALID_PROVIDER');
 return {events,cursor,examined};
}
