/* COBRA YA phase 1 V368 - isolated UI, preserves legacy forms and data */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
let mounted=false,active='clients';
function tab(name){
 active=name;
 const map={clients:'cy368clients',loans:'cy368loans',new:'cy368new',due:'cy368loans'};
 Object.entries({clients:'cy368clients',loans:'cy368loans',new:'cy368new'}).forEach(([key,id])=>{const el=$(id);if(el)el.hidden=map[name]!==id;});
 document.querySelectorAll('#cy368tabs [data-tab]').forEach(b=>{b.classList.toggle('on',b.dataset.tab===name);b.setAttribute('aria-selected',String(b.dataset.tab===name));});
 const search=$('cy368search');if(search)search.hidden=name!=='clients';
 if(name==='due'){$('cy64tabs')?.querySelector('[data-filter="soon"]')?.click();}
 if(name==='loans'){$('cy64tabs')?.querySelector('[data-filter="all"]')?.click();}
 $('cy368board')?.scrollIntoView({block:'start',behavior:'smooth'});
}
function mount(){
 if(mounted||!$('cy53layer'))return;
 const layer=$('cy53layer'),wrap=layer.querySelector('.cywrap'),cards=layer.querySelector('.cycards'),form=$('cy53loan'),client=$('cy53clients'),loans=$('cy60loanrecords');
 if(!wrap||!cards||!form||!client||!loans)return;
 const formSection=form.closest('section'),clientSection=client.closest('section'),loanSection=loans.closest('section');
 if(!formSection||!clientSection||!loanSection)return;
 formSection.id='cy368new';clientSection.id='cy368clients';loanSection.id='cy368loans';
 const board=document.createElement('div');board.id='cy368board';board.innerHTML=`
 <div class="cy368hero"><div><span class="cy368eyebrow">MI CARTERA</span><strong id="cy368total">Consultando…</strong><small id="cy368currencies">Total por cobrar</small></div><div class="cy368wallet"><span>◈ Billetera</span><strong id="cy368balance">—</strong></div></div>
 <div class="cy368stats"><div><span>♧</span><strong id="cy368clientsCount">—</strong><small>Clientes</small></div><div><span>▤</span><strong id="cy368loansCount">—</strong><small>Préstamos</small></div><div><span>▣</span><strong id="cy368dueCount">—</strong><small>Vencen hoy</small></div><div><span>◷</span><strong id="cy368lateCount">—</strong><small>Vencidos</small></div></div>
 <div class="cy368actions"><button type="button" id="cy368add">＋ Nuevo cliente</button><button type="button" data-goto="new">＋ Nuevo préstamo</button><button type="button" data-goto="loans">Registrar abono</button></div>
 <nav id="cy368tabs" aria-label="Navegación Cobra Ya"><button type="button" data-tab="clients" class="on">Clientes</button><button type="button" data-tab="loans">Préstamos</button><button type="button" data-tab="due">Vencimientos</button><button type="button" data-tab="new">Nuevo</button></nav>
 <div id="cy368search"><input type="search" id="cy368query" placeholder="Buscar por nombre o DNI…" aria-label="Buscar clientes"/></div>`;
 cards.parentNode.insertBefore(board,cards);
 const legacy=wrap.querySelector('.cy75quick');if(legacy)legacy.hidden=true;
 board.querySelector('#cy368add').addEventListener('click',()=>window.cc119OpenNewClient?.());
 board.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.goto)));
 board.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>tab(b.dataset.tab)));
 $('cy368query').addEventListener('input',e=>{const q=e.target.value.toLocaleLowerCase().trim();client.querySelectorAll('tbody tr').forEach(row=>row.hidden=!row.textContent.toLocaleLowerCase().includes(q));});
 // The existing new-client popup stays in its original position.
 const originalGo=window.cc119OpenNewClient;
 if(typeof originalGo==='function')window.cc119OpenNewClient=function(...args){return originalGo.apply(this,args)};
 // Preserve existing customer flow after creating a client.
 const previous=window.cc368GoLoan;window.cc368GoLoan=function(){tab('new');if(typeof previous==='function')previous()};
 tab('clients');mounted=true;
}
function update(payload){
 if(!mounted||!payload)return;
 const {clients=[],loans=[],installments=[],payments=[]}=payload;
 $('cy368clientsCount').textContent=clients.length;$('cy368loansCount').textContent=loans.length;
 const paid=new Map();payments.forEach(p=>paid.set(p.loan_id,(paid.get(p.loan_id)||0)+Number(p.amount||0)));
 const byCurrency=new Map();let todayCount=0,lateCount=0;
 const now=new Date(),today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
 for(const loan of loans){
  if(loan.status==='CANCELLED')continue;
  const balance=Math.max(0,Number(loan.total_due||0)-(paid.get(loan.id)||0));
  if(balance<0.01)continue;
  const currency=loan.currency||'PEN';byCurrency.set(currency,(byCurrency.get(currency)||0)+balance);
  const due=installments.filter(i=>i.loan_id===loan.id&&Number(i.amount||0)>Number(i.paid_total||0)+0.005).map(i=>i.due_on).filter(Boolean).sort()[0]||loan.corrected_due_on||loan.first_due_on;
  if(due===today)todayCount++;else if(due&&due<today)lateCount++;
 }
 $('cy368total').textContent='S/ '+money(byCurrency.get('PEN')||0);
 const others=[...byCurrency].filter(([cur])=>cur!=='PEN');
 $('cy368currencies').textContent=others.length?'PEN · Otras monedas: '+others.map(([cur,n])=>cur+' '+money(n)).join(' · '):'Total por cobrar · PEN';
 $('cy368dueCount').textContent=todayCount;$('cy368lateCount').textContent=lateCount;
 const brand=document.querySelector('#cy53layer .cc127-cobra-brand small');
 const match=brand?.textContent.match(/S\/\s*[\d,.]+/);
 if(match)$('cy368balance').textContent=match[0];
}
function start(){
 mount();
 window.addEventListener('cy368:data',e=>update(e.detail));
 const layer=$('cy53layer');
 if(layer){new MutationObserver(()=>{if(layer.style.display!=='none'&&mounted){const logo=document.querySelector('#cy53layer .cc127-cobra-brand small');const match=logo?.textContent.match(/S\/\s*[\d,.]+/);if(match&&$('cy368balance'))$('cy368balance').textContent=match[0];}}).observe(layer,{attributes:true,attributeFilter:['style']});}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
