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

/* V154 · Identidad oficial COBRA YA (logo remitido por titular, versión ligera). */
const cc154BrandData='data:image/webp;base64,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';
function cc154MountBrand(){
 const host=document.getElementById('cy53layer');
 if(!host||document.getElementById('cc154CobraBrand'))return;
 const strip=document.createElement('div');strip.id='cc154CobraBrand';strip.className='cc154-cobra-brand';
 const pic=document.createElement('img');pic.src=cc154BrandData;pic.alt='COBRA YA · CLAN CARTAN';pic.width=128;pic.height=128;pic.loading='eager';pic.decoding='async';
 const label=document.createElement('div');label.className='cc154-brand-label';
 const title=document.createElement('strong');title.textContent='COBRA YA';
 const sub=document.createElement('small');sub.textContent='Plataforma de gestión · CLAN CARTAN E.I.R.L.';
 label.append(title,sub);strip.append(pic,label);
 const anchor=document.getElementById('cy64tabs')||host.firstChild;
 if(anchor&&anchor.parentNode===host) host.insertBefore(strip,anchor);
 else host.prepend(strip);
 if(!document.getElementById('cc154BrandStyle')){
  const css=document.createElement('style');css.id='cc154BrandStyle';
  css.textContent='.cc154-cobra-brand{display:flex;align-items:center;gap:14px;margin:12px 0 20px;padding:12px 16px;background:linear-gradient(115deg,#02090c,#052126);border:1px solid rgba(11,210,221,.35);border-radius:16px;box-shadow:0 8px 27px rgba(0,0,0,.22);color:#fff}.cc154-cobra-brand img{width:96px;height:96px;object-fit:contain;flex-shrink:0;border-radius:8px}.cc154-brand-label{display:grid;gap:3px}.cc154-brand-label strong{color:#19e2e8;font-size:clamp(20px,3vw,28px);font-weight:900;letter-spacing:.04em}.cc154-brand-label small{font-size:12px;color:#e1f1ef}@media(max-width:480px){.cc154-cobra-brand{padding:10px}.cc154-cobra-brand img{width:72px;height:72px}}';
  document.head.appendChild(css);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cc154MountBrand);
else cc154MountBrand();

window.cy152OnRefresh=function(...args){sync(...args);cc154MountBrand();};
window.cy152OnLoansRendered=()=>{if(valid()){enhanceCards();filterCurrent();}};
})();
