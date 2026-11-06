/* V326: presentación del saldo central y activación STREAM. No crea billeteras ni cobra. */
(function(){
'use strict';
let owner='',generation=0,value=null,updated=0,attempted=0,pending=null,error='',scheduled=false,dialog=null,quote=null,quoting=false,paying=false;
const session=()=>window.CC_V53_SESSION;
const identity=()=>{const s=session();return s?.userId&&s?.jwt?s.userId+'|'+s.jwt:'';};
const same=k=>!!k&&identity()===k;
const money=n=>'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const node=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const set=(e,t)=>{if(e&&e.textContent!==t)e.textContent=t;};
const api=(p,b={})=>window.cc80.api('rpc/'+p,'POST',b);
function amount(wallet){const n=wallet?.available_pen;if(n===null||n===undefined||n==='')throw Error('Saldo no verificado');const v=Number(n);if(!Number.isFinite(v)||v<0)throw Error('Saldo no verificado');return v;}
function reset(){owner=identity();generation++;value=null;updated=0;attempted=0;pending=null;error='';quote=null;quoting=false;paying=false;close();document.querySelectorAll('.cc326-wallet-summary').forEach(e=>e.remove());}
function context(){const c=window.cc166StreamActivationContext?.();return c&&c.userId===session()?.userId&&c.jwt===session()?.jwt&&c.verified?c:null;}
function accept({userId,jwt,wallet}){
 const key=userId+'|'+jwt;if(!same(key))return;
 if(owner!==key)reset();
 try{value=amount(wallet);updated=Date.now();attempted=updated;error='';generation++;pending=null;}catch(_){value=null;attempted=Date.now();error='Saldo sin verificar';}
 schedule();
}
async function refresh(force=false){
 const key=identity();if(owner!==key)reset();
 if(!key){schedule();return null;}
 if(pending)return pending;
 if(!force&&value!==null&&Date.now()-updated<30000)return {available_pen:value};
 if(!force&&attempted&&Date.now()-attempted<30000)return null;
 if(typeof window.cc80?.api!=='function')return null;
 const seq=++generation;attempted=Date.now();
 const task=(async()=>{await Promise.resolve();try{
  const wallet=await api('cc_finance_wallet');
  if(!same(key)||generation!==seq)return null;
  value=amount(wallet);updated=Date.now();error='';return wallet;
 }catch(_){if(same(key)&&generation===seq){value=null;error='Saldo sin verificar';}return null;}
 finally{if(pending===task)pending=null;schedule();}})();pending=task;return task;
}
function close(){if(dialog){dialog.close?.();dialog.remove();dialog=null;}quote=null;}
function openWallet(){close();window.cc166OpenWallet?.('manual');}
function slots(){
 for(const label of document.querySelectorAll('[data-cc-wallet-amount]'))set(label,identity()&&value!==null?money(value):'Saldo sin verificar');
 const hosts=document.querySelectorAll('#cc166-panel .cc166-top>div:first-child,#cc77home .cc77top,#app .cc117-header,#mc158layer .mc158head>div:first-child,#ma1611layer .ma1611-brand>div,#cy53layer .cc127-cobra-brand>div,[data-cc-wallet-host]');
 for(const host of hosts){
  let badge=host.querySelector(':scope > .cc326-wallet-summary');
  if(!identity()){badge?.remove();continue;}
  if(!badge){badge=node('div','cc326-wallet-summary');badge.setAttribute('role','status');badge.setAttribute('aria-live','polite');host.append(badge);}
  set(badge,'Billetera CLAN CARTAN · '+(value===null?(error||'Consultando saldo…'):money(value)));
 }
 // Fallback de fixtures y catálogos sin cabecera. Un único saldo por cabecera.
 const section=document.querySelector('#productos .v23-catalog-section .section-head');
 if(section&&!document.querySelector('#app .cc117-header')){
  let badge=section.querySelector('.cc326-wallet-summary');
  if(identity()){if(!badge){badge=node('div','cc326-wallet-summary');section.append(badge);}set(badge,'Billetera CLAN CARTAN · '+(value===null?(error||'Consultando saldo…'):money(value)));}else badge?.remove();
 }
}
function catalogAction(){
 const c=context();
 for(const existing of document.querySelectorAll('.cc217-stream .cc77actions button:nth-child(2)')){const hide=!!c&&(c.admin||c.active);if(existing.hidden!==hide)existing.hidden=hide;}
 const host=document.querySelector('#productos .v23-catalog-section .section-head');if(!host)return;
 const show=!identity()||!!c&&!c.admin&&!c.active;
 let b=host.querySelector('.cc326-distributor-cta');
 if(!show){b?.remove();return;}
 if(!b){b=node('button','cc326-distributor-cta','Acceder a precio distribuidor');b.type='button';b.addEventListener('click',()=>void open());host.append(b);}
}
function drawDialog(){
 if(!dialog||!quote||!same(quote.key))return;
 const balance=value,shortfall=balance===null?null:Math.max(0,quote.amount-balance);
 set(dialog.querySelector('[data-field=price]'),money(quote.amount)+' · un año');
 set(dialog.querySelector('[data-field=balance]'),balance===null?(error||'Consultando…'):money(balance));
 set(dialog.querySelector('[data-field=shortfall]'),shortfall===null?'Por verificar':money(shortfall));
 const pay=dialog.querySelector('[data-action=activate]');pay.disabled=paying||quoting||balance===null||shortfall>0;
 set(pay,paying?'Procesando…':'Activar con mi saldo');
 const recharge=dialog.querySelector('[data-action=recharge]');recharge.hidden=shortfall===0;recharge.disabled=paying;
 dialog.querySelector('[data-action=close]').disabled=paying;
 set(dialog.querySelector('[data-pending]'),context()?.pendingRecharge?'Recarga en verificación. Solo puedes utilizar el saldo ya confirmado.':'');
}
async function loadQuote(){
 const target=dialog,key=identity();if(!target||!key)return;quoting=true;quote=null;
 target.querySelector('[data-action=activate]').disabled=true;set(target.querySelector('[data-message]'),'Verificando tarifa y vigencia…');
 try{
  const [rates,access]=await Promise.all([api('cc_finance_rates'),api('cc_portal_my_business_access_v316'),refresh(true)]);
  if(target!==dialog||!same(key))return;
  const rate=Array.isArray(rates)&&rates.find(r=>r.service==='STREAM_BULLS');
  const rows=access?.business_access;
  const stream=Array.isArray(rows)&&rows.find(r=>r.service==='STREAM_BULLS');
  if(!rate||!Number.isFinite(Number(rate.amount_pen))||Number(rate.amount_pen)<=0||!stream)throw Error('No se pudo verificar la tarifa y el acceso. Cierra y vuelve a intentar.');
  if(stream.status==='ACTIVE'&&Date.parse(stream.active_until)>Date.now()){close();window.cc169RefreshCatalog?.();return;}
  if(['SUSPENDED','PENDING'].includes(stream.status))throw Error('Tu membresía necesita revisión. Contacta con CLAN CARTAN antes de activar.');
  quote={key,amount:Number(rate.amount_pen)};
  set(target.querySelector('[data-message]'),value===null?'No pudimos verificar tu saldo. Cierra y vuelve a consultar.':'La activación es voluntaria y se cobra una sola vez al confirmar.');
 }catch(e){if(target===dialog&&same(key))set(target.querySelector('[data-message]'),String(e.message||e));}
 finally{if(target===dialog){quoting=false;drawDialog();}}
}
async function pay(){
 if(paying||quoting||!quote||!same(quote.key)||value===null||value<quote.amount)return;
 const target=dialog,selected=quote,key=selected.key;paying=true;drawDialog();
 try{
  if(typeof window.cc166ActivateStreamFromDialog!=='function')throw Error('El panel todavía está preparando tu cuenta. Intenta nuevamente en unos segundos.');
  const result=await window.cc166ActivateStreamFromDialog({expected:selected.amount,userId:session().userId,jwt:session().jwt});
  if(target!==dialog||!same(key))return;
  if(result?.status==='CANCELLED'){set(target.querySelector('[data-message]'),'Activación cancelada.');return;}
  if(result?.active_until&&result.status!=='REFUNDED'){
   close();await refresh(true);if(!same(key))return;window.cc169OpenCatalog?.();window.cc169RefreshCatalog?.();return;
  }
  set(target.querySelector('[data-message]'),'No se confirmó la activación. Revisa tus movimientos antes de reintentar.');
 }catch(e){if(target===dialog&&same(key))set(target.querySelector('[data-message]'),String(e.message||e));}
 finally{if(target===dialog&&same(key)){paying=false;drawDialog();}else if(!dialog)paying=false;}
}
async function open(){
 if(!identity()){window.cc77Auth?.(false);return;}
 if(owner!==identity())reset();
 const c=context();if(c?.admin||c?.active){window.cc169OpenCatalog?.();return;}
 if(dialog){dialog.focus();return;}
 dialog=node('dialog','cc326-activation');dialog.id='cc326-activation';dialog.setAttribute('aria-labelledby','cc326-title');
 const title=node('h2','','STREAM BULL’S');title.id='cc326-title';
 dialog.append(title,node('p','cc326-benefits','Accede al precio distribuidor de las publicaciones disponibles con tu membresía vigente. La activación solo corresponde a STREAM BULL’S.'));
 const facts=node('dl','cc326-facts');for(const [field,label] of [['price','Activación'],['balance','Saldo disponible'],['shortfall','Importe faltante']]){const line=node('div','');line.append(node('dt','',label));const dd=node('dd','','Consultando…');dd.dataset.field=field;line.append(dd);facts.append(line);}dialog.append(facts);
 const message=node('p','cc326-message','');message.dataset.message='';message.setAttribute('role','status');dialog.append(message);
 const pendingNote=node('p','cc326-message','');pendingNote.dataset.pending='';dialog.append(pendingNote);
 const actions=node('div','cc326-actions');for(const [action,label,fn] of [['recharge','Recargar',openWallet],['activate','Activar con mi saldo',()=>void pay()],['close','Cerrar',close]]){const b=node('button','',label);b.type='button';b.dataset.action=action;b.addEventListener('click',fn);if(action==='activate')b.disabled=true;actions.append(b);}dialog.append(actions,node('small','cc326-credit','Creado por CLAN CARTAN'));
 const target=dialog;target.addEventListener('cancel',e=>{if(paying){e.preventDefault();return;}close();});
 document.body.append(target);
 if(typeof target.showModal!=='function'){close();window.cc166OpenBusiness?.('STREAM_BULLS');return;}
 target.showModal();await loadQuote();
}
function render(){if(owner!==identity())reset();slots();catalogAction();drawDialog();if(identity()&&(!attempted||Date.now()-attempted>30000))void refresh();}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;render();});}
window.cc326Wallet={refresh,accept};window.cc326OpenStreamActivation=open;
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
window.addEventListener('focus',()=>{if(!document.hidden)void refresh(true);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh(true);});
document.addEventListener('cc192-session-ended',()=>{reset();schedule();});
setInterval(()=>{if(!document.hidden&&identity())void refresh(true);},45000);
schedule();
})();
