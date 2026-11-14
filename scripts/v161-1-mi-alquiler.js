/* CLAN CARTAN · MI ALQUILER V161.1: incorporación visual en rama aislada.
 * NO concede acceso, NO guarda inquilinos, NO opera billeteras ni pagos.
 * La persistencia y permisos llegan en V161.2; preservar V161 y sus tres módulos.
 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const session = () => window.CC_V53_SESSION;
  let currentArea='inmuebles',openedUser=null;
  const areas = Object.freeze([
    { id: 'inmuebles', emoji: '🏘️', title: 'Inmuebles', summary: 'Códigos H-001 y L-001, disponibilidad y tarifas por día o mes.' },
    { id: 'inquilinos', emoji: '👥', title: 'Inquilinos', summary: 'Documento, datos de contacto y WhatsApp particular de cada cliente.' },
    { id: 'contratos', emoji: '📋', title: 'Contratos', summary: 'Contratos diarios y mensuales, ampliaciones y retiros.' },
    { id: 'finanzas', emoji: '💳', title: 'Cobros y servicios', summary: 'Abonos, deudas, medidores, tarifas fijas, gastos y garantías.' },
    { id: 'avisos', emoji: '🔔', title: 'Avisos y reportes', summary: 'WhatsApp del inquilino, alertas, búsquedas y exportaciones.' }
  ]);
  function mountStyles() {
    if ($('ma1611styles')||document.querySelector('link[href*="styles/v161-1-mi-alquiler.css"]')) return;
    const link = document.createElement('link');
    link.id = 'ma1611styles'; link.rel = 'stylesheet';
    link.href = 'styles/v161-1-mi-alquiler.css?v=388';
    document.head.append(link);
  }
  function makeCard() {
    const card = document.createElement('article');
    card.id = 'ma1611card'; card.className = 'ma1611-card';
    card.setAttribute('aria-label', 'Cuarta plataforma: Mi Alquiler');
    card.innerHTML = '<div class="ma1611-card-icon"><img src="assets/mi-alquiler-logo.svg" alt="Logo oficial de MI ALQUILER CLAN CARTAN" width="76" height="76" loading="lazy" decoding="async"></div>' +
      '<div class="ma1611-card-copy"><small>CLAN CARTAN · CUARTA PLATAFORMA</small>' +
      '<h2>MI ALQUILER</h2><p>Habitaciones y locales · alquiler diario y mensual</p>' +
      '<span class="ma1611-chip">Gestión de habitaciones y locales</span></div>' +
      '<button id="ma1611open" type="button">Ingresar a MI ALQUILER</button>';
    const enter = card.querySelector('button');
    let lastPointerOpen = 0;
    // Safari móvil: abrir durante el toque original, antes de cualquier
    // manejador global que pueda consumir o retrasar el evento click.
    enter.addEventListener('pointerdown', event => {
      if (event.button !== 0 && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      lastPointerOpen = Date.now();
      window.ma1611LastPointerOpen = lastPointerOpen;
      open();
    }, { capture: true });
    enter.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      // Evitar que el click sintético vuelva a abrir la ventana.
      if (Date.now() - lastPointerOpen > 1200) open();
    }, { capture: true });
    return card;
  }
  function mount() {
    const home = $('cc77home');
    if (!home || $('ma1611card')) return;
    mountStyles();
    const card = makeCard();
    // Conservar sin cambios las tarjetas de STREAM BULL'S, COBRA YA y MI COCHERA.
    const third = home.querySelector('.cc158-cochera-card');
    if (third && third.parentNode) third.insertAdjacentElement('afterend', card);
    else home.appendChild(card);
  }
  function layout() {
    const layer = document.createElement('section');
    layer.id = 'ma1611layer'; layer.setAttribute('role', 'dialog');
    layer.setAttribute('aria-modal', 'true');
    layer.setAttribute('aria-label', 'MI ALQUILER: gestión de habitaciones y locales');
    layer.className='ma388-layer';
    layer.innerHTML = '<div class="ma1611-wrap"><header class="ma1611-head">'+
      '<button type="button" data-ma388-menu aria-label="Abrir menú" aria-expanded="false">☰</button>'+
      '<img class="ma1611-brand-logo" src="assets/logo-alquiler-v304.avif" alt="MI ALQUILER · CLAN CARTAN" width="100" height="68">'+
      '<button type="button" id="ma1611close" class="ma1611-close">← <span>Volver a<br>CLAN CARTAN</span></button>'+
      '<label class="ma388-search"><span aria-hidden="true">⌕</span><input id="ma388search" type="search" placeholder="Buscar inmueble, inquilino, DNI o código…" aria-label="Buscar en MI ALQUILER" autocomplete="off" maxlength="120"></label>'+
      '<button type="button" data-ma388-wallet aria-label="Billetera única CLAN CARTAN"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 7h17v14H3V7Zm0 0 13-5 2 5M15 12h7v5h-7v-5Z"/></svg></button><button type="button" data-ma388-profile aria-label="Abrir perfil"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0M17 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0"/></svg></button></header>'+
      '<div class="ma388-layout"><button type="button" class="ma388-scrim" data-ma388-menu aria-label="Cerrar menú"></button><aside class="ma388-sidebar"><nav class="ma1611-nav" aria-label="Secciones de Mi Alquiler"></nav><small>MI ALQUILER · V388</small></aside>'+
      '<main id="ma1611content" class="ma1611-content" tabindex="-1"></main></div></div>';
    layer.querySelector('#ma1611close').addEventListener('click',()=>{close();window.cc166OpenPanel?.();});
    layer.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('#ma1612dialog,#ma3dialog')){layer.classList.remove('ma388-menu-open');layer.querySelector('.ma388-sidebar').toggleAttribute('inert',matchMedia('(max-width:850px)').matches);layer.querySelector('[data-ma388-menu]').setAttribute('aria-expanded','false');}});
    layer.addEventListener('click',e=>{if(e.target.closest('[data-ma388-menu]')){if(matchMedia('(max-width:850px)').matches){layer.classList.toggle('ma388-menu-open');layer.querySelector('.ma388-sidebar').toggleAttribute('inert',!layer.classList.contains('ma388-menu-open'));layer.querySelector('[data-ma388-menu]').setAttribute('aria-expanded',String(layer.classList.contains('ma388-menu-open')));}else layer.classList.toggle('ma388-collapsed');}if(e.target.closest('[data-ma388-wallet]')){close();window.cc166OpenWallet?.('summary',()=>open());}if(e.target.closest('[data-ma388-profile]')){close();window.cc166OpenProfile?.(()=>open());}});
    layer.querySelector('#ma388search').addEventListener('input',e=>document.dispatchEvent(new CustomEvent('ma388-search',{detail:{query:e.target.value}})));
    const nav = layer.querySelector('.ma1611-nav');
    for (const area of areas) {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.dataset.area = area.id;
      btn.textContent = area.emoji + ' ' + area.title;
      btn.addEventListener('click', () => renderArea(area.id));
      nav.append(btn);
    }
    return layer;
  }
  function renderArea(id) {
    const area = areas.find(x => x.id === id) || areas[0];
    currentArea=area.id;const target = $('ma1611content'); if (!target) return;
    document.querySelectorAll('#ma1611layer .ma1611-nav button').forEach(btn => {
      const active = btn.dataset.area === area.id;
      btn.setAttribute('aria-current', active ? 'page' : 'false');
      btn.classList.toggle('active', active);
    });
    const layer=$('ma1611layer');if(layer){layer.scrollTop=0;layer.querySelector('.ma1611-content').scrollTop=0;layer.classList.remove('ma388-menu-open');layer.querySelector('.ma388-sidebar').toggleAttribute('inert',matchMedia('(max-width:850px)').matches);layer.querySelector('[data-ma388-menu]').setAttribute('aria-expanded','false');}
    // Solo texto estático: nunca mostrar cifras o personas inventadas.
    target.innerHTML = '<div class="ma1611-summary"><div class="ma1611-hero-icon" aria-hidden="true">' + area.emoji + '</div>' +
      '<div><small>MI ALQUILER</small><h3>' + area.title + '</h3><p>' + area.summary + '</p></div></div>' +
      '<div class="ma1611-placeholder"><span aria-hidden="true">🔐</span><div><strong>Verificando acceso a los datos</strong>' +
      '<p>El servidor determina qué información puedes consultar y administrar.</p></div></div>';
    if (typeof window.ma1612Enhance === 'function') window.ma1612Enhance(area.id, target);
  }
  function accessNotice(message) {
    const button = $('ma1611open');
    if (!button) return;
    let notice = $('ma1611-access-notice');
    if (!notice) {
      notice = document.createElement('p');
      notice.id = 'ma1611-access-notice';
      notice.setAttribute('role', 'alert');
      notice.style.cssText = 'flex-basis:100%;margin:0;color:#ffe1a1;font-size:13px;overflow-wrap:anywhere';
      button.insertAdjacentElement('afterend', notice);
    }
    notice.textContent = message;
  }
  let cc338AuthorizedOpen = false;
  function open() {
    if (!cc338AuthorizedOpen) {
      if (typeof window.cc337GateBusinessEntry !== 'function') {
        accessNotice('Verificando membresía. Actualiza la página para continuar.');
        return;
      }
      void window.cc337GateBusinessEntry('MI_ALQUILER', () => {
        cc338AuthorizedOpen = true;
        try { open(); } finally { cc338AuthorizedOpen = false; }
      });
      return;
    }
    const current = session();
    if (!current?.jwt || !current?.userId) {
      accessNotice('Debes iniciar sesión con tu cuenta ADMIN o con una membresía vigente antes de ingresar.');
      if (typeof window.cc77Auth === 'function') window.cc77Auth(false);
      return;
    }
    if(openedUser!==current.userId){openedUser=current.userId;currentArea='inmuebles';window.ma1612Reset?.();if($('ma388search'))$('ma388search').value='';}
    // Mostrar la interfaz inmediatamente. La autorización y los datos permanecen
    // protegidos por ma_ensure_account y las políticas RLS del servidor.
    try {
      mountStyles();
      let layer = $('ma1611layer');
      if (!layer) { layer = layout(); document.body.append(layer); }
      document.documentElement.dataset.ccActiveModule='alquiler';$('cc177-return-panel')?.remove();const portal=$('cc166-panel');if(portal)portal.hidden=true;
      layer.hidden = false;
      layer.style.setProperty('display', 'block', 'important');
      layer.style.setProperty('visibility', 'visible', 'important');
      layer.style.setProperty('z-index', '2147483647', 'important');
      layer.scrollTop = 0;
      accessNotice('');
      renderArea(currentArea);
      if (typeof window.ma1612OnOpen === 'function') {
        Promise.resolve(window.ma1612OnOpen()).catch(error => {
          console.warn('MI ALQUILER: fallo al cargar datos', error);
          const target = $('ma1611content');
          if (target) target.textContent = 'No se pudieron cargar los datos. Pulsa Actualizar para reintentar.';
        });
      } else {
        const target = $('ma1611content');
        if (target) target.textContent = 'El módulo de datos no está disponible. Actualiza la página e inténtalo nuevamente.';
      }
      layer.querySelector('#ma1611close')?.focus();
    } catch (error) {
      console.warn('MI ALQUILER: error al abrir la interfaz', error);
      accessNotice('No se pudo abrir MI ALQUILER. Actualiza la página e inténtalo nuevamente.');
    }
  }
  function close() {
    if(document.documentElement.dataset.ccActiveModule==='alquiler')delete document.documentElement.dataset.ccActiveModule;
    const layer = $('ma1611layer'); if (layer) { layer.hidden = true; layer.style.removeProperty('display'); layer.style.removeProperty('visibility'); }
    const dialog = $('ma1612dialog'); if (dialog) dialog.remove();
    $('ma3dialog')?.remove();
    if ($('ma1611card')) $('ma1611open').focus();
  }
  // No se borran ni reescriben paneles de otros módulos.
  let scheduled = false;
  function scheduleMount() {
    if (scheduled) return; scheduled = true;
    requestAnimationFrame(() => { scheduled = false; mount(); });
  }
  function init() {
    mount();
    document.addEventListener('cc192-session-ended',()=>{openedUser=null;currentArea='inmuebles';if($('ma388search'))$('ma388search').value='';close();window.ma1612Reset?.();});
    matchMedia('(max-width:850px)').addEventListener('change',()=>{const layer=$('ma1611layer');if(layer){layer.classList.remove('ma388-menu-open');layer.querySelector('.ma388-sidebar').toggleAttribute('inert',matchMedia('(max-width:850px)').matches);}});
    const observer = new MutationObserver(changes => {
      if (changes.some(change => change.type === 'childList' && change.addedNodes.length)) scheduleMount();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Captura delegada: funciona incluso si la portada reemplaza el botón
    // después del primer toque (Safari/iOS y re-render de tarjetas).
    document.addEventListener('click', e => {
      if (e.target.closest('#cc54logout')) { close(); return; }
      if (!e.target.closest('#ma1611open')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (Date.now() - (window.ma1611LastPointerOpen || 0) > 1200) open();
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.ma1611MiAlquiler = Object.freeze({ open, close, mount });
})();
