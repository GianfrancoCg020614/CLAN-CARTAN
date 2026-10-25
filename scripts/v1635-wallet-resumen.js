/* CLAN CARTAN · V163.5 · resumen de saldo REAL de solo lectura.
 * La autoridad del saldo reside en Supabase con RLS (auth.uid = user_id).
 * NO acreditar, transferir, aprobar recargas ni convertir bonos desde JS.
 */
(function () {
  'use strict';
  const SERVICES = Object.freeze([
    ['STREAM_BULLS', "STREAM BULL'S"],
    ['COBRA_YA', 'COBRA YA'],
    ['MI_COCHERA', 'MI COCHERA'],
    ['MI_ALQUILER', 'MI ALQUILER']
  ]);
  const by = id => document.getElementById(id);
  let activeUser = null, activeToken = null, generation = 0, inFlight = false;

  function toCents(value) {
    const match = /^(0|[1-9]\d{0,12})(?:\.(\d{1,2}))?$/.exec(String(value));
    if (!match) throw new Error('Importe no válido');
    const cents = Number(match[1]) * 100 + Number((match[2] || '').padEnd(2, '0'));
    if (!Number.isSafeInteger(cents) || cents < 0) throw new Error('Saldo no válido');
    return cents;
  }
  function format(cents) {
    return 'S/ ' + (cents / 100).toLocaleString('es-PE', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }
  function reset() {
    generation++;
    activeUser = null;
    activeToken = null;
    inFlight = false;
    by('cc164-wallet')?.remove();
    const previous = by('cc116-account-balances');
    if (previous) previous.hidden = false;
  }
  function mount() {
    const parent = by('cc95-user');
    if (!parent || !by('cc77home')) return null;
    if (by('cc164-wallet')) return by('cc164-wallet');
    const section = document.createElement('section');
    section.id = 'cc164-wallet';
    section.className = 'cc164-wallet';
    section.setAttribute('aria-label', 'Saldo real consolidado de cuatro servicios');
    section.innerHTML =
      '<div class="cc164-wallet-top"><div><span class="cc164-kicker">SALDO REAL VERIFICADO · TOTAL</span>' +
      '<strong id="cc164-total" role="status">Consultando…</strong></div>' +
      '<button type="button" id="cc164-wallet-reload" aria-label="Actualizar saldo real">↻</button></div>' +
      '<div class="cc164-balances" id="cc164-wallet-breakdown"></div>' +
      '<small class="cc164-wallet-note">Montos en PEN. Bonos de activación ADMIN, recompensas no aprobadas y recargas pendientes no son dinero real.</small>';
    const previous = by('cc116-account-balances');
    if (previous) previous.after(section);
    else parent.append(section);
    by('cc164-wallet-reload')?.addEventListener('click', () => { void refresh(); });
    return section;
  }
  function fresh(user, token, request) {
    const session = window.CC_V53_SESSION;
    return generation === request && session?.userId === user && session?.jwt === token &&
      !!by('cc164-wallet');
  }
  async function refresh() {
    const session = window.CC_V53_SESSION;
    if (!session?.jwt || !session?.userId || !window.cc80?.api) {
      reset();
      return;
    }
    const panel = mount();
    if (!panel) return;
    const user = session.userId, token = session.jwt, request = ++generation;
    activeUser = user;
    activeToken = token;
    inFlight = true;
    const total = by('cc164-total'), button = by('cc164-wallet-reload');
    if (button) button.disabled = true;
    // Evitar que saldos de la sesión anterior queden visibles mientras se consulta otra.
    panel.classList.remove('cc164-wallet-loaded');
    const breakdown = by('cc164-wallet-breakdown');
    if (breakdown) breakdown.replaceChildren();
    const previousBalances = by('cc116-account-balances');
    if (previousBalances) previousBalances.hidden = false;
    if (total) total.textContent = 'Consultando…';
    try {
      const endpoint = 'cc_real_service_wallets?select=service,balance_pen&user_id=eq.' +
        encodeURIComponent(user);
      const rows = await window.cc80.api(endpoint);
      if (!fresh(user, token, request)) return;
      if (!Array.isArray(rows)) throw new Error('Respuesta inválida');
      const balances = new Map();
      for (const row of rows) {
        if (!SERVICES.some(([code]) => code === row.service)) continue;
        if (balances.has(row.service)) throw new Error('Billetera duplicada');
        balances.set(row.service, toCents(row.balance_pen));
      }
      const sum = SERVICES.reduce((acc, [code]) => acc + (balances.get(code) || 0), 0);
      if (!Number.isSafeInteger(sum)) throw new Error('Saldo agregado inválido');
      const details = by('cc164-wallet-breakdown');
      if (!details || !total) return;
      details.replaceChildren();
      for (const [code, label] of SERVICES) {
        const row = document.createElement('div'), name = document.createElement('span'),
          amount = document.createElement('strong');
        row.className = 'cc164-balance';
        name.textContent = label;
        amount.textContent = format(balances.get(code) || 0);
        row.append(name, amount);
        details.append(row);
      }
      total.textContent = format(sum);
      panel.classList.add('cc164-wallet-loaded');
      // El control de transferencias continúa existiendo; se oculta solo el
      // bloque antiguo de saldos, y únicamente tras una lectura verificada.
      const previous = by('cc116-account-balances');
      if (previous) previous.hidden = true;
    } catch (_) {
      if (!fresh(user, token, request)) return;
      if (total) total.textContent = 'No disponible';
      const details = by('cc164-wallet-breakdown');
      if (details) details.textContent = 'No se pudo verificar el saldo. Pulsa ↻ para reintentar.';
      const previous = by('cc116-account-balances');
      if (previous) previous.hidden = false;
    } finally {
      if (fresh(user, token, request)) {
        inFlight = false;
        if (button) button.disabled = false;
      }
    }
  }
  function sync() {
    const session = window.CC_V53_SESSION;
    if (!session?.jwt || !session?.userId) {
      if (activeUser !== null || by('cc164-wallet')) reset();
      return;
    }
    if (session.userId !== activeUser || session.jwt !== activeToken || !by('cc164-wallet')) {
      void refresh();
    }
  }
  function init() {
    sync();
    // Auth existente no se sustituye. Reactivar después del login o logout
    // atendiendo los cambios visuales del portal; no se guardan saldos locales.
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; sync(); });
    });
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['hidden', 'style', 'class']
    });
    document.addEventListener('click', event => {
      if (event.target.closest?.('#cc54logout')) reset();
    }, true);
    window.addEventListener('focus', sync);
  }
  window.cc164AfterLogin = () => { void refresh(); };
  window.cc164RefreshRealWallet = () => { void refresh(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else init();
})();