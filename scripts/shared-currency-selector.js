/* CLAN CARTAN — selector común de monedas para todos los módulos.
 * Moneda contable: PEN. Conversiones solo con tasas verificadas provistas por backend.
 * Uso: incluir este script y un contenedor <div data-cc-currency-selector></div>.
 */
(function () {
  'use strict';
  const KEY = 'clancartan.displayCurrency';
  const LIST = Object.freeze([
    { code: 'PEN', flag: '🇵🇪', name: 'Sol peruano', locale: 'es-PE' },
    { code: 'USD', flag: '🇺🇸', name: 'Dólar estadounidense', locale: 'en-US' },
    { code: 'EUR', flag: '🇪🇺', name: 'Euro', locale: 'de-DE' },
    { code: 'COP', flag: '🇨🇴', name: 'Peso colombiano', locale: 'es-CO' },
    { code: 'MXN', flag: '🇲🇽', name: 'Peso mexicano', locale: 'es-MX' },
    { code: 'ARS', flag: '🇦🇷', name: 'Peso argentino', locale: 'es-AR' },
    { code: 'CLP', flag: '🇨🇱', name: 'Peso chileno', locale: 'es-CL' },
    { code: 'BOB', flag: '🇧🇴', name: 'Boliviano', locale: 'es-BO' }
  ]);
  const valid = code => LIST.some(item => item.code === code);
  const read = () => {
    try { const x = localStorage.getItem(KEY); return valid(x) ? x : 'PEN'; }
    catch (_) { return 'PEN'; }
  };
  let selected = read();
  function setCurrency(code) {
    if (!valid(code)) return false;
    selected = code;
    try { localStorage.setItem(KEY, code); } catch (_) {}
    document.querySelectorAll('[data-cc-currency-selector] select').forEach(el => {
      if (el.value !== code) { el.value = code; el.dispatchEvent(new Event('cc-currency-sync')); }
    });
    window.dispatchEvent(new CustomEvent('clancartan:currency-change', { detail: { code } }));
    return true;
  }
  // Flag images are rendered separately: native SELECT emoji flags are not reliable on Windows.
  const COUNTRIES = Object.freeze({PEN:'pe',USD:'us',EUR:'eu',COP:'co',MXN:'mx',ARS:'ar',CLP:'cl',BOB:'bo'});
  function mount(root) {
    if (root.querySelector('select')) return;
    const wrap=document.createElement('label');
    wrap.style.cssText='display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;font:inherit;color:inherit;max-width:100%';
    const title=document.createElement('span');title.textContent='🌐 Moneda';
    const flag=document.createElement('img');
    flag.width=30;flag.height=21;flag.alt='Bandera de moneda seleccionada';
    flag.style.cssText='width:30px;height:21px;object-fit:cover;border-radius:3px;border:1px solid #aaa;';
    const select=document.createElement('select');
    select.setAttribute('aria-label','Moneda de visualización');
    select.style.cssText='min-width:205px;max-width:100%;border-radius:10px;padding:9px 12px;background:#15171c;color:#fff;border:1px solid #8d7544;font:inherit;';
    LIST.forEach(item=>{
      const option=document.createElement('option');option.value=item.code;
      option.textContent=item.code+' — '+item.name;
      select.appendChild(option);
    });
    function showFlag(){
      const item=LIST.find(x=>x.code===select.value)||LIST[0];
      flag.alt='Bandera '+item.flag+' de '+item.name;
      flag.src='https://flagcdn.com/w40/'+COUNTRIES[item.code]+'.png';
      flag.onerror=()=>{flag.replaceWith(document.createTextNode(item.flag));};
    }
    select.value=selected;showFlag();
    select.addEventListener('change',()=>{showFlag();setCurrency(select.value)});
    select.addEventListener('cc-currency-sync',showFlag);
    wrap.append(title,flag,select);root.appendChild(wrap);
  }
  function mountAll() {
    document.querySelectorAll('[data-cc-currency-selector]').forEach(mount);
  }
  function format(amount, code = selected) {
    const item = LIST.find(x => x.code === code);
    if (!item || !Number.isFinite(Number(amount))) return '—';
    return new Intl.NumberFormat(item.locale, { style: 'currency', currency: code }).format(Number(amount));
  }
  /* rates = {USD: 0.27,...} representa unidades de destino por 1 PEN.
   * Llamador debe obtener y validar tasa real, vigencia y eventual margen antes de usarlo.
   * Nunca usar conversiones visuales como importe de cobro, saldo contable o USDT acreditado.
   */
  function displayFromPEN(penAmount, rates) {
    if (!Number.isFinite(Number(penAmount))) return null;
    if (selected === 'PEN') return format(penAmount, 'PEN');
    const rate = rates && Number(rates[selected]);
    return Number.isFinite(rate) && rate > 0 ? format(Number(penAmount) * rate, selected) : null;
  }
  window.ClanCartanCurrency = Object.freeze({
    currencies: LIST, getCurrency: () => selected, setCurrency, mountAll, format, displayFromPEN
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
  window.addEventListener('storage', e => {
    if (e.key === KEY && valid(e.newValue)) setCurrency(e.newValue);
  });
})();