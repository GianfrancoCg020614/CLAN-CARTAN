/* CLAN CARTAN · MI ALQUILER V161.3
 * Cobros y costos entre arrendador e inquilino; nunca son dinero de la billetera CLAN CARTAN.
 * Únicamente backend ma_* de Supabase, sin claves privilegiadas ni pasarelas no verificadas.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const ss=()=>window.CC_V53_SESSION;
const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const cash=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const n=v=>Number(v||0);
const uuid=()=>{
 if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
 bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const h=Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
 return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
};
const rpc=(p,body)=>window.cc80.api('rpc/'+p,'POST',body||{});
const api=(p)=>window.cc80.api(p);
let state={userId:null,ledger:[],meters:[],guarantees:[],expenses:[],adminAccounts:[],subscriptions:[],loaded:false,loading:false,error:null},current=null;
const reset=()=>{state={userId:null,ledger:[],meters:[],guarantees:[],expenses:[],adminAccounts:[],subscriptions:[],loaded:false,loading:false,error:null};current=null;};
const leaseName=(l,context)=>{const u=context.units.find(a=>Number(a.id)===Number(l.unit_id))||{},t=context.tenants.find(a=>a.id===l.tenant_id)||{};return (u.code||((u.kind==='LOCAL'?'L-':'H-')+String(u.serial||0).padStart(3,'0')))+' · '+(t.full_name||'Inquilino');};
const balance=id=>state.ledger.filter(m=>m.lease_id===id).reduce((s,m)=>s+n(m.amount_pen),0);
const held=id=>state.guarantees.filter(m=>m.lease_id===id).reduce((s,m)=>s+(m.action==='RECEIVED'?n(m.amount_pen):-n(m.amount_pen)),0);
const btn=(act,text,params='')=>'<button type="button" data-ma3-action="'+act+'" '+params+'>'+text+'</button>';
const badge=(label)=>'<small class="ma3-pill">'+esc(label)+'</small>';
function panel(title,body){return '<div class="ma3-wrap"><header class="ma3-header"><div><small>MI ALQUILER · V161.3</small><h3>'+title+'</h3><p>Contabilidad de alquileres independiente de billeteras CLAN CARTAN.</p></div>'+btn('refresh','↻ Actualizar')+'</header><p class="ma3-status" id="ma3-status" role="status"></p>'+body+'</div>';}
function message(text,isError=false){const p=$('ma3-status')||$('ma3-dialog-status');if(p){p.textContent=text;p.classList.toggle('ma3-error',isError);}else if(isError)console.warn('MI ALQUILER',text);}
function closedAccount(a){
 const bonus=n(a.bonus_pen);return panel('Suscripción MI ALQUILER','<section class="ma3-card"><h4>Tu cuenta ALQUILER está '+(a.suspended?'suspendida':'sin membresía vigente')+'</h4><p>Código: '+esc(a.invite_code)+' · S/ 15 por 30 días · renovación voluntaria.</p><p>Bono ADMIN: <b>'+cash(bonus)+'</b> · Saldo real confirmado: '+cash(a.real_verified_pen)+' (cobros externos bloqueados)</p><p>Todos tus datos anteriores permanecen guardados.</p>'+btn('activate','Activar con S/ 15 del bono',bonus>=15&&!a.suspended?'':'disabled')+'<p class="ma3-small">El bono no se puede retirar ni transferir. Un ADMIN puede otorgarlo en su panel.</p></section>'+(window.ma1621WalletPanel?.({account:a,sessionId:ss()?.userId})||''));
}
function adminBox(context){if(context.account.role!=='ADMIN')return '';
 const entries=state.adminAccounts.filter(a=>a.user_id!==context.sessionId);
 return '<section class="ma3-card"><h4>ADMIN · RESELLER y bonos de activación</h4><p>No se registran recargas ni ingresos reales desde este panel. S/15 por 30 días con bono promocional.</p><form data-ma3-form="bonus"><label>RESELLER<select name="reseller" required>'+entries.map(a=>'<option value="'+esc(a.user_id)+'">'+esc(a.invite_code)+' · Bono '+cash(a.bonus_pen)+'</option>').join('')+'</select></label><label>Bono gratuito en PEN<input name="amount" type="number" min="0.01" max="10000" step="0.01" required></label><label>Motivo<input name="note" maxlength="250" value="Bono ADMIN de bienvenida"></label><button type="submit" '+(!entries.length?'disabled':'')+'>Otorgar bono no transferible</button></form><div class="ma3-table"><table><thead><tr><th>Código</th><th>Bono</th><th>Vigencia</th></tr></thead><tbody>'+entries.map(a=>'<tr><td>'+esc(a.invite_code)+'</td><td>'+cash(a.bonus_pen)+'</td><td>'+esc(a.subscription_until?new Date(a.subscription_until).toLocaleDateString('es-PE'):'Sin activar')+'</td></tr>').join('')+'</tbody></table></div></section>';
}
function finance(context){
 const total=Math.max(0,state.ledger.reduce((s,m)=>s+n(m.amount_pen),0));
 const collected=state.ledger.filter(m=>m.kind==='PAYMENT').reduce((s,m)=>s-n(m.amount_pen),0);
 const expenses=state.expenses.reduce((s,m)=>s+n(m.amount_pen),0);
 const blocked=state.guarantees.reduce((s,m)=>s+(m.action==='RECEIVED'?n(m.amount_pen):-n(m.amount_pen)),0);
 let cards='<div class="ma3-stats"><div><small>Saldo por cobrar (contratado)</small><b>'+cash(total)+'</b></div><div><small>Alquileres cobrados</small><b>'+cash(collected)+'</b></div><div><small>Gastos registrados</small><b>'+cash(expenses)+'</b></div><div><small>Garantías custodiadas</small><b>'+cash(blocked)+'</b></div></div>';
 cards+='<section class="ma3-card"><h4>Invita a MI ALQUILER</h4><p>Tu código personal: <strong>'+esc(context.account.invite_code||'—')+'</strong></p>'+btn('share-invite','Copiar enlace de invitación')+'<p class="ma3-small">El referido se atribuye a tu código. No se activan suscripciones ni bonos automáticamente.</p></section>';
 cards+='<section class="ma3-card"><h4>Billetera MI ALQUILER (suscripción)</h4><p>Saldo real verificado: <b>'+cash(context.account.real_verified_pen)+'</b> · Bono gratuito: <b>'+cash(context.account.bonus_pen)+'</b></p><p>Suscripción hasta '+esc(context.account.subscription_until?new Date(context.account.subscription_until).toLocaleDateString('es-PE'):'sin activar')+' · S/15 por 30 días</p>'+btn('activate','Renovar 30 días con bono',n(context.account.bonus_pen)>=15?'':'disabled')+'<p class="ma3-small">No se habilitan depósitos Lemon, Binance ni transferencia de saldos hasta verificar proveedores y sus permisos.</p></section>';
 cards+=adminBox(context);
 const active=context.leases.filter(x=>x.state==='ACTIVE');
 cards+='<section class="ma3-card"><h4>Gastos de mantenimiento y operación</h4>'+btn('expense','＋ Registrar gasto')+'<p class="ma3-small">Son gastos del arrendador, no deuda del inquilino.</p></section>';
 cards+='<h4>Estado de contratos</h4>';
 cards+=context.leases.length?'<div class="ma3-contracts">'+context.leases.map(l=>{
  const entries=state.ledger.filter(x=>x.lease_id===l.id);
  const balanceAll=Math.max(0,balance(l.id));
  const due=entries.filter(x=>x.due_on<=(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()))).reduce((s,x)=>s+n(x.amount_pen),0);
  return '<article class="ma3-card"><div class="ma3-title"><div><h4>'+esc(leaseName(l,context))+'</h4><small>'+esc(l.mode==='DAY'?'Alquiler diario':'Alquiler mensual')+' · '+esc(l.state==='ACTIVE'?'Ocupado':'Finalizado')+'</small></div><div><strong>'+cash(balanceAll)+'</strong>'+badge('Exigible aprox. '+cash(Math.max(0,due)))+'</div></div><p>Garantía a devolver o aplicar: '+cash(held(l.id))+'</p><div class="ma3-actions">'+btn('payment','Cobrar','data-lease="'+l.id+'"')+(l.state==='ACTIVE'?btn('meter','Medidor','data-lease="'+l.id+'"')+btn('fixed','Tarifa fija','data-lease="'+l.id+'"'):'')+btn('guarantee','Garantía','data-lease="'+l.id+'"')+btn('history','Historial','data-lease="'+l.id+'"')+'</div></article>';
 }).join('')+'</div>':'<p>Aún no hay contratos. Regístralos en «Alquileres y vencimientos».</p>';
 cards+='<section class="ma3-card"><h4>Últimos gastos</h4><div class="ma3-table"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Monto</th></tr></thead><tbody>'+state.expenses.slice(0,15).map(e=>'<tr><td>'+esc(e.occurred_on)+'</td><td>'+esc(e.category)+' · '+esc(e.description)+'</td><td>'+cash(e.amount_pen)+'</td></tr>').join('')+'</tbody></table></div></section>';
 return panel('Cobros y servicios',cards+(window.ma1621WalletPanel?.(context)||''));
}
async function fetchMore(context,rerender){
 if(state.loading||state.loaded&&state.userId===context.sessionId)return;
 state.loading=true;state.userId=context.sessionId;
 try{
  const q='&reseller_id=eq.'+encodeURIComponent(context.sessionId);
  const urls=['ma_ledger?select=*&order=created_at.desc&limit=3000'+q,'ma_meter_readings?select=*&order=created_at.desc&limit=1500'+q,'ma_guarantee_events?select=*&order=created_at.desc&limit=1500'+q,'ma_expenses?select=*&order=created_at.desc&limit=1500'+q,'ma_subscription_events?select=*&order=created_at.desc&limit=100'+q];
  if(context.account.role==='ADMIN')urls.push('ma_accounts?select=user_id,invite_code,bonus_pen,subscription_until,suspended&order=created_at.desc&limit=200');
  const items=await Promise.all(urls.map(api));
  if(ss()?.userId!==context.sessionId){reset();return;}
  [state.ledger,state.meters,state.guarantees,state.expenses,state.subscriptions]=items.slice(0,5).map(i=>Array.isArray(i)?i:[]);
  state.adminAccounts=Array.isArray(items[5])?items[5]:[];state.loaded=true;state.error=null;
 }catch(e){state.loaded=false;state.error='No se pudo cargar contabilidad: '+String(e.message||e);}
 finally{state.loading=false;rerender?.();}
}
function enhance(area,target,context){
 if(!context?.account||!ss()?.jwt)return false;
 if(!context.account.active){target.innerHTML=closedAccount(context.account);return true;}
 if(area!=='finanzas')return false;
 if(state.userId!==context.sessionId)reset();
 current=context;
 if(state.error){target.innerHTML=panel('Cobros y servicios','<p class="ma3-error">'+esc(state.error)+'</p>');return true;}
 if(!state.loaded){target.innerHTML=panel('Cobros y servicios',state.loading?'<p>Sincronizando contabilidad…</p>':'<p>Consultando movimientos protegidos…</p>');void fetchMore(context,()=>{if($('ma1611content')&&current?.sessionId===context.sessionId&&$('ma1611layer')?.querySelector('.ma1611-nav button[data-area="finanzas"].active'))window.ma1612Enhance?.('finanzas',$('ma1611content'));});return true;}
 target.innerHTML=finance(context);return true;
}
function dialog(title,body){$('ma3dialog')?.remove();const d=document.createElement('div');d.className='ma1612-dialog ma3-dialog';d.id='ma3dialog';d.innerHTML='<section role="dialog" aria-modal="true"><header><h3>'+esc(title)+'</h3><button type="button" data-ma3-action="dismiss">✕</button></header>'+body+'<p id="ma3-dialog-status" role="status"></p></section>';document.body.append(d);}
const inp=(label,name,more='')=>'<label>'+label+'<input name="'+name+'" required '+more+'></label>';
function leaseDialog(act,id){const lease=current?.leases.find(x=>x.id===id),pname=lease?leaseName(lease,current):'';if(!lease)return;
 let form='';
 if(act==='payment')form='<form data-ma3-form="payment" data-lease="'+id+'"><p>'+esc(pname)+' · Saldo contratado '+cash(Math.max(0,balance(id)))+'</p>'+inp('Abono recibido (S/)','amount','type="number" min="0.01" step="0.01"')+'<label>Medio<select name="method"><option>EFECTIVO</option><option>YAPE</option><option>PLIN</option><option>TRANSFERENCIA</option></select></label><button type="submit">Registrar abono</button></form>';
 if(act==='fixed')form='<form data-ma3-form="fixed" data-lease="'+id+'"><p>Se registra solo una tarifa por servicio y mes.</p>'+inp('Servicio (agua, internet, etc.)','service','maxlength="50"')+inp('Importe (S/)','amount','type="number" step="0.01" min="0.01"')+'<button type="submit">Agregar tarifa del mes</button></form>';
 if(act==='meter')form='<form data-ma3-form="meter" data-lease="'+id+'"><p>La primera lectura es base y no genera cobro. Después se calcula diferencia × precio.</p><label>Medidor<select name="service"><option value="LUZ">Luz</option><option value="AGUA">Agua</option><option value="GAS">Gas</option></select></label>'+inp('Lectura actual','reading','type="number" min="0" step="0.001"')+inp('Precio por unidad (S/)','price','type="number" min="0" step="0.0001"')+'<button type="submit">Guardar lectura</button></form>';
 if(act==='guarantee')form='<form data-ma3-form="guarantee" data-lease="'+id+'"><p>Garantía en custodia: <b>'+cash(held(id))+'</b>. Nunca se suma como renta.</p><label>Movimiento<select name="action"><option value="RECEIVED">Recibir garantía</option><option value="REFUNDED">Devolver garantía</option><option value="APPLIED">Aplicar a deuda</option><option value="RETAINED">Retener (motivo obligatorio)</option></select></label>'+inp('Importe (S/)','amount','type="number" min="0.01" step="0.01"')+'<label>Motivo<input name="reason" maxlength="300" placeholder="Motivo de la operación"></label><button type="submit">Registrar garantía</button></form>';
 if(act==='history'){
  const movements=state.ledger.filter(x=>x.lease_id===id);const gs=state.guarantees.filter(x=>x.lease_id===id);const readings=state.meters.filter(x=>x.lease_id===id);
  form='<p>'+esc(pname)+'</p><div class="ma3-table"><table><thead><tr><th>Fecha vencimiento</th><th>Movimiento</th><th>Monto</th></tr></thead><tbody>'+movements.map(m=>'<tr><td>'+esc(m.due_on)+'</td><td>'+esc(m.label)+'</td><td>'+cash(m.amount_pen)+'</td></tr>').join('')+'</tbody></table></div><h4>Garantías</h4>'+gs.map(g=>'<p>'+esc(g.action)+' '+cash(g.amount_pen)+' · '+esc(g.reason)+'</p>').join('')+'<h4>Medidores</h4>'+readings.map(m=>'<p>'+esc(m.service)+' '+n(m.reading)+' · consumo '+(m.consumption==null?'base':n(m.consumption))+' · '+cash(m.charged_pen)+'</p>').join('');
 }
 dialog(({payment:'Registrar pago',fixed:'Tarifa fija',meter:'Registrar consumo',guarantee:'Movimiento de garantía',history:'Historial del contrato'})[act],form);
}
async function reload(){state.loaded=false;state.error=null;await window.ma1612OnOpen?.();}
let busy=false;
async function onClick(e){const b=e.target.closest('[data-ma3-action]');if(!b)return;e.preventDefault();e.stopPropagation();const act=b.dataset.ma3Action;
 if(act==='dismiss'){$('ma3dialog')?.remove();return;}
 if(['payment','fixed','meter','guarantee','history'].includes(act)){leaseDialog(act,b.dataset.lease);return;}
 if(act==='expense'){dialog('Registrar gasto','<form data-ma3-form="expense"><label>Unidad (opcional)<select name="unit"><option value="">Gasto general</option>'+current.units.map(u=>'<option value="'+u.id+'">'+esc(u.code)+' · '+esc(u.alias)+'</option>').join('')+'</select></label>'+inp('Categoría','category','maxlength="80"')+inp('Descripción','description','maxlength="250"')+inp('Gasto en soles','amount','type="number" step="0.01" min="0.01"')+'<label>Medio de pago<select name="method"><option>EFECTIVO</option><option>TRANSFERENCIA</option><option>YAPE</option><option>PLIN</option></select></label><button type="submit">Guardar gasto</button></form>');return;}
 if(busy)return;busy=true;b.disabled=true;
 try{
  if(act==='share-invite'){
   const code=String(current?.account?.invite_code||'');
   if(!/^ALQUILER[1-9][0-9]{0,11}$/.test(code))throw new Error('Código de invitación no disponible');
   const link='https://www.clancartan.com/?ref='+encodeURIComponent(code)+'#registro';
   if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(link);message('Enlace copiado para compartir con tu referido.');}
   else{window.prompt('Copia tu enlace de invitación:',link);}
   return;
  }
  if(act==='refresh'){await reload();return;}
  if(act==='activate'){await rpc('ma_activate_bonus',{p_request:uuid()});await reload();return;}
 }catch(ex){message(String(ex.message||ex),true);}finally{busy=false;b.disabled=false;}
}
async function onSubmit(e){const f=e.target.closest('[data-ma3-form]');if(!f)return;e.preventDefault();e.stopPropagation();if(busy)return;busy=true;
 const button=f.querySelector('button[type=submit]');if(button)button.disabled=true;
 const v=k=>String(f.elements.namedItem(k)?.value||'').trim();const num=k=>Number(v(k));const request=uuid();
 const id=f.dataset.lease,kind=f.dataset.ma3Form;
 try{
  if(kind==='payment')await rpc('ma_record_payment',{p_lease:id,p_amount:num('amount'),p_method:v('method'),p_request:request});
  if(kind==='fixed')await rpc('ma_charge_fixed',{p_lease:id,p_service:v('service'),p_amount:num('amount'),p_request:request});
  if(kind==='meter')await rpc('ma_record_meter',{p_lease:id,p_service:v('service'),p_reading:num('reading'),p_unit_price:num('price'),p_request:request});
  if(kind==='guarantee')await rpc('ma_record_guarantee',{p_lease:id,p_action:v('action'),p_amount:num('amount'),p_reason:v('reason'),p_request:request});
  if(kind==='expense')await rpc('ma_record_expense',{p_unit:v('unit')?Number(v('unit')):null,p_category:v('category'),p_description:v('description'),p_amount:num('amount'),p_method:v('method'),p_request:request});
  if(kind==='bonus')await rpc('ma_admin_grant_bonus',{p_reseller:v('reseller'),p_amount:num('amount'),p_note:v('note'),p_request:request});
  $('ma3dialog')?.remove();await reload();message('Movimiento guardado y auditado.');
 }catch(ex){const p=$('ma3-dialog-status')||$('ma3-status');if(p){p.textContent='No se registró: '+String(ex.message||ex);p.classList.add('ma3-error');}}
 finally{busy=false;if(button)button.disabled=false;}
}
function init(){document.addEventListener('click',onClick);document.addEventListener('submit',onSubmit);document.addEventListener('click',e=>{if(e.target.closest('#cc54logout'))reset();},true);}
window.ma1613Enhance=enhance;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();