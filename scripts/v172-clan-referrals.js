/* CLAN CARTAN · Parte 2/7 · Un código CLAN por usuario.
 * Solo consulta códigos y atribuciones reales en Supabase. NO acredita bonos.
 */
(function(){
'use strict';
const by=id=>document.getElementById(id);
const CODE=/^CLAN[1-9][0-9]{0,14}$/;
const moneyRewardNotice='Los premios de S/ 5 por activación REAL se habilitarán con la Parte 4; registrarse o compartir el código no acredita dinero.';
const officialLink=code=>{
 const u=new URL('https://www.clancartan.com/');
 u.searchParams.set('ref',code);u.hash='registro';return u.href;
};
async function copy(text,button){
 button.disabled=true;
 try{
  if(typeof window.cc160CopyText==='function')await window.cc160CopyText(text,button);
  else if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);button.textContent='✓ Copiado';}
  else{window.prompt('Copia el código o enlace:',text);}
 }catch(_){window.prompt('Copia el código o enlace:',text);}
 finally{button.disabled=false;}
}
function button(label,cls,fn){
 const b=document.createElement('button');b.type='button';b.className='cc172-btn '+(cls||'');
 b.textContent=label;b.addEventListener('click',fn);return b;
}
const cell=(tag,value,cls)=>{
 const x=document.createElement(tag);x.className=cls||'';x.textContent=value;return x;
};
async function load(){
 const s=window.CC_V53_SESSION,root=by('cc79logged');
 if(!s?.jwt||!s.userId||!root)return;
 const uid=s.userId;
 by('cc110mycodes')?.remove();
 by('cc172-referrals')?.remove();
 const panel=document.createElement('section');
 panel.id='cc172-referrals';panel.className='cc172-card';panel.setAttribute('aria-label','Mis referidos CLAN');
 const head=document.createElement('div');head.className='cc172-head';
 head.append(cell('span','MIS REFERIDOS CLAN','cc172-kicker'),cell('h3','Un código para tus cuatro negocios'));
 panel.append(head,cell('p','El mismo código sirve para STREAM BULL’S, COBRA YA, MI COCHERA y MI ALQUILER.','cc172-muted'));
 const loading=cell('p','Consultando tu código único y atribuciones reales…','cc172-muted');
 loading.setAttribute('role','status');panel.append(loading);root.append(panel);
 try{
  if(!window.cc80?.api)throw new Error('Sistema de referidos no disponible');
  const result=await window.cc80.api('rpc/cc_clan_my_summary','POST',{});
  if(window.CC_V53_SESSION?.userId!==uid||!panel.isConnected)return;
  const summary=Array.isArray(result)?result[0]:result;
  const code=String(summary?.code||'');
  if(!CODE.test(code))throw Error('Código CLAN no disponible');
  loading.remove();
  const controls=document.createElement('div');controls.className='cc172-code-controls';
  const codeInput=document.createElement('input');codeInput.type='text';codeInput.readOnly=true;
  codeInput.value=code;codeInput.className='cc172-code';codeInput.setAttribute('aria-label','Tu único código de referido');
  const actions=document.createElement('div');actions.className='cc172-actions';
  actions.append(
   button('Copiar código','',function(){void copy(code,this);}),
   button('Copiar enlace','',function(){void copy(officialLink(code),this);}),
   button('Compartir','cc172-share',async function(){
    const url=officialLink(code);
    if(navigator.share){try{await navigator.share({title:'CLAN CARTAN',text:'Mi código de invitación CLAN: '+code,url});}catch(e){if(e?.name!=='AbortError')void copy(url,this);}}
    else await copy(url,this);
   })
  );
  controls.append(codeInput,actions);panel.append(controls);
  const stats=document.createElement('div');stats.className='cc172-stats';
  const count=Number(summary.referrals);
  const stat=document.createElement('div');stat.className='cc172-stat';
  stat.append(cell('strong',Number.isSafeInteger(count)&&count>=0?String(count):'—'),cell('span','Personas registradas con tu código o alias anterior'));
  stats.append(stat);
  const alias=document.createElement('div');alias.className='cc172-stat';
  const old=Number(summary.historical_aliases);
  alias.append(cell('strong',Number.isSafeInteger(old)&&old>=0?String(old):'—'),cell('span','Enlaces antiguos compatibles'));
  stats.append(alias);panel.append(stats);
  const note=cell('p',moneyRewardNotice,'cc172-note');panel.append(note);
  if(Number.isSafeInteger(count)&&count>0){
   const last=cell('h4','Últimos referidos');panel.append(last);
   const container=document.createElement('div');container.className='cc172-recent';panel.append(container);
   try{
    const refs=await window.cc80.api('rpc/cc_clan_my_referrals','POST',{});
    if(window.CC_V53_SESSION?.userId!==uid||!container.isConnected)return;
    for(const entry of (Array.isArray(refs)?refs:[])){
     const row=document.createElement('div');row.className='cc172-ref-item';
     const label=cell('strong',String(entry.label||'Referido'));
     const date=new Date(entry.referred_at);
     const detail=cell('small',Number.isFinite(date.valueOf())?date.toLocaleDateString('es-PE',{day:'2-digit',month:'short',year:'numeric'}):'Fecha pendiente');
     row.append(label,detail);container.append(row);
    }
   }catch(_){container.textContent='No se pudo consultar la lista. Tu código sigue disponible.';}
  }
 }catch(e){
  if(window.CC_V53_SESSION?.userId!==uid||!panel.isConnected)return;
  loading.textContent='No se pudo consultar tu código CLAN. Vuelve a iniciar sesión e intenta nuevamente.';
  loading.setAttribute('data-error','true');
  console.warn('No se pudieron obtener referidos CLAN:',e?.message||e);
 }
}
window.cc172ShowClanReferrals=load;
})();