/* V152 COBRA YA · accesos rapidos, busqueda, alias, ficha historica,
   WhatsApp con 5 plantillas. Sin mover dinero de billeteras. */
(function(){
'use strict';
const $=id=>document.getElementById(id),ses=()=>window.CC_V53_SESSION;
let data=null,actions=null,filter='',focusLoan=null;
const cash=(n,c='PEN')=>({PEN:'S/',USD:'US$',EUR:'€',COP:'COL$',MXN:'MX$',ARS:'AR$',CLP:'CLP$',BOB:'Bs'}[c]||c)+' '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=v=>v?new Date(String(v).slice(0,10)+'T12:00:00').toLocaleDateString('es-PE'):'—';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const mk=(tag,txt,cls)=>{const e=document.createElement(tag);if(txt!==undefined)e.textContent=String(txt);if(cls)e.className=cls;return e;};
const paid=id=>(data?.payments||[]).filter(x=>x.loan_id===id).reduce((a,x)=>a+Number(x.amount||0),0);
const balance=x=>Math.max(0,Number(x.total_due||0)-paid(x.id));
const client=id=>data?.clients?.find(x=>x.id===id);
const due=x=>data?.installments?.filter(i=>i.loan_id===x.id).map(i=>i.due_on).filter(Boolean).sort().at(-1)||x.corrected_due_on||x.first_due_on;
const valid=()=>!!(ses()?.jwt&&(ses().isReseller||ses().isAdmin)&&data&&actions);
function closeModal(){const p=$('cy152modal');if(p)p.remove();}
function modal(title){
 closeModal();
 const wrap=mk('div');wrap.id='cy152modal';wrap.className='cy152-overlay';
 const panel=mk('section');panel.className='cy152-dialog';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
 const head=mk('header');head.className='cy152-dialog-head';
 head.append(mk('h3',title),mk('button','✕','cy152-close'));head.querySelector('button').type='button';head.querySelector('button').onclick=closeModal;
 panel.append(head);wrap.append(panel);document.body.append(wrap);
 wrap.addEventListener('click',e=>{if(e.target===wrap)closeModal()});
 return panel;
}
function linkNewLoan(c){
 closeModal();
 const s=$('cy53clientSelect'),form=$('cy53loan');if(!s||!form)return;
 s.value=c.id;if(s.value!==c.id){alert('Actualiza los clientes para continuar.');return;}
 const principal=form.elements.namedItem('principal');if(principal)principal.value='';
 form.scrollIntoView({behavior:'smooth',block:'start'});principal?.focus();
 const hint=$('cy60feedback');if(hint)hint.textContent='Nuevo préstamo para '+c.full_name+'. El historial anterior se conserva.';
}
async function editAlias(c){
 const panel=modal('Alias del cliente');
 panel.append(mk('p','El apodo es opcional. Los nombres oficiales y el DNI no se modifican.'));
 const label=mk('label','Alias / apodo');const input=mk('input');input.maxLength=80;input.placeholder='Ej. Don Pepe';input.value=c.alias||'';
 label.append(input);panel.append(label);
 const status=mk('p');status.setAttribute('role','status');
 const save=mk('button','Guardar alias','cy152-primary');panel.append(save,status);
 save.onclick=async()=>{
  if(!valid())return;
  const raw=input.value.trim();if(raw.length>80)return;
  save.disabled=true;status.textContent='Guardando…';
  try{
   await actions.api('cy_clients?id=eq.'+encodeURIComponent(c.id)+'&owner_id=eq.'+encodeURIComponent(ses().userId),'PATCH',{alias:raw||null});
   closeModal();await actions.refresh();
  }catch(e){status.textContent=String(e.message||e);save.disabled=false;}
 };
 input.focus();
}
function dossier(id){
 if(!valid())return;
 const c=client(id);if(!c)return;
 const panel=modal('Ficha del cliente');
 const banner=mk('div');banner.className='cy152-client-head';
 banner.append(mk('strong',c.full_name),mk('small',(c.alias?'Alias: '+c.alias+' · ':'')+(c.client_code||c.id.slice(0,8))));
 banner.append(mk('p','Documento: '+(c.document_number||'No indicado')+' · WhatsApp: '+(c.phone||'No indicado')));
 panel.append(banner);
 const actionsRow=mk('div');actionsRow.className='cy152-actions';
 const alias=mk('button','Editar alias');alias.onclick=()=>editAlias(c);
 const edit=mk('button','Editar ficha');edit.onclick=()=>{closeModal();actions.edit(c.id)};
 const newBtn=mk('button','+ Nuevo préstamo','cy152-primary');newBtn.onclick=()=>linkNewLoan(c);
 actionsRow.append(alias,edit,newBtn);panel.append(actionsRow);
 panel.append(mk('h4','Préstamos e historial conservado'));
 const list=mk('div');panel.append(list);
 const items=data.loans.filter(x=>x.client_id===id).slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
 if(!items.length)list.append(mk('p','Sin préstamos registrados.'));
 for(const loan of items){
  const box=mk('article');box.className='cy152-history';
  box.append(mk('strong',(loan.status==='CLOSED'?'Finalizado':'Préstamo')+' · '+cash(loan.principal,loan.currency)));
  box.append(mk('p','Inicio: '+date(loan.issued_on)+' · Vence: '+date(due(loan))+
    ' · Abonos: '+cash(paid(loan.id),loan.currency)+' · Pendiente: '+cash(balance(loan),loan.currency)));
  const row=mk('div');row.className='cy152-actions';
  const view=mk('button','Cronograma y pagos');view.onclick=()=>{closeModal();actions.open(loan.id)};
  row.append(view);
  if(balance(loan)>.005&&loan.status==='ACTIVE'){
   const payBtn=mk('button','Registrar abono');payBtn.onclick=()=>payment(loan.id);row.append(payBtn);
  }
  const whats=mk('button','WhatsApp');whats.onclick=()=>notify(loan.id);row.append(whats);
  box.append(row);list.append(box);
 }
 const status=mk('p','Cargando historial de prórrogas…');panel.append(status);
 actions.api('cy_loan_extensions?select=loan_id,old_due_on,new_due_on,old_months,new_months,reason,created_at&owner_id=eq.'+encodeURIComponent(c.owner_id)+'&order=created_at.desc&limit=80')
 .then(rows=>{
  if(!panel.isConnected)return;
  const extensions=Array.isArray(rows)?rows.filter(x=>items.some(y=>y.id===x.loan_id)):[];
  status.textContent=extensions.length?'Historial de ampliaciones':'Sin ampliaciones registradas.';
  for(const x of extensions){
   panel.append(mk('p','+ '+(x.new_months-x.old_months)+' mes(es) · '+x.old_months+' → '+x.new_months+
    ' meses · '+date(x.old_due_on)+' → '+date(x.new_due_on)+(x.reason?' · '+x.reason:''),'cy152-extension'));
  }
 }).catch(()=>{status.textContent='Historial de ampliaciones no disponible.'});
}
function payment(id){
 if(!valid())return;
 const x=data.loans.find(a=>a.id===id);if(!x||x.status!=='ACTIVE'||balance(x)<=0)return;
 const panel=modal('Registrar abono recibido');
 panel.append(mk('p','Cliente: '+(client(x.client_id)?.full_name||'—')+' · Deuda actual: '+cash(balance(x),x.currency)));
 const amtLabel=mk('label','Monto realmente recibido ('+x.currency+')'),amount=mk('input');
 amount.type='number';amount.min='0.01';amount.max=String(balance(x).toFixed(2));amount.step='0.01';amount.inputMode='decimal';
 amtLabel.append(amount);panel.append(amtLabel);
 const label=mk('label','Referencia / nota'),memo=mk('input');memo.maxLength=500;memo.placeholder='Ej. Yape, efectivo, transferencia';label.append(memo);panel.append(label);
 const confirm=mk('label');confirm.className='cy152-consent';const tick=mk('input');tick.type='checkbox';
 confirm.append(tick,document.createTextNode(' Confirmo que el PRESTAMISTA recibió el dinero directamente; CLAN CARTAN no lo cobra.'));panel.append(confirm);
 const info=mk('p');info.setAttribute('role','status');const btn=mk('button','Guardar abono','cy152-primary');
 panel.append(btn,info);
 btn.onclick=async()=>{
  if(!valid())return;
  const n=Number(amount.value);
  if(!tick.checked||!Number.isFinite(n)||n<=0||Math.round(n*100)!==Math.round(n*10000)/100||n>balance(x)+.001){info.textContent='Confirma el ingreso y escribe un importe válido.';return;}
  if(!window.confirm('¿Confirmas la recepción directa de '+cash(n,x.currency)+'? El historial no se puede borrar.'))return;
  btn.disabled=true;info.textContent='Registrando…';
  try{await actions.api('rpc/cy_record_payment','POST',{p_loan_id:id,p_amount:n,p_memo:memo.value.trim().slice(0,500)||'Abono recibido'});
   closeModal();await actions.refresh();
  }catch(e){info.textContent=String(e.message||e);btn.disabled=false;}
 };
 amount.focus();
}
function notify(id){
 if(!valid())return;
 const x=data.loans.find(z=>z.id===id),c=client(x?.client_id);if(!x||!c)return;
 const panel=modal('Notificar por WhatsApp');
 panel.append(mk('p','Mensaje dirigido a '+c.full_name+'. El préstamo es entre el prestamista y su cliente.'));
 const contact=mk('label','WhatsApp con código de país'),phone=mk('input');
 phone.value=c.phone||'+51 ';phone.type='tel';contact.append(phone);panel.append(contact);
 const types=mk('label','Mensaje'),choice=mk('select');
 const opts=[['new','✅ Préstamo registrado'],['soon','🔔 Próximo a vencer'],['late','⚠️ Préstamo vencido'],['paid','💵 Abono recibido'],['closed','🏁 Préstamo cancelado']];
 for(const [v,name]of opts){const op=mk('option',name);op.value=v;choice.append(op);}
 const remaining=balance(x);
 if(remaining<=.005)choice.value='closed';else choice.value=new Date((due(x)||'')+'T00:00:00')<new Date()?'late':'soon';
 types.append(choice);panel.append(types);
 const preview=mk('textarea');preview.rows=12;preview.readOnly=true;preview.setAttribute('aria-label','Vista previa WhatsApp');panel.append(preview);
 const info=mk('p');const go=mk('a','WhatsApp · Preparar mensaje','cy152-wa');go.target='_blank';go.rel='noopener noreferrer';
 panel.append(go,info);
 const name=c.full_name||'Cliente',fmtDate=date(due(x));
 function update(){
  const type=choice.value,n=Number(paid(id));const remaining=balance(x);
  const msg=['🐍 *COBRA YA | CLAN CARTAN E.I.R.L.*','','👋 ¡Hola, *'+name+'*!',''];
  const headlines={new:'✅ *PRÉSTAMO REGISTRADO*',soon:'🔔 *PRÓXIMO A VENCER*',late:'⚠️ *PRÉSTAMO VENCIDO*',paid:'💵 *ABONO RECIBIDO*',closed:'🏁 *PRÉSTAMO CANCELADO*'};
  msg.push(headlines[type]);
  msg.push('💰 Capital: '+cash(x.principal,x.currency));
  msg.push('📈 Interés mensual: '+Number(x.monthly_interest_rate??x.interest_rate??0)+'%');
  msg.push('🗓️ Plazo: '+(x.duration_months||1)+' meses');
  msg.push('💳 Total acordado: '+cash(x.total_due,x.currency));
  msg.push('📅 Vencimiento: '+fmtDate);
  msg.push('💵 Abonos registrados: '+cash(n,x.currency));
  msg.push('📌 Pendiente: '+cash(remaining,x.currency));
  if(type==='soon')msg.push('⏳ Recuerda coordinar tu pago con el prestamista.');
  if(type==='late')msg.push('⚠️ Comunícate con tu prestamista para regularizar el vencimiento.');
  if(type==='paid')msg.push('✅ Tu prestamista registró el abono recibido.');
  if(type==='closed')msg.push('🎉 Préstamo sin saldo pendiente. Gracias por cumplir.');
  msg.push('','🌐 https://www.clancartan.com/','Mensaje preparado por tu prestamista. CLAN CARTAN no recibe el pago del préstamo.');
  preview.value=msg.join('\n');
  const digits=phone.value.replace(/[^0-9]/g,'');
  const allowed=(type!=='paid'||n>.005)&&(type!=='closed'||remaining<=.005);
  if(digits.length<8||digits.length>15||!allowed){go.removeAttribute('href');go.setAttribute('aria-disabled','true');
   info.textContent=!allowed?'Aún no existen pagos suficientes para este mensaje.':'Indica un número válido, incluyendo código de país.';return;}
  go.href='https://wa.me/'+digits+'?text='+encodeURIComponent(preview.value);go.removeAttribute('aria-disabled');info.textContent='El mensaje se abre para que el prestamista confirme y envíe.';
 }
 choice.addEventListener('change',update);phone.addEventListener('input',update);update();
}
function enhanceCards(){
 const root=$('cy60loanrecords');if(!root||!data)return;
 for(const card of root.querySelectorAll('.cy138-card')){
  const ident=card.querySelector('[data-loan]')?.dataset.loan;
  const loan=data.loans.find(x=>x.id===ident);if(!loan)continue;
  const c=client(loan.client_id);card.dataset.search=norm([c?.full_name,c?.document_number,c?.phone,c?.alias,c?.client_code,ident].join(' '));
  const name=card.querySelector('.cy138-card-person strong');if(name&&c){name.textContent=(c.alias?c.alias+' · ':'')+c.full_name;}
  const bar=card.querySelector('.cy138-card-buttons');if(!bar)continue;
  const oldView=bar.querySelector('.cy63view'),oldPay=bar.querySelector('.cy138-paid'),newLoan=bar.querySelector('.cy71new'),actionsMenu=bar.querySelector('.cy138-actions-menu');
  if(oldView)oldView.hidden=true;
  if(oldPay&&actionsMenu){oldPay.textContent='✓ Pago total recibido';actionsMenu.append(oldPay);}
  bar.querySelector('.cy152-quick')?.remove();
  const quick=mk('div');quick.className='cy152-quick';
  const add=(txt,fn)=>{const b=mk('button',txt);b.type='button';b.onclick=fn;quick.append(b);};
  if(balance(loan)>.005&&loan.status==='ACTIVE')add('＋ Registrar abono',()=>payment(loan.id));
  else if(newLoan){newLoan.hidden=true;add('＋ Nuevo préstamo',()=>linkNewLoan(c));}
  add('◉ Notificar',()=>notify(loan.id));
  add('Ver ficha',()=>dossier(loan.client_id));
  bar.prepend(quick);
  card.hidden=filter&&!card.dataset.search.includes(norm(filter));
 }
}
function enhanceClients(){
 const root=$('cy53clients');if(!root||!data)return;
 const table=root.querySelector('table');
 if(!table)return;
 const h=table.querySelector('thead tr');if(h&&!h.querySelector('.cy152-h-alias')){
  const a=mk('th','Alias / Código','cy152-h-alias');h.insertBefore(a,h.children[1]);
 }
 for(const row of table.querySelectorAll('tbody tr')){
  const id=row.querySelector('.cy62editclient')?.dataset.id,c=client(id);if(!c)continue;
  const cell=mk('td',(c.alias?c.alias+' · ':'')+(c.client_code||''),'cy152-alias-code');
  row.insertBefore(cell,row.children[1]);
  const first=row.firstElementChild;const button=mk('button','Ver ficha','cy152-dossier-link');
  button.type='button';button.onclick=()=>dossier(id);first.append(' ',button);
  row.hidden=!!filter&&!norm([c.full_name,c.alias,c.client_code,c.document_number,c.phone].join(' ')).includes(norm(filter));
 }
}
function mountSearch(){
 if($('cy152search'))return;
 const tabs=$('cy64tabs'),clients=$('cy53clients');if(!tabs||!clients)return;
 const box=mk('section');box.id='cy152toolbar';
 const lbl=mk('label','Buscar cliente o préstamo');
 const inp=mk('input');inp.id='cy152search';inp.type='search';inp.placeholder='Nombre, DNI, apodo, código, celular…';inp.value=filter;
 lbl.append(inp);box.append(lbl);tabs.before(box);
 inp.addEventListener('input',()=>{filter=inp.value;filterCurrent()});
}
function filterCurrent(){const text=norm(filter);
 for(const card of document.querySelectorAll('#cy60loanrecords .cy138-card'))card.hidden=!!text&&!card.dataset.search.includes(text);
 for(const row of document.querySelectorAll('#cy53clients tbody tr')){
  const id=row.querySelector('.cy62editclient')?.dataset.id,c=client(id);
  row.hidden=!!text&&!norm([c?.full_name,c?.alias,c?.client_code,c?.document_number,c?.phone].join(' ')).includes(text);
 }
}
function sync(snapshot,bridge){
 if(!ses()?.jwt||!(ses().isReseller||ses().isAdmin))return;
 data=snapshot;actions=bridge;
 mountSearch();enhanceClients();enhanceCards();filterCurrent();
 const panel=$('cy152toolbar');if(panel){
  let hint=$('cy152hint');if(!hint){hint=mk('p','Los préstamos finalizados conservan código, ficha, abonos y cronogramas.','cy152-hint');hint.id='cy152hint';panel.append(hint);}
 }
}
window.cy152OnRefresh=sync;
window.cy152OnLoansRendered=()=>{if(valid()){enhanceCards();filterCurrent();}};
})();
