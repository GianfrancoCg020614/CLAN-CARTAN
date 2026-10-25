/* CLAN CARTAN · V166 · Panel unificado para ADMIN / RESELLER / SUPER_RESELLER.
   Control real: se consulta Supabase con RLS, nunca se inventan saldos ni membresías.
   Los paneles antiguos siguen intactos. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const api=(p,m,b)=>window.cc80.api(p,m,b);
const serviceName=k=>({STREAM_BULLS:"STREAM BULL'S",COBRA_YA:'COBRA YA',MI_COCHERA:'MI COCHERA',MI_ALQUILER:'MI ALQUILER'})[k]||k;
const services=[['STREAM_BULLS','◈'],['COBRA_YA','◎'],['MI_COCHERA','▣'],['MI_ALQUILER','⌂']];
let user=null,token=null,serial=0,app=null,view='home',busy=false,verified=false;
let profileEmail='',profileEmailOwner=null,profileEmailLoading=false;
let adminAccounts=[],adminAccountsState='idle',adminAccountsError='',adminActionBusy=false;
let data={admin:false,super:false,superPermission:false,reseller:false,members:[],subs:[],businesses:[],real:[],bonuses:[],cy:[],mc:null,ma:null,moves:[],products:[],orders:[],requests:[],plan:null,profile:null};
let lastReceipt=null,purchasePending=false,membershipPending=false;
const price=n=>Number.isFinite(Number(n))?'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const make=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x;};
const button=(txt,fn,cls)=>{const x=make('button',cls||'',txt);x.type='button';x.addEventListener('click',fn);return x;};
const enc=s=>encodeURIComponent(s);
const session=()=>window.CC_V53_SESSION;
const active=(id,jwt,seq)=>user===id&&token===jwt&&serial===seq&&session()?.userId===id&&session()?.jwt===jwt;
function reset(){
 serial++;user=null;token=null;busy=false;verified=false;view='home';
 data={admin:false,super:false,superPermission:false,reseller:false,members:[],subs:[],businesses:[],real:[],bonuses:[],cy:[],mc:null,ma:null,moves:[],products:[],orders:[],requests:[],plan:null,profile:null};lastReceipt=null;purchasePending=false;membershipPending=false;
 app?.remove();app=null;el('cc166-open-button')?.remove();
 profileEmail='';profileEmailOwner=null;profileEmailLoading=false;
 adminAccounts=[];adminAccountsState='idle';adminAccountsError='';adminActionBusy=false;
}
function shell(){
 if(app?.isConnected)return app;
 app=make('section','cc166-app');app.id='cc166-panel';app.hidden=true;
 app.setAttribute('aria-label','Panel CLAN CARTAN');
 app.innerHTML='<aside class="cc166-sidebar"><div class="cc166-brand">◈ <span>CLAN CARTAN<small>Panel de control</small></span></div><nav id="cc166-nav" aria-label="Navegación del panel"></nav><div id="cc166-aside-foot"></div></aside><div class="cc166-workspace"><header class="cc166-top"><div><small>CUATRO NEGOCIOS · UNA CUENTA</small><h1>Mi panel CLAN CARTAN</h1><p id="cc166-role"></p></div><div id="cc166-top-actions"></div></header><main id="cc166-content"></main></div>';
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
function nav(to){if(to==='shop'){openCatalog();return;}view=to;render();}
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
 const base=[['home','◫','Inicio'],['shop','▣','Comprar'],['wallet','▤','Billetera'],['movements','≡','Movimientos'],['orders','◱','Mis compras']];
 const extra=[['businesses','▦','Negocios'],['affiliate','♧','Referidos'],['external','⇄','Control externo']];
 const items=base.concat(data.reseller||data.super||data.admin?extra:[])
  .concat(data.super||data.admin?[['publish','♛','Publicar'],['sales','◈','Mis ventas']]:[])
  .concat(data.admin?[['admin','⚙','Usuarios y roles']]:[])
  .concat([['profile','♙','Mi perfil']]);
 for(const [id,icon,labelText] of items){
  const selected=view===id||(id==='businesses'&&view.startsWith('business:'));
  const b=button('',()=>nav(id),'cc166-navitem'+(selected?' selected':''));
  b.append(make('span','',icon),make('span','',labelText));menu.append(b);
 }
 const aside=el('cc166-aside-foot');aside.replaceChildren();
 aside.append(button('← Volver al portal',()=>{app.hidden=true;},'cc166-back'));
 const role=el('cc166-role');
 role.textContent=userRole()+' · '+(verified?'Permisos y saldos verificados':'Comprobando tu cuenta…');
 const heading=app.querySelector('.cc166-top h1');
 if(heading)heading.textContent='CLAN CARTAN · '+userRole();
 const top=el('cc166-top-actions');top.replaceChildren();
 top.append(button('↻ Actualizar',()=>load(),'cc166-secondary'));
 top.append(button('✕',()=>{app.hidden=true;},'cc166-x'));
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
function overview(page){
 title(page,userRole()==='AFILIADO'?'Bienvenido · Compra tus servicios':'Tu actividad general','Una plataforma, cuatro negocios y un solo panel según tu membresía.');
 const real=data.real.reduce((n,r)=>n+Number(r.balance_pen||0),0);
 const hero=make('section','cc167-hero');
 hero.append(make('h2','',userRole()==='AFILIADO'?'Tu billetera y catálogo':'Resumen de CLAN CARTAN'));
 hero.append(make('p','',userRole()==='AFILIADO'?
  'Recarga tu saldo real y compra servicios digitales a precios públicos. Después de pagar podrás notificar al vendedor por WhatsApp.':
  'Selecciona arriba el negocio que deseas administrar. Solo se habilitan los controles correspondientes a tu rol y membresía.'));
 const buttons=make('div','cc167-actions');
 buttons.append(button('Comprar servicios',()=>nav('shop'),'cc166-primary'));
 buttons.append(button('Recargar saldo',openRecharge,'cc166-secondary'));hero.append(buttons);page.append(hero);
 const stats=make('div','cc166-stats');
 stats.append(metric('Saldo real disponible',verified?price(real):'—','aqua'));
 stats.append(metric('Mis compras',String(data.orders.filter(o=>o.buyer_id===user).length),'blue'));
 if(data.admin||data.super||data.reseller){
  stats.append(metric('Negocios activos',services.filter(b=>access(b[0]).ok).length+' / 4','gold'));
  stats.append(metric('Movimientos consultados',String(data.moves.length),'purple'));
 }
 page.append(stats);
 if(data.admin||data.super||data.reseller){
  const next=card('Mi actividad','El negocio se abre desde las pestañas superiores; la contabilidad se consulta desde Billetera.');
  const buttons2=make('div','cc166-actions');
  buttons2.append(button('Ver mis negocios',()=>nav('businesses'),'cc166-primary'));
  if(data.super||data.admin)buttons2.append(button('Publicar servicio',()=>nav('publish'),'cc166-secondary'));
  next.append(buttons2);page.append(next);
 }
 const wallet=card('Últimos movimientos','Cada cargo indica el producto, activación, recarga o renovación.');
 movementList(wallet,5);page.append(wallet);
}

function openRecharge(){exitTo(()=>{if(typeof window.cc116OpenRecharge==='function')window.cc116OpenRecharge();else window.cc80?.open();});}
function wallet(page){
 title(page,'Billetera digital única','Un saldo total real para compras y membresías, con trazabilidad de cada servicio.');
 const real=data.real.reduce((n,r)=>n+Number(r.balance_pen||0),0);
 const box=make('section','cc167-hero');
 box.append(make('h2','','Saldo REAL disponible'));
 box.append(make('strong','cc167-balance',verified?price(real):'Consultando…'));
 box.append(make('p','','Una compra puede descontar varias subbilleteras en una sola operación atómica, sin usar bonos.'));
 const actions=make('div','cc167-actions');
 actions.append(button('Recargar',openRecharge,'cc166-primary'),
 button('Ver movimientos',()=>nav('movements'),'cc166-secondary'));box.append(actions);page.append(box);
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
  actions.append(button('Comprar servicios',()=>nav('shop'),'cc166-primary'));
  if(info.ok){
   if(data.super||data.admin)actions.append(button('Mis publicaciones',()=>nav('publish'),'cc166-secondary'));
   else actions.append(button('Mi catálogo',()=>nav('shop'),'cc166-secondary'));
  }else{
   const cost=Number(data.plan?.price_pen||25);
   shell.append(metric('Membresía anual · 365 días',price(cost),'gold'));
   actions.append(button('Activar por '+price(cost),()=>void buyStreamMembership(cost),'cc166-primary'));
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
  const rows=await read('cc_portal_stream_products?select=id,seller_id,service,title,price_pen,stock,status&id=eq.'+
   encodeURIComponent(productId)+'&limit=1',true);
  const item=rows[0];
  if(!item||item.status!=='ACTIVE'||Number(item.stock)<1){
   window.alert('Este producto ya no está disponible. Actualiza el catálogo.');return;
  }
  if(Number(item.price_pen)!==Number(displayedPrice)){
   window.alert('El precio fue actualizado. Actualiza el catálogo antes de confirmar.');return;
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
 if(!window.confirm('¿Confirmas que entregaste el producto al comprador? Esta acción no transfiere ni libera dinero.'))return;
 try{
  const ok=await api('rpc/cc_portal_mark_stream_order_delivered','POST',{p_order_id:order.id});
  if(ok){await load();view='sales';render();notice('Entrega marcada como completada.');}
  else notice('El pedido ya había sido atendido o no tienes permiso.');
 }catch(e){notice('No se pudo cambiar el estado: '+String(e.message||e));}
}
function sales(page){
 if(!data.admin&&!data.super){nav('home');return;}
 title(page,'Ventas y entregas','Cada compra se guarda con comisión ADMIN y pago pendiente al vendedor; sin liquidaciones automáticas.');
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
  const b=button(o.status==='FULFILLED'?'Entregado':'Marcar entregado',()=>void markDelivered(o),'cc166-secondary');
  b.disabled=o.status!=='PAID_AWAITING_DELIVERY';
  line.append(b);page.append(line);
 }
}

function publish(page){
 if(!data.admin&&!data.super)return overview(page);
 title(page,'Publicar servicios · STREAM BULL’S','Publicaciones registradas por el servidor con autor y stock.');
 const box=card('Nuevo servicio','La membresía y el permiso se verifican antes de guardar.');
 const form=make('form','cc166-form');form.id='cc166-publish-form';
 const specs=[
 ['service','Plataforma','select'],['title','Nombre del producto','text'],
 ['days','Duración (días)','number'],['price','Precio al público (S/)','number'],
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
  row.append(make('span','',p.service+' · '+price(p.price_pen)+' · Stock '+p.stock+' · '+p.status));
  const actions=make('div','cc167-actions');
  actions.append(button('Actualizar stock',()=>void editProduct(p,'stock'),'cc166-secondary'));
  actions.append(button(p.status==='ACTIVE'?'Pausar':'Reactivar',()=>void editProduct(p,'status'),'cc166-secondary'));
  actions.append(button('WhatsApp',()=>void editProduct(p,'whatsapp'),'cc166-secondary'));
  row.append(actions);
  window.cc170Flyers?.decorateRow(row,p);
  list.append(row);
 }
 page.append(list);
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
 const value=k=>String(fd.get(k)||'').trim(),days=Number(value('days')),stock=Number(value('stock')),p=Number(value('price')),c=Number(value('cost'));
 if(!(p>0&&c>=0&&c<=p&&Number.isInteger(days)&&days>=1&&Number.isInteger(stock)&&stock>=1)){
  notice('Verifica precio, costo, stock y duración.');return;
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
  const productId=await api('rpc/cc_portal_publish_stream_product','POST',{
   p_service:value('service'),p_title:value('title'),p_duration_days:days,p_price_pen:p,
   p_cost_pen:c,p_stock:stock,p_whatsapp:value('whatsapp'),p_description:value('description')
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
 if(item.trial_active)return 'Prueba activa hasta '+trialDate(item.trial_until);
 if(item.access_until&&Date.parse(item.access_until)>Date.now())
  return 'Membresía activa hasta '+trialDate(item.access_until);
 if(item.trial_until)return 'Prueba utilizada · Sin acceso vigente';
 return 'Pendiente de membresía';
}
async function loadAdminAccounts(force=false){
 if(!data.admin||!user||!session()?.jwt)return;
 if(adminAccountsState==='loading'||(adminAccountsState==='ready'&&!force))return;
 adminAccountsState='loading';adminAccountsError='';
 const uid=user,jwt=token;
 try{
  const result=await api('rpc/cc_portal_admin_accounts','POST',{});
  if(user!==uid||token!==jwt||session()?.jwt!==jwt)return;
  if(!Array.isArray(result))throw Error('Respuesta de usuarios inválida');
  adminAccounts=result;
  adminAccountsState='ready';
 }catch(e){
  if(user!==uid||token!==jwt||session()?.jwt!==jwt)return;
  adminAccountsState='error';
  adminAccountsError=String(e?.message||e);
 }finally{
  if(user===uid&&session()?.jwt===jwt&&view==='admin')render();
 }
}
async function adminChangeRole(person,role,percent,btn){
 if(adminActionBusy||!data.admin||person.is_admin)return;
 if(!['AFFILIATE','RESELLER','SUPER_RESELLER'].includes(role))return;
 if(person.access_until&&Date.parse(person.access_until)>Date.now()){
  notice('Para modificar este rol, primero termina su acceso vigente o revisa su membresía.');
  return;
 }
 if(!confirm('¿Asignar '+roleLabel(role)+' a '+person.email+
   '? No se activará la membresía ni se cobrará dinero.'))return;
 adminActionBusy=true;btn.disabled=true;
 try{
  const out=await api('rpc/cc_portal_admin_assign_stream_role','POST',{
   p_email:person.email,p_role:role,p_admin_percent:percent
  });
  if(!out?.assigned)throw Error('No se confirmó el cambio');
  await loadAdminAccounts(true);
  if(view==='admin')notice('Rol actualizado: '+person.email+' → '+roleLabel(role)+
   '. La membresía sigue pendiente hasta su activación.');
 }catch(e){notice('No se cambió el rol: '+String(e?.message||e));}
 finally{adminActionBusy=false;btn.disabled=false;}
}
async function adminTrial(person,stop,btn){
 if(adminActionBusy||!data.admin||person.is_admin)return;
 const operation=stop?'finalizar':'activar';
 const explanation=stop?
  '¿Finalizar ahora la prueba de '+person.email+'? Se cerrará su acceso de prueba sin tocar la billetera.':
  '¿Activar una prueba GRATUITA de 7 días para '+person.email+
  '? No se cobrará dinero. El usuario tendrá permisos operativos durante la prueba; una publicación real puede aparecer en el catálogo y recibir compras reales.';
 if(!confirm(explanation))return;
 adminActionBusy=true;btn.disabled=true;
 const uid=user,jwt=token;
 try{
  const out=await api(stop?
   'rpc/cc_portal_admin_end_stream_trial':'rpc/cc_portal_admin_start_stream_trial',
   'POST',stop?{p_email:person.email}:{p_email:person.email,p_days:7});
  if(user!==uid||session()?.jwt!==jwt)return;
  if(stop?!out?.ended:!out?.activated)throw Error('La operación no se confirmó');
  await loadAdminAccounts(true);
  if(view==='admin')notice(stop?
   'Prueba finalizada sin cargos.':
   'Prueba activada para '+person.email+' hasta '+trialDate(out.ends_at)+
   '. Ya puede cerrar sesión e ingresar para probar su panel.');
 }catch(e){
  if(user===uid&&session()?.jwt===jwt)
   notice('No se pudo '+operation+' la prueba: '+String(e?.message||e));
 }finally{adminActionBusy=false;btn.disabled=false;}
}
function adminAccountRow(person){
 const wrap=make('article','cc171-person');
 const identity=make('div','cc171-person-id');
 const icon=make('span','cc171-avatar',
  String(person.display_name||person.email||'?').trim().charAt(0).toUpperCase());
 const info=make('div','cc171-identity');
 info.append(make('strong','',person.display_name||person.email));
 if(person.display_name)info.append(make('small','',person.email));
 identity.append(icon,info);wrap.append(identity);
 const type=make('div','cc171-person-role');
 type.append(make('strong','cc171-role-label',roleLabel(person.role_assigned)));
 const status=make('small',person.trial_active?'cc171-status-active':
   person.access_until&&Date.parse(person.access_until)>Date.now()?
   'cc171-status-active':'cc171-status-pending',accessLabel(person));
 type.append(status);wrap.append(type);
 if(person.is_admin){
  wrap.append(make('span','cc171-admin-protected','Cuenta protegida'));
  return wrap;
 }
 const area=make('div','cc171-person-actions');
 const active=person.access_until&&Date.parse(person.access_until)>Date.now();
 if(person.trial_active){
  area.append(button('Finalizar prueba',function(){void adminTrial(person,true,this)},
   'cc166-secondary cc171-small'));
 }else if(!active&&person.role_assigned!=='AFFILIATE'&&!person.trial_until){
  area.append(button('Probar 7 días · S/ 0',function(){void adminTrial(person,false,this)},
   'cc166-primary cc171-small'));
 }else if(active){
  area.append(make('span','cc171-state','Acceso habilitado'));
 }else if(person.trial_until){
  area.append(make('span','cc171-state','Prueba utilizada'));
 }
 const details=make('details','cc171-inline-details');
 const summary=make('summary','','Cambiar rol');
 details.append(summary);
 const controls=make('div','cc171-edit');
 const select=document.createElement('select');
 select.setAttribute('aria-label','Rol para '+person.email);
 for(const [role,name] of [['AFFILIATE','Afiliado'],['RESELLER','Reseller'],
     ['SUPER_RESELLER','Súper reseller']]){
  const option=make('option','',name);option.value=role;
  option.selected=person.role_assigned===role;select.append(option);
 }
 const percent=document.createElement('input');
 percent.type='number';percent.min='0';percent.max='100';percent.step='0.01';
 percent.value='20';percent.setAttribute('aria-label','Comisión ADMIN porcentual sobre ganancia');
 const save=button('Guardar rol',function(){
  void adminChangeRole(person,select.value,Number(percent.value),this);
 },'cc166-secondary cc171-small');
 save.disabled=!!active;
 controls.append(select,percent,save);
 details.append(make('small','cc171-field-hint',
  'Porcentaje de comisión ADMIN sobre la ganancia (solo SÚPER RESELLER).'));
 details.append(controls);
 if(active)details.append(make('small','cc171-field-hint',
  'No se cambia el rol mientras exista una membresía activa.'));
 area.append(details);
 wrap.append(area);
 return wrap;
}
function admin(page){
 if(!data.admin)return overview(page);
 title(page,'Usuarios y accesos','Administra tus cuentas directamente desde este panel, sin abrir pantallas complejas.');
 if(adminAccountsState==='idle')void loadAdminAccounts();
 const summary=make('div','cc171-top-summary');
 if(adminAccountsState==='ready'){
  const active=adminAccounts.filter(a=>a.trial_active||
   a.access_until&&Date.parse(a.access_until)>Date.now()).length;
  const pending=adminAccounts.filter(a=>!a.is_admin&&!a.trial_active&&
    !(a.access_until&&Date.parse(a.access_until)>Date.now())).length;
  summary.append(metric('Usuarios registrados',String(adminAccounts.length),'blue'),
    metric('Accesos vigentes',String(active),'aqua'),
    metric('Pendientes',String(pending),'gold'));
 }else{
  summary.append(metric('Usuarios','Consultando…','blue'));
 }
 page.append(summary);
 const box=card('Cuentas y permisos','Elige la cuenta y administra su rol o una prueba temporal sin cobro.');
 if(adminAccountsState==='loading'){
  box.append(make('p','cc166-note','Consultando usuarios y membresías…'));
 }else if(adminAccountsState==='error'){
  box.append(make('p','cc166-notice','No se pudieron verificar los usuarios: '+adminAccountsError));
  box.append(button('Reintentar',()=>void loadAdminAccounts(true),'cc166-secondary'));
 }else if(adminAccountsState==='ready'){
  const heading=make('div','cc171-filter');
  const input=document.createElement('input');
  input.type='search';input.placeholder='Buscar usuario o correo…';
  input.setAttribute('aria-label','Buscar cuenta');
  heading.append(input,button('↻ Actualizar',()=>void loadAdminAccounts(true),'cc166-secondary'));
  box.append(heading);
  const rows=make('div','cc171-users');
  if(!adminAccounts.length)rows.append(make('p','cc166-empty','No hay cuentas disponibles.'));
  for(const person of adminAccounts){
   const row=adminAccountRow(person);
   row.dataset.search=(person.email+' '+(person.display_name||'')).toLowerCase();
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
 help.textContent='La prueba dura hasta 7 días, se concede una sola vez y queda registrada. No acredita dinero ni genera un pago. Para usar los accesos, el usuario debe cerrar sesión y volver a ingresar.';
 page.append(help);
 const advanced=make('details','cc171-advanced');
 advanced.append(make('summary','','Herramientas avanzadas · abrir solo cuando las necesites'));
 const actions=make('div','cc166-actions');
 const oldRequests=make('div','cc171-requests');
 async function consultRequests(){
  if(!data.admin)return;
  oldRequests.replaceChildren(make('p','cc166-note','Consultando solicitudes…'));
  try{
   const rows=await api('rpc/cc_admin_reseller_requests','POST',{});
   if(!Array.isArray(rows))throw Error('Respuesta no válida');
   data.requests=rows;
   oldRequests.replaceChildren();
   if(!rows.length)oldRequests.append(make('p','cc166-note','No hay solicitudes pendientes.'));
   for(const item of rows.slice(0,50)){
    const line=make('div','cc171-request-line');
    line.append(make('strong','',item.applicant_email||'Solicitante'));
    line.append(make('small','',item.membership_status||'Estado pendiente'));
    oldRequests.append(line);
   }
  }catch(e){
   oldRequests.replaceChildren(make('p','cc166-notice',
    'No se pudieron consultar las solicitudes: '+String(e?.message||e)));
  }
 }
 actions.append(
  button('Ver solicitudes',()=>void consultRequests(),'cc166-secondary'),
  button('Revisar recargas',()=>exitTo(()=>{window.cc80?.open();el('cc136admin')?.querySelector('summary')?.click();}),'cc166-secondary'),
  button('Auditoría de movimientos',()=>exitTo(()=>{window.cc80?.open();el('cc143report')?.querySelector('summary')?.click();}),'cc166-secondary'),
  button('Administración anterior',()=>exitTo(()=>el('cc92-admin-button')?.click()),'cc166-secondary')
 );
 advanced.append(actions,oldRequests);
 page.append(advanced);
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
 // Cuatro pestañas globales, nunca cuatro paneles generales ni datos repetidos.
 businessTabs(page);
 if(view.startsWith('business:')){businessPage(page,view.slice('business:'.length));return;}
 switch(view){
 case 'home':overview(page);break;
 case 'shop':shop(page);break;
 case 'wallet':wallet(page);break;
 case 'businesses':memberships(page);break;
 case 'movements':movements(page);break;
 case 'orders':orders(page);break;
 case 'publish':publish(page);break;
 case 'sales':sales(page);break;
 case 'admin':admin(page);break;
 case 'profile':profile(page);break;
 default:other(page);
 }
}
async function read(path,required=false){try{const r=await api(path);if(!Array.isArray(r))throw Error('Respuesta inválida');return r;}catch(e){if(required)throw e;return[];}}
async function readOrders(){const rows=await api('rpc/cc_portal_my_stream_orders','POST',{p_limit:100});if(!Array.isArray(rows))throw Error('Pedidos no disponibles');return rows;}
async function readMoves(){try{const r=await api('rpc/cc_my_real_wallet_movements','POST',{p_service:null,p_limit:120});return Array.isArray(r)?r:[];}catch(_){return[];}}
async function load(){
 if(!user||busy||!window.cc80?.api)return;
 busy=true;const id=user,jwt=token,n=++serial;const idp=enc(id);
 try{
  const [admins,members,subs,businesses,real,bonus,ma,mc,cy,moves,superRoles,products,shopOrders,plans,details]=await Promise.all([
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
   mc:mc[0]||null,ma:ma[0]||null,cy,moves,products,orders:shopOrders,
   requests:data.requests,
   plan:plans.find(p=>p.business_id===streamId)||null,
   profile:details[0]||null,
   bonuses:[
    {label:'Bono COBRA YA',amount:Number(bonus[0]?.balance_pen||0)},
    {label:'Bono MI COCHERA',amount:Number(mc[0]?.bonus_pen||0)},
    {label:'Bono MI ALQUILER',amount:Number(ma[0]?.bonus_pen||0)}
   ].filter(x=>Number.isFinite(x.amount)&&x.amount>0)
  };
  const firstVerified=!verified;
  verified=true;
  if(firstVerified&&data.admin&&view==='home')view='admin';
  if(data.profile?.full_name&&session()?.userId===id){session().displayName=data.profile.full_name;window.cc95RenderUser?.();}
  render();
 }catch(e){if(active(id,jwt,n)){verified=false;render();notice('No fue posible verificar los datos reales. Compras y activaciones permanecerán bloqueadas hasta actualizar.');}}
 finally{if(user===id&&token===jwt)busy=false;}
}
function sync(){
 const s=session();
 if(!s?.jwt||!s.userId){if(app||user)reset();return;}
 if(s.userId===user&&s.jwt===token){
  if(!verified&&!busy&&window.cc80?.api)void load();
  return;
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