/* CLAN CARTAN · MI ALQUILER V161.1: incorporación visual en rama aislada.
 * NO concede acceso, NO guarda inquilinos, NO opera billeteras ni pagos.
 * La persistencia y permisos llegan en V161.2; preservar V161 y sus tres módulos.
 */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const session = () => window.CC_V53_SESSION;
  const areas = Object.freeze([
    { id: 'inmuebles', emoji: '🏘️', title: 'Habitaciones y locales', summary: 'Códigos H-001 y L-001, disponibilidad y tarifas por día o mes.' },
    { id: 'inquilinos', emoji: '👥', title: 'Inquilinos', summary: 'Documento, datos de contacto y WhatsApp particular de cada cliente.' },
    { id: 'contratos', emoji: '📋', title: 'Alquileres y vencimientos', summary: 'Contratos diarios y mensuales, ampliaciones y retiros.' },
    { id: 'finanzas', emoji: '💳', title: 'Cobros y servicios', summary: 'Abonos, deudas, medidores, tarifas fijas, gastos y garantías.' },
    { id: 'avisos', emoji: '🔔', title: 'Avisos y reportes', summary: 'WhatsApp del inquilino, alertas, búsquedas y exportaciones.' }
  ]);
  function mountStyles() {
    if ($('ma1611styles')) return;
    const link = document.createElement('link');
    link.id = 'ma1611styles'; link.rel = 'stylesheet';
    link.href = 'styles/v161-1-mi-alquiler.css?v=1611';
    document.head.append(link);
  }
  function makeCard() {
    const card = document.createElement('article');
    card.id = 'ma1611card'; card.className = 'ma1611-card';
    card.setAttribute('aria-label', 'Cuarta plataforma: Mi Alquiler');
    card.innerHTML = '<div class="ma1611-card-icon"><img src="assets/mi-alquiler-logo.svg" alt="Logo oficial de MI ALQUILER CLAN CARTAN" width="76" height="76" loading="lazy" decoding="async"></div>' +
      '<div class="ma1611-card-copy"><small>CLAN CARTAN · CUARTA PLATAFORMA</small>' +
      '<h2>MI ALQUILER</h2><p>Habitaciones y locales · alquiler diario y mensual</p>' +
      '<span class="ma1611-chip">V163.5 · Integración progresiva</span></div>' +
      '<button id="ma1611open" type="button">Ingresar a MI ALQUILER</button>';
    card.querySelector('button').addEventListener('click', open);
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
    layer.setAttribute('aria-label', 'MI ALQUILER: vista previa de integración V163.5');
    layer.innerHTML = '<div class="ma1611-wrap">' +
      '<header class="ma1611-head"><div class="ma1611-brand"><img class="ma1611-brand-logo" src="assets/mi-alquiler-logo.svg" alt="MI ALQUILER" width="70" height="70" decoding="async">' +
      '<div><small>CLAN CARTAN · MI ALQUILER</small><h2>Gestión de habitaciones y locales</h2>' +
      '<p>Un acceso · datos independientes de los otros negocios</p></div></div>' +
      '<button type="button" id="ma1611close" class="ma1611-close">← Volver a CLAN CARTAN</button></header>' +
      '<section class="ma1611-notice" role="status"><strong>MI ALQUILER:</strong> módulos en integración y pruebas. ' +
      'Habitaciones, locales, inquilinos y contratos se guardan con acceso restringido en Supabase. ' +
      'Cobros, medidores, garantías y bonos protegidos; avisos al WhatsApp del inquilino, búsqueda y Excel. La consulta DNI usa el backend y respeta la autorización disponible.</section>' +
      '<nav class="ma1611-nav" aria-label="Secciones de Mi Alquiler"></nav>' +
      '<main id="ma1611content" class="ma1611-content" tabindex="-1"></main>' +
      '<footer class="ma1611-footer">MI ALQUILER · Acceso sujeto a membresía vigente. Sin acreditación automática de recargas ni envíos automáticos de WhatsApp.</footer></div>';
    layer.querySelector('#ma1611close').addEventListener('click', close);
    layer.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    layer.addEventListener('click', e => { if (e.target === layer) close(); });
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
    const target = $('ma1611content'); if (!target) return;
    document.querySelectorAll('#ma1611layer .ma1611-nav button').forEach(btn => {
      const active = btn.dataset.area === area.id;
      btn.setAttribute('aria-current', active ? 'page' : 'false');
      btn.classList.toggle('active', active);
    });
    // Solo texto estático: nunca mostrar cifras o personas inventadas.
    target.innerHTML = '<div class="ma1611-summary"><div class="ma1611-hero-icon" aria-hidden="true">' + area.emoji + '</div>' +
      '<div><small>MI ALQUILER</small><h3>' + area.title + '</h3><p>' + area.summary + '</p></div></div>' +
      '<div class="ma1611-placeholder"><span aria-hidden="true">🔐</span><div><strong>Activación de datos pendiente</strong>' +
      '<p>La siguiente integración se habilitará únicamente con los permisos del servidor.</p></div></div>';
    if (typeof window.ma1612Enhance === 'function') window.ma1612Enhance(area.id, target);
  }
  function open() {
    if (!session()?.jwt) {
      if (typeof window.cc77Auth === 'function') window.cc77Auth(false);
      return;
    }
    mountStyles();
    let layer = $('ma1611layer');
    if (!layer) { layer = layout(); document.body.append(layer); }
    layer.hidden = false;
    renderArea('inmuebles');
    if (typeof window.ma1612OnOpen === 'function') window.ma1612OnOpen();
    layer.querySelector('#ma1611close').focus();
  }
  function close() {
    const layer = $('ma1611layer'); if (layer) layer.hidden = true;
    const dialog = $('ma1612dialog'); if (dialog) dialog.remove();
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
    const observer = new MutationObserver(changes => {
      if (changes.some(change => change.type === 'childList' && change.addedNodes.length)) scheduleMount();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', e => {
      if (e.target.closest('#cc54logout')) close();
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  window.ma1611MiAlquiler = Object.freeze({ open, close, mount });
})();