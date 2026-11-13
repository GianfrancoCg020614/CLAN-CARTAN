/* CLAN CARTAN V373 / MI COCHERA: modulo multiempresa protegido en Supabase.
 No intenta cobrar pagos comerciales ni transferir bonos. */
(function(){
"use strict";
if(window.mc373Loaded)return;window.mc373Loaded=true;
const $=id=>document.getElementById(id),ses=()=>window.CC_V53_SESSION;
const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const num=x=>Number(x||0);
const currencyLocales={PEN:"es-PE",USD:"en-US",EUR:"es-ES",COP:"es-CO",MXN:"es-MX",ARS:"es-AR",CLP:"es-CL",BOB:"es-BO",BRL:"pt-BR",UYU:"es-UY",PYG:"es-PY",CRC:"es-CR",DOP:"es-DO",CAD:"en-CA",GBP:"en-GB",GTQ:"es-GT",VES:"es-VE"};
const currency=(v,c)=>{try{return new Intl.NumberFormat(currencyLocales[c]||"es-PE",{style:"currency",currency:c||"PEN",minimumFractionDigits:2,maximumFractionDigits:2}).format(num(v));}catch(_){return (c||"PEN")+" "+num(v).toFixed(2);}};
const countryMeta={PE:["🇵🇪","Perú","PEN"],US:["🇺🇸","Estados Unidos","USD"],ES:["🇪🇸","España","EUR"],AT:["🇦🇹","Austria","EUR"],BE:["🇧🇪","Bélgica","EUR"],CY:["🇨🇾","Chipre","EUR"],DE:["🇩🇪","Alemania","EUR"],EE:["🇪🇪","Estonia","EUR"],FI:["🇫🇮","Finlandia","EUR"],FR:["🇫🇷","Francia","EUR"],GR:["🇬🇷","Grecia","EUR"],HR:["🇭🇷","Croacia","EUR"],IE:["🇮🇪","Irlanda","EUR"],IT:["🇮🇹","Italia","EUR"],LT:["🇱🇹","Lituania","EUR"],LU:["🇱🇺","Luxemburgo","EUR"],LV:["🇱🇻","Letonia","EUR"],MT:["🇲🇹","Malta","EUR"],NL:["🇳🇱","Países Bajos","EUR"],PT:["🇵🇹","Portugal","EUR"],SI:["🇸🇮","Eslovenia","EUR"],SK:["🇸🇰","Eslovaquia","EUR"],CO:["🇨🇴","Colombia","COP"],MX:["🇲🇽","México","MXN"],AR:["🇦🇷","Argentina","ARS"],CL:["🇨🇱","Chile","CLP"],BO:["🇧🇴","Bolivia","BOB"],BR:["🇧🇷","Brasil","BRL"],UY:["🇺🇾","Uruguay","UYU"],PY:["🇵🇾","Paraguay","PYG"],CR:["🇨🇷","Costa Rica","CRC"],DO:["🇩🇴","República Dominicana","DOP"],CA:["🇨🇦","Canadá","CAD"],GB:["🇬🇧","Reino Unido","GBP"],GT:["🇬🇹","Guatemala","GTQ"],VE:["🇻🇪","Venezuela","VES"]};
const api=(p,b)=>window.cc80.api(p,"POST",b||{});
let account=null,carts=[],moves=[],people=[],accounts=[],walletAvailable=null,busy=false,filter="",cartState="ALL",ownerId=null,loadSequence=0,selectedCartId=null;
const normalize=value=>String(value||" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
function note(msg){const el=$('mc158notice');if(el)el.textContent=msg;}
function active(){return ses()?.isAdmin||account&&!account.suspended&&new Date(account.subscription_until)>new Date();}
async function open(){
 if(!ses()?.jwt){if(typeof window.cc77Auth==="function")window.cc77Auth(false);return;}
 const r=host();r.style.display="block";document.documentElement.dataset.ccActiveModule="cochera";const portal=$("cc166-panel");if(portal)portal.hidden=true;if($("cc77home"))$("cc77home").style.display="none";
 $("mc158body").innerHTML="<p>Cargando MI COCHERA…</p>";
 const actor=ses()?.userId,jwt=ses()?.jwt,expected=loadSequence+1;
 try{await load();}catch(e){if(ses()?.userId!==actor||ses()?.jwt!==jwt||loadSequence!==expected)return;$("mc158body").textContent="No se pudo abrir MI COCHERA: "+String(e.message||e);}
}
async function load(syncRents=true){
 await window.ccLoadBusinessCurrency?.();
 const session=ses(),id=session?.userId,jwt=session?.jwt,seq=++loadSequence;
 if(!id||!jwt)return;const current=()=>ses()?.userId===id&&ses()?.jwt===jwt&&loadSequence===seq;
 if(ownerId!==id){ownerId=id;account=null;carts=[];moves=[];people=[];walletAvailable=null;filter='';cartState='ALL';selectedCartId=null;selectedData=null;listPage=0;section='home';workspaceSummary=[];summaryCurrency='';if($('mc158search'))$('mc158search').value='';}
 if(session.isAdmin){account=null;return await loadAdmin(current);}
 const rows=await api('rpc/mc_ensure_account');if(!current())return;
 account=Array.isArray(rows)?rows[0]:rows;if(!account)throw Error('Sin cuenta.');
 const uid=encodeURIComponent(id);
 const detail=await window.cc80.api('mc_accounts?select=country&user_id=eq.'+uid);if(!current())return;
 account.country=detail?.[0]?.country||'PE';
 const wallet=await api('rpc/cc_finance_wallet');if(!current())return;
 if(wallet?.available_pen==null||!Number.isFinite(Number(wallet.available_pen)))throw Error('No se pudo verificar tu saldo disponible. Actualiza para continuar.');
 walletAvailable=Number(wallet.available_pen);window.cc326Wallet?.accept({userId:id,jwt,wallet});void refreshHomeWallet();
 if(!active()){showLocked();return;}
 if(syncRents)await api('rpc/mc_sync_rents');if(!current())return;
 const data=await api('rpc/mc373_workspace',{p_query:filter,p_state:cartState,p_due:section==='collections',p_limit:pageSize(),p_offset:listPage*pageSize(),p_cart:selectedCartId});
 if(!current())return;
 if(!Array.isArray(data?.rows)||!Array.isArray(data.summary))throw Error('No se pudieron verificar los datos del panel. Actualiza para reintentar.');
 carts=data.rows;selectedData=data.selected;selectedCartId=selectedData?.id||null;serverTotal=data.total;allCartCount=data.cart_count;workspaceSummary=data.summary;
 people=[...new Map([...carts,selectedData].filter(Boolean).flatMap(c=>[c.owner,c.worker]).filter(p=>p?.id).map(p=>[p.id,p])).values()];renderList();
}

function showLocked(){let el=$("mc158body");syncHeader();el.innerHTML='<section class="mc158box"><h3>Acceso a MI COCHERA</h3><p>Mientras la mensualidad esté vencida, tus carritos, cobros y deudas permanecen guardados y protegidos.</p><p>Activa la membresía desde Negocios con saldo real verificado, o utiliza un bono de activación autorizado.</p><button type="button" data-action="activation">Pagar para activar</button><button type="button" data-action="bonus" '+(num(account.bonus_pen)<15||account.suspended?"disabled":"")+'>Activar 30 días con S/ 15 de bono</button><p id="mc158notice" role="status"></p></section>';}
async function loadAdmin(current=()=>true){
 const [accountRows,clanUsers]=await Promise.all([
  window.cc80.api("mc_accounts?select=user_id,invite_code,currency,subscription_until,bonus_pen,suspended&order=created_at.desc&limit=300"),
  window.cc80.api("rpc/cc_admin_users_compact_v1","POST",{}).catch(()=>[])
 ]);
 if(!current())return;
 const names=new Map((Array.isArray(clanUsers)?clanUsers:[]).map(u=>[u.id,u.code]));
 accounts=accountRows.map(a=>({...a,invite_code:names.get(a.user_id)||'CLAN pendiente'}));
 syncHeader();$("mc158body").innerHTML='<section class="mc158box"><h3>Resellers MI COCHERA</h3><p>Consulta de cuentas y vigencias. Los bonos se administran desde el panel ADMIN central.</p><button type="button" data-action="bonuses">Abrir gestión de bonos</button><p id="mc158notice" role="status"></p><div class="mc158scroll"><table><thead><tr><th>Código</th><th>Suscripción</th><th>Bono</th><th>Cuenta</th></tr></thead><tbody>'+accounts.map(a=>'<tr><td>'+esc(a.invite_code)+'</td><td>'+esc(a.subscription_until?new Date(a.subscription_until).toLocaleDateString("es-PE"):"No activa")+'</td><td>S/ '+num(a.bonus_pen).toFixed(2)+'</td><td>'+esc(a.user_id.slice(0,8))+'…</td></tr>').join("")+'</tbody></table></div></section>';
}
function currencyCountryChanged(event){
 const select=event.target.closest('#mc158config select[name="country"]');
 if(!select)return;
 const code=select.selectedOptions[0]?.dataset.currency||"PEN";
 const hidden=select.form?.elements.namedItem("currency");
 const preview=$("mc158currencyPreview");
 if(hidden)hidden.value=code;
 if(preview)preview.textContent=code;
}
function person(id){return people.find(p=>p.id===id)||{};}
const icons={menu:'M4 6h16M4 12h16M4 18h16',back:'m11 5-7 7 7 7M4 12h17',search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',home:'m3 10 9-8 9 8M5 9v12h5v-7h4v7h5V9',cart:'M2 4h3l3 12h11l3-8H6M9 20h1M18 20h1',pay:'M2 18h5l4 3 9-6c2-2-1-4-3-2l-5 2M7 18v-6h5c3 0 3 4 0 4H9M13 2l7 3v5l-7 3-5-3V5l5-3Z',sales:'M3 7h18v14H3V7ZM3 7l3-5h12l3 5M9 11h6',report:'M3 21h18M6 18v-5M12 18V9M18 18V4',settings:'M9 3h6l1 3 3 1 2 5-2 4-3 1-1 4H9l-1-4-3-1-2-4 2-5 3-1 1-3ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',user:'M20 21a8 8 0 0 0-16 0M17 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0',wallet:'M3 7h17v14H3V7Zm0 0 13-5 2 5M15 12h7v5h-7v-5Z',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',close:'m5 5 14 14M5 19 19 5',refresh:'M20 7V2l-4 4a8 8 0 1 0 4 8M20 2h-5'};
const icon=name=>'<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="'+icons[name]+'"/></svg>';
const sections={home:['home','Inicio'],carts:['cart','Carritos'],sales:['sales','Ventas'],collections:['pay','Cobros'],reports:['report','Reportes'],settings:['settings','Configuración']};
let section='home',listPage=0,serverTotal=0,allCartCount=0,selectedData=null,workspaceSummary=[],summaryCurrency='',searchTimer,historySequence=0;
const pageSize=()=>matchMedia('(max-width:850px)').matches?5:10;
function header(){return '<header class="mc158head"><button type="button" data-action="menu" class="mc373-icon" aria-label="Abrir menú" aria-expanded="false">'+icon('menu')+'</button><img class="mc373-logo" src="/assets/logo-cochera-v304.avif" alt="MI COCHERA · CLAN CARTAN" width="100" height="70"><button type="button" id="mc158close" class="mc373-back">'+icon('back')+'<span>Volver a<br><b>CLAN CARTAN</b></span></button><label class="mc373-search">'+icon('search')+'<input id="mc158search" type="search" maxlength="120" aria-label="Buscar carrito" placeholder="Nombre, alias, DNI, celular o C-…" autocomplete="off"></label><button type="button" data-action="wallet" class="mc373-wallet" aria-label="Billetera única CLAN CARTAN">'+icon('wallet')+'<span id="mc373walletAmount">Billetera</span></button><button type="button" data-action="profile" class="mc373-icon" aria-label="Abrir mi perfil">'+icon('user')+'</button></header>';}
function syncHeader(){const w=$('mc373walletAmount');if(w)w.textContent=walletAvailable==null?'Billetera':currency(walletAvailable,'PEN');const s=$('mc158search');if(s){s.disabled=!active();s.placeholder=ses()?.isAdmin?'Buscar cuenta o código CLAN…':'Nombre, alias, DNI, celular o C-…';}}
function host(){let root=$('mc158layer');if(root)return root;root=document.createElement('div');root.id='mc158layer';root.className='mc373-layer';root.innerHTML='<div class="mc158wrap">'+header()+'<div id="mc158body" aria-live="polite">Preparando acceso…</div></div>';document.body.append(root);
 $('mc158close').onclick=()=>{close();window.cc166OpenPanel?.();};root.addEventListener('click',click);root.addEventListener('submit',submit);root.addEventListener('click',dniClick);root.addEventListener('change',currencyCountryChanged);
 $('mc158search').oninput=e=>{if(ses()?.isAdmin){const q=normalize(e.target.value);$('mc158body').querySelectorAll('tbody tr').forEach(row=>row.hidden=!normalize(row.textContent).includes(q));return;}filter=e.target.value;listPage=0;if(!['home','carts','collections'].includes(section)){section='carts';renderList();}else renderRows();clearTimeout(searchTimer);searchTimer=setTimeout(()=>{if(root.style.display!=='none')void load(false).catch(err=>note(err.message));},250);};
 root.addEventListener('keydown',e=>{if(e.key==='Escape'&&root.classList.contains('mc373-menu-open')){root.classList.remove('mc373-menu-open');root.querySelector('.mc158sidebar')?.setAttribute('inert','');root.querySelector('[data-action=menu]').setAttribute('aria-expanded','false');}});return root;
}
function close(){$('mc158dialog')?.remove();clearTimeout(searchTimer);historySequence++;const root=$('mc158layer');if(root){root.style.display='none';root.classList.remove('mc373-menu-open');}if(document.documentElement.dataset.ccActiveModule==='cochera')delete document.documentElement.dataset.ccActiveModule;if($('cc77home'))$('cc77home').style.display='block';}
function navHTML(){return '<button type="button" class="mc373-scrim" data-action="menu" aria-label="Cerrar menú"></button><aside class="mc158sidebar" '+(matchMedia('(max-width:850px)').matches&&!$('mc158layer').classList.contains('mc373-menu-open')?'inert':'')+'><nav aria-label="Secciones MI COCHERA">'+Object.entries(sections).map(([key,[img,label]])=>'<button type="button" data-action="nav" data-view="'+key+'" class="mc158nav-item '+(section===key?'is-current':'')+'" '+(section===key?'aria-current="page"':'')+'>'+icon(img)+'<span>'+label+'</span></button>').join('')+'</nav><small>MI COCHERA · V373</small></aside>';}
function balance(id){const c=carts.find(c=>Number(c.id)===Number(id))||(Number(selectedData?.id)===Number(id)?selectedData:null);if(!c||!Number.isFinite(Number(c.balance_local)))throw Error('No se pudo verificar el saldo del carrito. Actualiza antes de registrar un pago.');return Number(c.balance_local);}
function rowMatches(c){const o=person(c.owner_person_id),w=person(c.worker_person_id),text=normalize([c.alias,c.business_type,o.full_name,o.document_number,o.phone,String(o.phone||'').replace(/\D/g,''),w.full_name,w.document_number,w.phone,String(c.id),'C-'+String(c.id).padStart(3,'0'),'C'+String(c.id).padStart(3,'0')].join(' '));return (cartState==='ALL'||c.state===cartState)&&(section!=='collections'||balance(c.id)>0)&&normalize(filter).split(/\s+/).filter(Boolean).every(term=>text.includes(term));}
function renderRows(){
 const shown=carts.filter(rowMatches),body=$('mc158rows');if(!body)return;
 body.innerHTML=shown.map(c=>{const due=Math.max(0,balance(c.id)),o=person(c.owner_person_id),retired=c.state==='RETIRED';return '<tr class="'+(Number(c.id)===Number(selectedCartId)?'is-selected':'')+'"><td data-label="Código">C-'+String(c.id).padStart(3,'0')+'</td><td data-label="Carrito"><strong>'+esc(c.alias||o.full_name||'Carrito')+'</strong><small>'+esc(o.full_name||c.business_type)+'</small></td><td data-label="Tarifa diaria">'+currency(c.daily_rate,c.currency)+'</td><td data-label="Estado"><span class="mc158status '+(retired?'is-retired':due>0?'is-due':'is-active')+'">'+(retired?'Retirado':due>0?'Pendiente':'Al día')+'</span></td><td data-label="Saldo" class="'+(due>0?'mc158debt':'')+'">'+currency(due,c.currency)+'<small>'+esc(c.currency)+'</small></td><td><button type="button" data-action="select-cart" data-cart="'+c.id+'" class="mc158-row-open" aria-label="Ver carrito '+esc(c.alias||c.id)+'">'+icon('eye')+'</button></td></tr>';}).join('')||'<tr><td colspan="6" class="mc158empty">'+(allCartCount?'No hay carritos que coincidan con la búsqueda.':'Todavía no tienes carritos registrados. Usa Nuevo carrito para comenzar.')+'</td></tr>';
 $('mc158count').textContent=shown.length+' de '+allCartCount+' carritos';
}
function selectedDetail(){
 const c=selectedData;if(!c)return '<div class="mc373-empty"><h3>Selecciona un carrito</h3><p>Abre una ficha para consultar su deuda e historial.</p></div>';
 const o=person(c.owner_person_id),w=person(c.worker_person_id),due=Math.max(0,balance(c.id));
 return '<div class="mc158detail-head"><div><small>C-'+String(c.id).padStart(3,'0')+' · '+esc(c.business_type)+'</small><h3>'+esc(c.alias||o.full_name||'Carrito')+'</h3></div><span class="mc158status">'+(c.state==='ACTIVE'?'Activo':'Retirado')+'</span></div><div class="mc158person"><strong>'+esc(o.full_name||'Propietario')+'</strong><small>Propietario'+(o.document_number?' · '+esc(o.document_number):'')+'</small></div>'+(w.id?'<div class="mc158detail-line"><span>Trabajador</span><strong>'+esc(w.full_name)+'</strong></div>':'')+'<div class="mc158detail-line"><span>Tarifa diaria</span><strong>'+currency(c.daily_rate,c.currency)+'</strong></div><div class="mc158detail-line"><span>Alquiler registrado</span><strong>'+currency(c.rent_total,c.currency)+'</strong></div><div class="mc158detail-line"><span>Productos registrados</span><strong>'+currency(c.product_total,c.currency)+'</strong></div><div class="mc158detail-debt"><span>Saldo pendiente · '+esc(c.currency)+'</span><strong>'+currency(due,c.currency)+'</strong></div><div class="mc158detail-actions"><button type="button" data-action="payment" data-cart="'+c.id+'" '+(due<=0?'disabled':'')+'>Registrar pago</button><button type="button" data-action="sale" data-cart="'+c.id+'" '+(c.state!=='ACTIVE'?'disabled':'')+'>Agregar producto</button><button type="button" data-action="history" data-cart="'+c.id+'">Historial</button><button type="button" data-action="whatsapp" data-cart="'+c.id+'">WhatsApp</button><button type="button" data-action="'+(c.state==='ACTIVE'?'retire':'reactivate')+'" data-cart="'+c.id+'">'+(c.state==='ACTIVE'?'Retirar carrito':'Reactivar carrito')+'</button></div>';
}
function renderList(){
 syncHeader();if(!workspaceSummary.some(s=>s.currency===summaryCurrency))summaryCurrency=account.currency;
 const s=workspaceSummary.find(s=>s.currency===summaryCurrency)||{active:0,debt:0,rent_today:0,product_today:0,paid_today:0},sel=selectedData,due=sel?Math.max(0,balance(sel.id)):0;
 const moneyOptions=[...new Set([account.currency,...workspaceSummary.map(s=>s.currency)])].map(c=>'<option value="'+esc(c)+'" '+(c===summaryCurrency?'selected':'')+'>'+esc(c)+'</option>').join('');
 const stats='<section class="mc158kpis">'+[['cart','Carritos activos',s.active,'green'],['home','Alquiler registrado hoy',currency(s.rent_today,summaryCurrency),'blue'],['sales','Ventas registradas hoy',currency(s.product_today,summaryCurrency),'gold'],['pay','Deuda pendiente',currency(s.debt,summaryCurrency),'red']].map(([i,label,val,color])=>'<article class="mc158kpi kpi-'+color+'">'+icon(i)+'<div><small>'+label+'</small><strong>'+val+'</strong></div></article>').join('')+'</section>';
 const saleReason=!sel?'Selecciona un carrito para registrar una venta.':sel.state!=='ACTIVE'?'Solo los carritos activos permiten registrar ventas.':'';
 const paymentReason=!sel?'Selecciona un carrito para registrar un pago.':due<=0?'Este carrito no tiene deuda pendiente.':'';
 const quick='<section class="mc158quick" aria-label="Acciones rápidas"><button type="button" data-action="new">'+icon('cart')+'<span>Nuevo carrito</span></button><button type="button" data-action="sale" data-cart="'+(sel?.id||'')+'" '+(saleReason?'disabled title="'+esc(saleReason)+'" aria-label="'+esc('Registrar venta: '+saleReason)+'"':'')+'>'+icon('sales')+'<span>Registrar venta</span></button><button type="button" data-action="payment" data-cart="'+(sel?.id||'')+'" '+(paymentReason?'disabled title="'+esc(paymentReason)+'" aria-label="'+esc('Registrar pago: '+paymentReason)+'"':'')+'>'+icon('pay')+'<span>Registrar pago</span></button></section>'+(saleReason||paymentReason?'<p class="mc374-action-help" role="status">'+esc(!sel?'Selecciona un carrito en la lista para habilitar ventas y pagos.':saleReason||paymentReason)+'</p>':'');
 const controls='<div class="mc158panel-title"><div><h2>'+esc(sections[section][1])+'</h2><small>Alquiler y ventas generan deuda; los pagos la reducen.</small></div><label class="mc373-unit">Moneda <select id="mc373unit">'+moneyOptions+'</select></label><button type="button" data-action="reload" aria-label="Actualizar MI COCHERA">'+icon('refresh')+'</button></div>';
 const list='<section class="mc158workspace"><div class="mc158panel mc158list-panel"><div class="mc158filters"><h3>'+(section==='collections'?'Carritos con deuda':'Mis carritos')+'</h3><span id="mc158count"></span><select id="mc158state" aria-label="Filtrar estado"><option value="ALL">Todos</option><option value="ACTIVE">Activos</option><option value="RETIRED">Retirados</option></select></div><div class="mc158table-wrap"><table class="mc158table"><thead><tr><th>Código</th><th>Carrito / propietario</th><th>Tarifa diaria</th><th>Estado</th><th>Saldo</th><th>Ficha</th></tr></thead><tbody id="mc158rows"></tbody></table></div><div class="mc373-pages">'+(serverTotal>pageSize()?'<span>Página '+(listPage+1)+'</span><button type="button" data-action="page-prev" '+(!listPage?'disabled':'')+'>Anterior</button><button type="button" data-action="page-next" '+((listPage+1)*pageSize()>=serverTotal?'disabled':'')+'>Siguiente</button>':'')+'</div></div>'+(matchMedia('(max-width:850px)').matches?'':'<aside class="mc158panel mc158detail-panel">'+selectedDetail()+'</aside>')+'</section>';
 let content=list;
 if(section==='reports')content='<section class="mc158panel mc373-report"><h3>Resumen de hoy · '+esc(summaryCurrency)+'</h3><p>Zona de cobro existente: America/Lima. Cada moneda se consulta por separado.</p><dl><div><dt>Alquiler registrado</dt><dd>'+currency(s.rent_today,summaryCurrency)+'</dd></div><div><dt>Ventas añadidas a deuda</dt><dd>'+currency(s.product_today,summaryCurrency)+'</dd></div><div><dt>Pagos recibidos</dt><dd>'+currency(s.paid_today,summaryCurrency)+'</dd></div><div><dt>Saldo pendiente</dt><dd>'+currency(s.debt,summaryCurrency)+'</dd></div></dl><button type="button" data-action="export">Descargar resumen CSV</button></section>';
 if(section==='sales')content='<section class="mc158panel"><div class="mc158panel-title"><h3>Ventas de productos</h3><button type="button" data-action="nav" data-view="carts">Seleccionar carrito</button></div><p>Los productos se añaden a la deuda hasta registrar el pago.</p><div id="mc373sales">Consultando movimientos…</div></section>';
 if(section==='settings')content='<section class="mc158panel mc373-report"><h3>Mi cuenta MI COCHERA</h3><dl><div><dt>Activación vigente hasta</dt><dd>'+esc(new Date(account.subscription_until).toLocaleDateString('es-PE'))+'</dd></div><div><dt>Moneda de operación</dt><dd>'+esc(account.currency)+'</dd></div></dl><p>La sesión y la Billetera única pertenecen a CLAN CARTAN.</p><div class="mc158detail-actions"><button type="button" data-action="currency">Configurar país y moneda</button><button type="button" data-action="profile">Abrir mi perfil</button></div></section>';
 $('mc158body').innerHTML='<div class="mc158dashboard">'+navHTML()+'<main class="mc158main">'+controls+(section==='home'?stats:'')+(['home','carts','collections'].includes(section)?quick:'')+content+'<p id="mc158notice" role="status"></p></main></div>';
 $('mc373unit').onchange=e=>{summaryCurrency=e.target.value;renderList();};
 if($('mc158state')){$('mc158state').value=cartState;$('mc158state').onchange=e=>{cartState=e.target.value;listPage=0;renderRows();void load(false).catch(err=>note(err.message));};renderRows();}
 if(section==='sales')void movementPage(null,0,$('mc373sales'),'PRODUCT');
}
async function movementPage(cart,page,target,kind=null){
 const uid=ses()?.userId,jwt=ses()?.jwt,seq=++historySequence;
 try{const path='mc_movements?select=id,cart_id,kind,label,occurred_on,amount_local,currency&reseller_id=eq.'+encodeURIComponent(uid)+(cart?'&cart_id=eq.'+cart:'')+(kind?'&kind=eq.'+kind:'')+'&order=created_at.desc,id.desc&limit=21&offset='+(page*20),data=await window.cc80.api(path);
 if(seq!==historySequence||!target.isConnected||ses()?.userId!==uid||ses()?.jwt!==jwt)return;
 target.innerHTML=data.length?'<div class="mc158scroll"><table><thead><tr><th>Fecha</th><th>Carrito</th><th>Movimiento</th><th>Importe</th></tr></thead><tbody>'+data.slice(0,20).map(m=>'<tr><td>'+esc(m.occurred_on||'Sin fecha')+'</td><td>C-'+String(m.cart_id).padStart(3,'0')+'</td><td>'+esc(m.label)+'</td><td>'+currency(m.amount_local,m.currency)+'</td></tr>').join('')+'</tbody></table></div>':'<p class="mc158empty">Sin movimientos registrados.</p>';
 if(page||data.length>20){const controls=document.createElement('div');controls.className='mc373-pages';for(const [label,next,enabled]of[['Anterior',page-1,page>0],['Siguiente',page+1,data.length>20]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.disabled=!enabled;b.onclick=()=>void movementPage(cart,next,target,kind);controls.append(b);}target.append(controls);}
 }catch(e){if(target.isConnected)target.textContent='No se pudo consultar el historial. Cierra y vuelve a abrir para reintentar.';}
}
function drawer(title,body){$("mc158dialog")?.remove();const d=document.createElement("div");d.id="mc158dialog";d.className="mc158dialog";d.innerHTML='<section role="dialog" aria-modal="true"><header><h3>'+esc(title)+'</h3><button type="button" data-action="close-dialog">✕</button></header>'+body+'<p id="mc158dialogStatus" role="status"></p></section>';d.addEventListener("click",click);d.addEventListener("click",dniClick);d.addEventListener("submit",submit);document.body.append(d);return d;}
function fields(prefix,title,optional){
 const name=prefix+"Name",doc=prefix+"Doc",kind=prefix+"Kind",phone=prefix+"Phone";
 return '<fieldset><legend>'+title+(optional?" (opcional)":"")+'</legend><label>Documento primero<select name="'+kind+'"><option value="DNI">DNI peruano</option><option value="CE">Carné de extranjería</option><option value="PASSPORT">Pasaporte</option><option value="CEDULA">Cédula extranjera</option><option value="OTHER">Otro</option></select></label><label>Número de documento<input name="'+doc+'" data-mc-dni="'+prefix+'" '+(optional?"":"required")+' maxlength="40" autocomplete="off"></label><button type="button" data-mc-verify="'+prefix+'">Buscar DNI</button><p id="mc158lookup'+prefix+'" class="mc158look" aria-live="polite">Ingresa 8 dígitos y pulsa Buscar DNI.</p><label>Nombres y apellidos<input name="'+name+'" '+(optional?"":"required")+' maxlength="160"></label><label>Celular<input name="'+phone+'" type="tel" maxlength="30"></label></fieldset>';
}
function newCart(){drawer("Registrar carrito · DNI primero",'<form id="mc158new">'+fields("owner","Propietario",false)+fields("worker","Trabajador",true)+'<label>Alias / apodo<input name="alias" maxlength="80" placeholder="El Paisa"></label><label>Tipo de negocio<input name="business" required maxlength="100" placeholder="Emoliente, anticuchos, frutera…"></label><label>Tarifa por día ('+esc(account.currency)+')<input type="number" name="rate" min=".01" step=".01" required></label><button type="submit">Guardar carrito</button></form>');}
function dniClick(event){
 const button=event.target.closest('[data-mc-verify]');if(!button||button.disabled)return;
 const form=button.closest('form'),input=form?.querySelector('[data-mc-dni="'+button.dataset.mcVerify+'"]');if(!input)return;
 button.disabled=true;Promise.resolve(lookupDni(input)).finally(()=>{button.disabled=false;});
}
async function lookupDni(input){
 const form=input.closest('form'),prefix=input.dataset.mcDni,kind=form.elements.namedItem(prefix+'Kind').value,dni=input.value.trim();
 const info=form.querySelector('#mc158lookup'+prefix),dest=form.elements.namedItem(prefix+'Name');if(!info||!dest)return;
 if(kind!=='DNI'||!/^\d{8}$/.test(dni)){info.textContent='Para consultar, selecciona DNI e ingresa exactamente 8 dígitos. Otros documentos se registran manualmente.';return;}
 const s=ses(),uid=s?.userId,jwt=s?.jwt;
 if(!uid||!jwt){info.textContent='Inicia sesión para consultar el DNI.';return;}
 const current=()=>form.isConnected&&ses()?.userId===uid&&ses()?.jwt===jwt&&input.value.trim()===dni&&form.elements.namedItem(prefix+'Kind').value===kind;
 let expectedName=dest.value;info.textContent='Buscando DNI…';
 const fillName=name=>{if(dest.value!==expectedName){info.textContent='Consulta recibida. Se conserva el nombre que editaste; revísalo antes de guardar.';return false;}dest.value=String(name).slice(0,160);expectedName=dest.value;return true;};
 try{
  const matches=await window.cc80.api('mc_people?select=full_name,phone,verification_source&document_type=eq.DNI&document_number=eq.'+dni+'&limit=1');
  if(!current())return;
  if(matches.length){
   const filled=fillName(matches[0].full_name);const phone=form.elements.namedItem(prefix+'Phone');if(!phone.value)phone.value=matches[0].phone||'';
   if(filled)info.textContent='Datos encontrados en tu cartera.';
  }
  if(matches[0]?.verification_source==='API_PERU')return;
  if(!s.root||!s.key){info.textContent='Consulta externa no disponible; puedes completar el nombre manualmente.';return;}
  const res=await fetch(s.root+'/functions/v1/mc-verify-dni',{method:'POST',headers:{apikey:s.key,Authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:JSON.stringify({dni})});
  const data=await res.json();if(!current())return;
  if(res.ok&&(data.status==='found'||data.status==='saved')&&data.full_name){if(fillName(data.full_name))info.textContent='Identidad completada desde API Perú. Revisa los datos antes de guardar.';}
  else info.textContent=matches.length?'Datos internos disponibles; verificación oficial no disponible.':'Consulta no disponible. Completa el nombre manualmente.';
 }catch(_){if(current())info.textContent='Consulta externa no disponible; ingresa el nombre manualmente.';}
}

async function submit(e){
 if(!e.target.id?.startsWith("mc158"))return;
 e.preventDefault();if(busy)return;const actor=ses()?.userId,jwt=ses()?.jwt,form=e.target;const current=()=>ses()?.userId===actor&&ses()?.jwt===jwt;busy=true;let button=e.target.querySelector('button[type="submit"]');const label=button?.textContent;if(button){button.disabled=true;button.textContent='Guardando…';}form.setAttribute('aria-busy','true');
 try{
 if(e.target.id==="mc158config"){
  const f=e.target;await api("rpc/mc_configure_currency",{p_currency:f.elements.currency.value,p_country:f.elements.country.value.toUpperCase()});if(!current())return;form.closest("#mc158dialog")?.remove();await load();if(!current())return;note("Moneda de operación actualizada para MI COCHERA, MI ALQUILER y COBRA YA.");
 }else if(e.target.id==="mc158new"){
  const f=e.target,x=k=>f.elements.namedItem(k)?.value?.trim()||"";
  const id=await api("rpc/mc_create_cart",{p_alias:x("alias"),p_type:x("business"),p_rate:num(x("rate")),p_owner_kind:x("ownerKind"),p_owner_doc:x("ownerDoc"),p_owner_name:x("ownerName"),p_owner_phone:x("ownerPhone"),p_worker_kind:x("workerKind")||null,p_worker_doc:x("workerDoc")||null,p_worker_name:x("workerName")||null,p_worker_phone:x("workerPhone")||null});
  if(!current())return;form.closest("#mc158dialog")?.remove();await load();if(!current())return;note("Carrito registrado: C-"+String(id).padStart(3,"0"));
 }else if(e.target.id==="mc158pay"){
  const f=e.target;await api("rpc/mc_record_payment_once",{p_cart:Number(f.dataset.cart),p_amount:num(f.elements.amount.value),p_method:f.elements.method.value,p_request:f.dataset.request});if(!current())return;form.closest("#mc158dialog")?.remove();await load();if(!current())return;note("Pago registrado.");
 }else if(e.target.id==="mc158sale"){
  const f=e.target,q=num(f.elements.quantity.value),price=num(f.elements.price.value);
  await api("rpc/mc_record_movement",{p_cart:Number(f.dataset.cart),p_kind:"PRODUCT",p_label:f.elements.item.value,p_quantity:q,p_unit:price,p_amount:Math.round(q*price*100)/100,p_method:null});if(!current())return;form.closest("#mc158dialog")?.remove();await load();if(!current())return;note("Producto agregado a la deuda.");
 }
 }catch(e){if(!current())return;const el=form.closest("#mc158dialog")?.querySelector("#mc158dialogStatus")||$("mc158notice");if(el)el.textContent="No se completó: "+String(e.message||e);}
 finally{busy=false;form.removeAttribute('aria-busy');if(button){button.disabled=false;button.textContent=label;}}
}
async function click(e){
 let btn=e.target.closest("[data-action]");if(!btn)return;
 e.preventDefault();const act=btn.dataset.action,id=Number(btn.dataset.cart),actor=ses()?.userId,jwt=ses()?.jwt;
 try{
 if(act==="close-dialog"){historySequence++;$("mc158dialog")?.remove();return;}
 if(act==="menu"){const root=$('mc158layer');if(matchMedia('(max-width:850px)').matches){root.classList.toggle('mc373-menu-open');root.querySelector('.mc158sidebar')?.toggleAttribute('inert',!root.classList.contains('mc373-menu-open'));root.querySelector('[data-action=menu]').setAttribute('aria-expanded',String(root.classList.contains('mc373-menu-open')));}else root.classList.toggle('mc373-collapsed');return;}
 if(act==="profile"){close();window.cc166OpenProfile?.(()=>window.mc158Open());return;}
 if(act==="activation"){close();window.cc166OpenBusiness?.('MI_COCHERA');return;}
 if(act==="nav"){section=btn.dataset.view;listPage=0;filter='';$('mc158search').value='';$('mc158layer').classList.remove('mc373-menu-open');$('mc158layer [data-action=menu]').setAttribute('aria-expanded','false');await load(false);return;}
 if(act==="page-prev"||act==="page-next"){listPage+=act==='page-next'?1:-1;await load(false);return;}
 if(act==="export"){const lines=[['Moneda','Alquiler registrado hoy','Ventas registradas hoy','Pagos recibidos hoy','Deuda pendiente'],...workspaceSummary.map(s=>[s.currency,s.rent_today,s.product_today,s.paid_today,s.debt])];const blob=new Blob(['\uFEFF'+lines.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='mi-cochera-resumen.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;}
 if(act==="select-cart"){selectedCartId=id;selectedData=carts.find(c=>Number(c.id)===id);renderList();$('mc158rows')?.querySelector('[data-cart="'+id+'"]')?.focus({preventScroll:true});if(matchMedia('(max-width:850px)').matches)drawer('Ficha del carrito', '<div class="mc158detail-actions-scope">'+selectedDetail()+'</div>');return;}
 if(act==="close-module"){close();return;}
 if(act==="reload"){await load();return;}
 if(act==="new"){newCart();return;}
 if(act==="currency"){
  const currentCurrency=account.currency||"PEN";
  const options=Object.entries(countryMeta).filter(([,meta])=>carts.length===0||meta[2]===currentCurrency).map(([code,meta])=>'<option value="'+code+'" data-currency="'+meta[2]+'" '+((account.country||"PE")===code?"selected":"")+'>'+meta[0]+' '+meta[1]+' · '+meta[2]+'</option>').join("");
  drawer("País y moneda de tu negocio",'<form id="mc158config"><p class="mc158config-intro">Cada RESELLER configura una sola moneda de operación compartida por MI COCHERA, MI ALQUILER y COBRA YA. Los importes se registran directamente en esa moneda; no hay conversión cambiaria ni afecta STREAM BULL’S.</p><label>País de operación<select name="country" required>'+options+'</select></label><div class="mc158currency-preview"><small>MONEDA DE OPERACIÓN DE LOS TRES MÓDULOS</small><strong id="mc158currencyPreview">'+esc(currentCurrency)+'</strong><input type="hidden" name="currency" value="'+esc(currentCurrency)+'"></div>'+(carts.length?'<p class="mc158config-lock">La moneda es compartida por los tres módulos. Si ya existen importes en otra moneda, el sistema impedirá cambiarla para proteger los registros históricos. No se realizan conversiones.</p>':'<p class="mc158config-lock">Configura el país y la moneda antes de registrar importes en cualquiera de los tres módulos. Después, el sistema protegerá la moneda para conservar la integridad de los saldos.</p>')+'<button type="submit">Guardar país y moneda</button></form>');return;
 }
 if(act==="bonuses"){close();window.cc166OpenAdminBonuses?.();return;}
 if(act==="wallet"){close();window.cc166OpenWallet?.("summary",()=>window.mc158Open());return;}
 if(['bonus','retire','reactivate'].includes(act)){
  if(busy)return;const actor=ses()?.userId,jwt=ses()?.jwt;
  const question=act==='bonus'?'¿Usar S/ 15 del bono ADMIN para activar 30 días?':act==='retire'?'Se detendrán los cargos diarios futuros. La deuda histórica permanecerá.':'¿Reactivar este carrito conservando su historial?';
  if(!confirm(question))return;busy=true;btn.disabled=true;
  try{
   if(act==='bonus')await api('rpc/mc_activate_with_bonus',{p_request:crypto.randomUUID()});
   else await api('rpc/mc_change_cart_state',{p_cart:id,p_new_state:act==='retire'?'RETIRED':'ACTIVE'});
   if(ses()?.userId!==actor||ses()?.jwt!==jwt)return;await load();
  }finally{busy=false;btn.disabled=false;}
  return;
 }
 if(act==="whatsapp"){
  const cart=carts.find(c=>Number(c.id)===id)||(Number(selectedData?.id)===id?selectedData:null);if(!cart)return;
  const owner=person(cart.owner_person_id),worker=person(cart.worker_person_id);
  const candidates=[owner,worker].map(person=>{let digits=String(person.phone||'').replace(/[^0-9]/g,'');if(/^9[0-9]{8}$/.test(digits))digits='51'+digits;return {person,digits};});
  const choice=candidates.find(item=>/^[1-9][0-9]{9,14}$/.test(item.digits));
  if(!choice){note('Registra un WhatsApp válido del propietario o trabajador, con código de país.');return;}
  const recipient=choice.person,digits=choice.digits;
  const due=Math.max(0,balance(id));
  const text="Hola, "+(recipient.full_name||"cliente")+". Te escribimos por tu carrito C-"+String(id).padStart(3,"0")+" ("+(cart.alias||cart.business_type||"Mi Cochera")+"). "+(due>0?"Tu saldo pendiente es "+currency(due,cart.currency)+". ":"No registramos deuda pendiente. ")+"Por favor, comunícate con el responsable de tu cochera. Mensaje preparado por tu administrador desde MI COCHERA | CLAN CARTAN.";
  const link='https://wa.me/'+digits+'?text='+encodeURIComponent(text);
  const opened=window.open(link,'_blank','noopener,noreferrer');
  if(!opened){const status=$('mc158notice');if(status){status.textContent='Si WhatsApp no se abrió, utiliza este enlace: ';const a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Abrir WhatsApp';status.append(a);}}
  return;
 }
 if(act==="payment"){if(balance(id)<=0){note("No hay deuda pendiente para registrar un abono.");return;}drawer("Cobrar · C-"+id,'<form id="mc158pay" data-cart="'+id+'" data-request="'+crypto.randomUUID()+'"><p>Deuda pendiente: '+currency(balance(id),account.currency)+'</p><label>Importe recibido<input name="amount" type="number" min=".01" max="'+Math.max(0,balance(id)).toFixed(2)+'" step=".01" required></label><label>Medio<select name="method"><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Transferencia</option></select></label><button type="submit">Registrar abono</button></form>');return;}
 if(act==="sale"){drawer("Agregar hielo o producto · C-"+id,'<form id="mc158sale" data-cart="'+id+'"><label>Producto<input name="item" value="Hielo" required maxlength="120"></label><label>Cantidad<input name="quantity" type="number" min=".001" step="any" value="1" required></label><label>Precio por unidad ('+esc(account.currency)+')<select name="price"><option value="1.50">1.50</option><option value="2">2.00</option><option value="3">3.00</option></select></label><p>Se acumula como deuda del carrito hasta registrar el pago.</p><button type="submit">Agregar producto</button></form>');return;}
 if(act==="history"){const c=carts.find(c=>Number(c.id)===id)||selectedData;const d=drawer('Historial · '+(c?.alias||'C-'+id),'<div id="mc373history">Consultando movimientos…</div>');await movementPage(id,0,d.querySelector('#mc373history'));return;}

 }catch(e){if(ses()?.userId===actor&&ses()?.jwt===jwt)note("Error: "+String(e.message||e));}
}
async function refreshHomeWallet(){
 const label=$("mc158-home-wallet"),current=ses();
 if(!label)return;
 label.setAttribute('data-cc-wallet-amount','');
 if(!current?.jwt){label.textContent="S/ --";return;}
 const userId=current.userId,jwt=current.jwt;
 try{
  const uid=encodeURIComponent(userId);
  const wallet=await api('rpc/cc_finance_wallet');
  if(ses()?.userId!==userId||ses()?.jwt!==jwt)return;
  if(wallet?.available_pen==null||!Number.isFinite(Number(wallet.available_pen)))throw Error('Saldo sin verificar');
  label.textContent=currency(Number(wallet.available_pen),'PEN');
 }catch(_){if(ses()?.userId===userId&&ses()?.jwt===jwt)label.textContent="S/ --";}
}
function mountHomeBadge(){
 const host=$("cc95-user");
 if(!host)return;
 const watcher=new MutationObserver(()=>void refreshHomeWallet());
 watcher.observe(host,{attributes:true,attributeFilter:["style"]});
 if(ses()?.jwt)void refreshHomeWallet();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountHomeBadge);else mountHomeBadge();
document.addEventListener('cc192-session-ended',()=>{loadSequence++;ownerId=null;account=null;carts=[];moves=[];people=[];walletAvailable=null;filter='';cartState='ALL';selectedData=null;workspaceSummary=[];selectedCartId=null;close();const body=$('mc158body');if(body)body.textContent='Inicia sesión para abrir MI COCHERA.';});
matchMedia('(max-width:850px)').addEventListener('change',()=>{if($('mc158layer')?.style.display!=='none'&&account&&active()){listPage=0;void load(false).catch(err=>note(err.message));}});
window.mc158Open=open;
window.mc158Close=close;
})();
