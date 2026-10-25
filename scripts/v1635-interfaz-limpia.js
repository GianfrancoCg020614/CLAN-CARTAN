/* CLAN CARTAN · Paso 1 · Interfaz limpia / V163.5.
 * Agrupa opciones secundarias con <details> nativos. Nunca elimina controles,
 * cambia lógica Auth, envía solicitudes, modifica saldos ni realiza pagos.
 */
(function () {
  'use strict';
  const by = id => document.getElementById(id);
  let scheduled = false;

  function foldSection(id, label) {
    const section = by(id);
    if (!section || section.dataset.cc165Folded === 'true') return;
    const details = document.createElement('details');
    details.className = 'cc165-fold';
    const summary = document.createElement('summary');
    summary.textContent = label;
    const body = document.createElement('div');
    body.className = 'cc165-fold-body';
    // Mover nodos mantiene IDs, valores y listeners ya asociados.
    while (section.firstChild) body.appendChild(section.firstChild);
    details.append(summary, body);
    section.appendChild(details);
    section.dataset.cc165Folded = 'true';
  }

  function simplifyManualRecharge() {
    const card = by('cc147manualQr');
    const grid = card?.querySelector('.cc147-qr-grid');
    const paid = by('cc148alreadyPaid');
    if (!card || !grid || !paid || card.dataset.cc165Simple === 'true') return;
    const details = document.createElement('details');
    details.className = 'cc165-pay-methods';
    const summary = document.createElement('summary');
    summary.textContent = 'Ver medios de pago y confirmar';
    const body = document.createElement('div');
    body.className = 'cc165-pay-methods-body';
    card.insertBefore(details, grid);
    body.append(grid, paid);
    details.append(summary, body);
    card.dataset.cc165Simple = 'true';
    const title = card.querySelector('h3');
    if (title) title.textContent = 'Recargar saldo';
    // La advertencia sobre medios NO autorizados permanece visible fuera del desplegable.
  }

  function simplifyCochera() {
    const layer = by('mc158layer');
    if (!layer) return;
    layer.querySelectorAll('.mc158cart .mc158actions').forEach(actions => {
      if (actions.dataset.cc165Simple === 'true') return;
      const buttons = Array.from(actions.children).filter(node => node.tagName === 'BUTTON');
      if (buttons.length < 3) return;
      const details = document.createElement('details');
      details.className = 'mc165-more';
      const summary = document.createElement('summary');
      summary.textContent = 'Más opciones';
      const grid = document.createElement('div');
      grid.className = 'mc165-more-grid';
      buttons.slice(1).forEach(button => grid.appendChild(button));
      details.append(summary, grid);
      actions.appendChild(details);
      actions.dataset.cc165Simple = 'true';
      // Cobrar permanece visible; historial, ventas, WhatsApp y estado se conservan.
    });
  }

  function unfold(id) {
    const details = by(id)?.querySelector(':scope > details.cc165-fold');
    if (details) details.open = true;
  }

  function simplify() {
    const wallet = by('cc80wallet');
    if (wallet) {
      simplifyManualRecharge();
      [
        ['cc122section', 'Recarga automática · pendiente de habilitación'],
        ['cc136manual', 'Más información sobre recargas manuales'],
        ['cc132movements', 'Movimientos, filtros y exportaciones'],
        ['cc151operations', 'Mis solicitudes de recarga'],
        ['cc143activate', 'Bono de bienvenida (si está disponible)'],
        ['cc136admin', 'ADMIN · Solicitudes pendientes'],
        ['cc143bonus', 'ADMIN · Bonos de activación'],
        ['cc143report', 'ADMIN · Resumen financiero y auditoría'],
        ['cc146admin', 'ADMIN · Acreditar pagos verificados']
      ].forEach(([id,label]) => foldSection(id,label));
    }
    simplifyCochera();
    if (typeof window.cc132OpenMovements === 'function' &&
        !window.cc132OpenMovements.cc165Wrapped) {
      const original = window.cc132OpenMovements;
      const wrapped = function (...args) {
        unfold('cc132movements');
        return original.apply(this, args);
      };
      wrapped.cc165Wrapped = true;
      window.cc132OpenMovements = wrapped;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; simplify(); });
  }

  function init() {
    simplify();
    // Los módulos se dibujan después del login o se reconstruyen al buscar.
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('click', event => {
      const target = event.target;
      if (!target?.closest) return;
      if (target.closest('#cc132jump')) unfold('cc132movements');
      if (target.closest('#cc151requests button')) unfold('cc146admin');
      if (target.closest('#cc136goManual')) {
        // El control histórico desplaza al formulario antiguo: dirigir
        // a la versión simplificada conservando su comportamiento de sesión.
        setTimeout(() => {
          const card = by('cc147manualQr');
          if (!card) return;
          card.scrollIntoView({ behavior: 'smooth', block: 'start' });
          card.querySelector('#cc148amount')?.focus({ preventScroll: true });
        }, 80);
      }
    }, true);
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();