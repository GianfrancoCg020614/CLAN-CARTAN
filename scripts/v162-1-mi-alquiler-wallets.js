/* MI ALQUILER V162.1 | billetera real compartida y recargas pendientes.
 * Nunca acredita fondos desde el navegador ni transfiere bonos.
 */
(function(){
'use strict';
const get=id=>document.getElementById(id), ss=()=>window.CC_V53_SESSION;
const services=Object.freeze({COBRA_YA:'COBRA YA',STREAM_BULLS:"STREAM BULL'S",MI_COCHERA:'MI COCHERA',MI_ALQUILER:'MI ALQUILER'});
const money=v=>'S/ '+Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const api=(path,method,body)=>window.cc80.api(path,method,body);
const rpc=(fn,data)=>api('rpc/'+fn,'POST',data||{});
const uid=()=>ss()?.userId;
const uuid=()=>{if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const b=new Uint8Array(16);crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);};
const valid=v=>Number.isFinite(v)&&v>=0.01&&v<=100000&&Math.abs(v*100-Math.round(v*100))<0.000001;
let state={userId:'',balances:[],requests:[],loaded:false,loading:false,working:false,error:'',notice:'',receipt:null,method:'LEMON_DALE',pendingForm:false,supportPhone:''};
const clean=()=>{state={userId:'',balances:[],requests:[],loaded:false,loading:false,working:false,error:'',notice:'',receipt:null,method:'LEMON_DALE',pendingForm:false,supportPhone:''};};
function amount(service){return Number(state.balances.find(x=>x.service===service)?.balance_pen||0);}
const serviceOptions=selected=>Object.entries(services).map(([key,label])=>'<option value="'+key+'" '+(selected===key?'selected':'')+'>'+esc(label)+'</option>').join('');
function internals(){
 const selectedFrom=get('ma1621from')?.value||'MI_ALQUILER',selectedTo=get('ma1621to')?.value||'MI_COCHERA';
 const cards=Object.entries(services).map(([id,label])=>'<div class="ma1621-balance"><small>'+esc(label)+'</small><strong>'+money(amount(id))+'</strong></div>').join('');
 const hist=state.requests.slice(0,8).map(r=>'<p>'+esc(new Date(r.created_at).toLocaleDateString('es-PE'))+' · '+money(r.amount_pen)+' · '+esc(r.status==='PENDING'?'Pendiente de verificación':r.status==='APPROVED'?'Acreditado':r.status)+'</p>').join('');
 const transfer='<section class="ma1621-box"><h4>Transferir saldo REAL entre mis billeteras</h4><p>Solo saldo REAL verificado del mismo titular. Los bonos ADMIN/de activación no se transfieren ni se usan en STREAM BULL’S. Las recompensas de referidos se vuelven saldo REAL únicamente al aprobarse y acreditarse.</p><form id="ma1621transfer"><label>De<select name="from" id="ma1621from">'+serviceOptions(selectedFrom)+'</select></label><label>A<select name="to" id="ma1621to">'+serviceOptions(selectedTo)+'</select></label><label>Monto (S/)<input name="amount" type="number" min="0.01" max="100000" step="0.01" required></label><button type="submit" '+(state.working?'disabled':'')+'>Transferir saldo real</button></form></section>';
 const qr='<div class="ma1621-qr"><figure><b>Lemon / DALE · PEN</b><img alt="QR Lemon / DALE compartido" src="assets/qr-dale-gianfranco.svg" loading="lazy"><figcaption>Escanea y verifica el destinatario en la aplicación.</figcaption></figure><figure><b>Binance Pay · USDT</b><img alt="QR Binance Pay personal compartido" src="assets/qr-binance-personal.png" loading="lazy"><figcaption>Verifica destinatario y conversión neta antes de pagar.</figcaption></figure></div>';
 const recharge='<section class="ma1621-box"><h4>Recargar MI ALQUILER · mismo QR que los demás negocios</h4><p>Modo de consulta: la cuenta de cobro comercial sigue sin autorización. <strong>No envíes dinero sin confirmar habilitación del método.</strong> La solicitud y el comprobante nunca acreditan saldo.</p>'+qr+
 '<form id="ma1621recharge"><label>Método<select name="method" id="ma1621method"><option value="LEMON_DALE">Lemon / DALE (PEN)</option><option value="BINANCE">Binance Pay (USDT)</option></select></label><label>Monto a recargar · PEN en Lemon, USDT en Binance<input name="amount" type="number" min="0.01" max="1000" step="0.01" required></label><button type="button" data-ma1621="paid">YA PAGUÉ</button><div id="ma1621details" '+(!state.pendingForm?'hidden':'')+'><label>Nombres y apellidos del depositante<input name="payer" maxlength="120" autocomplete="name"></label><label>Número de operación<input name="operation" maxlength="120" autocomplete="off"></label><button type="submit" '+(state.working?'disabled':'')+'>Registrar solicitud pendiente</button></div></form>'+
 '<p class="ma1621-small">Lemon: ADMIN coteja el abono antes de acreditar. Binance: solo USDT efectivamente recibido y convertido con tasa segura; la referencia no constituye cobro confirmado.</p><div class="ma1621-history"><b>Últimas solicitudes Lemon</b>'+ (hist||'<p>No existen solicitudes registradas.</p>')+'</div></section>';
 const subscription='<section class="ma1621-box"><h4>Suscripción · S/15 por 30 días</h4><p>Saldo real MI ALQUILER: <b>'+money(amount('MI_ALQUILER'))+'</b>. Los bonos promocionales siguen en otra cuenta, no son transferibles.</p><button type="button" data-ma1621="renew" '+(amount('MI_ALQUILER')<15||state.working?'disabled':'')+'>Renovar con S/15 de saldo real</button></section>';
 const support=ss()?.isAdmin?'<section class="ma1621-box"><h4>ADMIN · WhatsApp para recargas</h4><p>Configura el contacto de atención; no se publica CCI ni número de billetera.</p><form id="ma1621support"><label>WhatsApp con código de país<input name="phone" value="'+esc(state.supportPhone||'')+'" placeholder="519xxxxxxxx" required></label><button type="submit">Guardar WhatsApp ADMIN</button></form></section>':'';
 const receipt=state.receipt?'<section class="ma1621-box"><h4>Solicitud registrada · pendiente</h4><p>ADMIN verificará el ingreso; esta declaración NO acredita saldo.</p><button type="button" data-ma1621="notify-admin">'+(state.supportPhone?'Avisar por WhatsApp':'Copiar aviso para ADMIN')+'</button></section>':'';
 return '<div class="ma1621-grid">'+cards+'</div>'+transfer+recharge+receipt+subscription+support;
}
function body(){
 if(!ss()?.jwt)return '<p>Inicia sesión para administrar billeteras.</p>';
 if(state.loading&&!state.loaded)return '<p>Cargando únicamente tus saldos reales verificados…</p>';
 if(state.error)return '<p class="ma1621-error">'+esc(state.error)+'</p><button type="button" data-ma1621="refresh">Reintentar</button>';
 return internals();
}
function mount(){
 const root=get('ma1621panel');if(!root)return;
 const content=get('ma1621body');if(content)content.innerHTML=body();
 const status=get('ma1621status');if(status)status.textContent=state.notice||'';
}
async function reload(){
 if(state.loading||!ss()?.jwt)return;
 const id=uid();state.loading=true;state.error='';mount();
 try{
  const balances=await api('cc_real_service_wallets?select=service,balance_pen&user_id=eq.'+encodeURIComponent(id));
  const requests=await api('cc_manual_recharge_requests?select=id,amount_pen,status,created_at&service=eq.MI_ALQUILER&user_id=eq.'+encodeURIComponent(id)+'&order=created_at.desc&limit=8');
  const contacts=await api('ma_payment_support_settings?select=whatsapp&id=eq.true');
  if(uid()!==id){clean();return;}
  state.balances=Array.isArray(balances)?balances:[];state.requests=Array.isArray(requests)?requests:[];state.supportPhone=Array.isArray(contacts)?String(contacts[0]?.whatsapp||''):'';state.loaded=true;
 }catch(e){state.error=String(e.message||e);}
 finally{state.loading=false;mount();}
}
function panel(context){
 if(!ss()?.jwt||!context?.account)return '';
 if(state.userId!==context.sessionId){clean();state.userId=context.sessionId;}
 if(!state.loaded&&!state.loading)Promise.resolve().then(reload);
 return '<section class="ma1621-box ma1621-main" id="ma1621panel"><header><h3>Mis cuatro billeteras de CLAN CARTAN</h3><button type="button" data-ma1621="refresh">↻ Actualizar</button></header><p>Saldo real transferible verificado · PEN. No mezcla bonos, garantías ni pagos de inquilinos.</p><p role="status" id="ma1621status">'+esc(state.notice)+'</p><div id="ma1621body">'+body()+'</div></section>';
}
let lock=false;
async function onClick(e){
 const b=e.target.closest?.('[data-ma1621]');if(!b)return;e.preventDefault();e.stopPropagation();
 const act=b.dataset.ma1621;
 if(act==='paid'){state.pendingForm=true;const d=get('ma1621details');if(d)d.hidden=false;get('ma1621recharge')?.elements.namedItem('operation')?.focus();return;}
 if(act==='refresh'){state.loaded=false;await reload();return;}
 if(act==='notify-admin'){
  if(!state.receipt)return;
  const r=state.receipt,msg='MI ALQUILER · Recarga pendiente\\nMétodo: '+r.method+'\\nMonto declarado: '+r.amount+' '+(r.method==='BINANCE'?'USDT':'PEN')+'\\nDepositante: '+r.payer+'\\nNº operación: '+r.operation+'\\nVerificar recepción real antes de acreditar.';
  if(state.supportPhone){window.open('https://wa.me/'+state.supportPhone+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');state.notice='WhatsApp abierto, entrega no confirmada.';}
  else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(msg);state.notice='Aviso copiado. ADMIN aún debe configurar WhatsApp.';}
  else{window.prompt('Copia este aviso para ADMIN:',msg);state.notice='Aviso preparado.';}
  mount();return;
 }
 if(lock)return;
 if(act==='renew'){
  if(amount('MI_ALQUILER')<15)return;
  if(!window.confirm('¿Pagar S/15 de tu saldo REAL MI ALQUILER para activar o renovar 30 días?'))return;
  lock=true;state.working=true;try{await rpc('ma_activate_real_wallet',{p_request:uuid()});state.notice='Suscripción activada desde saldo real. Sin tocar el bono.';await reload();await window.ma1612OnOpen?.();}catch(e){state.notice='No se activó: '+String(e.message||e);}finally{lock=false;state.working=false;mount();}
 }
}
async function onSubmit(e){
 const form=e.target.closest?.('#ma1621transfer,#ma1621recharge,#ma1621support');if(!form)return;e.preventDefault();e.stopPropagation();if(lock||!ss()?.jwt)return;
 lock=true;state.working=true;state.notice='Procesando solicitud…';mount();
 try{
  if(form.id==='ma1621support'){
   if(!ss()?.isAdmin)throw Error('Solo ADMIN puede configurar el contacto');
   await rpc('ma_admin_set_support_whatsapp',{p_whatsapp:String(form.elements.namedItem('phone').value||'')});
   state.notice='Número de atención guardado por ADMIN.';
  }else if(form.id==='ma1621transfer'){
   const from=form.elements.namedItem('from').value,to=form.elements.namedItem('to').value,v=Number(form.elements.namedItem('amount').value);
   if(!services[from]||!services[to]||from===to||!valid(v)||v>amount(from))throw Error('Selecciona otra billetera y un importe disponible de saldo REAL');
   await rpc('ma_transfer_real_balance',{p_from:from,p_to:to,p_amount:v,p_request:uuid()});
   state.notice='Transferencia real registrada; bonos permanecen inmóviles.';
  }else{
   const method=form.elements.namedItem('method').value,v=Number(form.elements.namedItem('amount').value);
   const payer=String(form.elements.namedItem('payer').value||'').trim(),operation=String(form.elements.namedItem('operation').value||'').trim();
   if(!valid(v)||v>1000||payer.length<5||!payer.includes(' ')||operation.length<4)throw Error('Completa importe, nombres y número de operación');
   if(method==='LEMON_DALE'){
    await rpc('cc_submit_manual_recharge',{p_service:'MI_ALQUILER',p_amount:v,p_payer_name:payer,p_payer_reference:operation});
    state.notice='Solicitud Lemon PENDIENTE. Solo ADMIN puede acreditar un depósito realmente verificado.';
    state.receipt={method,amount:v,payer,operation};
   }else{
    if(method!=='BINANCE'||v<0.5||operation.length<8)throw Error('USDT/referencia inválidos');
    const quote=await rpc('cc_notify_binance_personal_usdt',{p_service:'MI_ALQUILER',p_received_usdt:v,p_operation:operation});
    state.notice='Aviso Binance PENDIENTE. Cotización neta referencial: '+money(Array.isArray(quote)?quote[0]?.estimated_pen:quote?.estimated_pen)+'. No constituye saldo acreditado.';
    state.receipt={method,amount:v,payer,operation};
   }
  }
  state.pendingForm=false;state.loaded=false;await reload();
 }catch(err){state.notice='No se acreditó ni transfirió: '+String(err.message||err);}finally{lock=false;state.working=false;mount();}
}
function init(){
 document.addEventListener('click',onClick);
 document.addEventListener('submit',onSubmit,true);
 document.addEventListener('click',e=>{if(e.target.closest?.('#cc54logout'))clean();},true);
}
window.ma1621WalletPanel=panel;
window.ma1621RefreshWallet=reload;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
