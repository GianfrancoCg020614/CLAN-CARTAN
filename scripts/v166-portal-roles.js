/* CLAN CARTAN · V166 · Panel unificado para ADMIN / RESELLER / SUPER_RESELLER.
   Control real: se consulta Supabase con RLS, nunca se inventan saldos ni membresías.
   Los paneles antiguos siguen intactos. */
(function(){
'use strict';
const el=id=>document.getElementById(id);
const api=(p,m,b)=>window.cc80.api(p,m,b);
const serviceName=k=>({STREAM_BULLS:"STREAM BULL'S",COBRA_YA:'COBRA YA',MI_COCHERA:'MI COCHERA',MI_ALQUILER:'MI ALQUILER'})[k]||k;
const services=[['STREAM_BULLS','◈'],['COBRA_YA','◎'],['MI_COCHERA','▣'],['MI_ALQUILER','⌂']];
const sidebar=[['home','◫','Dashboard'],['businesses','▦','Negocios'],['wallet','▤','Billetera'],['movements','≡','Movimientos'],['orders','◱','Pedidos'],['affiliate','♧','Mis afiliados'],['external','⇄','Control externo'],['support','◌','Soporte'],['profile','♙','Mi perfil']];
let user=null,token=null,serial=0,app=null,view='home',busy=false,verified=false;
let data={admin:false,super:false,reseller:false,members:[],subs:[],businesses:[],real:[],bonuses:[],cy:[],mc:null,ma:null,moves:[],products:[],orders:[],requests:[],plan:null};
let lastReceipt=null,purchasePending=false,membershipPending=false;
const price=n=>Number.isFinite(Number(n))?'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
const make=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=String(txt);return x;};
const button=(txt,fn,cls)=>{const x=make('button',cls||'',txt);x.type='button';x.addEventListener('click',fn);return x;};
const enc=s=>encodeURIComponent(s);
const session=()=>window.CC_V53_SESSION;
const active=(id,jwt,seq)=>user===id&&token===jwt&&serial===seq&&session()?.userId===id&&session()?.jwt===jwt;
function reset(){
 serial++;user=null;token=null;busy=false;verified=false;view='home';
 data={admin:false,super:false,reseller:false,members:[],subs:[],businesses:[],real:[],bonuses:[],cy:[],mc:null,ma:null,moves:[],products:[],orders:[],requests:[],plan:null};lastReceipt=null;purchasePending=false;membershipPending=false;
 app?.remove();app=null;el('cc166-open-button')?.remove();
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
  if(data.subs.some(s=>s.membership_id===m.id&&s.status==='ACTIVE'&&Date.parse(s.end_at)>Date.now()))
   return {ok:true,reason:'Vigente'};
 }
 return {ok:false,reason:'Membresía pendiente o vencida'};
}
function exitTo(fn){
 if(typeof fn!=='function')return;
 app.hidden=true;
 try{fn();}catch(e){app.hidden=false;notice('No se pudo abrir el módulo actual.');}
}
function gotoBusiness(code){
 // Cambia a la pestaña del negocio, sin abrir otro dashboard ni duplicar controles.
 nav('business:'+code);
}
function openOriginalBusiness(code){
 if(!access(code).ok){notice('Primero activa tu membresía para usar '+serviceName(code)+'.');return;}
 if(code==='MI_COCHERA')return exitTo(()=>window.mc158Open?.());
 if(code==='MI_ALQUILER')return exitTo(()=>window.ma1611MiAlquiler?.open());
 if(code==='COBRA_YA')return exitTo(()=>window.cc79Cobra?.());
 // El catálogo y las publicaciones de STREAM se gestionan en ESTE MISMO PANEL.
 nav('business:STREAM_BULLS');
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
function nav(to){view=to;render();}
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
 return 'AFILIADO';
}
function renderNav(){
 const menu=el('cc166-nav');menu.replaceChildren();
 const base=[['home','◫','Inicio'],['shop','▣','Comprar'],['wallet','▤','Billetera'],['orders','◱','Mis compras']];
 const extra=[['businesses','▦','Negocios'],['movements','≡','Movimientos'],['affiliate','♧','Referidos'],['external','⇄','Control externo']];
 const items=base.concat(data.reseller||data.super||data.admin?extra:[])
  .concat(data.super||data.admin?[['publish','♛','Publicar'],['sales','◈','Mis ventas']]:[])
  .concat(data.admin?[['admin','⚙','Administración']]:[])
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
  a.append(make('small','',dt+' · '+serviceName(m.service)+' · '+(m.movement_type||'Movimiento')));
  a.append(make('span','',String(m.description||m.reference||'Movimiento registrado').slice(0,130)));
  row.append(a,make('strong',Number(m.amount_pen)<0?'minus':'plus',price(m.amount_pen)));box.append(row);
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
 title(page,'Movimientos reales','Compras, recargas, renovaciones y activaciones con su descripción y referencia.');
 const buttons=make('div','cc166-actions');
 buttons.append(button('Abrir filtros y exportaciones',()=>exitTo(()=>window.cc132OpenMovements?.()),'cc166-primary'));
 page.append(buttons);movementList(page,120);
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
 title(page,'Comprar servicios · precios públicos','Cualquier usuario con cuenta puede comprar con saldo REAL, sin membresía de gestión.');
 receipt(page);
 const action=make('section','cc167-mini');
 const real=data.real.reduce((a,b)=>a+Number(b.balance_pen||0),0);
 const n=make('div','');n.append(make('small','','Saldo real disponible'),make('strong','',verified?price(real):'Consultando…'));
 action.append(n,button('Recargar billetera',openRecharge,'cc166-primary'));page.append(action);
 const items=data.products.filter(p=>p.status==='ACTIVE'&&Number(p.stock)>0);
 if(!items.length){
  const box=card('Catálogo de STREAM BULL’S','En este momento no hay publicaciones con stock confirmado.');
  box.append(make('p','cc166-note','Los productos aparecen automáticamente cuando ADMIN o un SÚPER RESELLER con membresía vigente los publica.'));
  page.append(box);return;
 }
 const grid=make('div','cc167-market');
 for(const p of items){
  const item=make('article','cc167-product');
  item.append(make('small','cc167-platform',p.service));
  item.append(make('h3','',p.title));
  item.append(make('p','',String(p.description||'Servicio digital publicado por un vendedor autorizado.').slice(0,220)));
  item.append(make('small','','Duración: '+(p.duration_days||'—')+' días · Stock: '+p.stock));
  item.append(make('strong','cc167-price',price(p.price_pen)));
  const own=p.seller_id===user;
  const buy=button(own?'Tu publicación':'Comprar',()=>void buyProduct(p,buy),'cc166-primary');
  buy.disabled=!verified||purchasePending||own;item.append(buy);grid.append(item);
 }page.append(grid);
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
  view='shop';render();
  receiptFocus();
 }catch(e){if(session()?.userId===uid&&session()?.jwt===jwt)notice('Compra no confirmada: '+String(e?.message||e)+'. No repitas con otra referencia hasta comprobar Mis compras.');}
 finally{purchasePending=false;b.disabled=false;}
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
  input.name=key;if(key!=='description')input.required=true;if(key==='days')input.value='30';label.append(input);form.append(label);
 }
 const save=make('button','cc166-primary','Publicar servicio');save.type='submit';form.append(save);
 form.addEventListener('submit',e=>{e.preventDefault();void publishSave(new FormData(form),save);});
 box.append(form);page.append(box);
 const list=card('Publicaciones registradas','Una publicación NO significa que el checkout esté habilitado.');
 const products=data.products.filter(p=>data.admin||p.seller_id===user);
 if(!products.length)list.append(make('p','cc166-empty','Aún no hay publicaciones.'));
 for(const p of products){const row=make('div','cc166-product');row.append(make('strong','',p.title),
 make('span','',p.service+' · '+price(p.price_pen)+' · Stock '+p.stock+' · '+p.status));list.append(row);}
 page.append(list);
}
async function publishSave(fd,b){
 if(!user||!verified)return;
 const s=session(),uid=user,jwt=token;
 const value=k=>String(fd.get(k)||'').trim(),days=Number(value('days')),stock=Number(value('stock')),p=Number(value('price')),c=Number(value('cost'));
 if(!(p>0&&c>=0&&c<=p&&Number.isInteger(days)&&days>=1&&Number.isInteger(stock)&&stock>=0)){notice('Verifica precio, costo, stock y duración.');return;}
 b.disabled=true;
 try{await api('rpc/cc_portal_publish_stream_product','POST',{
 p_service:value('service'),p_title:value('title'),p_duration_days:days,p_price_pen:p,
 p_cost_pen:c,p_stock:stock,p_whatsapp:value('whatsapp'),p_description:value('description')});
 if(session()?.userId!==uid||session()?.jwt!==jwt)return;
 await load();nav('publish');notice('Servicio registrado. El cobro comercial continúa sujeto a checkout autorizado.');
 }catch(e){if(session()?.userId===uid)notice('No se pudo publicar: '+String(e.message||e));}
 finally{b.disabled=false;}
}
function admin(page){
 if(!data.admin)return overview(page);
 title(page,'Administración general','Funciones exclusivamente para ADMIN verificadas por el servidor.');
 const actions=make('div','cc166-actions');
 actions.append(button('Administración original',()=>exitTo(()=>el('cc92-admin-button')?.click()),'cc166-primary'),
 button('Recargas por verificar',()=>exitTo(()=>{window.cc80?.open();el('cc136admin')?.querySelector('summary')?.click();}),'cc166-secondary'),
 button('Auditoría financiera',()=>exitTo(()=>{window.cc80?.open();el('cc143report')?.querySelector('summary')?.click();}),'cc166-secondary'));page.append(actions);
 const grant=card('Permisos SÚPER RESELLER','ADMIN puede asignar o revocar el rol. La membresía activa se requiere por separado.');
 const form=make('form','cc166-form');form.id='cc166-role-form';
 const label1=make('label','','Correo del usuario');const email=document.createElement('input');email.name='email';email.type='email';email.required=true;label1.append(email);form.append(label1);
 const label2=make('label','','Comisión ADMIN sobre ganancia (%)');const pct=document.createElement('input');pct.name='percent';pct.type='number';pct.step='0.01';pct.min='0';pct.max='100';pct.value='20';label2.append(pct);form.append(label2);
 const assign=make('button','cc166-primary','Habilitar SÚPER RESELLER');assign.type='submit';form.append(assign);
 const revoke=button('Revocar permiso',()=>{if(confirm('¿Revocar permiso SÚPER RESELLER?'))void grantRole(false);},'cc166-secondary');form.append(revoke);
 async function grantRole(enabled){
  if(!email.validity.valid){email.reportValidity();return;}
  assign.disabled=true;revoke.disabled=true;
  try{await api('rpc/cc_portal_admin_set_super_reseller','POST',{p_email:email.value.trim(),p_enabled:enabled,p_admin_percent:Number(pct.value)});
   notice(enabled?'Permiso registrado. La membresía se valida por separado.':'Permiso revocado.');
  }catch(e){notice('No se modificó el permiso: '+String(e.message||e));}
  finally{assign.disabled=false;revoke.disabled=false;}
 }
 form.addEventListener('submit',e=>{e.preventDefault();void grantRole(true);});
 grant.append(form);page.append(grant);
 const req=card('Solicitudes actuales','Se consultan las solicitudes reales existentes.');
 req.append(button('Actualizar solicitudes',()=>void getRequests(),'cc166-secondary'));
 if(data.requests.length===0)req.append(make('p','cc166-empty','Sin solicitudes cargadas.'));
 for(const item of data.requests.slice(0,25)){
  const p=make('div','cc166-product');p.append(make('strong','',item.applicant_email||'Solicitante'),make('span','',item.membership_status||'Pendiente'));req.append(p);
 }page.append(req);
}
async function getRequests(){
 if(!data.admin||!user)return;
 try{const r=await api('rpc/cc_admin_reseller_requests','POST',{});
 if(Array.isArray(r)){data.requests=r;render();}}
 catch(e){notice('No se pudo consultar las solicitudes: '+String(e.message||e));}
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
 default:other(page);
 }
}
async function read(path){try{const r=await api(path);return Array.isArray(r)?r:[];}catch(_){return[];}}
async function readMoves(){try{const r=await api('rpc/cc_my_real_wallet_movements','POST',{p_service:null,p_limit:120});return Array.isArray(r)?r:[];}catch(_){return[];}}
async function load(){
 if(!user||busy||!window.cc80?.api)return;
 busy=true;const id=user,jwt=token,n=++serial;const idp=enc(id);
 try{
  const [admins,members,subs,businesses,real,bonus,ma,mc,cy,moves,superRoles,products,shopOrders,plans]=await Promise.all([
   read('cc_admins?select=user_id&user_id=eq.'+idp+'&limit=1'),
   read('cc_memberships?select=id,role,status,business_id&user_id=eq.'+idp),
   read('cc_subscriptions?select=membership_id,status,start_at,end_at&order=end_at.desc&limit=150'),
   read('cc_businesses?select=id,code,display_name'),
   read('cc_real_service_wallets?select=service,balance_pen&user_id=eq.'+idp),
   read('cc_cobra_welcome_bonus_wallets?select=balance_pen&user_id=eq.'+idp+'&limit=1'),
   read('ma_accounts?select=subscription_until,suspended,bonus_pen&user_id=eq.'+idp+'&limit=1'),
   read('mc_accounts?select=subscription_until,suspended,bonus_pen&user_id=eq.'+idp+'&limit=1'),
   read('cc_cobra_real_access_periods?select=status,period_end&user_id=eq.'+idp+'&order=period_end.desc&limit=20'),
   readMoves(),
   read('cc_portal_super_resellers?select=enabled,user_id,admin_percent&user_id=eq.'+idp+'&limit=1'),
   read('cc_portal_stream_products?select=id,seller_id,service,title,description,duration_days,price_pen,stock,status&order=created_at.desc&limit=100'),
   read('cc_portal_stream_orders?select=id,checkout_key,buyer_id,seller_id,title,price_pen,admin_fee_pen,seller_payable_pen,seller_whatsapp,status,created_at&order=created_at.desc&limit=100'),
   read('cc_plans?select=business_id,code,price_pen,is_active&code=eq.STREAM_365&is_active=eq.true')
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
   reseller:!!currentRoleReseller,
   members,subs,businesses,real,
   mc:mc[0]||null,ma:ma[0]||null,cy,moves,products,orders:shopOrders,
   requests:data.requests,
   plan:plans.find(p=>p.business_id===streamId)||null,
   bonuses:[
    {label:'Bono COBRA YA',amount:Number(bonus[0]?.balance_pen||0)},
    {label:'Bono MI COCHERA',amount:Number(mc[0]?.bonus_pen||0)},
    {label:'Bono MI ALQUILER',amount:Number(ma[0]?.bonus_pen||0)}
   ].filter(x=>Number.isFinite(x.amount)&&x.amount>0)
  };
  verified=true;render();
 }catch(e){if(active(id,jwt,n))notice('La consulta de datos no fue completada; vuelve a actualizar.');}
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
 window.cc166RefreshPanel=()=>void load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();