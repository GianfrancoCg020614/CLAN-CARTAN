/* CLAN CARTAN V127 · Transferencia rápida bidireccional entre billeteras propias.
   Las transferencias de saldos REALES y DE PRUEBA permanecen completamente separadas. */
(function(){
'use strict';
const by=id=>document.getElementById(id);
const nameOf=s=>s==='COBRA_YA'?'COBRA YA':'STREAM BULL’S';
const other=s=>s==='COBRA_YA'?'STREAM_BULLS':'COBRA_YA';
const money=n=>'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const state={from:'COBRA_YA',busy:false,loading:false,balances:{real:null,test:null},sessionId:null};
function mount(){
 if(by('cc127transferModal'))return;
 const balances=by('cc116-account-balances');
 if(balances){
  const quick=document.createElement('button');
  quick.id='cc127transferQuick';quick.type='button';quick.className='cc127-transfer-quick';
  quick.title='Transferir entre mis billeteras';quick.setAttribute('aria-label','Transferir saldo entre COBRA YA y STREAM BULL’S');
  quick.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16m-5-5 5 5-5 5M20 17H4m5-5-5 5 5 5"/></svg><span>Transferir</span>';
  quick.addEventListener('click',()=>open('COBRA_YA'));
  balances.after(quick);
  balances.setAttribute('title','Los importes de esta barra corresponden a saldos de prueba. Los saldos reales se consultan en Transferir.');
 }
 const cobra=by('cy53layer')?.querySelector('.cy114-nav');
 if(cobra&&!by('cc127cobraTransfer')){
  const b=document.createElement('button');
  b.type='button';b.id='cc127cobraTransfer';b.className='secondary cc127-cobra-transfer';
  b.textContent='⇄ Mis billeteras';
  b.addEventListener('click',()=>open('COBRA_YA'));
  cobra.prepend(b);
 }
 const modal=document.createElement('div');
 modal.id='cc127transferModal';modal.hidden=true;modal.className='cc127-modal';
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','cc127title');
 modal.innerHTML='<div class="cc127-panel">'+
 '<div class="cc127-top"><div><span class="cc127-kicker">CLAN CARTAN · MIS BILLETERAS</span><h2 id="cc127title">Transferir saldo</h2></div><button type="button" id="cc127close" aria-label="Cerrar transferencia">✕</button></div>'+
 '<p class="cc127-intro">Mueve tu saldo de COBRA YA a STREAM BULL’S o viceversa, sin salir de tu cuenta.</p>'+
 '<label for="cc127mode">Tipo de saldo</label><select id="cc127mode"><option value="test">Saldo de prueba</option><option value="real">Saldo real confirmado</option></select>'+
 '<div class="cc127-wallets"><div class="cc127-wallet"><small>Desde</small><strong id="cc127fromLabel">COBRA YA</strong><span id="cc127fromBalance">S/ --</span></div>'+
 '<button type="button" id="cc127swap" aria-label="Invertir dirección de transferencia" title="Cambiar sentido">⇄</button>'+
 '<div class="cc127-wallet"><small>Hacia</small><strong id="cc127toLabel">STREAM BULL’S</strong><span id="cc127toBalance">S/ --</span></div></div>'+
 '<label for="cc127amount">Importe a transferir (S/)</label><div class="cc127-amount"><input id="cc127amount" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="0.00"><button type="button" id="cc127all">Todo</button></div>'+
 '<p id="cc127summary" class="cc127-summary">Solo entre tus billeteras. No se permiten retiros ni pagos de préstamos.</p>'+
 '<button type="button" id="cc127send" class="cc127-submit">Transferir</button><p id="cc127status" role="status" aria-live="polite"></p>'+
 '<small class="cc127-note">El saldo real y el saldo de prueba son independientes. Nunca se convierten uno en el otro.</small>'+
 '</div>';
 document.body.appendChild(modal);
 by('cc127close').onclick=close;
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 by('cc127swap').onclick=()=>{state.from=other(state.from);render();by('cc127amount').focus()};
 by('cc127mode').onchange=()=>{by('cc127amount').value='';render()};
 by('cc127amount').oninput=render;
 by('cc127all').onclick=()=>{const b=available();if(b===null){msg('No se pudo consultar el saldo.');return;}by('cc127amount').value=b>0?b.toFixed(2):'';render()};
 by('cc127send').onclick=send;
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});
 document.addEventListener('click',e=>{
  const old=e.target.closest?.('#cy113transfer');
  if(old&&!e.defaultPrevented){
   e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
   open('COBRA_YA');
  }
 },true);
 window.cc127OpenTransfer=open;
}
function close(){if(state.busy)return;const m=by('cc127transferModal');if(m)m.hidden=true;}
function msg(s){const x=by('cc127status');if(x)x.textContent=s;}
function balance(service){
 const mode=by('cc127mode')?.value||'test';
 const values=state.balances[mode];
 if(!values)return null;
 return values[service]??0;
}
function available(){return balance(state.from);}
function render(){
 const m=by('cc127transferModal');if(!m||m.hidden)return;
 const mode=by('cc127mode').value,from=state.from,to=other(from),amount=Number(by('cc127amount').value);
 by('cc127fromLabel').textContent=nameOf(from);by('cc127toLabel').textContent=nameOf(to);
 const v1=balance(from),v2=balance(to);
 by('cc127fromBalance').textContent=v1===null?'Saldo no disponible':money(v1);
 by('cc127toBalance').textContent=v2===null?'Saldo no disponible':money(v2);
 const good=by('cc127amount').value.trim()!==''&&Number.isFinite(amount)&&amount>=0.01&&Number.isInteger(Math.round(amount*100))&&Math.abs(amount*100-Math.round(amount*100))<0.00001&&v1!==null&&amount<=v1;
 const btn=by('cc127send');btn.disabled=state.busy||state.loading||!good;
 btn.textContent=state.busy?'Transfiriendo…':good?'Transferir '+money(amount):'Transferir saldo';
 by('cc127summary').textContent=mode==='real'
 ?'Saldo real confirmado · '+nameOf(from)+' → '+nameOf(to)+'. Solo tu misma cuenta, sin retiros ni envíos a terceros.'
 :'Saldo de prueba · '+nameOf(from)+' → '+nameOf(to)+'. No representa dinero real.';
}
async function refresh(){
 const session=window.CC_V53_SESSION;
 if(!session?.jwt){msg('Tu sesión terminó. Inicia sesión otra vez.');return;}
 state.loading=true;render();
 const uid=session.userId,requested={test:null,real:null};
 try{
  const results=await Promise.allSettled([
   window.cc80.api('rpc/cc_my_test_wallets','POST',{}),
   window.cc80.api('cc_real_service_wallets?select=service,balance_pen&user_id=eq.'+encodeURIComponent(uid))
  ]);
  if(window.CC_V53_SESSION?.userId!==uid){msg('Cambió la cuenta. Cierra esta ventana y vuelve a ingresar.');state.balances={real:null,test:null};return;}
  if(results[0].status==='fulfilled'&&Array.isArray(results[0].value)){
   requested.test={COBRA_YA:0,STREAM_BULLS:0};
   for(const x of results[0].value){if(x.service in requested.test)requested.test[x.service]=Number(x.balance_test||0)}
  }
  if(results[1].status==='fulfilled'&&Array.isArray(results[1].value)){
   requested.real={COBRA_YA:0,STREAM_BULLS:0};
   for(const x of results[1].value){if(x.service in requested.real)requested.real[x.service]=Number(x.balance_pen||0)}
  }
  state.balances=requested;
  if(!requested.test&&!requested.real)msg('No se pudieron consultar las billeteras. Reintenta.');
  else if(!requested[by('cc127mode').value])msg('Ese saldo no está disponible temporalmente.');
  else msg('');
 }catch(e){msg(e.message||'No se pudieron consultar los saldos.');}
 finally{state.loading=false;render();}
}
function open(source){
 if(!window.CC_V53_SESSION?.jwt){if(typeof cc77Auth==='function')cc77Auth(false);return;}
 mount();
 state.from=source==='STREAM_BULLS'?'STREAM_BULLS':'COBRA_YA';
 state.sessionId=window.CC_V53_SESSION.userId;
 state.balances={real:null,test:null};
 by('cc127mode').value='test';by('cc127amount').value='';
 by('cc127transferModal').hidden=false;
 msg('Consultando billeteras…');render();
 void refresh();
 by('cc127amount').focus({preventScroll:true});
}
async function send(){
 if(state.busy||state.loading)return;
 const uid=window.CC_V53_SESSION?.userId,from=state.from,to=other(from),amount=Number(by('cc127amount').value),mode=by('cc127mode').value;
 if(!uid||uid!==state.sessionId){msg('Sesión modificada. Vuelve a ingresar.');return;}
 const avail=available();
 if(avail===null||!Number.isFinite(amount)||amount<=0||amount>avail||Math.abs(amount*100-Math.round(amount*100))>.00001){msg('Revisa el importe y saldo disponible.');return;}
 state.busy=true;render();msg('Realizando transferencia segura…');
 try{
  await window.cc80.api(mode==='real'?'rpc/cc_transfer_real_balance':'rpc/cc_transfer_test_balance','POST',{p_from:from,p_to:to,p_amount:amount});
  if(window.CC_V53_SESSION?.userId!==uid){msg('Transferencia procesada. Actualiza la sesión para ver los saldos.');return;}
  by('cc127amount').value='';
  await refresh();
  msg('✓ '+money(amount)+' transferidos de '+nameOf(from)+' a '+nameOf(to)+'. Saldo actualizado.');
  if(typeof window.cc116RefreshBalances==='function')void window.cc116RefreshBalances();
  if(mode==='test'&&typeof window.cy55?.status==='function')void window.cy55.status();
  if(typeof window.cc123RefreshRealBalances==='function'&&mode==='real')void window.cc123RefreshRealBalances();
 }catch(e){msg('No se realizó la transferencia: '+(e.message||e));}
 finally{state.busy=false;render();}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);
else mount();
})();