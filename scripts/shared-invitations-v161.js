/* CLAN CARTAN V161 — Parte 3. Componente compartido de invitaciones.
   Solo interfaz. Validar código y guardar atribución una sola vez en Supabase
   mediante RPC/trigger V110; nunca usar datos del navegador para pagar bonos. */
(function () {
  'use strict';
  const HOME = 'https://www.clancartan.com/';
  const PREFIXES = Object.freeze({ CLAN:'CLAN CARTAN', COBRA: 'COBRA YA', BULL: "STREAM BULL'S", COCHERA: 'MI COCHERA', ALQUILER:'MI ALQUILER' });
  const clean = value => String(value == null ? '' : value).trim().toUpperCase();
  const parse = value => {
    const code = clean(value);
    const match = /^(CLAN|COCHERA|COBRA|BULL|ALQUILER)([1-9][0-9]*)$/.exec(code);
    return match ? Object.freeze({code, business: PREFIXES[match[1]], prefix: match[1]}) : null;
  };
  function incomingCode() {
    try {
      const params = new URLSearchParams(window.location.search);
      return parse(params.get('ref') || params.get('invite') || params.get('codigo'));
    } catch (_) { return null; }
  }
  function invitationUrl(rawCode) {
    const item = parse(rawCode);
    if (!item) return null;
    const url = new URL(HOME);
    url.searchParams.set('ref', item.code);
    return url.toString();
  }
  function prefillRegistration(root = document) {
    const item = incomingCode();
    if (!item) return null;
    // Selector V110 más identificadores neutrales; nunca reemplazar texto existente.
    const field = root.querySelector('#cc110-invite, [data-cc-invitation-input], input[name="invitation_code"]');
    if (field && !field.value.trim()) {
      field.value = item.code;
      field.dispatchEvent(new Event('input', {bubbles: true}));
      field.dispatchEvent(new Event('change', {bubbles: true}));
    }
    return item;
  }
  async function validateCode(supabaseClient, rawCode) {
    const item = parse(rawCode);
    if (!item) return {valid:false, business:null};
    if (!supabaseClient || typeof supabaseClient.rpc !== 'function') throw new Error('Supabase no disponible');
    const {data,error} = await supabaseClient.rpc('cc_clan_validate_code', {p_code:item.code});
    if (error) throw error;
    // La forma de retorno de RPC debe confirmarse contra V161 antes de integrar.
    return {valid:Array.isArray(data)&&data[0]?.valid===true,raw:data,code:item.code,business:item.business};
  }
  function renderOwnedCodes(root, ownedCodes) {
    if (!root) return;
    root.replaceChildren();
    (Array.isArray(ownedCodes) ? ownedCodes : []).forEach(entry => {
      const item = parse(typeof entry === 'string' ? entry : (entry?.code || entry?.invitation_code));
      if (!item) return;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:8px 0';
      const info = document.createElement('span');
      info.textContent = item.business + ' · ' + item.code;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Copiar enlace';
      btn.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(invitationUrl(item.code)); btn.textContent = 'Enlace copiado'; }
        catch (_) { btn.textContent = 'No se pudo copiar'; }
      });
      row.append(info,btn); root.appendChild(row);
    });
  }
  window.ClanCartanInvitations = Object.freeze({
    parse, incomingCode, invitationUrl, prefillRegistration, validateCode, renderOwnedCodes
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => prefillRegistration());
  } else { prefillRegistration(); }
})();