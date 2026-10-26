/* V151: recargas en dos secciones, una solicitud PENDING, sin paneles repetidos. */
(function(){
'use strict';
const $=id=>document.getElementById(id),s=()=>window.CC_V53_SESSION;
const cash=n=>'S/ '+Number(n||0).toFixed(2);
let busy=false;
function make(tag,content){const e=document.createElement(tag);e.textContent=content;return e;}
function refreshNoticeList(){
 const host=$('cc151requests'),session=s();if(!host||!session?.jwt)return;
 host.textContent='Consultando solicitudes…';
 const isAdmin=!!session.isAdmin;
 const path='cc_manual_payment_notifications?select=id,user_id,service,method,amount_pen,operation_number,status,created_at'+
 (isAdmin?'&order=created_at.desc&limit=30':'&user_id=eq.'+encodeURIComponent(session.userId)+'&order=created_at.desc&limit=15');
 window.cc80.api(path).then(rows=>{
  if(s()?.userId!==session.userId)return;
  host.replaceChildren();
  if(!Array.isArray(rows)||!rows.length){host.textContent='Aún no hay solicitudes de recarga registradas.';return;}
  for(const row of rows){
   const card=document.createElement('div');card.className='cc136entry';
   card.append(make('strong',cash(row.amount_pen)+' · '+(row.service==='COBRA_YA'?'COBRA YA':'STREAM BULL’S')));
   const label={PENDING:'Pendiente de verificación',VERIFIED:'Acreditada tras verificación',REJECTED:'Rechazada'}[row.status]||'En revisión';
   card.append(make('p',label+' · '+row.method+' · N.º '+row.operation_number));
   card.append(make('small','Solicitud '+row.id+' · '+new Date(row.created_at).toLocaleString('es-PE')));
   if(isAdmin&&row.status==='PENDING'){
    const b=make('button','Revisar pago en ADMIN');b.type='button';
    b.addEventListener('click',()=>{
     const admin=$('cc146admin');if(!admin)return;
     if($('cc146service'))$('cc146service').value=row.service;
     if($('cc146amount'))$('cc146amount').value=row.amount_pen;
     if($('cc146tx'))$('cc146tx').value=row.operation_number;
     if($('cc146provider'))$('cc146provider').value=row.method==='BINANCE'?'BINANCE_PERSONAL':'LEMON_DALE_PERSONAL';
     $('cc146provider')?.dispatchEvent(new Event('change'));
     admin.scrollIntoView({behavior:'smooth',block:'start'});
     $('cc146status').textContent='Solicitud '+row.id+' cargada. Comprueba directamente el ingreso y el correo del cliente antes de acreditar.';
    });card.append(b);
   }
   host.append(card);
  }
 }).catch(()=>{host.textContent='No fue posible consultar solicitudes; actualiza la página.';});
}
function setup(){
 if(!$('cc122section')||!$('cc147autoQr')||!$('cc148amount'))return;
 const auto=$('cc147autoQr'),flow=$('cc148manualFlow');
 if(!auto||!flow)return;
 // El proveedor automático seguirá desconectado hasta recibir eventos firmados:
 // la vista pública utiliza el mismo formulario de solicitud pendiente que Recarga manual.
 if(!$('cc151autoFlow')){
  const group=document.createElement('div');group.id='cc151autoFlow';
  group.style.cssText='display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end;margin:16px 0';
  group.innerHTML='<label style="flex:1 1 180px">Billetera<select id="cc151autoService">'+
   '<option value="COBRA_YA">COBRA YA</option><option value="STREAM_BULLS">STREAM BULL’S</option></select></label>'+
   '<label style="flex:1 1 180px">Monto a recargar (S/)<input type="number" id="cc151autoAmount" min="1" max="1000" step="0.01" inputmode="decimal" placeholder="Ej. 15.00"></label>'+
   '<button type="button" id="cc151autoPaid">✓ YA PAGUÉ</button>';
  const grid=auto.querySelector('.cc147-qr-grid');auto.insertBefore(group,grid);
  $('cc151autoPaid').addEventListener('click',()=>{
   const n=Number($('cc151autoAmount').value);
   if(!Number.isFinite(n)||n<1||n>1000||Math.round(n*100)!==n*100){$('cc151autoAmount').focus();return;}
   $('cc148service').value=$('cc151autoService').value;
   $('cc148amount').value=n.toFixed(2);
   $('cc148amount').dispatchEvent(new Event('input'));
   $('cc148alreadyPaid').click();
  });
 }
 const old=$('cc122section');
 for(const selector of ['.cc131-instructions','.cc131-fields','#cc122create','#cc122payinfo','#cc131checkout']){
  for(const node of old.querySelectorAll(selector))node.hidden=true;
 }
 // Formulario de recarga histórica en un solo bloque, sin duplicar datos de pago.
 const oldManual=$('cc136manual');
 for(const selector of ['.cc136form','.cc136actions','#cc136recipient','.cc136warn']){
  const n=oldManual?.querySelector(selector);if(n)n.hidden=true;
 }
 if(!$('cc151requests')){
  const box=document.createElement('section');box.className='cc136manual';box.id='cc151operations';
  box.innerHTML='<h3>Mis solicitudes de recarga</h3><p>Al enviar el comprobante se registra una operación pendiente. Solo ADMIN confirma los depósitos recibidos.</p>'+
   '<button type="button" id="cc151reload">↻ Actualizar operaciones</button><div id="cc151requests" role="status"></div>';
  auto.after(box);
  $('cc151reload').addEventListener('click',refreshNoticeList);
 }
 refreshNoticeList();
}
function init(){
 setup();
 if(!window.cc151Once){
  window.cc151Once=true;
  const open=window.cc80?.open;
  if(typeof open==='function')window.cc80.open=function(...args){
   const r=open.apply(this,args);setup();return r;
  };
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshNoticeList();});
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

/* V166 · Pantalla general de ADMIN / RESELLER / SUPER_RESELLER.
   Añadir después de la UI existente; nunca reemplazar Auth ni historial. */
(function(){
 'use strict';
 if(!document.getElementById('cc166-panel-style')){
  const css=document.createElement('link');css.id='cc166-panel-style';
  css.rel='stylesheet';css.href='styles/v166-portal-roles.css?v=177';document.head.append(css);
 }
 if(!document.getElementById('cc166-panel-script')){
  const script=document.createElement('script');script.id='cc166-panel-script';
  script.src='scripts/v166-portal-roles.js?v=193';script.async=false;document.head.append(script);
 }
})();


/* Catálogo único: adaptar el escaparate público real al checkout verificado.
 * No incluye una segunda tienda ni edita módulos de COBRA YA/COCHERA/ALQUILER.
 */
(function(){
 'use strict';
 if(!document.getElementById('cc169-public-catalog-style')){
  const link=document.createElement('link');link.id='cc169-public-catalog-style';
  link.rel='stylesheet';link.href='styles/v169-catalogo-perfil.css?v=1721';
  document.head.append(link);
 }
 if(!document.getElementById('cc169-public-catalog-script')){
  const script=document.createElement('script');script.id='cc169-public-catalog-script';
  script.src='scripts/v169-catalogo-unico.js?v=1731';
  script.async=false;document.head.append(script);
 }
})();


/* V170: solo flyers de STREAM BULL'S, el mismo panel y catálogo V169. */
(function(){
 'use strict';
 if(!document.getElementById('cc170-stream-flyers-style')){
  const css=document.createElement('link');css.id='cc170-stream-flyers-style';
  css.rel='stylesheet';css.href='styles/v170-flyers-stream.css?v=1701';
  document.head.append(css);
 }
 if(!document.getElementById('cc170-stream-flyers-script')){
  const script=document.createElement('script');script.id='cc170-stream-flyers-script';
  script.src='scripts/v170-flyers-stream.js?v=1701';
  script.async=false;document.head.append(script);
 }
})();


/* V171 · Administración simple de usuarios en el MISMO panel CLAN CARTAN. */
(function(){
 'use strict';
 if(document.getElementById('cc171-admin-simple-css'))return;
 const css=document.createElement('link');
 css.id='cc171-admin-simple-css';css.rel='stylesheet';
 css.href='styles/v171-admin-simple.css?v=177';
 document.head.append(css);
})();

/* V176 · Estilo exclusivo para la consola de ADMIN. Sin nuevos paneles. */
(function(){
 'use strict';
 if(document.getElementById('cc176-admin-style'))return;
 const style=document.createElement('link');style.id='cc176-admin-style';
 style.rel='stylesheet';style.href='styles/v176-admin-console.css?v=177';
 document.head.append(style);
})();

/* V177 · Diseño común de los cuatro roles; sin abrir administraciones paralelas. */
(function(){
 'use strict';
 if(document.getElementById('cc177-shared-panel-css'))return;
 const link=document.createElement('link');link.id='cc177-shared-panel-css';
 link.rel='stylesheet';link.href='styles/v177-panel-unico.css?v=193';
 document.head.append(link);
})();
