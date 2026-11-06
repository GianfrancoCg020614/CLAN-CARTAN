// Módulos reales con datos ficticios y sin red ni guardados.
import fs from 'node:fs';
export function businessDialogFixture(kind='alquiler',before=false){
 const files=kind==='cochera'?['scripts/v158-mi-cochera.js']:kind==='alquiler'?['scripts/v161-1-mi-alquiler.js','scripts/v161-2-mi-alquiler.js']:['scripts/v152-cobra-fast.js'];
 const css=kind==='cochera'?fs.readFileSync('styles/v158-mi-cochera.css','utf8'):kind==='alquiler'?fs.readFileSync('styles/v161-1-mi-alquiler.css','utf8')+fs.readFileSync('styles/v161-2-mi-alquiler.css','utf8'):(fs.readFileSync('index.html','utf8').match(/<style id="cy152-fast-style">([\s\S]*?)<\/style>/)||[])[1];
 const setup=`window.CC_V53_SESSION={userId:'fixture-user',jwt:'FIXTURE-ONLY-JWT',isReseller:true,isAdmin:false};window.__errors=[];window.__writes=[];window.addEventListener('error',e=>__errors.push(e.message));window.fetch=()=>{throw Error('Red prohibida en fixture')};
 window.cc80={api:async(p,m,b)=>{if(p.includes('&id=gt.'))return [];if(p==='rpc/mc_my_cart_balances_v328')return [];if(p==='rpc/cc_finance_wallet')return {available_pen:0,pending_reversal_pen:0};if(p==='rpc/mc_ensure_account')return [{user_id:'fixture-user',subscription_until:window.__locked?'2000-01-01':'2099-12-31',currency:'PEN',bonus_pen:0}];if(p==='rpc/ma_ensure_account')return [{active:!window.__locked}];if(p==='rpc/mc_sync_rents')return [];if(p.startsWith('rpc/')){__writes.push(p);throw Error('Guardado prohibido en fixture');}return [];}};`;
 let js=files.map(p=>fs.readFileSync(p,'utf8')).join('\n');
 if(before){js=js.replace('function close(){$("mc158dialog")?.remove();let layer=','function close(){let layer=');js=js.replace("    const layer=$('ma1611layer');if(layer)layer.scrollTop=0;\n",'');}
 const helpers=before?'':fs.readFileSync('scripts/v311-business-dialogs.js','utf8');
 const cobra=kind==='cobra'?'<div id="cy53layer" style="position:fixed;inset:0;z-index:2147483646;background:#101e2a;color:white"><button id="cy53close">Volver</button><div id="cy64tabs"></div><div id="cy53clients"><table><thead><tr><th>Cliente</th><th>Acción</th></tr></thead><tbody><tr><td>Cliente ficticio</td><td><button class="cy62editclient" data-id="fixture-client">Editar</button></td></tr></tbody></table></div></div>':'';
 const probe=`(async()=>{const wait=ms=>new Promise(r=>setTimeout(r,ms));await wait(200);const q=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)],checks={};let opener,id;
 try{
 if(${JSON.stringify(kind)}==='cochera'){await window.mc158Open();opener=q('[data-action="new"]');id='mc158dialog';}
 else if(${JSON.stringify(kind)}==='alquiler'){window.ma1611MiAlquiler.open();await wait(180);opener=q('[data-ma-action="new-property"]');id='ma1612dialog';}
 else{window.cy152OnRefresh({clients:[{id:'fixture-client',full_name:'Cliente ficticio',owner_id:'fixture-user',client_code:'COBRA-1'}],loans:[],payments:[],installments:[]},{api:async(p,m)=>{if(m&&m!=='GET'){__writes.push(p);throw Error('Guardado prohibido');}return [];}});opener=q('.cy152-dossier-link');id='cy152modal';}
 if(!opener)throw Error('No aparece el formulario autorizado');opener.focus();opener.click();await wait(60);
 const root=document.getElementById(id),panel=root?.querySelector('[role=dialog]');checks.opens=!!panel;
 checks.focusInside=panel?.contains(document.activeElement)===true;
 checks.named=!!panel?.getAttribute('aria-label');const close=panel?.querySelector('header button');checks.closeNamed=close?.getAttribute('aria-label')==='Cerrar formulario';checks.closeTarget=close?.getBoundingClientRect().width>=44&&close?.getBoundingClientRect().height>=44;
 const bounds=panel.getBoundingClientRect(),hit=document.elementFromPoint(Math.min(innerWidth-2,bounds.left+20),Math.min(innerHeight-2,bounds.top+20));checks.aboveModule=panel.contains(hit)||hit===panel;
 const items=[...panel.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')].filter(x=>!x.disabled&&x.tabIndex>=0&&x.getBoundingClientRect().width>0);const first=items[0],last=items.at(-1);
 last.focus();last.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));checks.tabWrap=document.activeElement===first;
 first.focus();first.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));checks.reverseTabWrap=document.activeElement===last;
 const field=panel.querySelector('input');if(field)field.value='BORRADOR FICTICIO';last.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await wait(60);
 checks.escapeClosesForm=!document.getElementById(id);checks.focusReturns=document.activeElement===opener;
 checks.moduleRemains=${JSON.stringify(kind)}==='alquiler'?!q('#ma1611layer').hidden:${JSON.stringify(kind)}==='cochera'?q('#mc158layer').style.display!=='none':!!q('#cy53layer');
 if(${JSON.stringify(kind)}==='alquiler'){
  const layer=q('#ma1611layer');q('#ma1611content').style.minHeight='2200px';layer.scrollTop=300;const scrolled=layer.scrollTop>0;q('[data-area="inquilinos"]').click();checks.sectionStartsTop=scrolled&&layer.scrollTop===0;
 }
 if(${JSON.stringify(kind)}==='cochera'){
  if(document.getElementById(id))document.getElementById(id).remove();opener.click();await wait(30);window.mc158Close();await wait(30);checks.closingModuleRemovesForm=!q('#mc158dialog');
 }
 if(${JSON.stringify(kind)}==='cobra'){
  opener.click();await wait(40);[...q('#cy152modal').querySelectorAll('button')].find(b=>b.textContent==='Editar alias').click();await wait(40);
  q('#cy152modal input').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await wait(40);checks.replacedDialogReturns=q('#cy53close')===document.activeElement;
  window.CC_V53_SESSION.isReseller=false;opener.click();await wait(30);checks.accessStillBlocked=!q('#cy152modal');}
 else if(${JSON.stringify(kind)}==='cochera'){window.__locked=true;await window.mc158Open();checks.accessStillBlocked=!q('[data-action=\"new\"]');}
 else{window.__locked=true;window.ma1611MiAlquiler.close();window.ma1611MiAlquiler.open();await wait(180);checks.accessStillBlocked=!q('[data-ma-action=\"new-property\"]');}
 checks.noWrites=__writes.length===0;checks.noErrors=__errors.length===0;checks.noOverflow=document.documentElement.scrollWidth<=innerWidth+1;
 }catch(e){checks.error=String(e.stack||e)}
 const out=document.createElement('output');out.id='cc311-result';out.dataset.status=Object.values(checks).every(x=>x===true)?'pass':'fail';out.textContent=JSON.stringify(checks);document.body.append(out);
})();`;
 return '<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0}'+css+'</style></head><body><div id="cc77home"></div>'+cobra+'<script>'+setup+'</script><script>'+js+'</script><script>'+helpers+'</script><script>'+probe+'</script></body></html>';
}
