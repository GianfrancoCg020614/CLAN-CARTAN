/* CLAN CARTAN V158.3: transferencias de dinero REAL entre tres billeteras del mismo usuario.
 * Bonos ADMIN separados y INTRANSFERIBLES. Solo una operación por referencia idempotente.
 */
(function(){
'use strict';
const by=id=>document.getElementById(id);
const services=['COBRA_YA','STREAM_BULLS','MI_COCHERA'];
const label={COBRA_YA:'COBRA YA',STREAM_BULLS:'STREAM BULL’S',MI_COCHERA:'MI COCHERA'};
const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const state={from:'COBRA_YA',to:'STREAM_BULLS',busy:false,loading:false,balances:null,sessionId:null,requestId:null};
function nameOf(s){return label[s]||'Billetera';}
function msg(s){const el=by('cc127status');if(el)el.textContent=s;}
function resetRequest(){state.requestId=null;}
function mount(){
 if(by('cc127transferModal'))return;
 const balances=by('cc116-account-balances');
 if(balances){
  const button=document.createElement('button');
  button.id='cc127transferQuick';button.type='button';button.className='cc127-transfer-quick';
  button.title='Transferir saldo real entre mis tres billeteras';
  button.setAttribute('aria-label','Transferir saldo real entre COBRA YA, STREAM BULL’S y MI COCHERA');
  button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16m-5-5 5 5-5 5M20 17H4m5-5-5 5 5 5"/></svg><span>Transferir</span>';
  button.addEventListener('click',()=>open('COBRA_YA'));balances.after(button);
  balances.setAttribute('title','Solo saldo real verificado: los bonos gratuitos ADMIN nunca se transfieren.');
 }
 const cobra=by('cy53layer')?.querySelector('.cy114-nav');
 if(cobra&&!by('cc127cobraTransfer')){
  const btn=document.createElement('button');
  btn.type='button';btn.id='cc127cobraTransfer';btn.className='secondary cc127-cobra-transfer';
  btn.textContent='⇄ Mis billeteras';btn.addEventListener('click',()=>open('COBRA_YA'));cobra.prepend(btn);
 }
 const opts=services.map(s=>'<option value="'+s+'">'+nameOf(s)+'</option>').join('');
 const modal=document.createElement('div');
 modal.id='cc127transferModal';modal.hidden=true;modal.className='cc127-modal';
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','cc127title');
 modal.innerHTML='<div class="cc127-panel">'+
 '<div class="cc127-top"><div><span class="cc127-kicker">CLAN CARTAN · 3 BILLETERAS</span><h2 id="cc127title">Transferir saldo real</h2></div><button type="button" id="cc127close" aria-label="Cerrar transferencia">✕</button></div>'+
 '<p class="cc127-intro">Transfiere únicamente dinero real confirmado entre COBRA YA, STREAM BULL’S y MI COCHERA, siempre del mismo usuario.</p>'+
 '<div class="cc127-wallets">'+
 '<div class="cc127-wallet"><label for="cc127fromSelect">Desde</label><select id="cc127fromSelect">'+opts+'</select><strong id="cc127fromLabel"></strong><span id="cc127fromBalance">S/ --</span></div>'+
 '<button type="button" id="cc127swap" aria-label="Invertir dirección de transferencia" title="Cambiar sentido">⇄</button>'+
 '<div class="cc127-wallet"><label for="cc127toSelect">Hacia</label><select id="cc127toSelect">'+opts+'</select><strong id="cc127toLabel"></strong><span id="cc127toBalance">S/ --</span></div></div>'+
 '<label for="cc127amount">Importe a transferir (S/)</label><div class="cc127-amount"><input id="cc127amount" type="number" min="0.01" max="100000" step="0.01" inputmode="decimal" placeholder="0.00"><button type="button" id="cc127all">Todo</button></div>'+
 '<p id="cc127summary" class="cc127-summary"></p>'+
 '<button type="button" id="cc127send" class="cc127-submit">Transferir saldo</button><p id="cc127status" role="status" aria-live="polite"></p>'+
 '<small class="cc127-note">Bonos gratuitos ADMIN: se ven en su billetera, pero no se retiran ni transfieren a otras billeteras o personas.</small>'+
 '</div>';
 document.body.appendChild(modal);
 const style=document.createElement('style');style.id='cc158threeTransferStyles';
 style.textContent='#cc127transferModal .cc127-wallet select{display:block;min-width:0;width:100%;max-width:215px;background:#0a2231;color:#f0f8ff;border:1px solid #6a90a5;padding:9px 7px;border-radius:9px;margin:5px auto 8px;font-size:13px}#cc127transferModal .cc127-wallet strong{display:none}#cc127transferModal .cc127-wallets{gap:8px}#cc127transferModal .cc127-wallet{min-width:0;flex:1}';
 document.head.appendChild(style);
 by('cc127close').onclick=close;
 modal.addEventListener('click',e=>{if(e.target===modal)close();});
 by('cc127fromSelect').onchange=()=>{
  state.from=by('cc127fromSelect').value;resetRequest();by('cc127amount').value='';render();
 };
 by('cc127toSelect').onchange=()=>{
  state.to=by('cc127toSelect').value;resetRequest();by('cc127amount').value='';render();
 };
 by('cc127swap').onclick=()=>{
  if(state.busy)return;
  [state.from,state.to]=[state.to,state.from];
  resetRequest();by('cc127amount').value='';render();by('cc127amount').focus();
 };
 by('cc127amount').oninput=()=>{resetRequest();render();};
 by('cc127all').onclick=()=>{const v=available();if(v===null){msg('No se pudo consultar tu saldo real.');return;}by('cc127amount').value=v>0?v.toFixed(2):'';resetRequest();render();};
 by('cc127send').onclick=send;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close();});
 document.addEventListener('click',e=>{
  const old=e.target.closest?.('#cy113transfer');
  if(old&&!e.defaultPrevented){
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();open('COBRA_YA');
  }
 },true);
 window.cc127OpenTransfer=open;
}
function close(){if(state.busy)return;const m=by('cc127transferModal');if(m)m.hidden=true;}
function balance(service){if(!state.balances)return null;return state.balances[service]??0;}
function available(){return balance(state.from);}
function render(){
 const m=by('cc127transferModal');if(!m||m.hidden)return;
 by('cc127fromSelect').value=state.from;by('cc127toSelect').value=state.to;
 const value=by('cc127amount').value.trim(),amount=Number(value),a=balance(state.from),b=balance(state.to);
 by('cc127fromLabel').textContent=nameOf(state.from);by('cc127toLabel').textContent=nameOf(state.to);
 by('cc127fromBalance').textContent=a===null?'Saldo no disponible':money(a);
 by('cc127toBalance').textContent=b===null?'Saldo no disponible':money(b);
 const valid=value!==''&&Number.isFinite(amount)&&amount>=0.01&&amount<=100000&&Math.abs(amount*100-Math.round(amount*100))<0.00001&&a!==null&&amount<=a&&state.from!==state.to;
 by('cc127send').disabled=state.busy||state.loading||!valid;
 by('cc127send').textContent=state.busy?'Transfiriendo…':valid?'Transferir '+money(amount):'Transferir saldo';
 by('cc127summary').textContent=state.from===state.to?'Selecciona dos billeteras diferentes.':
  'Saldo real verificado · '+nameOf(state.from)+' → '+nameOf(state.to)+'. Bonos ADMIN excluidos. Sin retiros ni transferencias entre usuarios.';
}
async function refresh(){
 const sess=window.CC_V53_SESSION;if(!sess?.jwt){msg('Inicia sesión de nuevo.');return;}
 state.loading=true;render();const uid=sess.userId;
 try{
  const rows=await window.cc80.api('cc_real_service_wallets?select=service,balance_pen&user_id=eq.'+encodeURIComponent(uid));
  if(window.CC_V53_SESSION?.userId!==uid){state.balances=null;msg('La sesión cambió. Cierra esta ventana.');return;}
  const next={COBRA_YA:0,STREAM_BULLS:0,MI_COCHERA:0};
  for(const item of rows){if(Object.prototype.hasOwnProperty.call(next,item.service))next[item.service]=Number(item.balance_pen||0);}
  state.balances=next;msg('');
 }catch(e){state.balances=null;msg('No se pudieron consultar los saldos reales: '+String(e.message||e));}
 finally{state.loading=false;render();}
}
function open(source){
 if(!window.CC_V53_SESSION?.jwt){if(typeof cc77Auth==='function')cc77Auth(false);return;}
 mount();
 state.from=services.includes(source)?source:'COBRA_YA';
 state.to=state.from==='COBRA_YA'?'STREAM_BULLS':'COBRA_YA';
 state.sessionId=window.CC_V53_SESSION.userId;
 state.balances=null;state.busy=false;resetRequest();
 by('cc127amount').value='';
 by('cc127transferModal').hidden=false;
 msg('Consultando tus saldos reales…');render();void refresh();
 by('cc127amount').focus({preventScroll:true});
}
async function send(){
 if(state.busy||state.loading)return;
 const uid=window.CC_V53_SESSION?.userId,from=state.from,to=state.to,amount=Number(by('cc127amount').value);
 if(!uid||uid!==state.sessionId){msg('La sesión cambió. Inicia sesión otra vez.');return;}
 if(from===to||!services.includes(from)||!services.includes(to)){msg('Selecciona origen y destino diferentes.');return;}
 const availableReal=available();
 if(availableReal===null||!Number.isFinite(amount)||amount<0.01||amount>100000||amount>availableReal||Math.abs(amount*100-Math.round(amount*100))>0.00001){msg('Revisa el importe y saldo REAL disponible. Los bonos no cuentan.');return;}
 const request=state.requestId||crypto.randomUUID();state.requestId=request;
 state.busy=true;render();msg('Verificando transferencia segura…');
 try{
  await window.cc80.api('rpc/mc_transfer_real_balance','POST',{p_from:from,p_to:to,p_amount:amount,p_request:request});
  if(window.CC_V53_SESSION?.userId!==uid){msg('Operación registrada; tu sesión cambió.');return;}
  resetRequest();by('cc127amount').value='';await refresh();
  msg('✓ '+money(amount)+' transferidos de '+nameOf(from)+' a '+nameOf(to)+'. Ningún bono fue transferido.');
  if(typeof window.cc116RefreshBalances==='function')void window.cc116RefreshBalances();
  if(typeof window.cc123RefreshRealBalances==='function')void window.cc123RefreshRealBalances();
 }catch(e){msg('No se completó la transferencia: '+String(e.message||e)+'. Puedes reintentar sin duplicarla.');}
 finally{state.busy=false;render();}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();