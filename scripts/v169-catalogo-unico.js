/* CLAN CARTAN V169 — Puente del catálogo público existente con publicaciones REALES.
 * Reutiliza #productos y el diseño V117. No mantiene otra lista de compra,
 * no importa inventarios de demostración ni procesa dinero por sí mismo.
 * El backend decide qué se publica y cobra la operación.
 */
(function () {
  'use strict';
  const ROOT='https://pqalxtrcyrpmwqdlibqd.supabase.co';
  const UUID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  const FLYER_RE=new RegExp('^'+UUID+'/'+UUID+'/'+UUID+'\\.(jpg|jpeg|png|webp)$');
  // Publishable key que ya utiliza index.html: NO es una service_role key.
  const KEY='sb_publishable_nsp19gAqsdRak3JqWpusUg_Qd6mQr0n';
  let rows=[],loading=false,loaded=false,error='',revision=0,scheduled=false,inFlight=null,showcase=null;
  const el=id=>document.getElementById(id);
  const money=n=>'S/ '+Number(n).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
  const text=(tag,cls,content)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(content!==undefined)x.textContent=String(content);return x;};
  const button=(caption,handle,cls)=>{const b=text('button',cls,caption);b.type='button';b.addEventListener('click',handle);return b;};
  const isStreaming=service=>/netflix|youtube|disney|prime|hbo|max|spotify|crunchyroll|paramount|stream/i.test(service||'');
  function categoryMatches(row){
    const chosen=(typeof ui!=='undefined'&&ui.storeCategory)||'Todos';
    if(chosen==='Todos')return true;
    if(chosen==='Streaming')return isStreaming(row.service);
    if(chosen==='Recursos')return !isStreaming(row.service);
    return true;
  }
  function searchMatches(row){
    const input=el('cc117-search');
    const raw=input?.value??(typeof ui!=='undefined'?ui.storeSearch:'');
    const needle=String(raw||'').trim().toLocaleLowerCase('es');
    return !needle||[row.service,row.title,row.description].some(v=>String(v||'').toLocaleLowerCase('es').includes(needle));
  }
  function purchase(product,btn){
    if(!window.CC_V53_SESSION?.jwt){
      if(typeof window.cc77Auth==='function')window.cc77Auth(false);
      else window.alert('Inicia sesión con tu cuenta CLAN CARTAN para comprar.');
      return;
    }
    if(typeof window.cc166PurchaseProductFromCatalog!=='function'){
      window.alert('El módulo de compras seguras todavía no está disponible. No se realizó ningún cargo.');
      return;
    }
    window.cc166PurchaseProductFromCatalog(product.id,btn,product.price_pen);
  }
  function buildCard(product){
    const card=text('article','product lux v23-product-card cc169-offer');
    const cover=text('div','product-visual cc169-offer-cover');
    const flyerPath=String(product.flyer_path||'');
    const flyerUrl=FLYER_RE.test(flyerPath)?
      ROOT+'/storage/v1/object/public/cc-stream-flyers/'+flyerPath:'';
    if(flyerUrl){
      cover.classList.add('cc170-cover-with-image');
      const preview=button('Ver flyer ampliado',()=>{
        window.cc170Flyers?.openPreview(flyerUrl,product.title,product.description);
      },'cc170-catalog-cover-button');
      preview.title='Ver flyer de '+product.title;
      const image=text('img','cc170-public-flyer');
      image.src=flyerUrl;image.alt='Flyer publicitario de '+product.title;
      image.loading='lazy';image.decoding='async';
      image.onerror=()=>{
        cover.classList.remove('cc170-cover-with-image');
        cover.replaceChildren(text('span','cc169-cover-brand',"STREAM BULL'S"),
          text('strong','cc169-cover-title',product.service),
          text('span','cc169-cover-status','Publicación activa'));
      };
      preview.prepend(image);
      cover.append(preview);
    }else{
      cover.append(text('span','cc169-cover-brand',"STREAM BULL'S"));
      cover.append(text('strong','cc169-cover-title',product.service));
      cover.append(text('span','cc169-cover-status','Publicación activa'));
    }
    const body=text('div','product-body');
    const meta=text('div','product-topmeta');
    meta.append(text('span','v23-product-category',isStreaming(product.service)?'Streaming':'Recursos'));
    meta.append(text('span','availability-badge',product.stock+' disponible'+(product.stock===1?'':'s')));
    body.append(meta);
    body.append(text('h3','cc169-offer-title',product.title));
    body.append(text('p','product-preview',product.description||'Servicio digital. Revisa las condiciones antes de confirmar.'));
    body.append(text('small','cc169-duration','Duración: '+product.duration_days+' días'));
    const priceBox=text('div','v23-card-price');
    const amount=text('div','');amount.append(text('small','','Precio público'),text('strong','',money(product.price_pen)));
    priceBox.append(amount);body.append(priceBox);
    const actions=text('div','product-actions cc117-one-action');
    actions.append(button(window.CC_V53_SESSION?.jwt?'Comprar con billetera':'Ingresar para comprar',
      function(){purchase(product,this)},'btn primary cc169-buy'));
    card.append(cover,body,actions);
    return card;
  }
  function readOnlySamples(grid){
    if(!grid)return null;
    const clone=grid.cloneNode(true);clone.classList.add('cc169-showcase');
    clone.querySelectorAll('[onclick],[onkeydown]').forEach(el=>{
      el.removeAttribute('onclick');el.removeAttribute('onkeydown');el.removeAttribute('tabindex');
      if(el.getAttribute('role')==='button')el.setAttribute('role','img');
    });
    clone.querySelectorAll('button').forEach(b=>{b.disabled=true;b.textContent='Muestra informativa';});
    clone.querySelectorAll('a[href]').forEach(a=>{a.removeAttribute('href');a.removeAttribute('target');a.setAttribute('aria-disabled','true');});
    clone.querySelectorAll('.v23-card-price strong,.detail-price,.availability-badge').forEach(el=>{
      el.textContent='Sin publicación verificada';
    });
    clone.querySelectorAll('.product-ribbon').forEach(el=>{el.textContent='Ejemplo';});
    clone.querySelectorAll('.v23-product-seller').forEach(el=>{el.textContent='Diseño de referencia';});
    return clone;
  }
  function unifyProfileLink(){
    const link=document.querySelector('#app .cc117-header .cc117-actions-top .cc117-register');
    if(!link||!window.CC_V53_SESSION?.jwt||link.dataset.cc169Profile==='true')return;
    // La cabecera de ESTE mismo catálogo abre la ficha personal global.
    link.removeAttribute('onclick');
    link.textContent='Mi perfil';
    link.dataset.cc169Profile='true';
    link.addEventListener('click',()=>{
      if(typeof window.cc166OpenProfile==='function')window.cc166OpenProfile();
      else window.cc77Home?.();
    });
  }
  function render(){
    unifyProfileLink();
    const section=document.querySelector('#productos .v23-catalog-section');
    if(!section)return;
    const oldBanner=el('cc77demobanner');
    if(oldBanner)oldBanner.style.display='none'; // Estado de venta ya figura en el catálogo.
    const chosen=(typeof ui!=='undefined'?ui.storeCategory:'Todos');
    const term=el('cc117-search')?.value??(typeof ui!=='undefined'?ui.storeSearch:'');
    const state=revision+'|'+chosen+'|'+term+'|'+!!window.CC_V53_SESSION?.jwt;
    if(section.dataset.cc169State===state)return;
    section.dataset.cc169State=state;
    // Guardar solo imágenes de referencia: jamás permitir comprar a través de la demo.
    const seedGrid=section.querySelector('.v23-product-grid:not(.cc169-verified-grid)');
    if(seedGrid)showcase=readOnlySamples(seedGrid);
    // El contenido de demostración NO es inventario: reemplazarlo, nunca combinarlo.
    section.querySelectorAll('.v23-product-grid,.v23-empty,.cc169-result').forEach(n=>n.remove());
    const matches=rows.filter(x=>categoryMatches(x)&&searchMatches(x));
    const count=section.querySelector('.v23-count');
    if(count)count.textContent=loading?' Consultando…':loaded?matches.length+' publicaciones verificadas':' Sin verificación';
    const holder=text('div','cc169-result');
    if(loading&&!loaded)holder.append(text('p','cc169-status','Consultando publicaciones disponibles…'));
    else if(error) {
      holder.append(text('p','cc169-status',error+' No se pueden confirmar compras hasta recuperar el catálogo.'));
      holder.append(button('Volver a consultar',()=>{void refresh()},'btn'));
    } else if(!matches.length){
      holder.append(text('p','cc169-status',rows.length?
        'No encontramos servicios publicados para esta búsqueda.':
        'Aún no hay publicaciones activas verificadas. Estas imágenes son SOLO ejemplos; no tienen precio ni compra habilitados.'));
      if(!rows.length&&showcase)holder.append(showcase.cloneNode(true));
    } else {
      const grid=text('div','products v6-grid v23-product-grid cc169-verified-grid');
      grid.dataset.cc169Source='verified';matches.forEach(p=>grid.append(buildCard(p)));holder.append(grid);
    }
    const controls=text('div','cc169-catalog-controls');
    controls.append(text('small','','Productos y precios confirmados por CLAN CARTAN. El pago requiere sesión y saldo real.'));
    controls.append(button('↻ Actualizar catálogo',()=>{void refresh()},'btn cc169-refresh'));
    holder.append(controls);
    const note=section.querySelector('.v23-shop-note');
    if(note)note.replaceWith(holder);else section.append(holder);
  }
  function schedule(){
    if(scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;render();});
  }
  async function refresh(){
    if(inFlight)return inFlight;
    loading=true;error='';revision++;schedule();
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),16000);
    inFlight=(async()=>{
      try{
        const response=await fetch(ROOT+'/rest/v1/rpc/cc_portal_public_catalog_v2',{
          method:'POST',
          headers:{apikey:KEY,'Content-Type':'application/json'},
          body:'{}',signal:controller.signal
        });
        if(!response.ok)throw Error('La lista real no está disponible.');
        const result=await response.json();
        if(!Array.isArray(result))throw Error('Respuesta de productos inválida');
        rows=result.filter(p=>p.id&&p.title&&Number(p.price_pen)>0&&Number(p.stock)>0);
        loaded=true;error='';
      }catch(_){
        rows=[];loaded=false;error='No se pudo verificar el catálogo.';
      }finally{
        clearTimeout(timeout);loading=false;inFlight=null;revision++;render();
      }
    })();
    return inFlight;
  }
  function openCatalog(){
    const old=document.getElementById('cc166-panel');
    if(old)old.hidden=true;
    if(typeof window.cc77Store==='function')window.cc77Store();
    else window.alert('No se puede abrir el catálogo original.');
    schedule();void refresh();
  }
  function init(){
    new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{
      childList:true,subtree:true
    });
    window.cc169OpenCatalog=openCatalog;
    window.cc169RefreshCatalog=refresh;
    render();
    void refresh();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
