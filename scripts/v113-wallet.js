/* CLAN CARTAN V113: UX de billeteras y activación por descuento confirmado.
 * SOLO saldo ficticio hasta que exista proveedor de pagos verificados. */
(function(){
'use strict';
const by=id=>document.getElementById(id);
const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const cards=[
'<div class="cy113-head"><div><span class="cy113-label">COBRA YA · MI CUENTA</span><h3>Mi acceso y billetera</h3></div><span class="cy113-badge" id="cy55state" role="status" aria-live="polite">Consultando...</span></div>',
'<div class="cy113-stats"><div><small>Saldo COBRA YA</small><strong id="cy55balance">S/ 0.00</strong></div><div><small>Plan mensual</small><strong>S/ 15.00 <em>/ 30 días</em></strong></div><div><small>Vence</small><strong id="cy113due">Sin activar</strong></div></div>',
'<div class="cy113-buttons"><button class="cy113-pay" id="cy55pay" type="button">Activar por S/ 15</button><button class="cy113-secondary" id="cy113recharge" type="button">＋ Recargar</button><button class="cy113-secondary" id="cy113transfer" type="button">⇄ Transferir</button></div>',
'<div class="cy113-extra" id="cy113topup" hidden><label for="cy113amount">Solicitar saldo de prueba (S/)</label><div class="cy113-action"><input type="number" id="cy113amount" min="1" max="1000" step="0.01" value="30" inputmode="decimal"><button type="button" id="cy113topupGo">Solicitar recarga</button></div><small>Solo simulación. La recarga necesita aprobación antes de acreditarse; no envíes dinero real.</small></div>',
'<div class="cy113-extra" id="cy113transferArea" hidden><label for="cy113transferAmount">Desde STREAM BULL’S <span id="cy113streamBalance">(saldo: S/ 0.00)</span></label><div class="cy113-action"><input type="number" id="cy113transferAmount" min="0.01" step="0.01" value="15" inputmode="decimal"><button type="button" id="cy113transferGo">Transferir a COBRA YA</button></div><small>Únicamente entre tus billeteras. No permite retiros ni transferencias a otras personas.</small></div>',
'<p id="cy55msg" class="cy113-message" role="status" aria-live="polite"></p><small class="cy113-note">Saldo de prueba · Sin cobros automáticos · El pago activa el plan sin aprobación del ADMIN.</small>'
];
const sub=by('cy55subscription');
if(!sub||!window.cy55||!window.cy54||!window.cc80)return;
sub.classList.add('cy113-card');sub.innerHTML=cards.join('');
const oldRefreshAuth=cy54.refreshAuth;
cy54.refreshAuth=async function(){
  await oldRefreshAuth.call(this);
  const session=window.CC_V53_SESSION;
  const duplicated=by('cy54membership');if(duplicated)duplicated.style.display='none';
  if(session&&!session.isAdmin)await cy55.status();
};
const oldClose=cy53.close;
cy53.close=function(){oldClose();if(typeof cc77Home==='function')cc77Home();};
const oldWalletOpen=cc80.open;
cc80.open=function(){
 const portal=by('cc77home');if(portal)portal.style.display='none';
 const cobra=by('cy53layer');if(cobra)cobra.style.display='none';
 const back=by('cc77back');if(back)back.style.display='block';
 return oldWalletOpen.call(this);
};
let paying=false;
cy55.status=async function(){
 const session=window.CC_V53_SESSION;if(!session||session.isAdmin)return;
 sub.style.display='block';
 const pay=by('cy55pay'),state=by('cy55state'),message=by('cy55msg');
 pay.disabled=true;
 try{
  const [status,members]=await Promise.all([
   cy54.api('rpc/cy_subscription_status','POST',{}),
   cy54.api('cc_memberships?select=status,role,cc_businesses(code)&user_id=eq.'+encodeURIComponent(session.userId))
  ]);
  const x=Array.isArray(status)?status[0]||{}:{};
  const member=Array.isArray(members)?members.find(m=>m.cc_businesses?.code==='COBRA_YA'):null;
  const active=Boolean(x.authorized&&x.active),suspended=member?.status==='SUSPENDED';
  const balance=Number(x.balance_test||0);
  state.textContent=suspended?'Suspendido':active?'Activo':x.active?'Acceso restringido':'Sin activar';
  state.className='cy113-badge'+(active?' active':suspended?' blocked':'');
  by('cy55balance').textContent=money(balance);
  by('cy113due').textContent=active&&x.expires_at?new Date(x.expires_at).toLocaleDateString('es-PE'):'Sin activar';
  pay.textContent=active?'Plan vigente':suspended?'Contactar soporte':balance<15?'Saldo insuficiente':'Activar por S/ 15';
  pay.disabled=paying||active||suspended||balance<15;
  const quick=document.querySelector('#cy53layer .cy75quick');
  if(quick&&!session.isAdmin)quick.hidden=!active;
  ['cy53client','cy53loan','cy53clients','cy60loanrecords'].forEach(id=>{const panel=by(id)?.closest('section');if(panel)panel.style.display=active?'block':'none';});
  document.querySelectorAll('#cy53client button[type="submit"],#cy53loan button[type="submit"],#cy53layer .cy53pay').forEach(b=>b.disabled=!active);
  if(!active){
   const clients=by('cy53clients'),records=by('cy60loanrecords');
   if(clients)clients.textContent='Activa el plan para consultar tus clientes.';
   if(records)records.textContent='Activa el plan para consultar tus préstamos.';
  }
  if(!paying&&!active&&!suspended&&balance<15&&message.dataset.done!=='yes')message.textContent='Recarga o transfiere saldo para activar.';
 }catch(e){
  state.textContent='No se pudo verificar el acceso';
  pay.disabled=true;
  const quick=document.querySelector('#cy53layer .cy75quick');if(quick)quick.hidden=true;
  ['cy53client','cy53loan','cy53clients','cy60loanrecords'].forEach(id=>{const panel=by(id)?.closest('section');if(panel)panel.style.display='none';});
  message.textContent='Reintenta más tarde: '+(e.message||'Error de red');
 }
};
cy55.pay=async function(){
 if(paying||!window.CC_V53_SESSION||window.CC_V53_SESSION.isAdmin)return;
 if(!confirm('¿Confirmas descontar S/ 15 de tu billetera de PRUEBA para activar COBRA YA durante 30 días?'))return;
 paying=true;const pay=by('cy55pay'),message=by('cy55msg');
 pay.disabled=true;pay.textContent='Activando...';message.textContent='Confirmando el pago y tu acceso...';
 let charged=false;
 try{
  await cy54.api('rpc/cy_pay_subscription_test','POST',{});charged=true;
  await cy54.refreshAuth();
  if(window.CC_V53_SESSION?.isReseller)await cy53.refresh();
  message.textContent='✓ S/ 15 descontados. Plan activo por 30 días, sin autorización manual.';
  message.dataset.done='yes';
 }catch(e){
  message.textContent=charged?'El pago se registró, pero no se pudo actualizar la pantalla. Recarga para consultar el estado.':'No se realizó el descuento: '+(e.message||'No fue posible activar');
  message.dataset.done='yes';
 }finally{paying=false;await cy55.status();}
};
function show(id){const el=by(id);if(el){el.hidden=!el.hidden;if(!el.hidden&&id==='cy113transferArea')refreshStream();}}
by('cy55pay').addEventListener('click',()=>cy55.pay());
by('cy113recharge').addEventListener('click',()=>show('cy113topup'));
by('cy113transfer').addEventListener('click',()=>show('cy113transferArea'));
const validAmount=(num,min,max)=>Number.isFinite(num)&&num>=min&&num<=max&&Math.abs(Math.round(num*100)-num*100)<0.000001;
async function recharge(service,inputId,messageId,button){
 const amount=Number(by(inputId)?.value),output=by(messageId);
 if(!validAmount(amount,1,1000)){output.textContent='Indica un monto válido entre S/ 1 y S/ 1,000, con máximo dos decimales.';return;}
 button.disabled=true;output.textContent='Enviando solicitud de prueba...';
 try{
  await cc80.api('rpc/cc_request_test_topup','POST',{p_service:service,p_amount:amount});
  output.textContent='✓ Solicitud recibida. El saldo se abonará después de aprobar la recarga ficticia.';
  output.dataset.done='yes';
 }catch(e){output.textContent='Solicitud no realizada: '+(e.message||'Error de conexión');}
 finally{button.disabled=false;}
}
by('cy113topupGo').addEventListener('click',e=>recharge('COBRA_YA','cy113amount','cy55msg',e.currentTarget));
async function refreshStream(){
 if(!window.CC_V53_SESSION)return;
 try{
  const wallets=await cc80.api('rpc/cc_my_test_wallets','POST',{});
  const stream=Array.isArray(wallets)?wallets.find(x=>x.service==='STREAM_BULLS'):null;
  const v=money(stream?.balance_test);
  const fields=[by('cy113streamBalance'),by('cc113sbBalance')];
  if(fields[0])fields[0].textContent='(saldo: '+v+')';
  if(fields[1])fields[1].textContent=v;
 }catch(e){console.warn('Saldo Stream Bull no disponible',e.message);}
}
by('cy113transferGo').addEventListener('click',async e=>{
 const amount=Number(by('cy113transferAmount').value),message=by('cy55msg'),button=e.currentTarget;
 if(!validAmount(amount,0.01,100000)){message.textContent='Importe no válido.';return;}
 if(!confirm('¿Transferir '+money(amount)+' desde tu propia billetera Stream Bull’s a COBRA YA?'))return;
 button.disabled=true;message.textContent='Realizando transferencia...';
 try{
  await cc80.api('rpc/cc_transfer_test_balance','POST',{p_from:'STREAM_BULLS',p_to:'COBRA_YA',p_amount:amount});
  await Promise.all([cy55.status(),refreshStream()]);
  message.textContent='✓ Transferencia entre tus billeteras realizada.';message.dataset.done='yes';
 }catch(err){message.textContent='Transferencia no realizada: '+(err.message||'Error de red');}
 finally{button.disabled=false;}
});
const pop=by('cc93-affiliate');
if(pop){
 const m=by('cc93-message'),badge=document.createElement('div');
 badge.className='cc113-stream-wallet';
 badge.innerHTML='<span>Mi billetera STREAM BULL’S<br><small>Saldo de prueba</small></span><strong id="cc113sbBalance">S/ 0.00</strong>';
 m.before(badge);
 const oldRecharge=[...pop.querySelectorAll('button')].find(b=>b.textContent.includes('Solicitar recarga'));
 if(oldRecharge){
  oldRecharge.removeAttribute('onclick');
  oldRecharge.textContent='＋ Recargar billetera';
  oldRecharge.classList.add('cc113-recharge-btn');
  const area=document.createElement('div');area.className='cc113-stream-topup';area.id='cc113sbTopup';area.hidden=true;
  area.innerHTML='<label for="cc113sbAmount">Importe de prueba (S/)</label><input id="cc113sbAmount" type="number" min="1" max="1000" step="0.01" value="20" inputmode="decimal"><button type="button" id="cc113sbSend">Solicitar recarga</button><small>Sin pago real. La recarga de prueba está sujeta a aprobación.</small>';
  oldRecharge.after(area);
  oldRecharge.addEventListener('click',()=>show('cc113sbTopup'));
  by('cc113sbSend').addEventListener('click',e=>recharge('STREAM_BULLS','cc113sbAmount','cc93-message',e.currentTarget));
 }
 const oldBenefits=window.cc79StreamBenefits;
 if(typeof oldBenefits==='function')window.cc79StreamBenefits=async function(){await oldBenefits();await refreshStream();};
 const oldPay=window.cc93PayAffiliation;
 if(typeof oldPay==='function')window.cc93PayAffiliation=async function(){await oldPay();await refreshStream();};
}
const wallet=by('cc80wallet');
if(wallet){
 const details=document.createElement('details');details.className='cc113-central-topup';
 details.innerHTML='<summary>＋ Recargar una billetera (prueba)</summary><label for="cc113centralService">Billetera</label><select id="cc113centralService"><option value="COBRA_YA">COBRA YA</option><option value="STREAM_BULLS">STREAM BULL’S</option></select><label for="cc113centralAmount">Importe en soles</label><input id="cc113centralAmount" type="number" min="1" max="1000" step="0.01" value="30"><button type="button" id="cc113centralSend">Solicitar recarga</button><small>La solicitud es ficticia y necesita validación para acreditar el saldo.</small>';
 by('cc80refresh').after(details);
 const back=document.createElement('button');back.type='button';back.textContent='← Volver a CLAN CARTAN';back.className='cc113-back';details.after(back);
 back.addEventListener('click',()=>{if(typeof cc77Home==='function')cc77Home();});
 by('cc113centralSend').addEventListener('click',e=>{
  recharge(by('cc113centralService').value,'cc113centralAmount','cc80status',e.currentTarget);
 });
}
window.cc113={refreshStream};
})();