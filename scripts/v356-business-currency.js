/* V356 · Moneda de operación compartida SOLO por MI COCHERA, MI ALQUILER y COBRA YA.
   Sin tipos de cambio, conversiones, pagos comerciales ni cambios a STREAM BULL'S. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const countries={
 PE:['🇵🇪','Perú','PEN','es-PE'],US:['🇺🇸','Estados Unidos','USD','en-US'],
 ES:['🇪🇸','España','EUR','es-ES'],AT:['🇦🇹','Austria','EUR','de-AT'],BE:['🇧🇪','Bélgica','EUR','fr-BE'],CY:['🇨🇾','Chipre','EUR','el-CY'],DE:['🇩🇪','Alemania','EUR','de-DE'],EE:['🇪🇪','Estonia','EUR','et-EE'],FI:['🇫🇮','Finlandia','EUR','fi-FI'],FR:['🇫🇷','Francia','EUR','fr-FR'],GR:['🇬🇷','Grecia','EUR','el-GR'],HR:['🇭🇷','Croacia','EUR','hr-HR'],IE:['🇮🇪','Irlanda','EUR','en-IE'],IT:['🇮🇹','Italia','EUR','it-IT'],LT:['🇱🇹','Lituania','EUR','lt-LT'],LU:['🇱🇺','Luxemburgo','EUR','fr-LU'],LV:['🇱🇻','Letonia','EUR','lv-LV'],MT:['🇲🇹','Malta','EUR','en-MT'],NL:['🇳🇱','Países Bajos','EUR','nl-NL'],PT:['🇵🇹','Portugal','EUR','pt-PT'],SI:['🇸🇮','Eslovenia','EUR','sl-SI'],SK:['🇸🇰','Eslovaquia','EUR','sk-SK'],
 CO:['🇨🇴','Colombia','COP','es-CO'],MX:['🇲🇽','México','MXN','es-MX'],AR:['🇦🇷','Argentina','ARS','es-AR'],CL:['🇨🇱','Chile','CLP','es-CL'],BO:['🇧🇴','Bolivia','BOB','es-BO'],BR:['🇧🇷','Brasil','BRL','pt-BR'],UY:['🇺🇾','Uruguay','UYU','es-UY'],PY:['🇵🇾','Paraguay','PYG','es-PY'],CR:['🇨🇷','Costa Rica','CRC','es-CR'],DO:['🇩🇴','República Dominicana','DOP','es-DO'],CA:['🇨🇦','Canadá','CAD','en-CA'],GB:['🇬🇧','Reino Unido','GBP','en-GB'],GT:['🇬🇹','Guatemala','GTQ','es-GT'],VE:['🇻🇪','Venezuela','VES','es-VE']
};
let cachedUser=null,profile=null,loading=null;
const session=()=>window.CC_V53_SESSION;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function currencyLabel(code){const x=Object.values(countries).find(v=>v[2]===code);return (x?.[0]||'🌐')+' '+code;}
function setGlobals(p){
 profile=p;cachedUser=session()?.userId||null;
 window.CC_BUSINESS_COUNTRY=p.country;
 window.CC_BUSINESS_CURRENCY=p.currency;
 window.ccFormatBusinessCurrency=(amount,code)=>{const cur=String(code||window.CC_BUSINESS_CURRENCY||'PEN').toUpperCase();const country=Object.values(countries).find(x=>x[2]===cur);try{return new Intl.NumberFormat(country?.[3]||'es-PE',{style:'currency',currency:cur}).format(Number(amount||0));}catch(_){return cur+' '+Number(amount||0).toFixed(2);}};
 window.dispatchEvent(new CustomEvent('cc-business-currency-ready',{detail:{country:p.country,currency:p.currency}}));
 updateControls();applyLoanCurrency();
 return p;
}
async function loadBusinessCurrency(force=false){
 const s=session();if(!s?.jwt||!s.userId||!window.cc80?.api)return null;
 if(!force&&cachedUser===s.userId&&profile)return profile;
 if(loading&&!force)return loading;
 const user=s.userId;
 loading=(async()=>{
  try{
   const rows=await window.cc80.api('cc_profiles?select=business_country,business_currency&user_id=eq.'+encodeURIComponent(user));
   if(session()?.userId!==user)return null;
   const row=Array.isArray(rows)?rows[0]:rows;
   const country=row?.business_country||'PE';
   const currency=row?.business_currency||countries[country]?.[2]||'PEN';
   return setGlobals({country,currency});
  }catch(error){
   console.warn('CLAN CARTAN: no se pudo leer la moneda de operación.',error);
   if(session()?.userId===user&&profile)return profile;
   return setGlobals({country:'PE',currency:'PEN'});
  }finally{loading=null;}
 })();
 return loading;
}
function applyLoanCurrency(){
 if(!profile||!session()?.jwt)return;
 const form=$('cy53loan'),select=form?.elements?.namedItem('currency');
 if(!select||select.dataset.ccBusinessCurrency===profile.currency)return;
 const meta=countries[profile.country]||['🌐','Moneda internacional',profile.currency,'es-PE'];
 const option=document.createElement('option');option.value=profile.currency;option.textContent=meta[0]+' '+profile.currency+' — '+meta[1];
 select.replaceChildren(option);select.value=profile.currency;select.dataset.ccBusinessCurrency=profile.currency;
 const label=select.closest('label');if(label?.firstChild?.nodeType===Node.TEXT_NODE)label.firstChild.textContent='Moneda de operación compartida ';
 let note=form.querySelector('[data-cc-business-currency-note]');
 if(!note){note=document.createElement('small');note.dataset.ccBusinessCurrencyNote='true';select.closest('label')?.after(note);}
 if(note)note.textContent='Se aplica a los nuevos préstamos de MI COCHERA, MI ALQUILER y COBRA YA. Los préstamos anteriores conservan su moneda. No se realizan conversiones.';
 select.dispatchEvent(new Event('change',{bubbles:true}));
}
function updateControls(){
 const label=currencyLabel(profile?.currency||'PEN');
 const ma=$('ma1611layer');
 if(ma&&!ma.hidden&&getComputedStyle(ma).display!=='none'){
  const head=ma.querySelector('.ma1611-head'),close=$('ma1611close');
  if(head&&close){let ctl=head.querySelector('[data-cc-currency-control]');if(!ctl){ctl=document.createElement('div');ctl.dataset.ccCurrencyControl='true';ctl.className='cc356-currency-control';const txt=document.createElement('span');txt.className='cc356-currency-label';const b=document.createElement('button');b.type='button';b.dataset.ccOpenBusinessCurrency='true';b.textContent='Cambiar moneda';ctl.append(txt,b);close.before(ctl);}const txt=ctl.querySelector('.cc356-currency-label'),next='🌐 '+label;if(txt&&txt.textContent!==next)txt.textContent=next;}
 }
 const cy=$('cy53layer');
 if(cy&&getComputedStyle(cy).display!=='none'){
  const nav=cy.querySelector('.cy114-nav');
  if(nav){let ctl=nav.querySelector('[data-cc-currency-control]');if(!ctl){ctl=document.createElement('div');ctl.dataset.ccCurrencyControl='true';ctl.className='cc356-currency-control';const txt=document.createElement('span');txt.className='cc356-currency-label';const b=document.createElement('button');b.type='button';b.dataset.ccOpenBusinessCurrency='true';b.textContent='Cambiar moneda';ctl.append(txt,b);nav.prepend(ctl);}const txt=ctl.querySelector('.cc356-currency-label'),next='🌐 '+label;if(txt&&txt.textContent!==next)txt.textContent=next;}
 }
 const mc=$('mc158layer');
 if(mc&&getComputedStyle(mc).display!=='none'){
  const actions=mc.querySelector('.mc158top-actions');
  if(actions){let ctl=actions.querySelector('[data-cc-currency-control]');if(!ctl){ctl=document.createElement('div');ctl.dataset.ccCurrencyControl='true';ctl.className='cc356-currency-control';const txt=document.createElement('span');txt.className='cc356-currency-label';const b=document.createElement('button');b.type='button';b.dataset.ccOpenBusinessCurrency='true';b.textContent='Cambiar';ctl.append(txt,b);actions.prepend(ctl);}const txt=ctl.querySelector('.cc356-currency-label');if(txt&&txt.textContent!==label)txt.textContent=label;}
 }
}
function closeSettings(){$('cc356-currency-modal')?.remove();}
function openSettings(){
 if(!session()?.jwt){window.cc77Auth?.(false);return;}
 void loadBusinessCurrency().then(()=>{
  const p=profile||{country:'PE',currency:'PEN'};
  closeSettings();
  const overlay=document.createElement('div');overlay.id='cc356-currency-modal';overlay.className='cc356-currency-overlay';
  const panel=document.createElement('section');panel.className='cc356-currency-dialog';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Moneda de operación');
  const heading=document.createElement('header');const title=document.createElement('h3');title.textContent='Moneda de operación';const close=document.createElement('button');close.type='button';close.textContent='✕';close.setAttribute('aria-label','Cerrar');close.onclick=closeSettings;heading.append(title,close);
  const desc=document.createElement('p');desc.textContent='Una sola moneda para MI COCHERA, MI ALQUILER y COBRA YA. No hay tipo de cambio ni conversión automática. STREAM BULL’S no se modifica.';
  const form=document.createElement('form');form.id='cc356-currency-form';
  const lab=document.createElement('label');lab.textContent='País de operación';
  const select=document.createElement('select');select.name='country';select.required=true;
  Object.entries(countries).forEach(([code,meta])=>{const op=document.createElement('option');op.value=code;op.textContent=meta[0]+' '+meta[1]+' · '+meta[2];if(code===p.country)op.selected=true;select.append(op);});
  lab.append(select);
  const preview=document.createElement('div');preview.className='cc356-currency-preview';
  const previewLabel=document.createElement('small');previewLabel.textContent='MONEDA QUE USARÁN LOS TRES MÓDULOS';
  const previewCode=document.createElement('strong');previewCode.textContent=p.currency;preview.append(previewLabel,previewCode);
  const info=document.createElement('small');info.className='cc356-currency-info';info.textContent='Los registros existentes conservarán su moneda. Si hay importes en otra moneda, el sistema bloqueará el cambio para evitar alterar saldos.';
  const status=document.createElement('p');status.id='cc356-currency-status';status.setAttribute('role','status');
  const save=document.createElement('button');save.type='submit';save.textContent='Guardar moneda';
  form.append(lab,preview,info,save,status);panel.append(heading,desc,form);overlay.append(panel);document.body.append(overlay);
  const update=()=>{const meta=countries[select.value];previewCode.textContent=meta?.[2]||'PEN';};
  select.addEventListener('change',update);
  overlay.addEventListener('click',e=>{if(e.target===overlay)closeSettings();});
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(save.disabled)return;save.disabled=true;status.textContent='Guardando preferencia compartida…';
   try{
    const country=select.value,currency=countries[country][2];
    await window.cc80.api('rpc/cc_set_business_currency','POST',{p_country:country,p_currency:currency});
    await loadBusinessCurrency(true);closeSettings();
    document.dispatchEvent(new CustomEvent('cc-business-currency-change',{detail:{country,currency}}));
    if($('mc158layer')&&getComputedStyle($('mc158layer')).display!=='none')await window.mc158Open?.();
    if($('ma1611layer')&&!$('ma1611layer').hidden&&getComputedStyle($('ma1611layer')).display!=='none')await window.ma1612OnOpen?.();
    applyLoanCurrency();updateControls();
   }catch(error){status.textContent=String(error.message||error);}
   finally{save.disabled=false;}
  });
 });
}
function init(){
 document.addEventListener('cc192-session-ended',()=>{cachedUser=null;profile=null;window.CC_BUSINESS_COUNTRY='PE';window.CC_BUSINESS_CURRENCY='PEN';});
 const style=document.createElement('style');style.id='cc356-currency-style';style.textContent='.cc356-currency-control{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;padding:6px 9px;border:1px solid rgba(65,190,220,.35);border-radius:12px;background:rgba(10,30,45,.86);color:#e8f8ff;font-size:12px}.cc356-currency-control button{border:1px solid #2dbbd2;border-radius:8px;background:#0d5267;color:#fff;padding:7px 10px;font-weight:700;cursor:pointer}.cc356-currency-label{font-weight:800;white-space:nowrap}.cc356-currency-overlay{position:fixed;inset:0;z-index:2147483647;background:#020812d9;display:flex;align-items:center;justify-content:center;padding:16px}.cc356-currency-dialog{width:min(460px,100%);max-height:90vh;overflow:auto;background:#102238;color:#eff8ff;border:1px solid #2b617d;border-radius:18px;padding:22px;box-shadow:0 22px 70px #0009}.cc356-currency-dialog header{display:flex;align-items:center;justify-content:space-between;gap:12px}.cc356-currency-dialog h3{margin:0;font-size:22px}.cc356-currency-dialog header button{background:transparent;color:#fff;border:0;font-size:22px;cursor:pointer}.cc356-currency-dialog p{line-height:1.5;color:#c2d6e5}.cc356-currency-dialog form{display:grid;gap:12px}.cc356-currency-dialog label{display:grid;gap:7px;font-weight:700}.cc356-currency-dialog select{width:100%;padding:12px;border:1px solid #3b6480;border-radius:10px;background:#071728;color:#fff}.cc356-currency-preview{display:grid;gap:5px;padding:13px;border-radius:12px;background:#0b3344;border:1px solid #226b7e}.cc356-currency-preview strong{font-size:24px;color:#79e7f3}.cc356-currency-info{color:#bed3e3;line-height:1.45}.cc356-currency-dialog form>button{padding:12px;border:0;border-radius:10px;background:#087e9b;color:#fff;font-weight:800;cursor:pointer}.cc356-currency-dialog form>button:disabled{opacity:.6}.cc356-currency-dialog #cc356-currency-status{min-height:1.2em;color:#ffcf8c;overflow-wrap:anywhere}@media(max-width:520px){.cc356-currency-control{font-size:11px}.cc356-currency-control button{padding:6px 8px}.cc356-currency-dialog{padding:17px}}';
 document.head.append(style);
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-cc-open-business-currency]')){e.preventDefault();openSettings();return;}
  if(e.target.closest('#cy53open,[onclick*="cc79Cobra"],[data-cy75-go="cy53loan"]')){setTimeout(()=>void loadBusinessCurrency().then(()=>{applyLoanCurrency();updateControls();}),0);}
 });
 const observer=new MutationObserver(()=>{if(!profile&&session()?.jwt)void loadBusinessCurrency();updateControls();applyLoanCurrency();});
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['style','hidden','class']});
 void loadBusinessCurrency();
}
window.ccLoadBusinessCurrency=loadBusinessCurrency;
window.ccOpenBusinessCurrencySettings=openSettings;
window.ccFormatBusinessCurrency=(amount,code)=>{const cur=String(code||'PEN');try{return new Intl.NumberFormat('es-PE',{style:'currency',currency:cur}).format(Number(amount||0));}catch(_){return cur+' '+Number(amount||0).toFixed(2);}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();