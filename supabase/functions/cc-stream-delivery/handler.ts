// Entregas comerciales autorizadas. Sin extracción de OTP, TOTP, login o recuperación.
const ORIGINS = new Set(['https://www.clancartan.com', 'https://clancartan.com']);
const ORDER = /^ORD-\d{6,15}$/;
const encoder = new TextEncoder();
const safeCode = (value) => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9 -]{7,127}$/.test(value) && !/^\d{6,8}$/.test(value);
const scopes = {
  google: 'openid email https://www.googleapis.com/auth/gmail.readonly',
  microsoft: 'openid email offline_access User.Read Mail.Read',
};
const tokenURL = (provider, env) => provider === 'google' ? 'https://oauth2.googleapis.com/token' : `https://login.microsoftonline.com/${tenant(env)}/oauth2/v2.0/token`;
function tenant(env) { const value = env('CC_STREAM_MICROSOFT_TENANT') || 'common'; if (!/^(common|organizations|consumers|[a-fA-F0-9-]{36})$/.test(value)) throw Error('CONFIGURATION_ERROR'); return value; }
function credentials(provider, env) {
  const prefix = provider === 'google' ? 'CC_STREAM_GOOGLE' : 'CC_STREAM_MICROSOFT';
  return { id: env(prefix + '_CLIENT_ID') || '', secret: env(prefix + '_CLIENT_SECRET') || '' };
}
function validProvider(provider) { if (!['google', 'microsoft'].includes(provider)) throw Error('INVALID_PROVIDER'); return provider; }
function validateScopes(provider, scope) {
  if (typeof scope !== 'string' || !scope.trim()) throw Error('INVALID_MAIL_SCOPE');
  const list = scope.toLowerCase().split(/\s+/);
  if (provider === 'google') {
    if (!list.includes('https://www.googleapis.com/auth/gmail.readonly') || list.some(s => /gmail\.(modify|send|compose)|mail\.google\.com/.test(s))) throw Error('INVALID_MAIL_SCOPE');
  } else if (!list.some(s => /(^|\/)mail\.read$/.test(s)) || list.some(s => /mail\.(readwrite|send)|directory\./.test(s))) throw Error('INVALID_MAIL_SCOPE');
}
const hex = bytes => [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, '0')).join('');
const base64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hash = async value => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
function plainBase64(value) {
  try { const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/')); return new TextDecoder().decode(Uint8Array.from(raw, c => c.charCodeAt(0))); } catch { return ''; }
}
export function parseCommercialMessage({from, subject, text, id, authentication}, context, now = Date.now()) {
  if (typeof text !== 'string' || text.length > 65536 || typeof subject !== 'string') return null;
  const sender = String(from || '').match(/<([^<>]+)>/)?.[1] || String(from || '');
  if (sender.trim().toLowerCase() !== context.authorized_sender.toLowerCase()) return null;
  const auth=String(authentication||''),domain=context.authorized_sender.split('@').at(-1).toLowerCase();
  if(!/\bdkim=pass\b/i.test(auth)||!/\bdmarc=pass\b/i.test(auth)||auth.match(/\bheader\.from="?([A-Za-z0-9.-]+)/i)?.[1]?.toLowerCase()!==domain)return null;
  if (subject.trim() !== 'CLAN CARTAN ENTREGA ' + context.order_code) return null;
  // Plantilla exacta de entrega comercial. Nunca se interpretan mensajes genéricos de plataformas.
  if (/\b(otp|totp|2fa|mfa|password|passcode|login|sign[ -]?in|recovery|authenticat\w*|verification|verify|contraseñ\w*|autentica\w*|verificaci[oó]n|recuperaci[oó]n)\b/i.test(text + ' ' + subject)) return null;
  const lines = text.replace(/\r/g, '').trim().split('\n');
  if (lines[0] !== 'CLAN-CARTAN-DELIVERY/1' || lines.length !== 6) return null;
  const values = {};for (const line of lines.slice(1)) { const match = line.match(/^(Order|Account|Purpose|Code|Expires): (.+)$/); if (!match || values[match[1]]) return null; values[match[1]] = match[2].trim(); }
  if (values.Order !== context.order_code || values.Account !== context.account_code || values.Purpose !== 'COMMERCIAL_DELIVERY' || !safeCode(values.Code)) return null;
  const expiry = Date.parse(values.Expires), orderEnd = Date.parse(context.valid_until);
  if (!Number.isFinite(expiry) || expiry <= now || expiry > now + 15 * 60000 || expiry > orderEnd) return null;
  return { code: values.Code, expires_at: new Date(expiry).toISOString(), message_id: String(id || '').slice(0, 250) };
}
function messageText(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' || !payload.mimeType && payload.body?.data) return plainBase64(payload.body?.data || '');
  return (payload.parts || []).filter(p => p.mimeType === 'text/plain').map(p => plainBase64(p.body?.data || '')).join('\n');
}
export function createHandler({env, fetcher = fetch, clock = () => Date.now(), paymentMode = false, paymentScanner = null}) {
  const root = env('SUPABASE_URL'), key = env('SUPABASE_ANON_KEY'), service = env('SUPABASE_SERVICE_ROLE_KEY');
  const callback = root + '/functions/v1/'+(paymentMode?'cc-recharge-mail':'cc-stream-delivery')+'/oauth/';
  async function remote(url, options = {}) {
    return fetcher(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(6500) });
  }
  async function rpc(name, body, jwt, internal = false) {
    const token = internal ? service : jwt;
    const response = await remote(root + '/rest/v1/rpc/' + name, { method: 'POST', headers: { apikey: internal ? service : key, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!response.ok) throw Error('DATA_UNAVAILABLE');return response.json();
  }
  const serviceCall = (action, data) => rpc(paymentMode?'cc_recharge_mail_service':'cc_stream_delivery_service', { p_action: action, p_data: data }, '', true);
  async function user(request) {
    const match = (request.headers.get('Authorization') || '').match(/^Bearer (\S+)$/i); if (!match) throw Error('AUTH_REQUIRED');
    const response = await remote(root + '/auth/v1/user', { headers: { apikey: key, Authorization: 'Bearer ' + match[1] } });
    if (!response.ok) throw Error('AUTH_REQUIRED');const account = await response.json();if (!account?.id) throw Error('AUTH_REQUIRED');return { id: account.id, jwt: match[1] };
  }
  async function seller(account) { await rpc(paymentMode?'cc_recharge_admin':'cc_stream_delivery_manage', { p_action: 'overview', p_data: {} }, account.jwt); }
  async function oauthToken(provider, params) {
    const {id, secret} = credentials(provider, env);if (!id || !secret) throw Error('OAUTH_NOT_CONFIGURED');
    const response = await remote(tokenURL(provider, env), { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ ...params, client_id: id, client_secret: secret }) });
    if (!response.ok) throw Error('MAIL_REAUTH_REQUIRED');const tokens = await response.json();if (!tokens.access_token) throw Error('MAIL_REAUTH_REQUIRED');return tokens;
  }
  async function getAccess(context, actor, requestId) {
    const current = context.tokens;
    if (!current?.access_token || !current?.refresh_token) throw Error('MAIL_REAUTH_REQUIRED');
    if (Date.parse(current.expires_at) > clock() + 60000) return current.access_token;
    const renewed = await oauthToken(context.provider, { grant_type: 'refresh_token', refresh_token: current.refresh_token, ...(context.provider === 'microsoft' ? { scope: scopes.microsoft } : {}) });
    const scope = renewed.scope || current.scope;validateScopes(context.provider, scope);
    const tokens = { access_token: renewed.access_token, refresh_token: renewed.refresh_token || current.refresh_token, expires_at: new Date(clock() + Math.max(60, Math.min(86400, Number(renewed.expires_in) || 3600)) * 1000).toISOString(), scope };
    const result = await serviceCall('mail_tokens', { actor_id: actor, ...(paymentMode?{connection_id:requestId}:{request_id:requestId}), tokens });if (!result.saved) throw Error('MAIL_REAUTH_REQUIRED');return tokens.access_token;
  }
  async function findCommercial(context, token) {
    const authorization = { Authorization: 'Bearer ' + token };
    if (context.provider === 'google') {
      const query = `in:inbox from:${context.authorized_sender} subject:"CLAN CARTAN ENTREGA ${context.order_code}" after:${Math.floor(Date.parse(context.mail_after || context.valid_from) / 1000)}`;
      const response = await remote('https://gmail.googleapis.com/gmail/v1/users/me/messages?' + new URLSearchParams({ q: query, maxResults: '5', fields: 'messages(id)' }), { headers: authorization });
      if (response.status === 401 || response.status === 403) throw Error('MAIL_REAUTH_REQUIRED');if (!response.ok) throw Error('MAIL_TEMPORARILY_UNAVAILABLE');
      const data = await response.json();for (const message of (data.messages || []).slice(0, 5)) {
        const detail = await remote('https://gmail.googleapis.com/gmail/v1/users/me/messages/' + encodeURIComponent(message.id) + '?' + new URLSearchParams({ format: 'full', fields: 'id,payload(mimeType,headers(name,value),body(data,size),parts(mimeType,body(data,size)))' }), { headers: authorization });
        if (!detail.ok) continue;const item = await detail.json();const headers = item.payload?.headers || [];const header = name => headers.find(h => h.name.toLowerCase() === name)?.value || '';
        const found = parseCommercialMessage({ id: item.id, from: header('from'), subject: header('subject'), text: messageText(item.payload), authentication:header('authentication-results') }, context, clock());if (found) return found;
      }
    } else {
      // Búsqueda acotada al buzón de entregas, remitente, asunto exacto y vigencia.
      const filter = `receivedDateTime ge ${new Date(context.mail_after || context.valid_from).toISOString()} and from/emailAddress/address eq '${context.authorized_sender.replace(/'/g, "''")}' and subject eq 'CLAN CARTAN ENTREGA ${context.order_code}'`;
      const response = await remote('https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?' + new URLSearchParams({ '$filter': filter, '$top': '5', '$orderby':'receivedDateTime desc', '$select': 'id,from,subject,body,internetMessageHeaders' }), { headers: { ...authorization, Prefer: 'outlook.body-content-type="text"' } });
      if (response.status === 401 || response.status === 403) throw Error('MAIL_REAUTH_REQUIRED');if (!response.ok) throw Error('MAIL_TEMPORARILY_UNAVAILABLE');
      const data = await response.json();for (const item of (data.value || []).slice(0, 5)) {
        if (String(item.body?.contentType).toLowerCase() !== 'text') continue;
        const found = parseCommercialMessage({ id: item.id, from: item.from?.emailAddress?.address, subject: item.subject, text: item.body?.content, authentication:(item.internetMessageHeaders||[]).find(h=>h.name.toLowerCase()==='authentication-results')?.value }, context, clock());if (found) return found;
      }
    }
    return null;
  }
  function callbackHTML(ok, origin) {
    const message = JSON.stringify({ type: paymentMode?'cc321-mail-result':'cc318-mail-result', ok });
    return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CLAN CARTAN · Correo</title><p>' + (ok ? 'Correo conectado. Puedes volver a CLAN CARTAN.' : 'No se pudo completar la conexión. Regresa a CLAN CARTAN y vuelve a intentarlo.') + '</p><a href="https://www.clancartan.com/?cc_mail=return">Volver a CLAN CARTAN</a><script>if(window.opener){window.opener.postMessage(' + message + ',"https://www.clancartan.com");window.close();}</script></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" } });
  }
  return async function handle(request) {
    const origin = request.headers.get('Origin');const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Origin', 'Referrer-Policy': 'no-referrer', ...(ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } : {}) };
    const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
    if (origin && !ORIGINS.has(origin)) return json({ error: 'ORIGIN_DENIED' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    if (request.method === 'GET' && /\/oauth\/(google|microsoft)$/.test(url.pathname)) {
      try {
        const provider = validProvider(url.pathname.split('/').at(-1)), state = url.searchParams.get('state'), code = url.searchParams.get('code');
        if (!state || !/^[A-Za-z0-9_-]{40,100}$/.test(state)) throw Error('INVALID_STATE');
        const claimed = await serviceCall('oauth_claim', { state_hash: await hash(state), provider });
        if (claimed.expired || !claimed.actor_id || !claimed.verifier || !code || code.length > 4096 || url.searchParams.has('error')) throw Error('INVALID_STATE');
        const tokens = await oauthToken(provider, { grant_type: 'authorization_code', code, redirect_uri: callback + provider, code_verifier: claimed.verifier });
        validateScopes(provider, tokens.scope);if (!tokens.refresh_token) throw Error('OFFLINE_ACCESS_REQUIRED');
        const profileURL = provider === 'google' ? 'https://gmail.googleapis.com/gmail/v1/users/me/profile' : 'https://graph.microsoft.com/v1.0/me?$select=id,mail,userPrincipalName';
        const response = await remote(profileURL, { headers: { Authorization: 'Bearer ' + tokens.access_token } });if (!response.ok) throw Error('PROFILE_UNAVAILABLE');const profile = await response.json();
        const email = provider === 'google' ? profile.emailAddress : profile.mail || profile.userPrincipalName;
        if (!email) throw Error('PROFILE_UNAVAILABLE');
        await serviceCall('oauth_save', { actor_id: claimed.actor_id, provider, subject: provider === 'google' ? email.toLowerCase() : profile.id, email,
          tokens: { access_token: tokens.access_token, refresh_token: tokens.refresh_token, scope: tokens.scope, expires_at: new Date(clock() + Math.max(60, Math.min(86400, Number(tokens.expires_in) || 3600)) * 1000).toISOString() } });
        return callbackHTML(true, origin);
      } catch { return callbackHTML(false, origin); }
    }
    if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
    try {
      if (!root || !key || !service) throw Error('CONFIGURATION_ERROR');
      const account = await user(request);
      const raw = await request.text();if (raw.length > 4096) return json({ error: 'REQUEST_TOO_LARGE' }, 413);
      let body;try { body = JSON.parse(raw); } catch { return json({ error: 'INVALID_REQUEST' }, 400); }
      if(paymentMode&&body.action==='methods_status'){
        const configured=env('CC_BINANCE_MERCHANT_ENABLED')==='true'&&['BINANCE_PAY_API_KEY','BINANCE_PAY_SECRET_KEY','BINANCE_MERCHANT_ID','BINANCE_WEBHOOK_PUBLIC_KEY_PEM','BINANCE_WEBHOOK_CERT_SN'].every(k=>!!env(k));
        return json({binance_merchant:{enabled:configured,min_pen:1,max_pen:10},lemon:{enabled:false},personal_automatic:{enabled:false},notice:'Un QR personal o un correo no confirman una recarga ni identifican al titular.'});
      }
      if(paymentMode&&body.action==='scan_deposits'){
        await seller(account);if(typeof paymentScanner!=='function'||! /^[a-f0-9-]{36}$/i.test(String(body.connection_id)))return json({error:'INVALID_REQUEST'},400);
        const context=await serviceCall('mail_scan_context',{actor_id:account.id,connection_id:body.connection_id});if(context.status!=='READY')return json({error:'MAIL_DISCONNECTED'},409);
        if(!Array.isArray(context.allowed_senders)||!context.allowed_senders.length)return json({error:'ALLOWED_SENDERS_REQUIRED'},400);
        try{const token=await getAccess(context,account.id,body.connection_id);const scan=await paymentScanner({context,token,remote,clock});let recorded=0;
          for(const event of scan.events){const r=await serviceCall('mail_notice',{actor_id:account.id,connection_id:body.connection_id,...event});if(r.recorded)recorded++;}
          await serviceCall('mail_scan_done',{actor_id:account.id,connection_id:body.connection_id,cursor:scan.cursor||null});return json({detected:recorded,examined:scan.examined,has_more:!!scan.cursor,credited:0,notice:'Avisos sin confirmación transaccional. Ninguna billetera se modificó.'});
        }catch(e){if(e.message==='MAIL_REAUTH_REQUIRED')await serviceCall('mail_reauth',{actor_id:account.id,connection_id:body.connection_id});return json({error:e.message==='MAIL_REAUTH_REQUIRED'?'MAIL_REAUTH_REQUIRED':'MAIL_SCAN_UNAVAILABLE'},409);}
      }
      if (!paymentMode&&body.action === 'lookup') {
        const order = String(body.order_code || '').trim().toUpperCase();if (!ORDER.test(order)) return json({ status: 'DENIED' });
        const result = await rpc('cc_stream_delivery_lookup', { p_order_code: order }, account.jwt);
        if (result.status !== 'AUTOMATIC_PENDING') return json(result);
        const context = await serviceCall('mail_context', { actor_id: account.id, request_id: result.request_id });
        if (context.status !== 'READY') return json({ status: context.status === 'MAIL_DISCONNECTED' ? 'MAIL_DISCONNECTED' : 'DENIED' });
        try {
          const token = await getAccess(context, account.id, result.request_id);
          const resource = await findCommercial(context, token);
          const completed = await serviceCall(resource ? 'complete' : 'no_code', { actor_id: account.id, request_id: result.request_id, ...(resource || {}) });
          return json(completed);
        } catch (error) {
          if (error.message === 'MAIL_REAUTH_REQUIRED' || error.message === 'OAUTH_NOT_CONFIGURED') {
            await serviceCall('mail_reauth', { actor_id: account.id, request_id: result.request_id });return json({ status: 'MAIL_DISCONNECTED' });
          }
          return json({ status: 'NO_CODE' });
        }
      }
      if (['oauth_status', 'oauth_start', 'oauth_disconnect'].includes(body.action)) {
        if (body.action === 'oauth_status') { const capabilities=await rpc(paymentMode?'cc_recharge_mail_capabilities':'cc_stream_mail_capabilities',{},account.jwt);return json({ ...capabilities,providers: Object.fromEntries(['google', 'microsoft'].map(p => { const c = credentials(p, env);return [p, { configured: !!(c.id && c.secret) }]; })) });}
        if (body.action === 'oauth_disconnect') {
          if (!/^[a-f0-9-]{36}$/i.test(String(body.connection_id))) return json({ error: 'INVALID_REQUEST' }, 400);
          const context = await serviceCall('mail_for_disconnect', { actor_id: account.id, connection_id: body.connection_id });
          if (context.provider === 'google' && context.tokens?.refresh_token) { try { await remote('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: context.tokens.refresh_token }) }); } catch {} }
          await serviceCall('mail_disconnect', { actor_id: account.id, connection_id: body.connection_id });return json({ disconnected: true });
        }
        await seller(account);
        const provider = validProvider(body.provider), { id, secret } = credentials(provider, env);
        if (!id || !secret) return json({ error: 'OAUTH_NOT_CONFIGURED', provider }, 503);
        if ((paymentMode?body.notification_mailbox:body.dedicated_mailbox) !== true) return json({ error: 'DEDICATED_MAILBOX_REQUIRED' }, 400);
        const verifier = base64url(crypto.getRandomValues(new Uint8Array(48))), state = base64url(crypto.getRandomValues(new Uint8Array(32)));
        const challenge = base64url(await crypto.subtle.digest('SHA-256', encoder.encode(verifier)));
        await serviceCall('oauth_start', { actor_id: account.id, provider, verifier, state_hash: await hash(state) });
        const endpoint = provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth' : `https://login.microsoftonline.com/${tenant(env)}/oauth2/v2.0/authorize`;
        const query = new URLSearchParams({ client_id: id, redirect_uri: callback + provider, response_type: 'code', scope: scopes[provider], state, code_challenge: challenge, code_challenge_method: 'S256', ...(provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : { prompt: 'select_account' }) });
        return json({ authorization_url: endpoint + '?' + query.toString() });
      }
      return json({ error: 'INVALID_ACTION' }, 400);
    } catch (error) {
      return json({ error: error.message === 'AUTH_REQUIRED' ? 'AUTH_REQUIRED' : error.message === 'INVALID_PROVIDER' ? 'INVALID_PROVIDER' : 'REQUEST_FAILED' }, error.message === 'AUTH_REQUIRED' ? 401 : 400);
    }
  };
}
