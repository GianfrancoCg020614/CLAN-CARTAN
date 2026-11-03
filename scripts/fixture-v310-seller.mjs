// Fixture aislado: publicaciones y entregas sólo en memoria. Sin credenciales reales.
import fs from 'node:fs';
import {panelFixture} from './fixture-v308-panel.mjs';
export function sellerFixture(mode='super'){
 let html=panelFixture(mode);const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
 const last=html.lastIndexOf('<script>');html=html.slice(0,last);
 const setup=`window.fetch=()=>{throw Error('Red prohibida en fixture')};window.confirm=()=>true;
 window.__mutations=[];window.__products=[];window.__inspectCalls=0;window.__uploads=0;window.__catalog=0;window.__whatsapp='';
 let fixtureSequence=0;Object.defineProperty(window.crypto,'randomUUID',{value:()=> '00000000-0000-4000-8000-'+String(++fixtureSequence).padStart(12,'0')});
 const orders=[{id:'own-pending',buyer_id:'fixture-user',seller_id:'other-seller',title:'Compra pendiente ficticia',status:'PAID_AWAITING_DELIVERY',price_pen:8,seller_whatsapp:'51912345678'},
 {id:'own-done',buyer_id:'fixture-user',seller_id:'other-seller',title:'Compra entregada ficticia',status:'FULFILLED',price_pen:7},
 {id:'seller-pending',buyer_id:'other-buyer',seller_id:'fixture-user',title:'Venta pendiente ficticia',status:'PAID_AWAITING_DELIVERY',price_pen:12},
 {id:'foreign',buyer_id:'other-buyer',seller_id:'other-seller',title:'Pedido ajeno',status:'PAID_AWAITING_DELIVERY',price_pen:99}];
 window.cc170Flyers={decorateRow(){},attachForm(form){const f=document.createElement('input');f.type='file';f.name='flyer';form.append(f);},
  inspectFile:()=>{__inspectCalls++;return new Promise(resolve=>window.__resolveInspect=resolve)},upload:async()=>{__uploads++}};
 window.cc169OpenCatalog=()=>{__catalog++;document.querySelector('#cc166-panel').hidden=true};window.open=url=>{__whatsapp=url;return {}};
 const original=cc80.api;cc80.api=async(p,m,b)=>{
  if(p.startsWith('cc_portal_stream_products?'))return __products;
  if(p==='rpc/cc_portal_my_stream_orders')return orders;
  if(p==='rpc/cc_portal_publish_stream_product_v2'){__mutations.push({p,b});return new Promise(resolve=>window.__resolvePublish=()=>{const id='10000000-0000-4000-8000-000000000001';__products.push({id,seller_id:'fixture-user',title:b.p_title,service:b.p_service,price_pen:b.p_price_pen,stock:b.p_stock,status:'ACTIVE'});resolve(id);});}
  if(p==='rpc/cc_portal_mark_stream_order_delivered'){__mutations.push({p,b});return new Promise(resolve=>window.__resolveDelivery=()=>{orders.find(o=>o.id===b.p_order_id).status='FULFILLED';resolve(true);});}
  return original(p,m,b);
 };`;
 html=html.replace('<script>'+js+'</script>','<script>'+setup+'</script><script>'+js+'</script>');
 const probe=`(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(800);
 const q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],checks={};const go=label=>all('.cc166-navitem').find(x=>x.getAttribute('aria-label')===label).click();const submit=f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 try{
 if(${JSON.stringify(mode)}==='super'){
  go('Mis publicaciones');let form=q('#cc166-publish-form');
  for(const [key,value] of Object.entries({title:'Servicio ficticio',days:'30',price:'12',distributor:'8',cost:'6',stock:'5',whatsapp:'51912345678',description:'Descripción de prueba'}))form.elements.namedItem(key).value=value;
  const transfer=new DataTransfer();transfer.items.add(new File([new Uint8Array([137,80,78,71,13,10,26,10])],'fixture.png',{type:'image/png'}));form.elements.namedItem('flyer').files=transfer.files;
  const originalForm=form;window.cc166RefreshPanel();await wait(130);form=q('#cc166-publish-form');
  checks.publicationDraft=form.elements.namedItem('title').value==='Servicio ficticio'&&form.elements.namedItem('price').value==='12';
  checks.flyerPreserved=form===originalForm&&form.elements.namedItem('flyer').files[0]?.name==='fixture.png';
  submit(form);submit(form);await wait(30);checks.oneValidation=__inspectCalls===1;
  if(window.__resolveInspect)window.__resolveInspect();await wait(30);
  checks.singlePublication=__mutations.filter(x=>x.p.includes('publish_stream')).length===1;
  window.cc166RefreshPanel();await wait(130);form=q('#cc166-publish-form');checks.publicationBusy=form.querySelector('button[type=submit]').disabled;
  submit(form);await wait(20);checks.stillSinglePublication=__mutations.filter(x=>x.p.includes('publish_stream')).length===1;
  if(window.__resolvePublish)window.__resolvePublish();await wait(150);
  checks.successResetsForm=q('#cc166-publish-form').elements.namedItem('title').value===''&&q('#cc166-publish-form').elements.namedItem('flyer').files.length===0;
  checks.publicationUnlocks=!q('#cc166-publish-form button[type=submit]').disabled&&__uploads===1;
  go('Mis ventas');let delivery=q('[data-delivery-order="seller-pending"]');checks.onlyOwnSales=all('.cc167-order-row').length===1&&!q('#cc166-content').textContent.includes('Pedido ajeno');
  delivery?.click();delivery?.dispatchEvent(new Event('click'));await wait(30);window.cc166RefreshPanel();await wait(130);
  delivery=q('[data-delivery-order="seller-pending"]');checks.deliveryBusy=delivery?.disabled===true;
  delivery?.dispatchEvent(new Event('click'));await wait(20);checks.singleDelivery=__mutations.filter(x=>x.p.includes('mark_stream')).length===1;
  if(window.__resolveDelivery)window.__resolveDelivery();await wait(150);delivery=q('[data-delivery-order="seller-pending"]');
  checks.deliveryConfirmed=delivery?.disabled===true&&delivery?.textContent==='Entregado'&&q('#cc166-content').textContent.includes('Entrega marcada como completada.');
 }else{
  go('Negocios');all('#cc166-content button').find(x=>x.textContent==='Recargar billetera').click();await wait(50);
  checks.rechargeRoute=q('.cc175-tab.selected')?.textContent==='Recarga manual';
  q('.cc177-back').click();checks.rechargeBack=q('.cc166-section-title h2')?.textContent.startsWith('Negocios');
  go('Mis compras');checks.onlyOwnPurchases=all('.cc167-order-row').length===2&&!q('#cc166-content').textContent.includes('Pedido ajeno');
  const filter=q('[aria-label="Filtrar mis compras por estado"]');if(filter){filter.value='REFUNDED';filter.dispatchEvent(new Event('change'));}
  checks.emptyFilter=all('.cc167-order-row').length===0&&q('#cc166-content').textContent.includes('No hay compras con este estado.');
  window.cc166RefreshPanel();await wait(130);checks.purchaseFilterPreserved=q('[aria-label="Filtrar mis compras por estado"]')?.value==='REFUNDED';
  const next=q('[aria-label="Filtrar mis compras por estado"]');if(next){next.value='PAID_AWAITING_DELIVERY';next.dispatchEvent(new Event('change'));}
  checks.pendingPurchase=all('.cc167-order-row').length===1&&q('.cc167-order-row')?.textContent.includes('own-pending');
  q('.cc167-order-row button')?.click();checks.sellerContact=__whatsapp.startsWith('https://wa.me/51912345678?text=');
  go('Catálogo');checks.catalogOpens=__catalog===1&&q('#cc166-panel').hidden;
  q('#cc177-return-panel button')?.click();checks.catalogReturn=!q('#cc166-panel').hidden;
  checks.noSellerControls=!all('.cc166-navitem').some(x=>/Mis publicaciones|Mis ventas|Usuarios/.test(x.textContent));
  checks.noWrites=__mutations.length===0;
 }
 checks.noErrors=__errors.length===0;checks.noOverflow=document.documentElement.scrollWidth<=innerWidth+1;
 }catch(e){checks.error=String(e.stack||e)}
 const out=document.createElement('output');out.id='cc310-result';out.dataset.status=Object.values(checks).every(x=>x===true)?'pass':'fail';out.textContent=JSON.stringify(checks);document.body.append(out);
})();`;
 return html+'<script>'+probe+'</script></body></html>';
}
