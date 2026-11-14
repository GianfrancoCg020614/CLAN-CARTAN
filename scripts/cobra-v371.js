/* COBRA YA V372 (V371 base). Existing CLAN CARTAN session, activation, wallet and financial RPCs. */
(() => {
'use strict';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const session=()=>window.CC_V53_SESSION;
const tools=window.Cobra372;
let timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'America/Lima',clockOffset=0,financialReport=null,reportSeq=0,reportCurrency='',zoneLoaded=false;
function readTimeZone(){try{const saved=localStorage.getItem('cobra:timezone:'+session()?.userId);if(saved){tools.todayAt(saved);return saved;}}catch{}return Intl.DateTimeFormat().resolvedOptions().timeZone||'America/Lima';}
const today=()=>tools.todayAt(timeZone,new Date(Date.now()+clockOffset));
const date=v=>v?new Date(String(v).slice(0,10)+'T12:00:00').toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'}):'—';
const money=(n,c='PEN')=>{try{return new Intl.NumberFormat('es-PE',{style:'currency',currency:c,minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);}catch{return c+' '+String(n||'0.00');}};
const paths={menu:'M4 6h16M4 12h16M4 18h16',back:'m11 5-7 7 7 7M4 12h17',search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
 home:'m3 10 9-8 9 8M5 9v12h5v-7h4v7h5V9',clients:'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M17 4a4 4 0 0 1 0 8M22 21v-3a4 4 0 0 0-3-4M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 loan:'M3 6c0-5 18-5 18 0s-18 5-18 0v12c0 5 18 5 18 0V6M3 12c0 5 18 5 18 0',calendar:'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2M8 14h2M14 14h2',
 alert:'m12 3 10 18H2L12 3ZM12 9v5M12 17v1',wallet:'M3 7h17v14H3V7Zm0 0 13-5 2 5M15 12h7v5h-7v-5Z',
 pay:'M2 18h5l4 3 9-6c2-2-1-4-3-2l-5 2M7 18v-6h5c3 0 3 4 0 4H9M13 2l7 3v5l-7 3-5-3V5l5-3ZM13 6v3',
 report:'M3 21h18M6 18v-5M12 18V9M18 18V4M4 9l6-5 5 2 6-5',settings:'M9 3h6l1 3 3 1 2 5-2 4-3 1-1 4H9l-1-4-3-1-2-4 2-5 3-1 1-3ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',profile:'M20 21a8 8 0 0 0-16 0M17 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
 plus:'M12 4v16M4 12h16',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',chevron:'m9 5 7 7-7 7',close:'m5 5 14 14M5 19 19 5',more:'M12 4v1M12 11v1M12 18v1'};
const icon=n=>`<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[n]||paths.loan}"/></svg>`;
let layer,sub,shell,gate,owner='',epoch=0,access=null,summary=null,view='home',filter='active',currency='',portfolioCurrency='',page=0,sort='recent',query='',rows=[],total=0,searchTimer,searchSeq=0,loadSeq=0,opened=false,checking=false,expiryTimer,returnFocus=null,modal=null;
const mobileLayout=matchMedia('(max-width: 1000px)');let pageSize=mobileLayout.matches?5:15;
const labels={home:'Inicio',clients:'Clientes',loans:'Préstamos',payments:'Cobros',due:'Vencimientos',reports:'Reportes',settings:'Configuración'};
const navIcons={home:'home',clients:'clients',loans:'loan',payments:'pay',due:'calendar',reports:'report',settings:'settings'};
function button(label,action,cls=''){const names={menu:'Abrir o cerrar menú',attention:'Atención y notificaciones',profile:'Abrir mi perfil',wallet:'Abrir billetera CLAN CARTAN','close-modal':'Cerrar ventana y volver a la vista anterior'},name=names[action]||(action.startsWith('nav:')?labels[action.slice(4)]:'');return `<button type="button" class="${cls}" data-action="${action}" ${name?`aria-label="${name}" title="${name}"`:''}>${label}</button>`;}
function status(message,error=false){const el=$('cy371status');if(el){el.textContent=message;el.classList.toggle('error',error);}}
async function api(name,data={},signal){
 const s=session();if(!s?.jwt||!s.userId)throw Error('Inicia sesión en CLAN CARTAN.');
 const uid=s.userId,token=s.jwt,generation=epoch,ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),20000);
 const abort=()=>ctl.abort();signal?.addEventListener('abort',abort,{once:true});
 try{
  const r=await fetch(s.root+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:s.key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data),signal:ctl.signal});
  const body=await r.json();if(session()?.userId!==uid||epoch!==generation)throw Error('La sesión cambió. Vuelve a abrir COBRA YA.');
  if(!r.ok){const e=new Error(body.message||'No se pudo completar la operación.');e.status=r.status;e.code=body.code;throw e;}
  return body;
 }finally{clearTimeout(timeout);signal?.removeEventListener('abort',abort);}
}
function fail(e){
 if(e.code==='42501'||e.status===401||e.status===403){void checkAccess();return;}
 status(e.name==='AbortError'?'La conexión tardó demasiado. Vuelve a intentar.':e.message||'No se pudo conectar. Vuelve a intentar.',true);
}
const modalHistory=[];
function closeModal(){
 if(!modal)return;modal.close();modal.remove();
 const prior=modalHistory.pop();modal=prior?.node||null;
 if(modal){layer.append(modal);modal.showModal();}
 returnFocus?.focus?.();returnFocus=prior?.focus||null;
}
function clearModals(){while(modal)closeModal();}
function dialog(title,body){
 const replacing=modal?.querySelector('h2')?.textContent===title;
 if(modal){modal.close();modal.remove();if(!replacing)modalHistory.push({node:modal,focus:returnFocus});}
 if(!replacing)returnFocus=document.activeElement;
 modal=document.createElement('dialog');modal.className='cy371-dialog';modal.setAttribute('aria-labelledby','cy371dialogTitle');
 modal.innerHTML=`<header><h2 id="cy371dialogTitle">${esc(title)}</h2><div class="cy371-dialog-nav">${button(icon('close'),'close-modal','cy371-icon')}</div></header><div class="cy371-dialog-body">${body}</div>`;
 layer.append(modal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});modal.addEventListener('cancel',e=>{e.preventDefault();closeModal();});modal.showModal();return modal;
}
const field=(label,name,value='',extra='',type='text')=>`<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const area=(label,name,value='',max=500)=>`<label>${label}<textarea name="${name}" rows="2" maxlength="${max}">${esc(value)}</textarea></label>`;
const formFooter=label=>`<p class="cy371-form-status" role="status" aria-live="polite"></p><button class="cy371-submit" type="submit">${label}</button>`;
async function fingerprint(payload){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload)));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');}
function bindForm(node,kind,read,onSaved){
 const form=node.querySelector('form');let busy=false,pending=null,frozen=null;
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!form.reportValidity())return;
  const msg=form.querySelector('[role=status]'),save=form.querySelector('[type=submit]');
  busy=true;save.disabled=true;let submitted=false;
  try{
   const payload=frozen||read(new FormData(form));if(!payload)return;
   const hash=await fingerprint({kind,payload}),storageKey='cy371:pending:'+session().userId;
   let stored;try{stored=JSON.parse(sessionStorage.getItem(storageKey));}catch{}
   if(stored&&stored.hash!==hash){
    const prior=await api('cy371_request',{p_request:stored.id});
    if(prior.state==='confirmed'||prior.state==='cancelled'){sessionStorage.removeItem(storageKey);stored=null;}
    else{
     msg.textContent='Hay una solicitud pendiente. Puedes reintentar sus mismos datos o cancelar esa solicitud de forma segura antes de continuar. ';
     const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Resolver solicitud pendiente';msg.append(cancel);
     cancel.onclick=async()=>{cancel.disabled=true;try{const result=await api('cy371_request',{p_request:stored.id,p_cancel:true});sessionStorage.removeItem(storageKey);msg.textContent=result.state==='confirmed'?'La operación anterior ya estaba confirmada. Revisa el historial y guarda esta nueva operación si corresponde.':'Solicitud anterior cancelada. Ya puedes guardar esta operación.';}catch(error){cancel.disabled=false;msg.textContent=error.message;}};
     return;
    }
   }
   pending=pending||{id:stored?.id||crypto.randomUUID(),hash};
   try{sessionStorage.setItem(storageKey,JSON.stringify(pending));}catch{}
   frozen=payload;msg.textContent='Guardando…';
   form.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=true);
   submitted=true;const result=await api('cy371_mutate',{p_kind:kind,p_request:pending.id,p_data:payload});
   try{sessionStorage.removeItem(storageKey);}catch{}
   const sameDialog=modal===node&&node.isConnected;if(sameDialog)closeModal();status('Guardado correctamente.');await reload();if(sameDialog&&onSaved)try{await onSaved(result);}catch(error){fail(error);}
  }catch(error){
   if(error.status&&error.status<500){pending=null;frozen=null;try{sessionStorage.removeItem('cy371:pending:'+session()?.userId);}catch{}form.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=false);}
   msg.textContent=!submitted?error.message:error.name==='AbortError'||!error.status?'No se confirmó la respuesta. Pulsa «Reintentar»; la misma operación no se registrará dos veces.':error.message;
   save.textContent='Reintentar';if(error.code==='42501'||error.status===401)void checkAccess();
  }finally{busy=false;save.disabled=false;}
 });
}
function header(){return `<header class="cy371-header">
 ${button(icon('menu'),'menu','cy371-icon cy371-menu')}
 <img class="cy371-logo" src="/assets/logo-cobraya-v304.avif" width="100" height="72" alt="CobraYa! · CLAN CARTAN">
 ${button(icon('back')+'<span>Volver a<br><b>CLAN CARTAN</b></span>','back','cy371-back')}
 <div class="cy371-search"><label for="cy371search">${icon('search')}<input id="cy371search" type="search" maxlength="120" placeholder="Buscar cliente, DNI o préstamo…" autocomplete="off" aria-controls="cy371results" aria-expanded="false"></label><div id="cy371results" class="cy371-results" hidden></div></div>
 ${button(icon('bell')+'<span id="cy371bellCount" hidden></span>','attention','cy371-icon cy371-bell')}
 ${button(icon('profile'),'profile','cy371-icon cy371-profile')}
 </header>`;}
function setup(){
 layer=$('cy53layer');if(!layer||!window.cy53)return;
 // Preserve the ORIGINAL activation card and its real/bonus payment listeners.
 sub=$('cy55subscription');
 const oldStatus=window.cy55?.status;
 const headerTemplate=document.createElement('template');headerTemplate.innerHTML=header();const newHeader=headerTemplate.content.firstElementChild;
 gate=document.createElement('div');gate.className='cy371-gate';gate.innerHTML='<h1>Pagar para activar</h1><p id="cy371gateStatus" role="status">Verificando tu activación…</p>';
 if(sub)gate.append(sub);
 const retry=document.createElement('button');retry.type='button';retry.dataset.action='check-access';retry.textContent='Comprobar activación';gate.append(retry);
 shell=document.createElement('div');shell.className='cy371-layout';shell.hidden=true;
 shell.innerHTML=`<button class="cy371-scrim" data-action="menu" aria-label="Cerrar menú" type="button"></button><aside class="cy371-sidebar"><nav aria-label="Secciones COBRA YA">${Object.entries(labels).map(([k,v])=>button(icon(navIcons[k])+`<span>${v}</span>`,'nav:'+k)).join('')}</nav><small>V372 · COBRA YA</small></aside>
 <main class="cy371-main"><div id="cy371summary"></div><div class="cy371-actions">${button(icon('profile')+'<span>Nuevo Cliente</span>','new-client','purple')}${button(icon('loan')+'<span>Nuevo Préstamo</span>','new-loan','blue')}${button(icon('pay')+'<span>Registrar Abono</span>','new-payment','green')}</div>
 <section class="cy371-board"><nav class="cy371-tabs" aria-label="Vista de cartera">${[['home','loan','Préstamos activos'],['due','calendar','Vencimientos'],['clients','clients','Clientes'],['reports','report','Reportes']].map(([key,i,text])=>button(icon(i)+`<span>${text}</span>`,'nav:'+key)).join('')}</nav><div id="cy371controls"></div><div id="cy371content" aria-live="polite"></div><div id="cy371pages"></div></section></main>`;
 const message=document.createElement('p');message.id='cy371status';message.className='cy371-status';message.setAttribute('role','status');
 // Replace duplicate chrome at its source; no hidden legacy header, logo, menu or empty card remains.
 layer.replaceChildren(newHeader,gate,shell,message);layer.classList.add('cy371-layer');
 layer.addEventListener('click',handle);
 const search=$('cy371search');search.addEventListener('input',()=>{clearTimeout(searchTimer);const seq=++searchSeq;searchTimer=setTimeout(()=>void searchFor(search.value,seq),250);});
 search.addEventListener('keydown',e=>{if(e.key==='Escape'){hideResults();search.focus();}if(e.key==='ArrowDown'){e.preventDefault();$('cy371results').querySelector('button')?.focus();}if(e.key==='Enter'){e.preventDefault();const found=$('cy371results').querySelector('button');found?.click();}});
 $('cy371results').addEventListener('keydown',e=>{const list=[...$('cy371results').querySelectorAll('button')],i=list.indexOf(document.activeElement);if(e.key==='ArrowDown'){e.preventDefault();list[(i+1)%list.length]?.focus();}if(e.key==='ArrowUp'){e.preventDefault();(i?list[i-1]:search)?.focus();}if(e.key==='Escape')hideResults();});
 document.addEventListener('click',e=>{if(!e.target.closest('.cy371-search'))hideResults();});
 const originalClose=window.cy53.close;
 window.cy53.open=open;
 window.cy53.close=()=>{opened=false;checking=false;epoch++;clearTimeout(expiryTimer);clearModals();hideResults();access=null;summary=null;rows=[];shell.hidden=true;gate.hidden=false;layer.style.display='none';delete document.documentElement.dataset.ccActiveModule;originalClose?.();window.cc166OpenPanel?.();};
 window.cy53.refresh=reload;window.cy53.openDetail=loanDetail;window.cy53.closeDetail=closeModal;window.cy53.printDetail=()=>printCurrent();
 window.cy54.refreshAuth=checkAccess;
 if(oldStatus)window.cy55.status=async function(){await oldStatus();if(opened)await checkAccess();};
 document.addEventListener('cc192-session-ended',()=>{owner='';if(opened)window.cy53.close();$('cy371content').replaceChildren();$('cy371summary').replaceChildren();});
 document.addEventListener('cc192-session-ready',()=>{if(opened&&owner!==session()?.userId)void open();});
 document.addEventListener('visibilitychange',()=>{if(opened&&!document.hidden)void checkAccess();});
 window.addEventListener('focus',()=>{if(opened)void checkAccess();});
 mobileLayout.addEventListener('change',e=>{pageSize=e.matches?5:15;page=0;if(opened&&access?.allowed)void loadList();});
 setInterval(()=>{if(opened&&!document.hidden)void checkAccess();},30000);
}
async function open(){
 if(!session()?.jwt){window.cc77Auth?.(false);return;}
 if(owner!==session().userId){owner=session().userId;timeZone=readTimeZone();zoneLoaded=false;clockOffset=0;financialReport=null;epoch++;checking=false;access=null;clearModals();hideResults();searchSeq++;summary=null;rows=[];view='home';filter='active';currency='';portfolioCurrency='';page=0;query='';$('cy371search').value='';$('cy371summary').replaceChildren();$('cy371content').replaceChildren();}
 else if(opened&&checking)return;
 opened=true;layer.style.display='block';layer.scrollTop=0;document.documentElement.dataset.ccActiveModule='cobra';
 // Synchronize the existing portal before leaving it; it must not reopen over this module.
 window.cc166OpenPanel?.();const portal=$('cc166-panel');if(portal)portal.hidden=true;
 $('cc177-return-panel')?.remove();
 $('cc77home')?.style.setProperty('display','none');$('cc-real-login')?.style.setProperty('display','none');
 shell.hidden=true;gate.hidden=false;sub?.style.setProperty('display','none');
 await checkAccess(true);
}
async function checkAccess(force=false){
 if(!opened||checking)return;checking=true;const generation=epoch;
 try{
  const a=await api('cy371_access');if(!opened||generation!==epoch)return;
  const becameActive=!access?.allowed;access=a;
  shell.hidden=!a.allowed;gate.hidden=!!a.allowed;
  $('cy371search').disabled=!a.allowed;
  if(a.allowed){
   sub?.style.setProperty('display','none');
   clearTimeout(expiryTimer);if(a.expires_at&&!a.admin){const delay=Date.parse(a.expires_at)-Date.now();expiryTimer=setTimeout(()=>void checkAccess(),Math.max(100,Math.min(delay+150,2147483647)));}
   if(force||becameActive||summary?.local_date!==today())await reload();
  }else{
   clearModals();hideResults();summary=null;rows=[];$('cy371summary').replaceChildren();$('cy371content').replaceChildren();
   $('cy371gateStatus').textContent='Activa o renueva COBRA YA para consultar tu cartera. Tu información se conserva.';
   if(sub){sub.hidden=false;sub.style.display='block';}
   // Existing real-wallet/bonus screen; its listeners are preserved, including activation safeguards.
   if(force&&typeof window.cy55?.status==='function')await window.cy55.status();
  }
 }catch(e){
  if(generation!==epoch)return;
  access=null;shell.hidden=true;gate.hidden=false;clearModals();hideResults();$('cy371summary').replaceChildren();$('cy371content').replaceChildren();
  $('cy371gateStatus').textContent='No se pudo verificar la activación. Comprueba la conexión y vuelve a intentar.';
 }finally{checking=false;}
}
function hideResults(){$('cy371results').hidden=true;$('cy371search').setAttribute('aria-expanded','false');}
async function searchFor(text,seq){
 if(!access?.allowed)return;const results=$('cy371results');
 if(text.trim().length<2){hideResults();return;}
 results.hidden=false;results.textContent='Buscando…';$('cy371search').setAttribute('aria-expanded','true');const generation=epoch;
 try{const found=await api('cy371_search',{p_query:text,p_limit:8,p_offset:0});if(seq!==searchSeq||generation!==epoch||!access?.allowed)return;
  results.innerHTML=found.length?found.map(x=>button(`<strong>${esc(x.full_name)}</strong><small>${esc([x.alias,x.client_code,x.loan_code,x.score===20?'Coincidencia aproximada':''].filter(Boolean).join(' · '))}</small>`,'result:'+x.kind+':'+x.id)).join(''):'<p>No se encontraron coincidencias.</p>';
 }catch(e){if(seq===searchSeq){results.textContent='No se pudo buscar. Vuelve a intentar.';if(e.code==='42501')void checkAccess();}}
}
async function reload(){
 if(!opened||!access?.allowed)return;
 const generation=epoch;status('Sincronizando con Supabase…');
 try{
  let zone;if(!zoneLoaded){zone=await api('cy372_context');if(!zone.configured)zone=await api('cy372_set_timezone',{p_timezone:timeZone,p_only_if_missing:true});if(generation!==epoch||!opened)return;timeZone=zone.timezone;zoneLoaded=true;}
  const [s,w]=await Promise.all([api('cy372_dashboard',{p_timezone:timeZone}),api('cc_finance_wallet').catch(()=>null)]);
  if(generation!==epoch||!opened)return;
  summary=s;clockOffset=Date.parse(s.verified_at)-Date.now();if(!Number.isFinite(clockOffset))clockOffset=0;if(currency&&!s.portfolios.some(p=>p.currency===currency))currency='';
  renderSummary(w);await loadList();status('');
 }catch(e){if(generation===epoch)fail(e);}
}
function renderSummary(wallet){
 const portfolios=summary.portfolios,selected=portfolios.find(p=>p.currency===portfolioCurrency)||portfolios[0];
 if(selected)portfolioCurrency=selected.currency;
 $('cy371summary').innerHTML=`<div class="cy371-balances"><article class="cy371-portfolio">${icon('wallet')}<div><h1>Mi Cartera</h1><strong class="${selected?'':'cy371-no-balance'}">${selected?esc(money(selected.amount,selected.currency)):'Sin saldos pendientes'}</strong><small>Total por cobrar${selected?' · '+esc(selected.currency):''}</small></div>${portfolios.length>1?`<label class="cy371-currency"><span>Moneda</span><select id="cy371currency" aria-label="Moneda de la cartera">${portfolios.map(p=>`<option value="${esc(p.currency)}" ${p.currency===portfolioCurrency?'selected':''}>${esc(p.currency)}</option>`).join('')}</select></label>`:''}</article>
 <article class="cy371-wallet">${icon('wallet')}<div><h2>Billetera</h2><strong class="${wallet?.available_pen!=null?'':'cy371-no-balance'}">${wallet?.available_pen!=null?esc(money(wallet.available_pen)):'Saldo sin verificar'}</strong><small>CLAN CARTAN · PEN</small></div>${button(icon('plus'),'wallet','cy371-icon')}</article></div>
 <div class="cy371-stats">${[['clients','clients',summary.clients,'Clientes'],['loans','loan',summary.active,'Préstamos'],['today','calendar',summary.today,'Vencen hoy'],['late','alert',summary.late,'Vencidos']].map(([key,i,n,text])=>button(icon(i)+`<span><strong>${n}</strong><small>${text}</small></span>`+icon('chevron'),'stat:'+key,key)).join('')}</div>`;
 $('cy371currency')?.addEventListener('change',e=>{portfolioCurrency=e.target.value;currency=e.target.value;page=0;renderSummary(wallet);void loadList();});
 const tab=layer.querySelector('.cy371-tabs [data-action="nav:home"] span');if(tab)tab.textContent='Préstamos activos ('+summary.active+')';
 const badge=$('cy371bellCount'),count=summary.attention;badge.textContent=count;badge.hidden=!count;
}
async function navigate(next,nextFilter){view=next;filter=nextFilter||(next==='due'?'today':'active');page=0;query='';shell.classList.remove('drawer-open');await loadList();}
function markNav(){layer.querySelectorAll('[data-action^="nav:"]').forEach(b=>{const selected=b.dataset.action==='nav:'+view;b.classList.toggle('active',selected);if(selected)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}
async function loadList(){
 if(!access?.allowed)return;
 const seq=++loadSeq,generation=epoch;markNav();
 if(view==='due'){await loadAgenda(seq);return;}if(view==='settings'){renderSettings();return;}if(view==='reports'){await reports();return;}
 $('cy371content').innerHTML='<div class="cy371-empty">Cargando registros…</div>';
 const clients=view==='clients',payments=view==='payments';
 $('cy371controls').innerHTML=view==='home'?'':`<div class="cy371-list-controls"><h2>${esc(labels[view])}</h2>${!clients&&!payments?`<select id="cy371filter" aria-label="Filtrar préstamos">${[['active','Activos'],['today','Vencen hoy'],['late','Vencidos'],['soon','Próximos 7 días'],['paid','Pagados'],['all','Todos']].map(([v,l])=>`<option value="${v}" ${filter===v?'selected':''}>${l}</option>`).join('')}</select>`:''}<select id="cy371sort" aria-label="Ordenar"><option value="recent">Más recientes</option><option value="name">Nombre</option>${!clients&&!payments?'<option value="due">Próximo pago</option>':''}</select>${!clients?`<select id="cy371listCurrency" aria-label="Moneda del listado"><option value="">Todas las monedas</option>${(summary.currencies||summary.portfolios.map(p=>p.currency)).map(c=>`<option value="${esc(c)}" ${c===currency?'selected':''}>${esc(c)}</option>`).join('')}</select>`:''}${button('Actualizar','refresh')}</div>`;
 if($('cy371listCurrency'))$('cy371listCurrency').onchange=e=>{currency=e.target.value;page=0;void loadList();};
 if($('cy371sort')){$('cy371sort').value=sort;$('cy371sort').onchange=e=>{sort=e.target.value;page=0;void loadList();};}if($('cy371filter'))$('cy371filter').onchange=e=>{filter=e.target.value;page=0;void loadList();};
 try{
  const data=await api('cy371_list',{p_kind:clients?'clients':payments?'payments':'loans',p_filter:filter,p_currency:clients?null:currency||null,p_query:query,p_limit:pageSize,p_offset:page*pageSize,p_today:today(),p_sort:sort});
  if(seq!==loadSeq||generation!==epoch||!opened)return;
  rows=data.rows;total=data.total;renderRows(clients,payments);renderPages();
 }catch(e){if(seq!==loadSeq||generation!==epoch)return;$('cy371content').innerHTML='<div class="cy371-empty">No se pudieron cargar los registros. Comprueba tu conexión y pulsa Actualizar.</div>';$('cy371pages').replaceChildren();fail(e);}
}
const initials=name=>String(name||'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const person=x=>`<span class="cy371-person"><span class="cy371-avatar">${esc(initials(x.full_name))}</span><span>${esc(x.full_name)}${x.alias?`<small>${esc(x.alias)}</small>`:''}</span></span>`;
const code=x=>x.loan_code||'ID '+String(x.id||x.loan_id).slice(0,8);
const flag=c=>({PEN:'🇵🇪',USD:'🇺🇸',EUR:'🇪🇺',MXN:'🇲🇽',COP:'🇨🇴',CLP:'🇨🇱'}[c]||'');
function renderRows(clients,payments){
 if(!rows.length){$('cy371content').innerHTML=`<div class="cy371-empty">${icon(clients?'clients':'loan')}<h3>${clients?'Aún no tienes clientes':payments?'Sin abonos registrados':'No hay préstamos en este listado'}</h3><p>${clients?'Usa «Nuevo Cliente» para registrar el primero.':payments?'Los abonos confirmados aparecerán aquí.':'Cambia el filtro o registra un préstamo con las acciones superiores.'}</p></div>`;return;}
 const headings=clients?['Cliente','Código','Acciones']:payments?['Cliente','Préstamo','Importe','Fecha','Medio','Acciones']:['Cliente','Préstamo','Monto','Moneda','Próximo pago','Saldo','Acciones'];
 $('cy371content').innerHTML=`<div class="cy371-table-wrap"><table class="cy371-table"><thead><tr>${headings.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(x=>{
  if(clients)return `<tr><td data-label="Cliente">${person(x)}</td><td data-label="Código">${esc(x.client_code||'—')}</td><td>${button(icon('eye')+'<span class="cy371-sr">Ver ficha de '+esc(x.full_name)+'</span>','client:'+x.id,'cy371-small')}</td></tr>`;
  if(payments)return `<tr><td data-label="Cliente">${esc(x.full_name)}</td><td data-label="Préstamo">${esc(code(x))}</td><td data-label="Importe">${esc(money(x.amount,x.currency))}</td><td data-label="Fecha">${date(x.paid_on||x.created_at)}</td><td data-label="Medio">${esc(x.payment_method||'No indicado')}</td><td>${button(icon('eye')+'<span class="cy371-sr">Ver comprobante</span>','receipt:'+x.id,'cy371-small')}</td></tr>`;
  const late=x.next_due&&x.next_due<today()&&Number(x.balance)>0;
  return `<tr><td data-label="Cliente">${person(x)}</td><td data-label="Préstamo">${esc(code(x))}</td><td data-label="Monto">${esc(money(x.principal,x.currency))}</td><td data-label="Moneda"><span class="cy371-flag">${flag(x.currency)}</span> ${esc(x.currency)}</td><td data-label="Próximo pago" class="${late?'cy371-overdue':''}">${icon('calendar')}${date(x.next_due||x.final_due)}</td><td data-label="Saldo"><span class="cy371-balance">${esc(money(x.balance,x.currency))}</span></td><td class="cy371-row-actions">${button(icon('eye')+'<span class="cy371-sr">Ver '+esc(code(x))+'</span>','loan:'+x.id,'cy371-small')}${button(icon('more')+'<span class="cy371-sr">Acciones de '+esc(code(x))+'</span>','actions:'+x.id,'cy371-small')}</td></tr>`;
 }).join('')}</tbody></table></div>`;
}
function renderPages(){$('cy371pages').innerHTML=total>pageSize?`<span>${page*pageSize+1}–${Math.min((page+1)*pageSize,total)} de ${total}</span>${button('Anterior','prev')}${button('Siguiente','next')}`:'';if(total>pageSize){$('cy371pages').querySelector('[data-action=prev]').disabled=page===0;$('cy371pages').querySelector('[data-action=next]').disabled=(page+1)*pageSize>=total;}}
const agendaLabels={today:'Cobros de hoy',tomorrow:'Cobros de mañana',soon:'Próximos 7 días',late:'Préstamos vencidos',paid:'Completamente pagados'};
async function loadAgenda(seq){
 if(!agendaLabels[filter])filter='today';const generation=epoch;
 $('cy371controls').innerHTML=`<div class="cy371-list-controls"><h2>Agenda de cobros</h2><select id="cy372bucket" aria-label="Periodo de agenda">${Object.entries(agendaLabels).map(([k,v])=>`<option value="${k}" ${filter===k?'selected':''}>${v}</option>`).join('')}</select><select id="cy372currency" aria-label="Moneda de agenda"><option value="">Todas las monedas</option>${(summary.currencies||[]).map(c=>`<option value="${esc(c)}" ${c===currency?'selected':''}>${esc(c)}</option>`).join('')}</select>${button('Actualizar','refresh')}<small>${esc(timeZone)}</small></div>`;
 $('cy372bucket').onchange=e=>{filter=e.target.value;page=0;void loadList();};$('cy372currency').onchange=e=>{currency=e.target.value;page=0;void loadList();};
 $('cy371content').innerHTML='<div class="cy371-empty">Consultando agenda…</div>';$('cy371pages').replaceChildren();
 try{
  const data=await api('cy372_agenda',{p_bucket:filter,p_timezone:timeZone,p_currency:currency||null,p_limit:pageSize,p_offset:page*pageSize});
  if(seq!==loadSeq||generation!==epoch||view!=='due')return;total=data.total;rows=data.rows;
  $('cy371content').innerHTML=!rows.length?'<div class="cy371-empty"><h3>Sin registros en este periodo</h3><p>Las cuotas completamente pagadas no aparecen como vencidas.</p></div>':`<div class="cy371-table-wrap"><table class="cy371-table cy372-agenda"><thead><tr>${['Cliente','Préstamo','Importe pendiente','Fecha','Estado','Acciones'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(x=>`<tr><td data-label="Cliente">${person(x)}</td><td data-label="Préstamo">${esc(code(x))}</td><td data-label="Importe pendiente">${esc(money(x.amount,x.currency))} <small>${esc(x.currency)}</small></td><td data-label="Fecha">${date(x.due_on)}${x.installments>1?`<small>${x.installments} cuotas · desde esta fecha</small>`:''}</td><td data-label="Estado">${esc(({PAID:'Pagado',OVERDUE:'Vencido',TODAY:'Hoy',UPCOMING:'Próximo'})[x.state])}</td><td class="cy371-row-actions">${button(icon('eye')+'<span class="cy371-sr">Ver préstamo</span>','loan:'+x.id,'cy371-small')}${x.state!=='PAID'?button(icon('pay')+'<span class="cy371-sr">Registrar abono</span>','payment:'+x.id,'cy371-small'):''}${button(icon('bell')+'<span class="cy371-sr">Preparar WhatsApp</span>','whatsapp:'+x.id+':'+filter,'cy371-small')}</td></tr>`).join('')}</tbody></table></div>`;
  renderPages();
 }catch(e){if(seq===loadSeq&&generation===epoch){$('cy371content').innerHTML='<div class="cy371-empty">No se pudo consultar la agenda. Pulsa Actualizar para reintentar.</div>';fail(e);}}
}
async function reports(){
 const seq=loadSeq,generation=epoch,request=++reportSeq;
 $('cy371pages').replaceChildren();
 const start=financialReport?.start||today().slice(0,8)+'01',end=financialReport?.end||today();
 $('cy371controls').innerHTML=`<form id="cy372period" class="cy371-list-controls"><h2>Reportes por moneda</h2><label>Desde<input name="start" type="date" value="${esc(start)}" required></label><label>Hasta<input name="end" type="date" value="${esc(end)}" required></label><button type="submit">Consultar periodo</button></form>`;
 $('cy372period').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;financialReport={start:f.elements.start.value,end:f.elements.end.value};void reports();};
 $('cy371content').innerHTML='<div class="cy371-empty">Consultando indicadores…</div>';
 try{
  const r=await api('cy372_financials',{p_start:start,p_end:end,p_timezone:timeZone});if(seq!==loadSeq||generation!==epoch||request!==reportSeq||view!=='reports')return;financialReport=r;
  renderFinancialReport(r);
 }catch(e){if(seq===loadSeq&&generation===epoch&&request===reportSeq){$('cy371content').innerHTML='<div class="cy371-empty">No se pudo consultar el reporte. Reintenta con «Consultar periodo».</div>';fail(e);}}
}
function renderFinancialReport(r){
 if(!r.rows.some(x=>x.currency===reportCurrency))reportCurrency=r.rows[0]?.currency||'';
 $('cy371content').innerHTML=`<div class="cy371-report"><p>Condiciones vigentes por moneda. Los abonos del periodo son cobros registrados, no intereses proyectados.</p><label>Moneda del reporte<select id="cy372reportcurrency">${r.rows.map(x=>`<option value="${esc(x.currency)}" ${x.currency===reportCurrency?'selected':''}>${esc(x.currency)}</option>`).join('')}</select></label><div class="cy372-financials">${r.rows.filter(x=>x.currency===reportCurrency).map(x=>`<article><h3>${esc(x.currency)}</h3><dl class="cy371-facts">${[['Capital prestado (registrado)',money(x.principal,x.currency)],['Intereses pactados',money(x.interest_agreed,x.currency)],['Abonos acumulados',money(x.payments_total,x.currency)],['Saldo total pendiente',money(x.balance,x.currency)],['Cuotas vencidas',x.overdue_count+' · '+money(x.overdue_amount,x.currency)],['Cobros del periodo',money(x.collected,x.currency)+' · '+x.payment_count+' abonos']].map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}<div><dt>Capital recuperado / pendiente</dt><dd>Sin desglose registrado</dd></div><div><dt>Intereses efectivamente cobrados</dt><dd>Sin desglose registrado</dd></div></dl></article>`).join('')||'<p>Sin préstamos registrados.</p>'}</div><p>El sistema actual aplica abonos a cuotas sin separar capital e intereses. Ese desglose requiere una regla aprobada; no se calcula por suposición. El capital y los intereses pactados reflejan las condiciones registradas y sus correcciones.</p>${button('Descargar resumen CSV','export')}<p>Zona horaria: ${esc(r.timezone)}. La billetera CLAN CARTAN se consulta por separado.</p></div>`;
 $('cy372reportcurrency').onchange=e=>{reportCurrency=e.target.value;renderFinancialReport(r);};
}
function exportReport(){
 if(!financialReport?.rows){status('Consulta primero un periodo válido.',true);return;}
 const r=financialReport,lines=[['Moneda','Capital registrado','Intereses pactados','Abonos acumulados','Saldo total pendiente','Cuotas vencidas','Importe vencido','Cobros del periodo','Desde','Hasta','Desglose capital/intereses'],...r.rows.map(x=>[x.currency,x.principal,x.interest_agreed,x.payments_total,x.balance,x.overdue_count,x.overdue_amount,x.collected,r.start,r.end,'Sin desglose registrado'])];
 const blob=new Blob(['\uFEFF'+lines.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});download(blob,'cobra-ya-reporte-'+today()+'.csv');
}
function download(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}

function renderSettings(){
 $('cy371controls').innerHTML='<div class="cy371-list-controls"><h2>Configuración</h2></div>';$('cy371pages').replaceChildren();
 $('cy371content').innerHTML=`<div class="cy371-report"><h3>Mi cuenta CLAN CARTAN</h3><p>La sesión, el perfil y la billetera se administran desde tu cuenta existente.</p>${button('Abrir mi perfil','profile')}${button('Consultar billetera','wallet')}<label>Zona horaria de mi agenda<select id="cy372timezone">${[...new Set([timeZone,...(Intl.supportedValuesOf?Intl.supportedValuesOf('timeZone'):['America/Lima','America/Bogota','America/Mexico_City','Europe/Madrid','UTC'])])].sort().map(z=>`<option value="${esc(z)}" ${z===timeZone?'selected':''}>${esc(z)}</option>`).join('')}</select></label><small>Se guarda en tu cuenta y se comparte entre tus dispositivos. Cambiar la zona no altera las fechas de los préstamos.</small><p>Activación: ${access?.expires_at?esc(date(access.expires_at)):access?.admin?'Acceso administrativo existente':'Verificada'}</p><p>Interés simple mensual y moneda elegida por préstamo. Las ampliaciones y correcciones conservan las reglas actuales.</p><p>Abonos exclusivos a capital o intereses y congelación: pendientes de una regla financiera aprobada.</p></div>`;
 $('cy372timezone').onchange=async e=>{try{tools.todayAt(e.target.value);const ctx=await api('cy372_set_timezone',{p_timezone:e.target.value});timeZone=ctx.timezone;localStorage.setItem('cobra:timezone:'+session().userId,timeZone);financialReport=null;await reload();}catch(error){fail(error);}};
}
async function attention(){if(!access?.allowed)return;
 const dlg=dialog('Atención de hoy',`<div class="cy371-attention">${[['today','calendar','Cobros de hoy',summary.today],['tomorrow','calendar','Cobros de mañana',summary.tomorrow],['soon','calendar','Próximos 7 días',summary.soon],['late','alert','Préstamos vencidos',summary.late],['paid','pay','Completamente pagados',summary.paid]].map(([f,i,l,n])=>button(icon(i)+`<span>${l}</span><strong>${n}</strong>`,'attention-filter:'+f)).join('')}</div>`);dlg.classList.add('cy371-attention-dialog');
}
function clientForm(c=null){
 const dlg=dialog(c?'Editar cliente':'Nuevo cliente',`<form class="cy371-form"><div class="cy371-form-grid">${field('DNI u otro documento','document_number',c?.document_number||'','maxlength="20" autocomplete="off"')}${field('Nombre completo *','full_name',c?.full_name||'','required minlength="2" maxlength="160" autocomplete="name"')}${field('Alias / apodo','alias',c?.alias||'','maxlength="80"')}${field('Celular / WhatsApp (con código de país)','phone',c?.phone||'','maxlength="25" autocomplete="tel"','tel')}${field('Teléfonos alternativos (separados por coma)','alternate_phones',(c?.alternate_phones||[]).join(', '),'maxlength="120"')}${field('Correo','email',c?.email||'','maxlength="254" autocomplete="email"','email')}</div><details><summary>Dirección y observaciones</summary>${field('Dirección','address',c?.address||'','maxlength="300"')}${field('Distrito / ciudad','district',c?.district||'','maxlength="120"')}${field('Referencia de domicilio','address_reference',c?.address_reference||'','maxlength="300"')}${area('Observaciones','notes',c?.notes||'')}${area('Referencias autorizadas para búsqueda (una por línea)','search_references',(c?.search_references||[]).join('\n'),1600)}</details><p>Un mismo cliente puede tener varios préstamos. Si el documento ya está registrado, se reutilizará su ficha.</p>${formFooter(c?'Guardar cambios':'Guardar cliente')}</form>`);
 bindForm(dlg,c?'edit_client':'client',f=>{const data=Object.fromEntries(f);data.phone=data.phone.trim()? '+'+data.phone.replace(/\D/g,''):'';data.alternate_phones=data.alternate_phones.split(',').map(v=>v.replace(/\D/g,'')).filter(Boolean).map(v=>'+'+v);data.search_references=data.search_references.split('\n').map(v=>v.trim()).filter(Boolean);if(c)data.id=c.id;return data;},id=>clientDetail(id));
 // Reuse the existing authorized API Perú function; manual entry remains available.
 const form=dlg.querySelector('form'),documentInput=form.elements.document_number,nameInput=form.elements.full_name,verify=document.createElement('button');
 verify.type='button';verify.textContent='Consultar DNI · API Perú';
 documentInput.closest('label').append(verify);
 const hint=document.createElement('small');hint.textContent='Al completar 8 dígitos se consultarán los nombres y apellidos. Los demás datos se registran manualmente.';documentInput.closest('label').append(hint);
 let timer,sequence=0,controller=null,lastDni='';
 const lookup=async()=>{
  const dni=documentInput.value.trim(),msg=form.querySelector('[role=status]');
  if(!/^\d{8}$/.test(dni)){msg.textContent='Para consultar DNI peruano, escribe sus 8 dígitos. Puedes registrar otros documentos manualmente.';return;}
  if(verify.disabled)return;
  const s=session(),generation=epoch,request=++sequence,originalName=nameInput.value;
  if(!s?.jwt)return;
  controller?.abort();controller=new AbortController();const stop=setTimeout(()=>controller.abort(),12000);
  const current=()=>request===sequence&&generation===epoch&&dlg.isConnected&&documentInput.value.trim()===dni&&session()?.userId===s.userId&&session()?.jwt===s.jwt;
  verify.disabled=true;msg.textContent='Consultando API Perú mediante el servicio autorizado…';lastDni=dni;
  try{
   const r=await fetch(s.root+'/functions/v1/cc-consulta-dni',{method:'POST',headers:{apikey:s.key,Authorization:'Bearer '+s.jwt,'Content-Type':'application/json'},body:JSON.stringify({dni}),signal:controller.signal}),v=await r.json();
   if(!current())return;
   if(r.ok&&['found','saved'].includes(v.status)&&v.full_name){
    if(nameInput.value===originalName){nameInput.value=String(v.full_name).slice(0,160);msg.textContent='Nombres y apellidos encontrados. Revisa los datos antes de guardar.';}
    else msg.textContent='Consulta terminada. Se conserva el nombre que escribiste manualmente.';
   }else msg.textContent='Consulta no disponible o sin cupo para esta cuenta. Puedes continuar manualmente.';
  }catch{if(current())msg.textContent='No se pudo conectar al servicio de identidad. Puedes continuar manualmente.';}
  finally{clearTimeout(stop);if(request===sequence)verify.disabled=false;}
 };
 documentInput.addEventListener('input',()=>{
  clearTimeout(timer);sequence++;controller?.abort();verify.disabled=false;
  if(/^\d{8}$/.test(documentInput.value.trim())&&documentInput.value.trim()!==lastDni)timer=setTimeout(lookup,350);
 });
 verify.onclick=()=>{clearTimeout(timer);void lookup();};
 documentInput.focus();
}
async function pickClient(title,onSelect){
 const dlg=dialog(title,'<label class="cy371-picker-label">Buscar cliente<input id="cy371pickClient" type="search" placeholder="Nombre, alias, DNI, celular o código" autocomplete="off"></label><div id="cy371pickResults" aria-live="polite">Escribe al menos 2 caracteres.</div>'+button('Registrar un cliente nuevo','new-client'));
 const input=$('cy371pickClient'),results=$('cy371pickResults');let timer,seq=0;
 input.addEventListener('input',()=>{clearTimeout(timer);const n=++seq;timer=setTimeout(async()=>{if(input.value.trim().length<2){results.textContent='Escribe al menos 2 caracteres.';return;}results.textContent='Buscando…';try{const all=await api('cy371_search',{p_query:input.value,p_limit:20});if(n!==seq||!dlg.isConnected)return;const found=all.filter(x=>x.kind==='client');results.innerHTML=found.length?found.map(x=>`<button type="button" data-pick="${esc(x.id)}"><strong>${esc(x.full_name)}</strong><small>${esc([x.alias,x.client_code].filter(Boolean).join(' · '))}</small></button>`).join(''):'Sin coincidencias.';results.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const c=found.find(x=>x.id===b.dataset.pick);closeModal();void onSelect(c);});}catch(e){results.textContent='No se pudo buscar. Reintenta.';}},250);});
 input.focus();
}
function addMonths(value,months){const d=new Date(value+'T12:00:00'),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+Number(months));d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
const supportedCurrencies=['PEN','USD','EUR','MXN','CLP','COP','ARS','BOB','BRL','UYU','PYG','GBP','CAD','GTQ','CRC','DOP','PAB','VES','NIO','HNL','SVC','CUP','JMD','HTG','TTD','BZD','GYD','SRD','AWG','ANG','BSD','BBD','XCD','CHF','AUD','NZD','JPY','CNY','INR','KRW','ZAR','EGP','MAD','NGN','KES','GHS','AED','SAR','TRY','SEK','NOK','DKK','PLN','CZK','HUF','RON','UAH','RUB','IDR','MYR','SGD','THB','PHP','VND','HKD','TWD','ILS'];
function loanForm(c){
 const dlg=dialog('Nuevo préstamo',`<form class="cy371-form"><p>Cliente: <strong>${esc(c.full_name)}</strong> · ${esc(c.client_code||'')}</p><div class="cy371-form-grid">${field('Capital *','principal','','required min="0.01" max="100000000" step="0.01" inputmode="decimal"','number')}<label>Moneda *<select name="currency">${supportedCurrencies.map(x=>`<option value="${x}" ${x===(portfolioCurrency||'PEN')?'selected':''}>${x}</option>`).join('')}</select></label>${field('Interés mensual (%) *','monthly_rate','10','required min="0" max="100" step="0.01"','number')}${field('Plazo en meses *','months','3','required min="1" max="120" step="1"','number')}${field('Fecha de vencimiento final *','final_due',addMonths(today(),3),'required','date')}${field('Número de cuotas *','installments','1','required min="1" max="360" step="1"','number')}</div><p id="cy371preview" class="cy371-preview"></p><p>Interés simple mensual sobre capital inicial. Las cuotas distribuyen el total. Los cálculos definitivos los valida Supabase.</p>${area('Garantía (opcional)','collateral','',1000)}${area('Observaciones del préstamo','notes','',1000)}${formFooter('Guardar préstamo')}</form>`);
 const f=dlg.querySelector('form');f.elements.months.oninput=()=>{f.elements.final_due.value=addMonths(today(),f.elements.months.value||1);};
 const update=()=>{try{const cents=decimal(f.elements.principal.value||'0'),rate=decimal(f.elements.monthly_rate.value||'0'),months=BigInt(f.elements.months.value||1);const interest=(cents*rate*months+5000n)/10000n;$('cy371preview').textContent='Total estimado: '+money(tools.major(cents+interest),f.elements.currency.value);}catch{$('cy371preview').textContent='Completa los importes para ver el total estimado.';}};
 f.addEventListener('input',update);update();bindForm(dlg,'loan',d=>({...Object.fromEntries(d),client_id:c.id}),id=>loanDetail(id));
}
function decimal(value){if(!/^\d+(\.\d{1,2})?$/.test(String(value)))throw Error('Usa como máximo dos decimales.');const [a,b='']=String(value).split('.');return BigInt(a)*100n+BigInt((b+'00').slice(0,2));}
async function paymentPicker(c){
 const data=await api('cy371_list',{p_kind:'loans',p_filter:'active',p_client:c.id,p_limit:50,p_offset:0});
 const dlg=dialog('Seleccionar préstamo',`<p>${esc(c.full_name)}</p><div class="cy371-pick-list">${data.rows.map(l=>button(`<strong>${esc(code(l))}</strong><span>${esc(money(l.balance,l.currency))} pendientes</span>`,'payment:'+l.id)).join('')||'<p>Este cliente no tiene préstamos pendientes.</p>'}</div>${data.total>50?'<p>Hay más préstamos: utiliza el buscador principal con el código del préstamo.</p>':''}`);
}
async function paymentForm(id){
 const l=await api('cy371_loan',{p_id:id});if(l.status!=='ACTIVE'||decimal(l.balance)<=0n){status('Este préstamo no tiene saldo pendiente.');return;}
 const dlg=dialog('Registrar abono',`<form class="cy371-form"><div class="cy371-detail-summary"><strong>${esc(l.full_name)}</strong><span>${esc(code(l))} · ${esc(l.currency)}</span><strong>Saldo: ${esc(money(l.balance,l.currency))}</strong></div><div class="cy371-form-grid">${field('Importe recibido ('+esc(l.currency)+') *','amount','','required min="0.01" max="'+esc(l.balance)+'" step="0.01" inputmode="decimal"','number')}${field('Fecha del abono *','paid_on',today(),'required max="'+today()+'"','date')}<label>Medio de pago *<select name="payment_method" required><option value="">Seleccionar</option>${['Efectivo','Transferencia','Yape','Plin','Otro'].map(s=>`<option>${s}</option>`).join('')}</select></label></div>${area('Observación opcional','memo')}<label class="cy371-consent"><input type="checkbox" required> Confirmo que recibí este dinero directamente. El registro no mueve la billetera de CLAN CARTAN.</label>${formFooter('Confirmar abono')}</form>`);
 bindForm(dlg,'payment',f=>{const d=Object.fromEntries(f);if(decimal(d.amount)>decimal(l.balance))throw Error('El importe supera el saldo.');return {...d,loan_id:id,currency:l.currency};},receiptDetail);
}
async function clientDetail(id,tab='general',offset=0){
 const c=await api('cy371_client',{p_id:id});const tabs=[['general','Datos generales'],['loans','Préstamos'],['payments','Pagos y abonos'],['schedule','Cronogramas'],['collateral','Garantías'],['history','Historial']];
 const dlg=dialog('Ficha del cliente',`<div class="cy371-client-heading"><h3>${esc(c.full_name)}</h3><p>${esc([c.alias,c.client_code].filter(Boolean).join(' · '))}</p>${button('Editar datos','edit-client:'+id)}${button('Nuevo préstamo','client-loan:'+id)}</div><nav class="cy371-dossier-tabs" aria-label="Ficha del cliente">${tabs.map(([t,l])=>button(l,'client-tab:'+id+':'+t,t===tab?'active':'')).join('')}</nav><div id="cy371dossierBody">Cargando…</div>`);
 if(tab==='general'){$('cy371dossierBody').innerHTML=`<dl class="cy371-facts">${[['Documento',c.document_number],['WhatsApp',c.phone],['Otros teléfonos',(c.alternate_phones||[]).join(' · ')],['Correo',c.email],['Dirección',[c.address,c.district].filter(Boolean).join(', ')],['Referencia',c.address_reference],['Observaciones',c.notes]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v||'No indicado')}</dd></div>`).join('')}</dl>`;return;}
 if(tab==='history'){const history=await api('cy371_history',{p_client:id,p_offset:offset});if(!dlg.isConnected)return;const names={client:'Cliente registrado',edit_client:'Datos actualizados',loan:'Préstamo registrado',payment:'Abono recibido',correct:'Corrección auditada',extend:'Ampliación de plazo',close:'Préstamo finalizado'};$('cy371dossierBody').innerHTML=history.map(x=>`<p>${date(x.created_at)} · ${esc(names[x.kind]||x.kind)}</p>`).join('')||'<p>Sin operaciones V371 registradas. Las operaciones anteriores se conservan en cada préstamo.</p>';if(history.length===30)$('cy371dossierBody').insertAdjacentHTML('beforeend',button('Ver más','client-history:'+id+':'+(offset+30)));return;}
 const data=await api('cy371_list',{p_kind:tab==='payments'?'payments':'loans',p_filter:'all',p_client:id,p_limit:15,p_offset:offset});if(!dlg.isConnected)return;
 $('cy371dossierBody').innerHTML=data.rows.map(l=>`<article class="cy371-dossier-loan"><strong>${esc(code(l))} · ${esc(money(tab==='payments'?l.amount:l.principal,l.currency))}</strong><p>${tab==='payments'?date(l.paid_on||l.created_at)+' · '+esc(l.payment_method||'No indicado'):'Saldo: '+esc(money(l.balance,l.currency))+' · Vence: '+date(l.final_due)}</p>${tab==='collateral'?`<p>${esc(l.collateral||'Sin garantía registrada.')}</p>`:''}${button(tab==='payments'?'Ver comprobante':tab==='collateral'?'Ver garantía':tab==='schedule'?'Ver cronograma':'Ver préstamo',tab==='payments'?'receipt:'+l.id:'loan:'+l.id)}</article>`).join('')||'<p>Sin registros en esta pestaña.</p>';
 if(data.total>offset+15)$('cy371dossierBody').insertAdjacentHTML('beforeend',button('Ver más','client-page:'+id+':'+tab+':'+(offset+15)));
}
let currentLoan=null;
async function loanDetail(id){
 const l=await api('cy371_loan',{p_id:id});currentLoan=l;
 const active=l.status==='ACTIVE'&&decimal(l.balance)>0n;
 dialog('Préstamo '+code(l),`<div class="cy371-loan-heading"><h3>${esc(l.full_name)}</h3><span>${esc(l.status==='CANCELLED'?'Cancelado':decimal(l.balance)===0n?'Pagado':l.status==='CLOSED'?'Finalizado':'Activo')}</span></div><dl class="cy371-facts">${[['Capital',money(l.principal,l.currency)],['Total pactado',money(l.total_due,l.currency)],['Abonos',money(l.paid,l.currency)],['Saldo pendiente',money(l.balance,l.currency)],['Interés mensual',l.monthly_rate+'%'],['Plazo',l.months+' meses'],['Inicio',date(l.issued_on)],['Vencimiento',date(l.final_due)]].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
 <div class="cy371-detail-actions">${active?button('Registrar abono','payment:'+id,'green'):''}${button('Ficha del cliente','client:'+l.client_id)}${button('Imprimir / guardar PDF','print')}${button('Acciones','actions:'+id)}</div>
 <details open><summary>Cronograma de pagos</summary><div class="cy371-modal-table"><table><thead><tr><th>Cuota</th><th>Fecha</th><th>Importe</th><th>Abonado</th></tr></thead><tbody>${l.installments.map(i=>`<tr><td>${i.installment_number}</td><td>${date(i.due_on)}</td><td>${esc(money(i.amount,l.currency))}</td><td>${esc(money(i.paid_total,l.currency))}</td></tr>`).join('')}</tbody></table></div></details>
 <details><summary>Pagos y abonos (${l.payments.length})</summary>${l.payments.map(p=>`<p>${date(p.paid_on||p.created_at)} · <strong>${esc(money(p.amount,l.currency))}</strong> · ${esc(p.payment_method||'No indicado')}<br>${esc(p.memo||'')} ${button('Comprobante','receipt:'+p.id)}</p>`).join('')||'<p>Sin abonos registrados.</p>'}</details>
 <details><summary>Garantía y observaciones</summary><p>${esc(l.collateral||'Sin garantía registrada.')}</p><p>${esc(l.notes||'Sin observaciones.')}</p></details>
 <details><summary>Historial y correcciones</summary>${l.extensions.map(x=>`<p>${date(x.created_at)} · Ampliación: ${date(x.old_due_on)} → ${date(x.new_due_on)} · ${esc(x.reason||'')}</p>`).join('')}${l.corrections.map(x=>`<p>${date(x.created_at)} · Corrección: ${esc(x.reason)} · Total ${esc(money(x.total_due,l.currency))}</p>`).join('')||(!l.extensions.length?'<p>Sin cambios registrados.</p>':'')}</details>`);
}
async function loanActions(id){
 const l=await api('cy371_loan',{p_id:id});
 dialog('Acciones · '+code(l),`<div class="cy371-pick-list">${button('Ver ficha','loan:'+id)}${l.status==='ACTIVE'&&decimal(l.balance)>0n?button('Registrar abono','payment:'+id)+button('Ampliar plazo','extend:'+id)+button('Corregir préstamo','correct:'+id):''}${l.status==='ACTIVE'&&decimal(l.balance)===0n?button('Finalizar préstamo pagado','finish:'+id):''}${button('Preparar mensaje de WhatsApp','whatsapp:'+id)}</div>`);
}
async function editLoan(id,extend){
 const l=await api('cy371_loan',{p_id:id});
 const dlg=dialog(extend?'Ampliar plazo':'Corregir préstamo',`<form class="cy371-form"><p>${esc(code(l))} · ${esc(l.full_name)}</p>${extend?field('Meses adicionales (1–12)','months','1','required min="1" max="12"','number'):`<div class="cy371-form-grid">${field('Capital','principal',l.principal,'required min="0.01" max="100000000" step="0.01"','number')}${field('Interés mensual (%)','monthly_rate',l.monthly_rate,'required min="0" max="100" step="0.01"','number')}${field('Plazo (meses)','months',l.months,'required min="1" max="120" step="1"','number')}${field('Vencimiento final','final_due',l.final_due,'required','date')}</div>`}${area('Motivo del cambio','reason')}<p>${extend?'La ampliación utiliza la regla actual: extiende el vencimiento sin añadir intereses.':'La corrección utiliza la fórmula actual y conserva los abonos y datos originales.'}</p><label class="cy371-consent"><input type="checkbox" required> Confirmo los datos y el cambio solicitado.</label>${formFooter('Guardar cambio')}</form>`);
 const form=dlg.querySelector('form'),preview=document.createElement('div');preview.className='cy371-preview';preview.setAttribute('aria-live','polite');form.querySelector('[role=status]').before(preview);
 const update=()=>{
  try{
   const capital=extend?decimal(l.principal):decimal(form.elements.principal.value),rate=extend?0n:decimal(form.elements.monthly_rate.value),months=Number(form.elements.months.value);
   if(!Number.isInteger(months)||months<1||months>(extend?12:120)||extend&&Number(l.months)+months>120)throw Error('Revisa el plazo.');
   const total=extend?decimal(l.total_due):capital+(capital*rate*BigInt(months)+5000n)/10000n,paid=decimal(l.paid);
   if(total<paid)throw Error('El total corregido no puede ser menor que los abonos registrados.');
   const due=extend?addMonths(l.final_due,months):tools.iso(form.elements.final_due.value);
   preview.innerHTML=`<strong>Vista previa de condiciones</strong><dl class="cy371-facts">${[['Capital',money(l.principal,l.currency)+' → '+money(tools.major(capital),l.currency)],['Total pactado',money(l.total_due,l.currency)+' → '+money(tools.major(total),l.currency)],['Saldo pendiente',money(l.balance,l.currency)+' → '+money(tools.major(total-paid),l.currency)],['Vencimiento',date(l.final_due)+' → '+date(due)]].map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><small>Supabase valida las condiciones y abonos actuales al guardar. No se modifican registros hasta confirmar.</small>`;
   form.dataset.previewValid='true';
  }catch(e){preview.textContent=e.message;form.dataset.previewValid='false';}
 };
 form.addEventListener('input',update);update();
 bindForm(dlg,extend?'extend':'correct',f=>{if(form.dataset.previewValid!=='true')throw Error('Revisa la vista previa antes de confirmar.');return {...Object.fromEntries(f),loan_id:id};},()=>loanDetail(id));
}
async function finishLoan(id){const dlg=dialog('Finalizar préstamo pagado',`<form class="cy371-form"><p>Se conservarán el cliente, el cronograma y todos los abonos.</p><label class="cy371-consent"><input type="checkbox" required> Confirmo la finalización.</label>${formFooter('Finalizar préstamo')}</form>`);bindForm(dlg,'close',()=>({loan_id:id}),()=>loanDetail(id));}
async function whatsapp(id,bucket='auto'){
 const generation=epoch;
 const [l,ctx]=await Promise.all([api('cy371_loan',{p_id:id}),api('cy372_context',{p_timezone:timeZone})]),c=await api('cy371_client',{p_id:l.client_id});
 if(generation!==epoch||!opened)return;
 const text=tools.reminder(l,ctx.local_date,bucket),link=tools.whatsappLink(c.phone,text);
 dialog('Preparar mensaje de WhatsApp',`<p>Revisa el mensaje. Abrir WhatsApp no significa que se haya enviado.</p><textarea rows="13" readonly aria-label="Mensaje">${esc(text)}</textarea>${link?`<a class="cy371-submit" href="${esc(link)}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>`:'<p>Registra un teléfono válido con código de país en la ficha del cliente para abrir WhatsApp.</p>'}`);
}
async function receiptDetail(id){
 const generation=epoch,r=await api('cy372_receipt',{p_payment:id,p_timezone:timeZone});if(generation!==epoch||!opened)return;
 const lines=tools.receiptLines(r),link=tools.whatsappLink(r.phone,tools.receiptMessage(r));
 dialog('Comprobante de abono',`<div class="cy372-receipt"><h3>🐍 COBRA YA!</h3><dl class="cy371-facts">${lines.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p>Comprobante interno de abono. No constituye un comprobante tributario autorizado. El saldo corresponde al momento de la consulta.</p><strong>www.ClanCartan.com</strong></div><div class="cy371-detail-actions">${button('Descargar PDF','receipt-pdf:'+id)}${button('Imprimir','receipt-print:'+id)}${link?`<a href="${esc(link)}" target="_blank" rel="noopener noreferrer">Compartir por WhatsApp</a>`:'<p>Para compartir por WhatsApp, registra un teléfono válido con código de país.</p>'}</div>`);
}
async function printReceipt(id){
 const popup=window.open('','_blank');if(!popup){status('Permite ventanas emergentes para imprimir.',true);return;}
 try{const r=await api('cy372_receipt',{p_payment:id,p_timezone:timeZone}),lines=tools.receiptLines(r);popup.document.write(`<!doctype html><html lang="es"><meta charset="utf-8"><title>COBRA YA · Abono ${esc(r.id)}</title><style>body{font:15px system-ui;margin:32px;color:#15102d}img{width:100px}dl div{padding:9px 0;border-bottom:1px solid #ddd}dt{font-size:12px;color:#555}dd{margin:4px 0;overflow-wrap:anywhere}</style><img src="${esc(location.origin)}/assets/logo-cobraya-v304.avif" alt="CobraYa! CLAN CARTAN"><h1>🐍 COBRA YA!</h1><h2>Comprobante interno de abono</h2><dl>${lines.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl><p>No constituye un comprobante tributario autorizado. El saldo corresponde al momento de la consulta.</p><strong>www.ClanCartan.com</strong></html>`);popup.document.close();popup.focus();popup.print();}catch(e){popup.close();throw e;}
}

function printCurrent(){if(!currentLoan)return;const l=currentLoan,w=window.open('','_blank','width=900,height=700');if(!w){status('Permite ventanas emergentes para imprimir.',true);return;}w.document.write(`<!doctype html><html lang="es"><meta charset="utf-8"><title>${esc(code(l))} · COBRA YA</title><style>body{font:14px system-ui;margin:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #aaa;padding:8px;text-align:left}</style><h1>COBRA YA · CLAN CARTAN</h1><h2>${esc(code(l))} · ${esc(l.full_name)}</h2><p>Capital: ${esc(money(l.principal,l.currency))} · Total: ${esc(money(l.total_due,l.currency))} · Pendiente: ${esc(money(l.balance,l.currency))}</p><h3>Cronograma</h3><table><tr><th>Cuota</th><th>Fecha</th><th>Importe</th><th>Abonado</th></tr>${l.installments.map(i=>`<tr><td>${i.installment_number}</td><td>${date(i.due_on)}</td><td>${esc(money(i.amount,l.currency))}</td><td>${esc(money(i.paid_total,l.currency))}</td></tr>`).join('')}</table><h3>Historial de abonos</h3>${l.payments.map(p=>`<p>${date(p.paid_on||p.created_at)} · ${esc(money(p.amount,l.currency))} · ${esc(p.payment_method||'')} · ${esc(p.memo||'')}</p>`).join('')||'<p>Sin abonos.</p>'}</html>`);w.document.close();w.focus();setTimeout(()=>w.print(),350);}
async function handle(e){
 const b=e.target.closest('[data-action]');if(!b||b.disabled)return;const [action,a,c,d]=b.dataset.action.split(':');
 try{
  if(action==='close-modal'){closeModal();return;}
  if(action==='back'){window.cy53.close();window.cc166ReturnToBusinesses?.();return;}
  if(action==='check-access'){await checkAccess(true);return;}
  if(action==='profile'){window.cy53.close();window.cc166OpenProfile?.(()=>window.cy53.open());return;}
  if(!access?.allowed)return;
  if(action==='wallet'){window.cy53.close();window.cc166OpenWallet?.('summary',()=>window.cy53.open());}
  else if(action==='menu'){if(matchMedia('(max-width: 1000px)').matches)shell.classList.toggle('drawer-open');else shell.classList.toggle('sidebar-collapsed');const m=layer.querySelector('.cy371-menu');m.setAttribute('aria-expanded',String(shell.classList.contains('drawer-open')));}
  else if(action==='nav')await navigate(a);
  else if(action==='stat'){currency='';await navigate(a==='clients'?'clients':['today','late'].includes(a)?'due':'loans',a==='today'?'today':a==='late'?'late':'active');}
  else if(action==='attention-filter'){closeModal();await navigate('due',a);}
  else if(action==='attention')await attention();
  else if(action==='refresh')await reload();
  else if(action==='prev'){page--;await loadList();}
  else if(action==='next'){page++;await loadList();}
  else if(action==='export')exportReport();
  else if(action==='new-client')clientForm();
  else if(action==='new-loan')await pickClient('Nuevo préstamo · Seleccionar cliente',loanForm);
  else if(action==='new-payment')await pickClient('Registrar abono · Buscar cliente',paymentPicker);
  else if(action==='result'){hideResults();if(a==='client')await clientDetail(c);else await loanDetail(c);}
  else if(action==='client')await clientDetail(a);
  else if(action==='edit-client')clientForm(await api('cy371_client',{p_id:a}));
  else if(action==='client-loan')loanForm(await api('cy371_client',{p_id:a}));
  else if(action==='client-tab')await clientDetail(a,c);
  else if(action==='client-page')await clientDetail(a,c,Number(d));
  else if(action==='client-history')await clientDetail(a,'history',Number(c));
  else if(action==='loan')await loanDetail(a);
  else if(action==='payment')await paymentForm(a);
  else if(action==='actions')await loanActions(a);
  else if(action==='extend')await editLoan(a,true);
  else if(action==='correct')await editLoan(a,false);
  else if(action==='finish')await finishLoan(a);
  else if(action==='whatsapp')await whatsapp(a,c||'auto');
  else if(action==='receipt')await receiptDetail(a);
  else if(action==='receipt-pdf'){b.disabled=true;const generation=epoch;try{const r=await api('cy372_receipt',{p_payment:a,p_timezone:timeZone}),pdf=await tools.receiptPdf(r);if(generation===epoch&&opened&&access?.allowed)download(pdf,'COBRA-YA-abono-'+r.id+'.pdf');}finally{b.disabled=false;}}
  else if(action==='receipt-print')await printReceipt(a);
  else if(action==='print')printCurrent();
 }catch(error){fail(error);}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
