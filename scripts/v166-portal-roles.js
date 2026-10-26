/* CLAN CARTAN · V177 · Panel común y permisos según rol, sin administración heredada.
   Control real: Supabase con RLS; no se inventan saldos ni membresías.
   Sin accesos desde este panel a administración heredada. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const api=(p,m,b)=>window.cc80.api(p,m,b);
const serviceName=k=>({STREAM_BULLS:"STREAM BULL'S",COBRA_YA:'COBRA YA',MI_COCHERA:'MI COCHERA',MI_ALQUILER:'MI ALQUILER'})[k]||k;
const services=[['STREAM_BULLS','◈'],['COBRA_YA','◎'],['MI_COCHERA','▣'],['MI_ALQUILER','⌂']];
let user=null,token=null,serial=0,app=null,view='home',busy=false,verified=false;
let profileEmail='',profileEmailOwner=null,profileEmailLoading=false;
let adminAccounts=[],adminAccountsState='idle',adminAccountsError='',adminActionBusy=false;
let walletTab='summary',rechargeMode='manual';
let navigationHistory=[],autoMethods=[],autoState='idle',autoError='';
let bonusSaving=false,personalTopupSaving=false;
let rechargeRows=[],rechargeState='idle',rechargeError='';
let rechargeReady=null,rechargeSaving=false;
let auditData=null,auditRows=[],auditState='idle',auditError='';
let data={admin:false,super:false,superPermission:false,reseller:false,members:[],subs:[],businesses:[],real:[],bonuses:[],cy:[],mc:null,ma:null,moves:[],products:[],orders:[],requests:[],plan:null,profile:null,priceDetails:[]};
let lastReceipt=null,purchasePending=false,membershipPending=false;
const price=n=>Number.isFinite(Number(n))?'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const make=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x;};
const button=(txt,fn,cls)=>{const x=make('button',cls||'',txt);x.type='button';x.addEventListener('click',fn);return x;};
const enc=s=>encodeURIComponent(s);
const session=()=>window.CC_V53_SESSION;
const active=(id,jwt,seq)=>user===id&&token===jwt&&serial===seq&&session()?.userId===id&&session()?.jwt===jwt;
function reset(){
 serial++;user=null;token=null;busy=false;verified=false;view='home';
 data={admin:false,super:false,superPermission:false,reseller:false,members:[],subs:[],businesses:[],real:[],bonuses:[],cy:[],mc:null,ma:null,moves:[],products:[],orders:[],requests:[],plan:null,profile:null,priceDetails:[]};lastReceipt=null;purchasePending=false;membershipPending=false;
 app?.remove();app=null;el('cc166-open-button')?.remove();
 profileEmail='';profileEmailOwner=null;profileEmailLoading=false;
 adminAccounts=[];adminAccountsState='idle';adminAccountsError='';adminActionBusy=false;
 walletTab='summary';rechargeMode='manual';navigationHistory=[];
 autoMethods=[];autoState='idle';autoError='';bonusSaving=false;personalTopupSaving=false;
 rechargeRows=[];rechargeState='idle';rechargeError='';
 rechargeReady=null;rechargeSaving=false;
 auditData=null;auditRows=[];auditState='idle';auditError='';
}
function shell(){
 if(app?.isConnected)return app;
 app=make('section','cc166-app');app.id='cc166-panel';app.hidden=true;
 app.setAttribute('aria-label','Panel CLAN CARTAN');
 app.innerHTML='<aside class="cc166-sidebar"><div class="cc166-brand">◈ <span>CLAN CARTAN<small>Panel de control</small></span></div><nav id="cc166-nav" aria-label="Navegación del panel"></nav><div id="cc166-aside-foot"></div></aside><div class="cc166-workspace"><header class="cc166-top"><div><small>CLAN CARTAN · V177 · PANEL ÚNICO</small><h1>Mi panel CLAN CARTAN</h1><p id="cc166-role"></p></div><div id="cc166-top-actions"></div></header><main id="cc166-content"></main></div>';
 document.body.append(app);return app;
}
function access(code){
 if(data.admin)return {ok:true,reason:'Administración'};
 if(code==='MI_COCHERA'&&data.mc?.subscription_until&&!data.mc.suspended&&Date.parse(data.mc.subscription_until)>Date.now())return {ok:true,reason:'Vigente'};
 if(code==='MI_ALQUILER'&&data.ma?.subscription_until&&!data.ma.suspended&&Date.parse(data.ma.subscription_until)>Date.now())return {ok:true,reason:'Vigente'};
 if(code==='COBRA_YA'&&data.cy.some(x=>x.status==='ACTIVE'&&Date.parse(x.period_end)>Date.now()))return {ok:true,reason:'Vigente'};
 const ids=new Set(data.businesses.filter(b=>b.code===code).map(b=>b.id));
 for(const m of data.members){
  if(!ids.has(m.business_id)||m.status!=='ACTIVE')continue;
  if(data.subs.some(s=>s.membership_id===m.id&&s.status==='ACTIVE'&&Date.parse(s.start_at)<=Date.now()&&Date.parse(s.end_at)>Date.now()))
   return {ok:true,reason:'Vigente'};
 }
 return {ok:false,reason:'Membresía pendiente o vencida'};
}
function exitTo(fn){
 if(typeof fn!=='function')return;
 app.hidden=true;
 try{fn();}catch(e){app.hidden=false;notice('No se pudo abrir el módulo actual.');}
}
function card(title,desc){
 const box=make('article','cc166-card');box.append(make('h2','',title));
 if(desc)box.append(make('p','cc166-subline',desc));return box;
}
function metric(title,num,tone){
 const c=make('div','cc166-metric '+(tone||''));c.append(make('small','',title),make('strong','',num));return c;
}
function title(page,heading,sub){
 const h=make('div','cc166-section-title');h.append(make('h2','',heading));if(sub)h.append(make('p','',sub));page.append(h);
}
function openCatalog(){
 if(typeof window.cc169OpenCatalog==='function'){window.cc169OpenCatalog();return;}
 if(typeof window.cc77Store==='function'){app.hidden=true;window.cc77Store();return;}
 notice('El catálogo público está temporalmente inaccesible.');
}
function nav(to){
 if(to==='back'){
  const prior=navigationHistory.pop();
  if(prior){view=prior.view;walletTab=prior.walletTab;render();return;}
  if(view!=='home'){view='home';walletTab='summary';render();return;}
  app.hidden=true;return;
 }
 if(to==='shop'){openCatalog();return;}
 if(view!==to)navigationHistory.push({view,walletTab});
 if(to==='wallet')walletTab='summary';
 view=to;render();
}
function notice(msg){const page=el('cc166-content');if(!page)return;const p=make('p','cc166-notice',msg);p.setAttribute('role','status');page.prepend(p);}
function mountLauncher(){
 const actions=el('cc77home')?.querySelector('.cc77top .cc77actions');
 if(!actions)return;
 let launcher=el('cc166-open-button');
 if(!launcher){
  launcher=button('◈ Panel de control',()=>{sync();if(app){app.hidden=false;render();}},'cc166-home-launch');
  launcher.id='cc166-open-button';actions.prepend(launcher);
 }
 launcher.hidden=!user;
}
function userRole(){
 if(data.admin)return 'ADMIN';
 if(data.super)return 'SÚPER RESELLER';
 if(data.reseller)return 'RESELLER';
 // Permiso preasignado ≠ membresía activa: el servidor mantiene el bloqueo.
 if(data.superPermission&&data.members.some(m=>m.role==='SUPER_RESELLER'))
  return 'SÚPER RESELLER · MEMBRESÍA PENDIENTE';
 if(data.members.some(m=>m.role==='RESELLER'))
  return 'RESELLER · MEMBRESÍA PENDIENTE';
 return 'AFILIADO';
}
function renderNav(){
 const menu=el('cc166-nav');menu.replaceChildren();
 // Una sola interfaz para los 4 roles. El servidor decide los permisos.
 app.classList.add('cc176-admin');
 const admin=!!data.admin,superRole=!admin&&!!data.super;
 const groups=[
  ['GENERAL',[['home','◫',admin?'Resumen':'Inicio'],...(admin?[['attention','◷','Atención de hoy']]:[])]],
  ['OPERACIONES',[
   ...(admin?[['admin','♙','Usuarios'],['approvals','✓','Súper reseller'],
     ['sales','◈','Supervisar pedidos'],['bonuses','◇','Bonos']]:[]),
   ...(superRole?[['publish','▣','Mis publicaciones'],['sales','◈','Mis ventas']]:[]),
   ...(!admin?[['shop','▣','Catálogo'],['orders','◱','Mis compras']]:[]),
   ['wallet','▤','Billetera']]],
  ['MI CUENTA',[['businesses','▦','Negocios'],['profile','♙','Mi perfil']]]
 ];
 for(const [heading,items] of groups){
  menu.append(make('p','cc176-nav-heading',heading));
  for(const [id,icon,labelText] of items){
   const selected=view===id||(id==='businesses'&&view.startsWith('business:'));
   const b=button('',()=>nav(id),'cc166-navitem'+(selected?' selected':''));
   b.setAttribute('aria-current',selected?'page':'false');
   b.append(make('span','',icon),make('span','',labelText));menu.append(b);
  }
 }
 const aside=el('cc166-aside-foot');aside.replaceChildren();
 aside.append(make('p','cc176-side-note',
  admin?'ADMIN · Validación y supervisión':superRole?'Súper reseller · Publicaciones y ventas':
  'Cuenta CLAN CARTAN · Accesos según membresía'));
 aside.append(button('← Salir al portal',()=>{app.hidden=true;},'cc166-back'));
 const role=el('cc166-role');
 role.textContent=userRole()+' · '+(verified?'Cuenta verificada':'Verificando datos…');
 const heading=app.querySelector('.cc166-top h1');
 if(heading)heading.textContent='Panel CLAN CARTAN';
 const top=el('cc166-top-actions');top.replaceChildren();
 top.append(button('← Atrás',()=>nav('back'),'cc166-secondary cc177-back'));
 top.append(button('↻ Actualizar',()=>load(),'cc166-secondary'));
 top.append(button('✕ Cerrar',()=>{app.hidden=true;},'cc166-x'));
}
function businessTabs(page){
 const tabs=make('nav','cc167-tabs');tabs.setAttribute('aria-label','Negocios CLAN CARTAN');
 for(const [code] of services){
  const accessInfo=access(code),selected=view==='business:'+code;
  const tab=button('',()=>nav('business:'+code),'cc167-tab'+(selected?' selected':'')+(accessInfo.ok?'':' locked'));
  tab.append(make('strong','',serviceName(code)));
  tab.append(make('small','',accessInfo.ok?'● Membresía activa':'○ No habilitado · Activar'));
  tabs.append(tab);
 }
 page.append(tabs);
}
function movementList(page,max){
 const box=make('div','cc166-list');const moves=data.moves.slice(0,max);
 if(!moves.length)box.append(make('p','cc166-empty',verified?'No se encontraron movimientos reales.':'Consultando movimientos…'));
 for(const m of moves){
  const row=make('div','cc166-movement'),a=make('div','');
  let dt='—';if(m.occurred_at){try{dt=new Date(m.occurred_at).toLocaleDateString('es-PE',{timeZone:'America/Lima'});}catch(_){}}
  const pending=m.affects_balance===false;
  a.append(make('small','',dt+' · '+serviceName(m.service)+' · '+(m.movement_type||'Movimiento')+
    (pending?' · SOLICITUD NO ACREDITADA':' · '+(m.status||'REGISTRADO'))));
  a.append(make('span','',String(m.description||m.reference||'Movimiento registrado').slice(0,130)));
  row.append(a,make('strong',pending?'pending':Number(m.amount_pen)<0?'minus':'plus',
   (pending?'Sin afectar saldo · ':'')+price(m.amount_pen)));box.append(row);
 }page.append(box);
}
function adminRecords(){
 return {
  pendingDeliveries:data.orders.filter(o=>o.status==='PAID_AWAITING_DELIVERY'),
  pendingPayments:adminAccountsState==='ready'?adminAccounts.filter(a=>!a.is_admin&&!a.access_until):[],
  superApproved:adminAccountsState==='ready'?adminAccounts.filter(a=>!a.is_admin&&a.super_enabled):[],
  activeProducts:data.products.filter(p=>p.status==='ACTIVE')
 };
}
function adminHome(page){
 if(adminAccountsState==='idle')void loadAdminAccounts();
 if(rechargeState==='idle')void loadAdminRecharges();
 const k=adminRecords();
 const intro=make('section','cc176-intro');
 const tag=make('p','cc176-eyebrow','DIRECCIÓN / VISTA GENERAL');
 intro.append(tag);
 intro.append(make('h2','','Control de operaciones'));
 intro.append(make('p','','Una vista para decidir qué necesita atención. Sin módulos antiguos ni funciones duplicadas.'));
 const quick=make('div','cc166-actions');
 quick.append(button('Revisar pendientes',()=>nav('attention'),'cc166-primary'));
 quick.append(button('Administrar usuarios',()=>nav('admin'),'cc166-secondary'));
 intro.append(quick);page.append(intro);
 const stats=make('div','cc176-kpis');
 stats.append(metric('Usuarios registrados',adminAccountsState==='ready'?String(adminAccounts.length):'—','blue'));
 stats.append(metric('Publicaciones activas',String(k.activeProducts.length),'gold'));
 stats.append(metric('Entregas por atender',String(k.pendingDeliveries.length),'aqua'));
 stats.append(metric('Recargas por verificar',rechargeState==='ready'?String(rechargeRows.length):'—','purple'));
 page.append(stats);
 const section=make('div','cc176-dashboard-columns');
 const tasks=card('Prioridades de hoy','Pendientes actuales obtenidos del servidor, sin movimientos inventados.');
 const items=[
  [rechargeState==='ready'?rechargeRows.length:'—','Recargas por verificar','Revisar recargas',()=>finance('recharges')],
  [k.pendingDeliveries.length,'Entregas de STREAM BULL’S','Abrir ventas',()=>nav('sales')],
  [adminAccountsState==='ready'?k.pendingPayments.length:'—','Membresías pendientes de pago','Ver usuarios',()=>nav('admin')]
 ];
 for(const [num,heading,action,fn] of items){
  const item=make('div','cc176-task');
  item.append(make('strong','cc176-task-count',num));
  const details=make('div','');details.append(make('strong','',heading));details.append(make('small','',num===0?'Sin pendientes':'Consulta para revisar el detalle'));
  item.append(details,button(action,fn,'cc166-secondary'));tasks.append(item);
 }
 section.append(tasks);
 const business=card('Áreas comerciales','Las aprobaciones manuales se aplican solo a Súper reseller.');
 const blocks=[
  ['Súper reseller', 'Autoriza los permisos especiales. El pago anual es independiente.',()=>nav('approvals')],
  ['Supervisar pedidos', 'Validaciones y entregas, sin publicar como ADMIN.',()=>nav('sales')],
  ['Finanzas', 'Recargas verificadas, saldos y auditoría en esta cuenta.',()=>finance('audit')]
 ];
 for(const [t,d,fn] of blocks){
  const x=button('',fn,'cc176-resource');
  x.append(make('strong','',t),make('small','',d));business.append(x);
 }
 section.append(business);page.append(section);
 const note=make('p','cc176-footnote',
 'STREAM BULL’S: membresía anual de 365 días. El reseller se activa al pagar con su billetera; ADMIN solo autoriza la categoría Súper reseller.');
 page.append(note);
}
function adminAttention(page){
 if(adminAccountsState==='idle')void loadAdminAccounts();
 if(rechargeState==='idle')void loadAdminRecharges();
 title(page,'Atención de hoy','Prioridades reales sin aprobaciones de reseller ni pantallas duplicadas.');
 const k=adminRecords();
 const wrap=make('div','cc176-attention-grid');
 const tiles=[
  ['Recargas pendientes',rechargeState==='ready'?String(rechargeRows.length):'—',
   'Solo acreditar depósitos comprobados.','Abrir recargas',()=>finance('recharges')],
  ['Entregas por completar',String(k.pendingDeliveries.length),
   'Pedidos pagados que requieren entrega.','Ver ventas',()=>nav('sales')],
  ['Cuentas sin membresía vigente',adminAccountsState==='ready'?String(k.pendingPayments.length):'—',
   'El reseller paga el plan anual desde su propia billetera.','Ver usuarios',()=>nav('admin')],
  ['Permisos Súper reseller',adminAccountsState==='ready'?String(k.superApproved.length):'—',
   'Aprobación manual ADMIN; no genera cargos ni suscripciones.','Gestionar permisos',()=>nav('approvals')]
 ];
 for(const [heading,number,desc,cta,fn] of tiles){
  const tile=card(heading,desc);tile.append(make('strong','cc176-attention-number',number),button(cta,fn,'cc166-secondary'));wrap.append(tile);
 }
 page.append(wrap);
 page.append(make('p','cc166-note','Las cifras de pedidos y publicaciones reflejan los registros consultados. Las recargas no modifican saldos hasta su verificación bancaria.'));
}
function finance(tab){walletTab=tab;view='wallet';render();}
function overview(page){
 if(data.admin){adminHome(page);return;}
 const balance=data.real.reduce((n,r)=>n+Number(r.balance_pen||0),0);
 const bought=data.orders.filter(o=>o.buyer_id===user);
 const published=data.products.filter(p=>p.seller_id===user);
 const sold=data.orders.filter(o=>o.seller_id===user);
 const currentBusiness=services.filter(b=>access(b[0]).ok).length;
 const resellerPending=!data.admin&&!data.super&&!data.reseller&&data.members.some(m=>m.role==='RESELLER');
 const kind=data.admin?'admin':data.super?'super':data.superPermission?'super-pending':data.reseller?'reseller':resellerPending?'reseller-pending':'affiliate';
 const headings={
  admin:['Centro de administración','Usuarios, publicaciones y ventas sin salir de un panel.'],
  super:['Mi negocio STREAM BULL’S','Publica servicios, atiende pedidos y revisa tus movimientos.'],
  'super-pending':['Súper reseller · membresía pendiente','La asignación está registrada. La venta exige una membresía verificada.'],
  reseller:['Mi espacio reseller','Compra y consulta tus servicios desde una sola cuenta.'],
  'reseller-pending':['Reseller · membresía pendiente','Tienes el rol asignado. Los precios de distribuidor requieren una membresía activa.'],
  affiliate:['Bienvenido a CLAN CARTAN','Explora el catálogo público y consulta tus compras.']
 }[kind];
 title(page,headings[0],headings[1]);
 const hero=make('section','cc167-hero cc174-overview-hero');
 hero.append(make('h2','',data.admin?'Resumen de operaciones':data.super?'Tu tienda y ventas':'Un espacio para tus servicios'));
 const actions=make('div','cc167-actions');
 if(data.admin){
  actions.append(button('Atención de hoy',()=>nav('attention'),'cc166-primary'));
  actions.append(button('Gestionar usuarios',()=>nav('admin'),'cc166-secondary'));
 }else if(data.super){
  actions.append(button('Publicar servicio',()=>nav('publish'),'cc166-primary'));
  actions.append(button('Ventas y entregas',()=>nav('sales'),'cc166-secondary'));
 }else if((data.superPermission&&!data.super)||resellerPending){
  actions.append(button('Consultar membresía',()=>nav('business:STREAM_BULLS'),'cc166-primary'));
 }else{
  actions.append(button('Explorar catálogo',()=>nav('shop'),'cc166-primary'));
  if(data.reseller)actions.append(button('Mis negocios',()=>nav('businesses'),'cc166-secondary'));
 }
 hero.append(actions);page.append(hero);
 const stats=make('div','cc166-stats cc174-overview-stats');
 if(data.admin){
  stats.append(metric('Cuentas',adminAccountsState==='ready'?String(adminAccounts.length):'Ver usuarios','blue'));
  stats.append(metric('Publicaciones',String(data.products.length),'gold'));
  stats.append(metric('Pedidos consultados',String(data.orders.length),'aqua'));
 }else if(data.super){
  stats.append(metric('Mis publicaciones',String(published.length),'gold'));
  stats.append(metric('Mis ventas',String(sold.length),'aqua'));
  stats.append(metric('Saldo real',verified?price(balance):'—','blue'));
 }else{
  stats.append(metric('Saldo real',verified?price(balance):'—','aqua'));
  stats.append(metric('Mis compras',String(bought.length),'blue'));
  if(data.reseller)stats.append(metric('Negocios activos',currentBusiness+' / 4','gold'));
 }
 page.append(stats);
 if(data.super&&!data.admin){
  const center=card('Centro Súper reseller · STREAM BULL’S',
   'Publicaciones y ventas propias. Los precios y las comisiones se confirman en el servidor.');
  center.append(button('Gestionar mis ventas',()=>nav('sales'),'cc166-secondary'));
  page.append(center);
 }else if(data.superPermission&&!data.super&&!data.admin){
  const pending=card('Súper reseller · activación pendiente',
   'Publicar y gestionar ventas requiere una membresía activa de STREAM BULL’S.');
  pending.append(button('Ver membresía',()=>nav('business:STREAM_BULLS'),'cc166-secondary'));
  page.append(pending);
 }else if(resellerPending){
  const pending=card('Reseller · activación pendiente',
   'El rol ya está registrado. El precio de distribuidor se habilita al confirmar tu suscripción.');
  pending.append(button('Consultar mi acceso',()=>nav('business:STREAM_BULLS'),'cc166-secondary'));
  page.append(pending);
 }
}
function openRecharge(){
 if(data.admin){finance('recharges');return;}
 exitTo(()=>{if(typeof window.cc116OpenRecharge==='function')window.cc116OpenRecharge();else window.cc80?.open();});
}

function adminSectionTabs(items,current,choose){
 const nav=make('nav','cc175-tabs');nav.setAttribute('aria-label','Secciones de administración');
 for(const [id,label] of items){
  const selected=current===id;
  const b=button(label,()=>choose(id),'cc175-tab'+(selected?' selected':''));
  b.setAttribute('aria-pressed',String(selected));nav.append(b);
 }
 return nav;
}
function safeDate(value){
 if(!value)return '—';
 try{return new Date(value).toLocaleString('es-PE',{timeZone:'America/Lima',day:'2-digit',month:'short',year:'numeric'});}
 catch(_){return '—';}
}
function adminWalletTabs(page){
 page.append(adminSectionTabs([['summary','Saldo y movimientos'],['recharges','Recargas'],['audit','Auditoría']],walletTab,id=>{walletTab=id;render();}));
}
async function loadAdminRecharges(force=false){
 if(!data.admin||!user||!session()?.jwt)return;
 if(rechargeState==='loading'||(rechargeState==='ready'&&!force))return;
 rechargeState='loading';rechargeError='';
 const uid=user,jwt=token;
 try{
  const [rows,ready]=await Promise.all([
   api('rpc/cc_admin_manual_recharge_queue','POST',{}),
   api('rpc/cc_manual_recharge_public_status','POST',{})
  ]);
  if(user!==uid||token!==jwt||session()?.jwt!==jwt)return;
  if(!Array.isArray(rows))throw Error('No se recibió la cola de recargas');
  rechargeRows=rows;rechargeReady=Array.isArray(ready)&&ready.length?ready[0]:{enabled:false};
  rechargeState='ready';
 }catch(e){
  if(user===uid&&token===jwt){rechargeState='error';rechargeError=String(e?.message||e);rechargeReady=null;}
 }finally{
  if(user===uid&&token===jwt&&((view==='wallet'&&walletTab==='recharges')||view==='home'||view==='attention'))render();
 }
}
async function adminDecideRecharge(row,approve,transaction,bank,confirmed,btn){
 if(!data.admin||!verified||rechargeSaving||!row?.request_id)return;
 const tx=String(transaction||'').trim(),origin=String(bank||'').trim();
 if(approve&&(!rechargeReady?.enabled||!confirmed||tx.length<8||tx.length>120)){
  notice('Acreditación bloqueada: confirma el depósito real habilitado y escribe la referencia bancaria única (8 a 120 caracteres).');return;
 }
 if(!window.confirm(approve?
  '¿Verificaste el ingreso REAL de '+price(row.amount_pen)+' y autorizas acreditarlo una sola vez?':
  '¿Rechazar esta solicitud sin acreditar dinero?'))return;
 const uid=user,jwt=token;rechargeSaving=true;btn.disabled=true;
 try{
  const result=await api('rpc/cc_admin_decide_manual_recharge','POST',{
   p_request:row.request_id,p_approve:approve,
   p_bank_tx:approve?tx:null,p_bank:approve?origin:null,
   p_confirmed_received:approve?true:false
  });
  if(user!==uid||session()?.jwt!==jwt)return;
  if(result!==true){
   notice('Solicitud ya procesada o sin cambio. Actualiza la cola para ver su estado.');
  }else{
   notice(approve?'Recarga verificada y acreditada por el servidor.':'Solicitud rechazada sin acreditar.');
  }
  rechargeState='idle';auditState='idle';
  await loadAdminRecharges(true);
 }catch(e){
  if(user===uid&&session()?.jwt===jwt)notice('No se procesó la recarga: '+String(e?.message||e));
 }finally{rechargeSaving=false;btn.disabled=false;}
}
function adminRecharges(page){
 const box=card('Recargas pendientes','El ADMIN verifica el pago bancario real antes de acreditar. Los comprobantes declarados no son confirmación.');
 const actions=make('div','cc166-actions');
 actions.append(button('Actualizar pendientes',()=>void loadAdminRecharges(true),'cc166-secondary'));box.append(actions);
 if(rechargeState==='idle')void loadAdminRecharges();
 if(rechargeState==='idle'||rechargeState==='loading')box.append(make('p','cc166-note','Consultando solicitudes de recarga…'));
 else if(rechargeState==='error'){
  box.append(make('p','cc166-notice','Recargas no disponibles: '+rechargeError));
  box.append(button('Reintentar',()=>void loadAdminRecharges(true),'cc166-secondary'));
 }else{
  if(!rechargeReady?.enabled){
   box.append(make('p','cc176-finance-warning',
    'Acreditación bancaria no habilitada en el servidor. Puedes revisar o rechazar, pero no aprobar depósitos hasta habilitar la cuenta recaudadora.'));
  }
  box.append(metric('Solicitudes por verificar',String(rechargeRows.length),'gold'));
  if(!rechargeRows.length)box.append(make('p','cc166-empty','No hay recargas pendientes de revisión.'));
  const list=make('div','cc175-records');
  for(const row of rechargeRows.slice(0,80)){
   const item=make('article','cc176-recharge-record');
   const top=make('div','cc176-recharge-head'),left=make('div','');
   left.append(make('strong','',String(row.payer_name||'Cliente')));
   left.append(make('small','',serviceName(row.service)+' · '+safeDate(row.created_at)));
   left.append(make('small','','Solicitud '+String(row.request_id||'—')));
   if(row.payer_reference)left.append(make('small','','Referencia declarada (NO verificada): '+String(row.payer_reference)));
   top.append(left,make('strong','',price(row.amount_pen)));item.append(top);
   const actions=make('div','cc166-actions');
   const review=make('details','cc176-review');
   review.append(make('summary','','Revisar comprobación bancaria'));
   const controls=make('div','cc176-recharge-fields');
   const tx=document.createElement('input');tx.maxLength=120;tx.placeholder='Referencia única de operación bancaria (mín. 8)';
   tx.setAttribute('aria-label','ID del depósito bancario verificado');
   const bank=document.createElement('input');bank.maxLength=64;bank.placeholder='Banco de origen (opcional)';
   bank.setAttribute('aria-label','Banco de origen');
   const label=make('label','cc176-verify-label');
   const checkbox=document.createElement('input');checkbox.type='checkbox';
   label.append(checkbox,document.createTextNode(' He comprobado el ingreso REAL en la cuenta autorizada.'));
   const approve=button('Aprobar y acreditar',()=>void adminDecideRecharge(row,true,tx.value,bank.value,checkbox.checked,approve),'cc166-primary');
   approve.disabled=!rechargeReady?.enabled;
   controls.append(tx,bank,label,approve);
   review.append(controls);actions.append(review);
   const reject=button('Rechazar solicitud',()=>void adminDecideRecharge(row,false,'','',false,reject),'cc166-secondary');
   actions.append(reject);item.append(actions);list.append(item);
  }
  box.append(list);
 }
 page.append(box);
}

async function loadAdminAudit(force=false){
 if(!data.admin||!user||!session()?.jwt)return;
 if(auditState==='loading'||(auditState==='ready'&&!force))return;
 auditState='loading';auditError='';
 const uid=user,jwt=token;
 try{
  const [summary,rows]=await Promise.all([
   api('rpc/cc_admin_financial_summary','POST',{}),
   api('rpc/cc_admin_wallet_financial_audit','POST',{p_before_id:null,p_limit:30})
  ]);
  if(user!==uid||token!==jwt||session()?.jwt!==jwt)return;
  if(!summary||typeof summary!=='object'||Array.isArray(summary)||!Array.isArray(rows))throw Error('Contabilidad no disponible');
  auditData=summary;auditRows=rows;auditState='ready';
 }catch(e){if(user===uid&&token===jwt){auditState='error';auditError=String(e?.message||e);}}
 finally{if(user===uid&&token===jwt&&view==='wallet'&&walletTab==='audit')render();}
}
function adminAudit(page){
 if(auditState==='idle')void loadAdminAudit();
 const box=card('Auditoría financiera','Ingresos verificados, bonos y saldos auditados. Este informe no sustituye la conciliación bancaria.');
 const actions=make('div','cc166-actions');
 actions.append(button('Actualizar auditoría',()=>void loadAdminAudit(true),'cc166-secondary'));box.append(actions);
 if(auditState==='idle'||auditState==='loading')box.append(make('p','cc166-note','Consultando operaciones verificadas…'));
 else if(auditState==='error')box.append(make('p','cc166-notice','No se pudo obtener la auditoría: '+auditError));
 else{
  const stats=make('div','cc166-stats cc175-financial-stats');
  for(const [label,key] of [
    ['Recargas recibidas','cash_received_pen'],
    ['Consumo pagado','paid_service_consumption_pen'],
    ['Saldo real pendiente','real_wallet_liability_pen']
  ])stats.append(metric(label,price(auditData?.[key]??0),'aqua'));
  box.append(stats);
  const details=make('details','cc175-financial-details');
  details.append(make('summary','','Ver desglose de bonos y reembolsos'));
  for(const [label,key] of [
   ['Bonos gratuitos otorgados','free_bonus_granted_pen'],
   ['Bonos disponibles','free_bonus_available_pen'],
   ['Bonos consumidos','free_bonus_consumed_pen'],
   ['Reembolsos de servicios','refunded_service_pen']
  ])details.append(make('p','cc166-note',label+': '+price(auditData?.[key]??0)));
  box.append(details);
  const history=make('h3','cc175-list-heading','Últimos movimientos auditados');box.append(history);
  if(!auditRows.length)box.append(make('p','cc166-empty','Sin movimientos registrados en la auditoría.'));
  else{
   const list=make('div','cc175-records');
   for(const item of auditRows){
    const line=make('article','cc175-record'),left=make('div','');
    left.append(make('strong','',String(item.concept||item.event_type||'Movimiento')));
    left.append(make('small','',safeDate(item.recorded_at)+' · '+serviceName(item.service)+' · '+String(item.status||'')));
    left.append(make('small','','Referencia: '+String(item.reference||'—')));
    const right=make('div','cc175-record-amount');
    right.append(make('strong','',price(item.amount_pen)));
    right.append(make('small','','Saldo '+price(item.balance_before)+' → '+price(item.balance_after)));
    line.append(left,right);list.append(line);
   }
   box.append(list);
  }
 }
 page.append(box);
}
function wallet(page){
 title(page,'Billetera digital única','Saldo real, recargas y movimientos verificados desde una sola sección.');
 if(data.admin){
  adminWalletTabs(page);
  if(walletTab==='recharges'){adminRecharges(page);return;}
  if(walletTab==='audit'){adminAudit(page);return;}
 }
 const real=data.real.reduce((n,r)=>n+Number(r.balance_pen||0),0);
 const box=make('section','cc167-hero');
 box.append(make('h2','','Saldo REAL disponible'));
 box.append(make('strong','cc167-balance',verified?price(real):'Consultando…'));
 box.append(make('p','','Una compra puede descontar varias subbilleteras en una sola operación atómica, sin usar bonos.'));
 const actions=make('div','cc167-actions');
 actions.append(button(data.admin?'Revisar recargas':'Recargar',openRecharge,'cc166-primary'),
 button(data.admin?'Auditoría de movimientos':'Ver movimientos',
  ()=>data.admin?finance('audit'):nav('movements'),'cc166-secondary'));box.append(actions);page.append(box);
 const promo=card('Bonos promocionales','Separados del saldo real y no considerados como efectivo disponible.');
 const total=data.bonuses.reduce((a,b)=>a+Number(b.amount||0),0);
 promo.append(metric('Total bonos verificados',verified?price(total):'—','purple'));
 const detail=make('details','cc167-advanced'),summary=make('summary','','Ver detalle de bonos');detail.append(summary);
 if(!data.bonuses.length)detail.append(make('p','cc166-note','Sin bonos activos verificados.'));
 for(const b of data.bonuses)detail.append(make('p','cc166-note',b.label+' · '+price(b.amount)));
 promo.append(detail);page.append(promo);
 const accounts=make('details','cc167-advanced');accounts.append(make('summary','','Detalle técnico de saldos por negocio'));
 for(const [code] of services)accounts.append(make('p','cc166-note',serviceName(code)+' · '+price(data.real.find(r=>r.service===code)?.balance_pen||0)));
 page.append(accounts);
 const recent=card('Movimientos e historial','Cada descuento o ingreso tiene su concepto y referencia.');
 movementList(recent,12);page.append(recent);
}
function memberships(page){
 title(page,'Accesos y suscripciones','Las mismas pestañas aparecen arriba. La administración del negocio exige membresía vigente.');
 page.append(make('p','cc166-note','Selecciona un negocio arriba para revisar su acceso, plan y funciones. No existen cuatro paneles generales diferentes.'));
}
function businessPage(page,code){
 const info=access(code);title(page,serviceName(code),info.ok?'Membresía verificada · Controles habilitados':'Tu acceso a este negocio está bloqueado hasta activar o renovar la membresía.');
 if(code==='STREAM_BULLS'){
  const shell=card('STREAM BULL’S · Servicios digitales',info.ok?'Tu suscripción de gestión está activa.':'Puedes comprar productos sin membresía. Para gestionar cuentas necesitas activar el plan.');
  const actions=make('div','cc166-actions');
  if(!data.admin)actions.append(button('Comprar servicios',()=>nav('shop'),'cc166-primary'));
  if(info.ok){
   if(data.super&&!data.admin)actions.append(button('Mis publicaciones',()=>nav('publish'),'cc166-secondary'));
   else actions.append(button('Mi catálogo',()=>nav('shop'),'cc166-secondary'));
  }else{
   const cost=Number(data.plan?.price_pen);
   shell.append(metric('Membresía anual · 365 días',Number.isFinite(cost)&&cost>0?price(cost):'Precio no verificado','gold'));
   if(!data.admin){const pay=button('Activar por '+price(cost),()=>void buyStreamMembership(cost),'cc166-primary');pay.disabled=!(Number.isFinite(cost)&&cost>0&&verified);actions.append(pay);}
  }
  shell.append(actions);page.append(shell);
 }else{
  const shell=card(info.ok?'Membresía activa':'Acceso no habilitado',
  info.ok?'Entra a las herramientas existentes de este negocio.':'Activa o renueva el plan desde el flujo protegido del negocio; no se aplicará ningún débito sin confirmación.');
  shell.append(make('p','cc166-note',info.ok?'Tus operaciones y clientes permanecen bajo tu cuenta CLAN CARTAN.':'El acceso administrativo se habilita solamente cuando el servidor confirma la membresía.'));
  const next=button(info.ok?'Entrar al negocio':'Consultar activación de membresía',()=>{
    const original={COBRA_YA:()=>window.cc79Cobra?.(),MI_COCHERA:()=>window.mc158Open?.(),MI_ALQUILER:()=>window.ma1611MiAlquiler?.open()}[code];
    exitTo(original);
  },'cc166-primary');shell.append(next);page.append(shell);
 }
}

function movements(page){
 title(page,'Movimientos de mi billetera','Historial personal de recargas, compras y activaciones, con sus importes y conceptos.');
 if(data.admin||data.reseller||data.super){
  const buttons=make('div','cc166-actions');
  buttons.append(button('Filtros y exportaciones',()=>exitTo(()=>window.cc132OpenMovements?.()),'cc166-secondary'));
  page.append(buttons);
 }
 movementList(page,120);
}

function orderMessage(order){
 return 'Hola, solicito coordinar la entrega de mi compra en CLAN CARTAN.'+
 '\nPedido: '+order.order_id+
 '\nProducto: '+order.title+
 '\nImporte pagado: '+price(order.price_pen)+
 '\nEl pago ya fue descontado de mi billetera real.';
}
function notifySeller(order){
 const phone=String(order?.seller_whatsapp||'').replace(/[^0-9]/g,'');
 if(!/^[1-9][0-9]{7,14}$/.test(phone)){notice('Este pedido no tiene WhatsApp válido. Contacta al administrador.');return;}
 const link='https://wa.me/'+phone+'?text='+encodeURIComponent(orderMessage(order));
 const opened=window.open(link,'_blank','noopener,noreferrer');
 if(!opened){
  const a=make('a','cc166-primary','Abrir WhatsApp del vendedor');
  a.href=link;a.target='_blank';a.rel='noopener noreferrer';
  el('cc166-content')?.prepend(a);
 }
}
function receipt(page){
 if(!lastReceipt||lastReceipt.buyer_id!==user)return;
 const box=make('section','cc167-receipt');
 box.append(make('h3','','Compra confirmada · '+price(lastReceipt.price_pen)));
 box.append(make('p','','Pedido '+lastReceipt.order_id+' · '+lastReceipt.title));
 box.append(make('p','','Pago descontado y registrado. Pulsa Notificar vendedor y envía el mensaje desde WhatsApp.'));
 box.append(button('Notificar al vendedor · WhatsApp',()=>notifySeller(lastReceipt),'cc166-primary'));
 box.append(button('Ver mis compras',()=>nav('orders'),'cc166-secondary'));
 page.append(box);
}
function shop(page){
 title(page,'Comprobante de compra','Aquí verás exclusivamente el resultado de tu compra; el catálogo público es único.');
 receipt(page);
 const actions=make('div','cc166-actions');
 actions.append(button('Volver al catálogo público',openCatalog,'cc166-primary'));
 actions.append(button('Mis compras',()=>nav('orders'),'cc166-secondary'));
 page.append(actions);
}
function storedKey(kind,id){
 const name='cc167:'+kind+':'+user+':'+id;
 let key=null;
 try{key=sessionStorage.getItem(name);}catch(_){}
 if(!key){
  if(!window.crypto?.randomUUID)throw Error('El navegador requiere conexión segura para confirmar compras.');
  key=window.crypto.randomUUID();
  try{sessionStorage.setItem(name,key);}catch(_){}
 }
 return {name,key};
}
function forgetKey(name){try{sessionStorage.removeItem(name);}catch(_){}}
async function buyProduct(product,b){
 if(!verified||purchasePending)return;
 const amount=Number(product.price_pen);
 if(!Number.isFinite(amount)||amount<=0)return;
 if(!window.confirm('¿Confirmas la compra de '+product.title+' por '+price(amount)+'? Se descontará de tu saldo REAL y el pedido quedará registrado.'))return;
 const uid=user,jwt=token;
 let keyInfo;
 try{keyInfo=storedKey('purchase',product.id);}catch(e){notice(e.message);return;}
 purchasePending=true;b.disabled=true;b.textContent='Confirmando pago…';
 try{
  const response=await api('rpc/cc_portal_purchase_stream_product','POST',{
   p_product_id:product.id,p_checkout_key:keyInfo.key,p_expected_price_pen:amount
  });
  if(session()?.userId!==uid||session()?.jwt!==jwt)return;
  if(!response?.order_id||!response?.seller_whatsapp)throw Error('No se recibió confirmación de orden.');
  forgetKey(keyInfo.name);
  lastReceipt={...response,buyer_id:uid};
  await load();
  app.hidden=false;view='shop';render();
  receiptFocus();
 }catch(e){if(session()?.userId===uid&&session()?.jwt===jwt){app.hidden=false;view='shop';render();notice('Compra no confirmada: '+String(e?.message||e)+'. Revisa Mis compras antes de intentarlo nuevamente.');}}
 finally{purchasePending=false;b.disabled=false;if(b.isConnected)b.textContent='Comprar con billetera';}
}
async function purchaseFromPublicCatalog(productId,buttonEl,displayedPrice){
 sync();
 if(!session()?.jwt||!user){
  if(typeof window.cc77Auth==='function')window.cc77Auth(false);
  else window.alert('Debes iniciar sesión con tu cuenta CLAN CARTAN.');
  return;
 }
 if(!verified||!window.cc80?.api){
  window.alert('No es posible confirmar tu saldo. Abre el panel y actualiza los datos antes de comprar.');
  return;
 }
 if(purchasePending)return;
 try{
  // Verificación por servidor: el navegador jamás elige quién merece precio distribuidor.
  const item=await api('rpc/cc_portal_stream_price_for_me','POST',{p_product_id:productId});
  if(!item||item.status!=='ACTIVE'||Number(item.stock)<1){
   window.alert('Este producto ya no está disponible. Actualiza el catálogo.');return;
  }
  if(Number(item.price_pen)!==Number(displayedPrice)){
   window.alert('El precio o tu membresía cambió. Actualiza el catálogo antes de confirmar.');
   window.cc169RefreshCatalog?.();return;
  }
  // Misma RPC transaccional e idempotente ya usada por el panel V167; no doble checkout.
  await buyProduct(item,buttonEl||button('Comprar',()=>{},'cc166-primary'));
 }catch(e){
  window.alert('No se pudo verificar el producto. No se hizo ningún cargo: '+String(e.message||e));
 }
}

function receiptFocus(){el('cc166-content')?.querySelector('.cc167-receipt')?.scrollIntoView({behavior:'smooth',block:'start'});}
async function buyStreamMembership(amount){
 if(!verified||membershipPending)return;
 if(!window.confirm('¿Activar o renovar STREAM BULL’S por '+price(amount)+' / 365 días? Se descontará una sola vez de tu saldo real.'))return;
 const uid=user,jwt=token;let key;
 try{key=storedKey('membership','stream');}catch(e){notice(e.message);return;}
 membershipPending=true;
 try{
  const res=await api('rpc/cc_portal_buy_stream_membership','POST',{
   p_checkout_key:key.key,p_expected_amount_pen:amount
  });
  if(session()?.userId!==uid||session()?.jwt!==jwt)return;
  if(!res?.membership_id)throw Error('No fue posible verificar la suscripción');
  forgetKey(key.name);
  await load();view='business:STREAM_BULLS';render();
  notice('Membresía STREAM BULL’S verificada hasta '+new Date(res.ends_at).toLocaleDateString('es-PE',{timeZone:'America/Lima'})+'.');
 }catch(e){if(session()?.userId===uid)notice('No se activó la membresía: '+String(e.message||e));}
 finally{membershipPending=false;}
}
function orders(page){
 title(page,'Mis compras','Cada pedido pagado conserva producto, importe, proveedor, estado y enlace de notificación.');
 const entries=data.orders.filter(o=>o.buyer_id===user);
 if(!entries.length){page.append(make('p','cc166-empty','Todavía no tienes compras registradas en el marketplace.'));return;}
 for(const o of entries){
  const row=make('article','cc167-order-row');
  const summary=make('div','');
  summary.append(make('strong','',o.title));
  summary.append(make('small','','Pedido: '+o.id+' · '+String(o.status).replaceAll('_',' ')));
  row.append(summary,make('strong','',price(o.price_pen)));
  row.append(button('Notificar vendedor',()=>notifySeller({...o,order_id:o.id}),'cc166-secondary'));
  page.append(row);
 }
}
async function markDelivered(order){
 if(data.admin){notice('Solo el vendedor puede marcar su pedido como entregado.');return;}
 if(!window.confirm('¿Confirmas que entregaste el producto al comprador? Esta acción no transfiere ni libera dinero.'))return;
 try{
  const ok=await api('rpc/cc_portal_mark_stream_order_delivered','POST',{p_order_id:order.id});
  if(ok){await load();view='sales';render();notice('Entrega marcada como completada.');}
  else notice('El pedido ya había sido atendido o no tienes permiso.');
 }catch(e){notice('No se pudo cambiar el estado: '+String(e.message||e));}
}
function sales(page){
 if(!data.admin&&!data.super){nav('home');return;}
 title(page,data.admin?'Supervisión de pedidos':'Ventas y entregas','Cada compra se guarda con comisión ADMIN y pago pendiente al vendedor; sin liquidaciones automáticas.');
 const rows=data.orders.filter(o=>data.admin||o.seller_id===user);
 const totals=rows.reduce((s,r)=>({sale:s.sale+Number(r.price_pen||0),
  owed:s.owed+(r.status==='REFUNDED'?0:Number(r.seller_payable_pen||0)),
  admin:s.admin+(r.status==='REFUNDED'?0:Number(r.admin_fee_pen||0))}),{sale:0,owed:0,admin:0});
 const stats=make('div','cc166-stats');
 stats.append(metric('Ventas registradas',price(totals.sale),'aqua'));
 stats.append(metric('Pendiente de liquidación',price(totals.owed),'blue'));
 stats.append(metric('Comisión ADMIN sobre ganancia',price(totals.admin),'gold'));
 page.append(stats);
 if(!rows.length){page.append(make('p','cc166-empty','Sin ventas registradas todavía.'));return;}
 for(const o of rows){
  const line=make('article','cc167-order-row');
  const info=make('div','');
  info.append(make('strong','',o.title));
  info.append(make('small','','Pedido '+o.id+' · '+String(o.status).replaceAll('_',' ')));
  line.append(info,make('strong','',price(o.price_pen)));
  if(!data.admin){const b=button(o.status==='FULFILLED'?'Entregado':'Marcar entregado',()=>void markDelivered(o),'cc166-secondary');b.disabled=o.status!=='PAID_AWAITING_DELIVERY';line.append(b);}
  page.append(line);
 }
}

function publish(page){
 if(data.admin||!data.super)return overview(page);
 title(page,'Publicar servicios · STREAM BULL’S','Publicaciones registradas por el servidor con autor y stock.');
 const box=card('Nuevo servicio','La membresía y el permiso se verifican antes de guardar.');
 const form=make('form','cc166-form');form.id='cc166-publish-form';
 const specs=[
 ['service','Plataforma','select'],['title','Nombre del producto','text'],
 ['days','Duración (días)','number'],['price','Precio al público (S/)','number'],
 ['distributor','Precio reseller / distribuidor (S/)','number'],
 ['cost','Costo de adquisición (S/)','number'],['stock','Stock disponible','number'],
 ['whatsapp','WhatsApp de soporte','tel'],['description','Descripción','textarea']
 ];
 for(const [key,name,type] of specs){
  const label=make('label','',name);let input;
  if(type==='select'){input=document.createElement('select');
   ['Netflix','YouTube','Disney+','Prime Video','HBO','Paramount+','Google One','Spotify','Crunchyroll','CapCut','Canva','ChatGPT Plus','Otro'].forEach(n=>{const o=make('option','',n);o.value=n;input.append(o);});}
  else if(type==='textarea'){input=document.createElement('textarea');input.rows=2;input.maxLength=1000;}
  else{input=document.createElement('input');input.type=type;if(type==='number'){input.min=key==='days'?'1':'0';input.step=key==='days'||key==='stock'?'1':'0.01';}}
  input.name=key;if(key!=='description')input.required=true;if(key==='whatsapp')input.placeholder='51912345678';if(key==='days')input.value='30';label.append(input);form.append(label);
 }
 const save=make('button','cc166-primary','Publicar servicio');save.type='submit';form.append(save);
 form.addEventListener('submit',e=>{e.preventDefault();void publishSave(new FormData(form),save);});
 window.cc170Flyers?.attachForm(form);
 box.append(form);page.append(box);
 const list=card('Mis servicios publicados','Compra habilitada con saldo REAL; cada venta crea pedido y queda pendiente de entrega.');
 const products=data.products.filter(p=>data.admin||p.seller_id===user);
 if(!products.length)list.append(make('p','cc166-empty','Aún no hay publicaciones.'));
 for(const p of products){
  const row=make('div','cc166-product cc167-stock-row');
  row.append(make('strong','',p.title));
  const ownPrice=data.priceDetails.find(info=>info.id===p.id);
  row.append(make('span','',p.service+' · Público '+price(p.price_pen)+
   ' · Reseller '+price(ownPrice?.distributor_price_pen??p.price_pen)+
   ' · Stock '+p.stock+' · '+p.status));
  const actions=make('div','cc167-actions');
  actions.append(button('Editar precios',()=>void editPrices(p,ownPrice),'cc166-secondary'));
  actions.append(button('Actualizar stock',()=>void editProduct(p,'stock'),'cc166-secondary'));
  actions.append(button(p.status==='ACTIVE'?'Pausar':'Reactivar',()=>void editProduct(p,'status'),'cc166-secondary'));
  actions.append(button('WhatsApp',()=>void editProduct(p,'whatsapp'),'cc166-secondary'));
  row.append(actions);
  window.cc170Flyers?.decorateRow(row,p);
  list.append(row);
 }
 page.append(list);
}
async function editPrices(product,details){
 if(data.admin||!data.super)return;
 const oldPublic=Number(details?.public_price_pen??product.price_pen);
 const oldDistributor=Number(details?.distributor_price_pen??oldPublic);
 const publicInput=window.prompt('Nuevo precio para AFILIADO / PÚBLICO (S/) · '+
   product.title,String(oldPublic));
 if(publicInput===null)return;
 const distributorInput=window.prompt('Nuevo precio para RESELLER (S/) · '+
   product.title,String(oldDistributor));
 if(distributorInput===null)return;
 const pub=Number(publicInput),dist=Number(distributorInput);
 if(!Number.isFinite(pub)||!Number.isFinite(dist)||pub<=0||pub>10000||
    dist<=0||dist>pub||Math.abs(pub*100-Math.round(pub*100))>1e-7||
    Math.abs(dist*100-Math.round(dist*100))>1e-7){
  notice('Precios inválidos. Deben tener máximo 2 decimales y el precio reseller no debe superar el público.');return;
 }
 if(!window.confirm('¿Guardar precios de '+product.title+'? Público '+
    price(pub)+' · Reseller '+price(dist)+'. Las compras futuras usarán estas tarifas.'))return;
 const uid=user,jwt=token;
 try{
  const result=await api('rpc/cc_portal_update_stream_prices','POST',{
   p_product_id:product.id,p_public_price_pen:pub,p_distributor_price_pen:dist
  });
  if(!result?.updated)throw Error('Actualización no confirmada');
  if(session()?.userId!==uid||session()?.jwt!==jwt)return;
  await load();view='publish';render();
  notice('Ambos precios se actualizaron. Las compras anteriores conservan su precio pagado.');
  window.cc169RefreshCatalog?.();
 }catch(e){
  if(user===uid)notice('No se actualizaron los precios: '+String(e?.message||e));
 }
}
async function editProduct(p,kind){
 const args={p_product_id:p.id,p_stock:null,p_status:null,p_whatsapp:null};
 if(kind==='stock'){
  const answer=window.prompt('Stock disponible para '+p.title+' (0 a 100000):',String(p.stock));
  if(answer===null)return;
  const n=Number(answer);
  if(!Number.isInteger(n)||n<0||n>100000){notice('Ingresa un stock entero válido.');return;}
  args.p_stock=n;
 }else if(kind==='status'){
  const next=p.status==='ACTIVE'?'PAUSED':'ACTIVE';
  if(!window.confirm('¿Cambiar '+p.title+' a '+(next==='ACTIVE'?'Activo':'Pausado')+'?'))return;
  args.p_status=next;
 }else{
  const answer=window.prompt('WhatsApp internacional del vendedor (ej. 51912345678):');
  if(answer===null)return;
  const phone=answer.replace(/[^0-9]/g,'');
  if(!/^[1-9][0-9]{7,14}$/.test(phone)){notice('El WhatsApp debe tener código de país y entre 8 y 15 dígitos.');return;}
  args.p_whatsapp=phone;
 }
 const uid=user,jwt=token;
 try{
  await api('rpc/cc_portal_update_stream_product','POST',args);
  if(session()?.userId!==uid||session()?.jwt!==jwt)return;
  await load();view='publish';render();notice('Producto actualizado correctamente.');
 }catch(e){if(session()?.userId===uid)notice('No se actualizó: '+String(e?.message||e));}
}
async function publishSave(fd,b){
 if(!user||!verified)return;
 const s=session(),uid=user,jwt=token;
 const value=k=>String(fd.get(k)||'').trim(),days=Number(value('days')),stock=Number(value('stock')),p=Number(value('price')),d=Number(value('distributor')),c=Number(value('cost'));
 if(!(p>0&&d>0&&c>=0&&c<=d&&d<=p&&p<=10000&&Number.isInteger(days)&&days>=1&&Number.isInteger(stock)&&stock>=1&&Math.abs(p*100-Math.round(p*100))<1e-7&&Math.abs(d*100-Math.round(d*100))<1e-7)){
  notice('Verifica que costo ≤ reseller ≤ público, con 2 decimales como máximo, además de stock y duración.');return;
 }
 const flyer=fd.get('flyer');
 const hasFlyer=flyer instanceof Blob&&flyer.size>0;
 if(hasFlyer){
  try{
   if(!window.cc170Flyers?.inspectFile)throw Error('No se ha cargado el módulo de imágenes. Actualiza la página.');
   await window.cc170Flyers.inspectFile(flyer);
  }catch(e){notice('Flyer inválido: '+String(e.message||e));return;}
 }
 b.disabled=true;b.textContent='Publicando…';
 try{
  // Conservar la RPC V167 y el MISMO id comercial: no crear un producto por cada imagen.
  const productId=await api('rpc/cc_portal_publish_stream_product_v2','POST',{
   p_service:value('service'),p_title:value('title'),p_duration_days:days,p_price_pen:p,
   p_distributor_price_pen:d,p_cost_pen:c,p_stock:stock,p_whatsapp:value('whatsapp'),p_description:value('description')
  });
  if(!productId||typeof productId!=='string')throw Error('El servidor no confirmó el producto.');
  if(session()?.userId!==uid||session()?.jwt!==jwt)return;
  let flyerError='';
  if(hasFlyer){
   try{
    b.textContent='Subiendo flyer…';
    await window.cc170Flyers.upload({id:productId,seller_id:uid},flyer);
   }catch(e){flyerError=String(e?.message||e);}
  }
  if(session()?.userId!==uid||session()?.jwt!==jwt)return;
  await load();nav('publish');
  if(flyerError)notice('Servicio publicado. El flyer quedó pendiente: '+flyerError+'. Puedes añadirlo desde Mis servicios, sin publicar de nuevo.');
  else notice(hasFlyer?'Servicio y flyer publicados en el catálogo público.':'Servicio publicado. Puedes agregarle un flyer cuando quieras.');
  window.cc169RefreshCatalog?.();
 }catch(e){if(session()?.userId===uid)notice('No se pudo publicar: '+String(e.message||e));}
 finally{b.disabled=false;if(b.isConnected)b.textContent='Publicar servicio';}
}
function trialDate(value){
 if(!value)return '—';
 try{return new Date(value).toLocaleDateString('es-PE',
   {timeZone:'America/Lima',year:'numeric',month:'short',day:'numeric'});}
 catch(_){return '—';}
}
function roleLabel(role){
 return ({ADMIN:'ADMIN',AFFILIATE:'AFILIADO',RESELLER:'RESELLER',
  SUPER_RESELLER:'SÚPER RESELLER'})[role]||'AFILIADO';
}
function accessLabel(item){
 if(item.is_admin)return 'Acceso administrativo';
 if(item.access_until&&Date.parse(item.access_until)>Date.now())
  return 'Membresía activa hasta '+trialDate(item.access_until);
 return 'Membresía pendiente o vencida';
}
async function loadAdminAccounts(force=false){
 if(!data.admin||!user||!session()?.jwt)return;
 if(adminAccountsState==='loading'||(adminAccountsState==='ready'&&!force))return;
 adminAccountsState='loading';adminAccountsError='';
 const uid=user,jwt=token;
 try{
  const result=await api('rpc/cc_portal_admin_accounts_v2','POST',{});
  if(user!==uid||token!==jwt||session()?.jwt!==jwt)return;
  if(!Array.isArray(result))throw Error('Respuesta de usuarios inválida');
  adminAccounts=result;
  adminAccountsState='ready';
 }catch(e){
  if(user!==uid||token!==jwt||session()?.jwt!==jwt)return;
  adminAccountsState='error';
  adminAccountsError=String(e?.message||e);
 }finally{
  if(user===uid&&session()?.jwt===jwt&&['home','attention','admin','approvals'].includes(view))render();
 }
}
async function adminSetSuper(person,enable,percent,btn){
 if(!data.admin||adminActionBusy||person.is_admin||!verified)return;
 const commission=Number(percent);
 if(!Number.isFinite(commission)||commission<0||commission>100||
    Math.abs(commission*100-Math.round(commission*100))>0.00001){
  notice('La comisión debe estar entre 0 y 100, máximo dos decimales.');return;
 }
 const name=person.registry_alias||person.display_name||person.email;
 const live=person.access_until&&Date.parse(person.access_until)>Date.now();
 const text=enable?
  '¿Autorizar a '+name+' como Súper reseller de STREAM BULL’S? La autorización no cobra ni activa una suscripción.':
  '¿Revocar el permiso Súper reseller de '+name+'? Conservará sus pagos y su cuenta.';
 if(!window.confirm(text))return;
 adminActionBusy=true;btn.disabled=true;
 try{
  let success=false;
  if(live){
   const result=await api('rpc/cc_portal_admin_set_super_reseller','POST',{
    p_email:person.email,p_enabled:enable,p_admin_percent:commission
   });
   success=!!result?.updated;
  }else{
   const result=await api('rpc/cc_portal_admin_assign_stream_role','POST',{
    p_email:person.email,p_role:enable?'SUPER_RESELLER':'RESELLER',
    p_admin_percent:commission
   });
   success=!!result?.assigned;
  }
  if(!success)throw Error('El servidor no confirmó el cambio');
  adminAccountsState='idle';
  await loadAdminAccounts(true);
  if(session()?.userId===user&&view==='approvals')
   notice((enable?'Autorización registrada para ':'Permiso revocado a ')+name+
    '. No se han modificado pagos ni saldos.');
 }catch(e){notice('No se aplicó el permiso: '+String(e?.message||e));}
 finally{adminActionBusy=false;btn.disabled=false;}
}
async function adminRenameAlias(person,next,btn){
 if(!data.admin||adminActionBusy)return;
 const alias=String(next||'').trim();
 if(alias.length<2||alias.length>80){notice('El nombre de registro debe tener de 2 a 80 caracteres.');return;}
 if(!Number.isInteger(Number(person.registry_no))){notice('Número CLAN no verificado.');return;}
 if(alias===person.registry_alias)return;
 if(!confirm('¿Renombrar '+person.registry_code+' a '+alias+'? No se modificará su correo ni acceso.'))return;
 adminActionBusy=true;btn.disabled=true;
 try{
  const ok=await api('rpc/cc_portal_admin_set_registry_alias','POST',{
   p_registry_no:Number(person.registry_no),p_alias:alias
  });
  if(ok!==true)throw Error('No se confirmó el cambio');
  await loadAdminAccounts(true);
  if(view==='admin')notice('Nombre actualizado; el número '+person.registry_code+' se conserva.');
 }catch(e){notice('No se guardó el nombre: '+String(e?.message||e));}
 finally{adminActionBusy=false;btn.disabled=false;}
}
function adminAccountRow(person){
 const wrap=make('article','cc171-person cc176-user-row');
 const identity=make('div','cc171-person-id');
 const icon=make('span','cc171-avatar',
   String(person.registry_alias||person.display_name||person.email||'?').trim().charAt(0).toUpperCase());
 const info=make('div','cc171-identity');
 info.append(make('span','cc174-registry-id',person.registry_code||'Sin número'));
 info.append(make('strong','',person.registry_alias||person.display_name||person.email));
 info.append(make('small','',person.email+' · Alta '+safeDate(person.registered_at)));
 identity.append(icon,info);wrap.append(identity);
 const state=make('div','cc171-person-role');
 state.append(make('strong','cc171-role-label',roleLabel(person.role_assigned)));
 state.append(make('small',person.access_until&&Date.parse(person.access_until)>Date.now()?
  'cc171-status-active':'cc171-status-pending',accessLabel(person)));
 wrap.append(state);
 const actions=make('div','cc171-person-actions');
 const rename=make('details','cc171-inline-details cc174-rename');
 rename.append(make('summary','','Editar identificación'));
 const tools=make('div','cc171-edit');
 const input=document.createElement('input');input.type='text';input.maxLength=80;
 input.value=person.registry_alias||person.display_name||'';
 input.setAttribute('aria-label','Nombre del '+(person.registry_code||person.email));
 const save=button('Guardar nombre',()=>void adminRenameAlias(person,input.value,save),'cc166-secondary cc171-small');
 tools.append(input,save);rename.append(tools);actions.append(rename);
 if(person.is_admin)actions.append(make('span','cc171-admin-protected','ADMIN protegido'));
 else actions.append(button('Permisos Súper reseller',()=>nav('approvals'),'cc166-secondary cc171-small'));
 wrap.append(actions);return wrap;
}
function adminApprovals(page){
 if(!data.admin)return overview(page);
 if(adminAccountsState==='idle')void loadAdminAccounts();
 title(page,'Autorizaciones · Súper reseller',
  'ADMIN concede o revoca permisos de publicación en STREAM BULL’S. Reseller se activa automáticamente al pagar su membresía anual.');
 const guide=make('section','cc176-approval-intro');
 guide.append(make('strong','','Regla comercial'));
 guide.append(make('p','','Una autorización es distinta al pago: el usuario autorizado debe mantener su membresía anual de STREAM BULL’S vigente para publicar. Aquí no se cobran membresías ni se activa a los resellers.'));
 page.append(guide);
 const box=card('Cuentas y permisos','Solo usuarios registrados. Esta pantalla no muestra solicitudes formales no enviadas por los usuarios.');
 if(adminAccountsState==='loading'||adminAccountsState==='idle')
  box.append(make('p','cc166-note','Verificando autorizaciones…'));
 else if(adminAccountsState==='error'){
  box.append(make('p','cc166-notice','No se pudieron consultar los permisos: '+adminAccountsError));
  box.append(button('Reintentar',()=>void loadAdminAccounts(true),'cc166-secondary'));
 }else{
  const users=adminAccounts.filter(a=>!a.is_admin);
  if(!users.length)box.append(make('p','cc166-empty','No hay usuarios para autorizar.'));
  for(const person of users){
   const approved=!!person.super_enabled&&person.role_assigned==='SUPER_RESELLER';
   const live=person.access_until&&Date.parse(person.access_until)>Date.now();
   const row=make('article','cc176-approval-row');
   const identity=make('div','');
   identity.append(make('strong','',person.registry_code+' · '+(person.registry_alias||person.display_name||person.email)));
   identity.append(make('small','',person.email));
   identity.append(make('span',approved?'cc176-status-approved':'cc176-status-pending',
      approved?(live?'Autorizado · Membresía vigente':'Autorizado · Debe activar membresía anual'):
      'Sin permiso Súper reseller'));
   row.append(identity);
   const controls=make('div','cc176-approval-controls');
   const rate=document.createElement('input');rate.type='number';rate.min='0';rate.max='100';
   rate.step='0.01';rate.value='20';rate.setAttribute('aria-label','Porcentaje ADMIN para '+person.email);
   const label=make('label','','Comisión ADMIN (%)');label.append(rate);controls.append(label);
   const btn=button(approved?'Revocar permiso':'Autorizar Súper reseller',function(){
    void adminSetSuper(person,!approved,rate.value,this);
   },approved?'cc166-secondary':'cc166-primary');
   controls.append(btn);row.append(controls);box.append(row);
  }
 }
 page.append(box);
 page.append(make('p','cc166-note','Los roles, vigencias y permisos se verifican en el servidor. Ninguna cuenta recibe acceso por cambiar su nombre CLAN.'));
}

function admin(page){
 if(!data.admin)return overview(page);
 title(page,'Directorio de usuarios','Registro CLAN permanente, contacto, rol y vigencia. Las autorizaciones especiales tienen una sección propia.');
 if(adminAccountsState==='idle')void loadAdminAccounts();
 const summary=make('div','cc171-top-summary');
 if(adminAccountsState==='ready'){
  const active=adminAccounts.filter(a=>a.is_admin||
   a.access_until&&Date.parse(a.access_until)>Date.now()).length;
  const pending=adminAccounts.filter(a=>!a.is_admin&&
    !(a.access_until&&Date.parse(a.access_until)>Date.now())).length;
  summary.append(metric('Usuarios registrados',String(adminAccounts.length),'blue'),
    metric('Accesos vigentes',String(active),'aqua'),
    metric('Pendientes',String(pending),'gold'));
 }else{
  summary.append(metric('Usuarios','Consultando…','blue'));
 }
 page.append(summary);
 const box=card('Cuentas registradas','Los números CLAN se conservan. Cambiar el nombre no modifica permisos, suscripciones ni saldos.');
 if(adminAccountsState==='loading'){
  box.append(make('p','cc166-note','Consultando usuarios y membresías…'));
 }else if(adminAccountsState==='error'){
  box.append(make('p','cc166-notice','No se pudieron verificar los usuarios: '+adminAccountsError));
  box.append(button('Reintentar',()=>void loadAdminAccounts(true),'cc166-secondary'));
 }else if(adminAccountsState==='ready'){
  const heading=make('div','cc171-filter');
  const input=document.createElement('input');
  input.type='search';input.placeholder='Buscar CLAN, usuario o correo…';
  input.setAttribute('aria-label','Buscar cuenta');
  heading.append(input,button('↻ Actualizar',()=>void loadAdminAccounts(true),'cc166-secondary'));
  box.append(heading);
  const rows=make('div','cc171-users');
  if(!adminAccounts.length)rows.append(make('p','cc166-empty','No hay cuentas disponibles.'));
  for(const person of adminAccounts){
   const row=adminAccountRow(person);
   row.dataset.search=(person.email+' '+(person.display_name||'')+' '+(person.registry_code||'')+' '+(person.registry_alias||'')).toLowerCase();
   rows.append(row);
  }
  input.addEventListener('input',()=>{
   const term=input.value.trim().toLowerCase();
   rows.querySelectorAll('.cc171-person').forEach(row=>{
    row.hidden=!row.dataset.search.includes(term);
   });
  });
  box.append(rows);
 }
 page.append(box);
 const help=make('p','cc171-help');
 help.textContent='Los afiliados compran a precio público; el reseller obtiene precio distribuidor tras pagar su membresía anual de STREAM BULL’S. Únicamente ADMIN puede autorizar el permiso Súper reseller.';
 page.append(help);

}

function profile(page){
 title(page,'Mi perfil · datos personales','Un registro central para tus cuatro negocios. Los datos se pueden actualizar desde aquí.');
 const form=make('form','cc166-form cc169-profile-form');
 form.id='cc169-profile-form';
 const record=data.profile||{};
 const fields=[
  ['full_name','Nombre completo',record.full_name||session()?.displayName||'','text',120],
  ['phone','WhatsApp (+código del país)',record.phone_e164||'','tel',20],
  ['region','Región / Departamento',record.region||'','text',80],
  ['province','Provincia',record.province||'','text',80],
  ['district','Distrito',record.district||'','text',80]
 ];
 for(const [key,caption,value,type,max] of fields){
  const label=make('label','',caption),input=document.createElement('input');
  input.name=key;input.value=value;input.type=type;input.maxLength=max;
  if(key==='full_name')input.required=true;
  if(key==='phone'){input.placeholder='+51912345678';input.autocomplete='tel';}
  if(key==='full_name')input.autocomplete='name';
  label.append(input);form.append(label);
 }
 const mailLabel=make('label','','Correo de acceso · solo lectura'),mailInput=document.createElement('input');
 mailInput.type='email';mailInput.value=profileEmail||'Consultando correo…';
 mailInput.readOnly=true;mailInput.autocomplete='off';mailLabel.append(mailInput);form.append(mailLabel);
 const note=make('p','cc166-note','Estos datos pertenecen a tu cuenta CLAN CARTAN, no a un negocio. El DNI/documento, las condiciones aceptadas y el correo de acceso no se cambian desde aquí.');
 note.classList.add('cc169-profile-note');form.append(note);
 const submit=make('button','cc166-primary','Guardar cambios');submit.type='submit';
 form.append(submit);
 form.addEventListener('submit',e=>{e.preventDefault();void saveProfile(new FormData(form),submit);});
 page.append(form);
 if(!profileEmail&&profileEmailOwner!==user&&!profileEmailLoading)void loadEmail();
}
async function loadEmail(){
 const s=session();if(!s?.jwt||!s.userId||profileEmailLoading)return;
 const uid=s.userId,jwt=s.jwt;profileEmailLoading=true;
 try{
  const r=await fetch(s.root+'/auth/v1/user',{headers:{apikey:s.key,Authorization:'Bearer '+s.jwt}});
  if(!r.ok)throw Error('Correo temporalmente no disponible');
  const auth=await r.json();
  if(auth?.id===uid&&session()?.jwt===jwt&&user===uid){
   profileEmail=String(auth.email||'');
   profileEmailOwner=uid;
   if(view==='profile')render();
  }
 }catch(_){if(user===uid){profileEmail='Correo no disponible';profileEmailOwner=uid;if(view==='profile')render();}}
 finally{profileEmailLoading=false;}
}
async function saveProfile(form,buttonEl){
 const uid=user,jwt=token;
 if(!verified||!uid||!jwt){notice('Inicia sesión y actualiza tus datos antes de guardar.');return;}
 const value=k=>String(form.get(k)||'').trim();
 const fullName=value('full_name'),phone=value('phone').replace(/[\s\-()]/g,'');
 const fields=['region','province','district'];
 if(fullName.length<2||fullName.length>120||phone&&!/^\+[1-9][0-9]{7,14}$/.test(phone)
   ||fields.some(k=>value(k).length>80)){
  notice('Corrige el nombre y escribe el WhatsApp internacional, por ejemplo +51912345678.');return;
 }
 buttonEl.disabled=true;buttonEl.textContent='Guardando…';
 try{
  const saved=await api('rpc/cc_portal_save_my_profile','POST',{
   p_full_name:fullName,p_phone_e164:phone,p_region:value('region'),
   p_province:value('province'),p_district:value('district')
  });
  if(user!==uid||session()?.jwt!==jwt)return;
  if(!saved?.saved)throw Error('No se confirmó la actualización');
  await load();
  if(user!==uid||session()?.jwt!==jwt)return;
  if(session()){session().displayName=fullName;}
  if(typeof window.cc95RenderUser==='function')window.cc95RenderUser();
  view='profile';render();notice('Perfil actualizado. Los cuatro negocios utilizarán estos datos de la misma cuenta.');
 }catch(e){
  if(user===uid){buttonEl.disabled=false;buttonEl.textContent='Guardar cambios';notice('No se guardaron los cambios: '+String(e?.message||e));}
 }
}

function other(page){
 const labels={
 orders:['Pedidos y renovaciones','Los detalles completos están disponibles dentro del negocio de origen.'],
 affiliate:['Afiliados CLAN','Tus códigos y referidos originales continúan disponibles en el portal.'],
 external:['Control externo','S/ 10 por 30 días. Activación con débito auditado todavía no habilitada.'],
 support:['Soporte','Gestiona incidencias desde el negocio correspondiente.'],
 profile:['Mi perfil','Los datos personales siguen en la cuenta original, sin duplicarlos aquí.']
 };
 const [heading,sub]=labels[view]||['Mi panel',''];title(page,heading,sub);
 const box=card('Herramientas actuales','Elige el negocio correspondiente o regresa a tu cuenta para continuar.');
 box.append(button('Ver negocios',()=>nav('businesses'),'cc166-primary'));
 box.append(button('Volver al portal original',()=>{app.hidden=true;},'cc166-secondary'));page.append(box);
}
function render(){
 if(!app||!user)return;
 mountLauncher();renderNav();const page=el('cc166-content');page.replaceChildren();
 // Cuatro negocios, un selector: visible únicamente al gestionar negocios.
 if(view==='businesses'||view.startsWith('business:'))businessTabs(page);
 if(view.startsWith('business:')){businessPage(page,view.slice('business:'.length));return;}
 switch(view){
 case 'home':overview(page);break;
 case 'attention':data.admin?adminAttention(page):overview(page);break;
 case 'approvals':data.admin?adminApprovals(page):overview(page);break;
 case 'bonuses':data.admin?adminBonuses(page):overview(page);break;
 case 'shop':shop(page);break;
 case 'wallet':wallet(page);break;
 case 'businesses':memberships(page);break;
 case 'movements':movements(page);break;
 case 'orders':orders(page);break;
 case 'publish':data.super&&!data.admin?publish(page):overview(page);break;
 case 'sales':sales(page);break;
 case 'admin':admin(page);break;
 case 'profile':profile(page);break;
 default:other(page);
 }
}
async function read(path,required=false){try{const r=await api(path);if(!Array.isArray(r))throw Error('Respuesta inválida');return r;}catch(e){if(required)throw e;return[];}}
async function readOrders(){const rows=await api('rpc/cc_portal_my_stream_orders','POST',{p_limit:100});if(!Array.isArray(rows))throw Error('Pedidos no disponibles');return rows;}
async function readMoves(){try{const r=await api('rpc/cc_my_real_wallet_movements','POST',{p_service:null,p_limit:120});return Array.isArray(r)?r:[];}catch(_){return[];}}
async function readOwnPriceDetails(){try{const r=await api('rpc/cc_portal_my_stream_prices','POST',{});return Array.isArray(r)?r:[];}catch(_){return[];}}
async function load(){
 if(!user||busy||!window.cc80?.api)return;
 busy=true;const id=user,jwt=token,n=++serial;const idp=enc(id);
 try{
  const [admins,members,subs,businesses,real,bonus,ma,mc,cy,moves,superRoles,products,priceDetails,shopOrders,plans,details]=await Promise.all([
   read('cc_admins?select=user_id&user_id=eq.'+idp+'&limit=1',true),
   read('cc_memberships?select=id,role,status,business_id&user_id=eq.'+idp,true),
   read('cc_subscriptions?select=membership_id,status,start_at,end_at&order=end_at.desc&limit=150',true),
   read('cc_businesses?select=id,code,display_name',true),
   read('cc_real_service_wallets?select=service,balance_pen&user_id=eq.'+idp,true),
   read('cc_cobra_welcome_bonus_wallets?select=balance_pen&user_id=eq.'+idp+'&limit=1'),
   read('ma_accounts?select=subscription_until,suspended,bonus_pen&user_id=eq.'+idp+'&limit=1'),
   read('mc_accounts?select=subscription_until,suspended,bonus_pen&user_id=eq.'+idp+'&limit=1'),
   read('cc_cobra_real_access_periods?select=status,period_end&user_id=eq.'+idp+'&order=period_end.desc&limit=20'),
   readMoves(),
   read('cc_portal_super_resellers?select=enabled,user_id,admin_percent&user_id=eq.'+idp+'&limit=1'),
   read('cc_portal_stream_products?select=id,seller_id,service,title,description,duration_days,price_pen,stock,status,flyer_path&order=created_at.desc&limit=100',true),
   readOwnPriceDetails(),
   readOrders(),
   read('cc_plans?select=business_id,code,price_pen,is_active&code=eq.STREAM_365&is_active=eq.true'),
   read('cc_user_details?select=full_name,phone_e164,region,province,district&user_id=eq.'+idp+'&limit=1')
  ]);
  if(!active(id,jwt,n))return;
  const hasSub=m=>subs.some(sub=>sub.membership_id===m.id&&sub.status==='ACTIVE'&&
   Date.parse(sub.start_at||0)<=Date.now()&&Date.parse(sub.end_at)>Date.now());
  const streamId=businesses.find(x=>x.code==='STREAM_BULLS')?.id;
  const activeStream=members.some(m=>m.business_id===streamId&&m.status==='ACTIVE'&&
    m.role==='SUPER_RESELLER'&&hasSub(m));
  const currentRoleReseller=members.some(m=>m.status==='ACTIVE'&&
     (m.role==='RESELLER'||m.role==='SUPER_RESELLER')&&hasSub(m))||
    (mc[0]?.subscription_until&&!mc[0]?.suspended&&Date.parse(mc[0].subscription_until)>Date.now())||
    (ma[0]?.subscription_until&&!ma[0]?.suspended&&Date.parse(ma[0].subscription_until)>Date.now())||
    cy.some(x=>x.status==='ACTIVE'&&Date.parse(x.period_end)>Date.now());
  data={
   admin:admins.some(x=>x.user_id===id),
   super:!!superRoles[0]?.enabled&&activeStream,
   superPermission:!!superRoles[0]?.enabled,
   reseller:!!currentRoleReseller,
   members,subs,businesses,real,
   mc:mc[0]||null,ma:ma[0]||null,cy,moves,products,priceDetails,orders:shopOrders,
   requests:data.requests,
   plan:plans.find(p=>p.business_id===streamId)||null,
   profile:details[0]||null,
   bonuses:[
    {label:'Bono COBRA YA',amount:Number(bonus[0]?.balance_pen||0)},
    {label:'Bono MI COCHERA',amount:Number(mc[0]?.bonus_pen||0)},
    {label:'Bono MI ALQUILER',amount:Number(ma[0]?.bonus_pen||0)}
   ].filter(x=>Number.isFinite(x.amount)&&x.amount>0)
  };
  verified=true;
  if(data.profile?.full_name&&session()?.userId===id){session().displayName=data.profile.full_name;window.cc95RenderUser?.();}
  render();
 }catch(e){if(active(id,jwt,n)){verified=false;render();notice('No fue posible verificar los datos reales. Compras y activaciones permanecerán bloqueadas hasta actualizar.');}}
 finally{if(user===id&&token===jwt)busy=false;}
}
function sync(){
 const s=session();
 if(!s?.jwt||!s.userId){if(app||user)reset();return;}
 if(s.userId===user){
  if(s.jwt===token){
   if(!verified&&!busy&&window.cc80?.api)void load();
   return;
  }
  // La sesión de Supabase rota el JWT periódicamente. Preservar pestaña,
  // perfil y estado del panel cuando se trata del MISMO titular.
  // Invalidar solo solicitudes antiguas; ninguna compra queda autorizada
  // hasta volver a verificar sus permisos y saldo.
  token=s.jwt;serial++;busy=false;verified=false;
  render();void load();return;
 }
 const sameUser=s.userId===user,previouslyHidden=app?.hidden===true;
 reset();user=s.userId;token=s.jwt;shell();app.hidden=!!(sameUser&&previouslyHidden);
 render();void load();
}
function init(){
 sync();let queued=false;
 new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;sync();});})
 .observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','hidden']});
 document.addEventListener('click',e=>{if(e.target.closest?.('#cc54logout'))reset();},true);
 window.addEventListener('focus',()=>{sync();if(user&&!busy)void load();});
 window.cc166OpenPanel=()=>{sync();if(app){app.hidden=false;render();}};
 window.cc166OpenStreamMembership=()=>{
  sync();
  if(!session()?.jwt||!app){window.cc77Auth?.(false);return;}
  app.hidden=false;
  view='business:STREAM_BULLS';
  render();
 };
 window.cc166RefreshPanel=()=>load();
 window.cc166PurchaseProductFromCatalog=(id,btn,price)=>purchaseFromPublicCatalog(id,btn,price);
 window.cc166OpenProfile=()=>{
  sync();
  if(!session()?.jwt||!app){window.cc77Auth?.(false);return;}
  app.hidden=false;view='profile';render();
 };

}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();