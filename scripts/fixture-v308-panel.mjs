// Datos ficticios: nunca carga credenciales ni escribe en un servidor.
import fs from 'node:fs';
export function panelFixture(mode='admin'){
 const css=['v246-admin-users','v166-portal-roles','v171-admin-simple','v176-admin-console','v177-panel-unico','v308-panel-navigation'].map(p=>fs.readFileSync('styles/'+p+'.css','utf8')).join('\n')+'\n'+fs.readFileSync('styles/v389-stream-premium.css','utf8');
 const js=fs.readFileSync('scripts/v166-portal-roles.js','utf8');
 const users=[{user_id:'admin-test',registry_no:1,registry_code:'CLAN1',registry_alias:'Administrador',email:'admin@ejemplo.test',role_assigned:'ADMIN',is_admin:true},
 {user_id:'super-test',registry_no:2,registry_code:'CLAN2',registry_alias:'José Ejemplo',email:'super@ejemplo.test',role_assigned:'SUPER_RESELLER',super_enabled:true,paid_until:'2099-12-31'},
 {user_id:'reseller-test',registry_no:3,registry_code:'CLAN3',registry_alias:'Reseller pendiente',email:'reseller@ejemplo.test',role_assigned:'RESELLER',phone:'+51999999999'}];
 const setup=`window.CC_V53_SESSION={userId:'fixture-user',jwt:'FIXTURE-ONLY-NO-REAL-JWT'};
 window.__requests=[];window.__errors=[];window.addEventListener('error',e=>__errors.push(e.message));
 window.cc80={open(){},api:async(p,m,b)=>{__requests.push(p);
 if(/set_super|set_registry|grant_bonus|assisted_recharge|decide_manual|purchase/i.test(p))throw Error('Escritura prohibida en fixture');
 if(p.startsWith('cc_admins?'))return ${mode==='admin'?'[{user_id:"fixture-user"}]':'[]'};
 if(p.startsWith('cc_memberships?'))return ${mode==='admin'?'[]':JSON.stringify([{id:'member',business_id:'stream',role:mode==='super'?'SUPER_RESELLER':'RESELLER',status:'ACTIVE'}])};
 if(p.startsWith('cc_subscriptions?'))return [{membership_id:'member',status:'ACTIVE',start_at:'2026-01-01',end_at:'2099-12-31'}];
 if(p.startsWith('cc_portal_super_resellers?'))return ${mode==='super'?'[{user_id:"fixture-user",enabled:true,admin_percent:20}]':'[]'};
 if(p.startsWith('cc_businesses?'))return [{id:'stream',code:'STREAM_BULLS'}];
 if(p==='rpc/cc_portal_admin_accounts_v2')return ${JSON.stringify(users)};
 if(p==='rpc/cc_admin_manual_recharge_status_v189')return [{enabled:true}];
 if(p==='rpc/cc_admin_financial_summary')return {};
 return [];}};window.cc77Home=()=>{};`;
 const probe=`(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(800);
 const q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
 const checks={},isVisible=e=>!!e&&e.getBoundingClientRect().width>0;
 const go=label=>{const b=all('.cc166-navitem').find(x=>x.getAttribute('aria-label')===label||x.textContent.includes(label));if(!b)throw Error('Sin destino '+label);b.click();};
 try{
 checks.noHorizontalNav=q('.cc166-sidebar').scrollWidth<=q('.cc166-sidebar').clientWidth+1&&q('#cc166-nav').getBoundingClientRect().right<=innerWidth+1;
 checks.primaryCount=all('.cc308-nav-primary>.cc166-navitem').length===3;
 checks.role=${JSON.stringify(mode)}==='admin'?q('#cc166-role').textContent.includes('ADMIN'):${JSON.stringify(mode)}==='super'?q('#cc166-role').textContent.includes('SÚPER'):q('#cc166-role').textContent.includes('RESELLER');
 checks.adminScoped=all('.cc166-navitem').some(b=>b.textContent.includes('Usuarios'))===(${JSON.stringify(mode)}==='admin');
 checks.publishScoped=all('.cc166-navitem').some(b=>b.textContent.includes('Mis publicaciones'))===(${JSON.stringify(mode)}==='super');
 if(innerWidth<=560&&q('#cc308-more')){
  checks.moreClosed=!isVisible(q('.cc308-nav-secondary'));
  q('#cc308-more')?.click();checks.moreOpens=isVisible(q('.cc308-nav-secondary'))&&q('#cc308-more').getAttribute('aria-expanded')==='true';
  checks.moreFocus=document.activeElement===q('.cc308-nav-secondary button');
  q('#cc308-more').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  checks.escapeCloses=!isVisible(q('.cc308-nav-secondary'))&&document.activeElement===q('#cc308-more');
  q('#cc308-more').click();q('#cc166-content').click();checks.outsideCloses=!isVisible(q('.cc308-nav-secondary'));
  q('#cc308-more').click();go('Mi perfil');checks.routeCloses=!isVisible(q('.cc308-nav-secondary'));
 }
 if(${JSON.stringify(mode)}==='admin'){
  go('Usuarios');await wait(60);
  const search=q('input[type=search]');search.value='jose';search.dispatchEvent(new Event('input'));
  checks.accentSearch=all('.cc171-person').filter(x=>!x.hidden).length===1&&all('.cc171-person').find(x=>!x.hidden).textContent.includes('CLAN2');
  search.value='CLAN3';search.dispatchEvent(new Event('input'));
  const row=all('.cc171-person').find(x=>!x.hidden);row.querySelector('.cc246-user-details').open=true;await wait(40);
  row.querySelector('.cc180-role-editor').open=true;
  checks.unpaidNoPromotion=!all('.cc180-role-editor button').filter(isVisible).some(b=>b.textContent.includes('Autorizar Súper'));
  all('.cc171-filter button').find(b=>b.textContent.includes('Actualizar')).click();await wait(100);
  checks.searchSurvivesRefresh=q('input[type=search]').value==='CLAN3'&&all('.cc171-person').filter(x=>!x.hidden).length===1;
  checks.fileSurvivesRefresh=all('.cc171-person').find(x=>!x.hidden).querySelector('.cc246-user-details').open;
  q('input[type=search]').value='no-existe';q('input[type=search]').dispatchEvent(new Event('input'));
  checks.noResults=all('.cc171-person').every(x=>x.hidden)&&q('#cc166-content').textContent.includes('No hay coincidencias')&&q('.cc308-search-count').textContent==='0 de 3 cuentas';
  q('input[type=search]').value='';q('input[type=search]').dispatchEvent(new Event('input'));
  const adminRow=all('.cc171-person')[0];adminRow.querySelector('details').open=true;
  checks.adminProtected=!adminRow.querySelector('.cc180-role-editor')&&!adminRow.querySelector('.cc181-user-actions');
  const superRow=all('.cc171-person')[1];superRow.querySelector('details').open=true;
  checks.superRevocationPresent=superRow.textContent.includes('Retirar permiso Súper reseller');
  checks.readableHelp=q('.cc171-help').textContent.includes('Ver ficha');
 }
 checks.noWrites=!__requests.some(p=>/set_super|set_registry|grant_bonus|assisted_recharge|decide_manual|purchase/i.test(p));
 checks.noErrors=__errors.length===0;
 checks.noOverflow=document.documentElement.scrollWidth<=innerWidth+1;
 }catch(e){checks.error=String(e.stack||e)}
 const n=document.createElement('output');n.id='cc308-result';n.dataset.status=Object.values(checks).every(x=>x===true)?'pass':'fail';n.textContent=JSON.stringify(checks);document.body.append(n);
})();`;
 return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><div id="cc77home"><div class="cc77top"><div class="cc77actions"></div></div></div><script>'+setup+'</script><script>'+js+'</script><script>'+probe+'</script></body></html>';
}
