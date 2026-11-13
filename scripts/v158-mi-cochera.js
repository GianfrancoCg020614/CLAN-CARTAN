/* CLAN CARTAN V343 / MI COCHERA: modulo multiempresa protegido en Supabase.
 No intenta cobrar pagos comerciales ni transferir bonos. */
(function(){
"use strict";
const $=id=>document.getElementById(id),ses=()=>window.CC_V53_SESSION;
const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const num=x=>Number(x||0);
const currencyLocales={PEN:"es-PE",USD:"en-US",EUR:"es-ES",COP:"es-CO",MXN:"es-MX",ARS:"es-AR",CLP:"es-CL",BOB:"es-BO",BRL:"pt-BR",UYU:"es-UY",PYG:"es-PY",CRC:"es-CR",DOP:"es-DO",CAD:"en-CA",GBP:"en-GB",GTQ:"es-GT",VES:"es-VE"};
const currency=(v,c)=>{try{return new Intl.NumberFormat(currencyLocales[c]||"es-PE",{style:"currency",currency:c||"PEN",minimumFractionDigits:2,maximumFractionDigits:2}).format(num(v));}catch(_){return (c||"PEN")+" "+num(v).toFixed(2);}};
const countryMeta={PE:["🇵🇪","Perú","PEN"],US:["🇺🇸","Estados Unidos","USD"],ES:["🇪🇸","España","EUR"],AT:["🇦🇹","Austria","EUR"],BE:["🇧🇪","Bélgica","EUR"],CY:["🇨🇾","Chipre","EUR"],DE:["🇩🇪","Alemania","EUR"],EE:["🇪🇪","Estonia","EUR"],FI:["🇫🇮","Finlandia","EUR"],FR:["🇫🇷","Francia","EUR"],GR:["🇬🇷","Grecia","EUR"],HR:["🇭🇷","Croacia","EUR"],IE:["🇮🇪","Irlanda","EUR"],IT:["🇮🇹","Italia","EUR"],LT:["🇱🇹","Lituania","EUR"],LU:["🇱🇺","Luxemburgo","EUR"],LV:["🇱🇻","Letonia","EUR"],MT:["🇲🇹","Malta","EUR"],NL:["🇳🇱","Países Bajos","EUR"],PT:["🇵🇹","Portugal","EUR"],SI:["🇸🇮","Eslovenia","EUR"],SK:["🇸🇰","Eslovaquia","EUR"],CO:["🇨🇴","Colombia","COP"],MX:["🇲🇽","México","MXN"],AR:["🇦🇷","Argentina","ARS"],CL:["🇨🇱","Chile","CLP"],BO:["🇧🇴","Bolivia","BOB"],BR:["🇧🇷","Brasil","BRL"],UY:["🇺🇾","Uruguay","UYU"],PY:["🇵🇾","Paraguay","PYG"],CR:["🇨🇷","Costa Rica","CRC"],DO:["🇩🇴","República Dominicana","DOP"],CA:["🇨🇦","Canadá","CAD"],GB:["🇬🇧","Reino Unido","GBP"],GT:["🇬🇹","Guatemala","GTQ"],VE:["🇻🇪","Venezuela","VES"]};
const api=(p,b)=>window.cc80.api(p,"POST",b||{});
let account=null,carts=[],moves=[],people=[],accounts=[],walletAvailable=null,busy=false,filter="",cartState="ALL",ownerId=null,loadSequence=0,selectedCartId=null;
const normalize=value=>String(value||" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
function host(){let root=$("mc158layer");if(root)return root;root=document.createElement("div");root.id="mc158layer";
 root.innerHTML='<div class="mc158wrap"><header class="mc158head"><div><small>CLAN CARTAN · MI COCHERA</small><h2><img src="assets/mi-cochera-logo.svg" alt="Logotipo original MI COCHERA"> MI COCHERA</h2><p>Administra carritos, cobros y alquileres desde un solo lugar.</p></div><button type="button" id="mc158close">← Volver a CLAN CARTAN</button></header><div id="mc158body" aria-live="polite">Preparando acceso…</div></div>';
 document.body.append(root);$("mc158close").onclick=close;
 root.addEventListener("click",click);root.addEventListener("submit",submit);
 root.addEventListener("click",dniClick);
 root.addEventListener("change",currencyCountryChanged);
 return root;
}
function close(){$("mc158dialog")?.remove();let layer=$("mc158layer");if(layer)layer.style.display="none";if($("cc77home"))$("cc77home").style.display="block";}
function note(msg){let el=$("mc158notice");if(el)el.textContent=msg;else alert(msg);}
function active(){return ses()?.isAdmin || account && !account.suspended && new Date(account.subscription_until)>new Date();}
function header(){
 const role=ses()?.isAdmin?'ADMIN':'RESELLER';
 const meta=account?countryMeta[account.country||"PE"]:null;
 const local=account?'<span class="mc158local-currency" title="Moneda compartida de MI COCHERA, MI ALQUILER y COBRA YA">'+(meta?.[0]||"🌐")+' '+esc(account.country||"PE")+' · '+esc(account.currency||"PEN")+'</span>':'';
 return '<header class="mc158topbar" aria-label="MI COCHERA · Billetera única · Marca oficial CLAN CARTAN"><div class="mc158top-brand"><img src="assets/clan-cartan-brand-original.webp" alt="Logotipo oficial CLAN CARTAN"></div><div class="mc158top-center"><div class="mc158title-lockup"><img src="assets/mi-cochera-mascota-original.webp" alt="Emblema original del oso de MI COCHERA"><h1>MI COCHERA</h1></div><div class="mc158top-ribbon">Control de Carritos · Alquiler Diario · Productos · Cobros</div></div><div class="mc158top-actions">'+local+'<span class="mc158bell" aria-label="Notificaciones">🔔<i></i></span><span class="mc158role"><span>●</span>'+role+' <b>⌄</b></span></div></header>';
}
async function open(){
 if(!ses()?.jwt){if(typeof window.cc77Auth==="function")window.cc77Auth(false);return;}
 const r=host();r.style.display="block";if($("cc77home"))$("cc77home").style.display="none";
 $("mc158body").innerHTML="<p>Cargando MI COCHERA…</p>";
 const actor=ses()?.userId,jwt=ses()?.jwt,expected=loadSequence+1;
 try{await load();}catch(e){if(ses()?.userId!==actor||ses()?.jwt!==jwt||loadSequence!==expected)return;$("mc158body").textContent="No se pudo abrir MI COCHERA: "+String(e.message||e);}
}
async function load(){
 await window.ccLoadBusinessCurrency?.();
 const session=ses(),id=session?.userId,jwt=session?.jwt,seq=++loadSequence;
 if(!id||!jwt)return;const current=()=>ses()?.userId===id&&ses()?.jwt===jwt&&loadSequence===seq;
 if(ownerId!==id){ownerId=id;account=null;carts=[];moves=[];people=[];walletAvailable=null;filter='';cartState='ALL';}
 if(session.isAdmin){account=null;return await loadAdmin(current);}
 const rows=await api('rpc/mc_ensure_account');if(!current())return;
 account=Array.isArray(rows)?rows[0]:rows;if(!account)throw Error('Sin cuenta.');
 const uid=encodeURIComponent(id);
 const detail=await window.cc80.api('mc_accounts?select=country&user_id=eq.'+uid);if(!current())return;
 account.country=detail?.[0]?.country||'PE';
 const wallet=await api('rpc/cc_finance_wallet');if(!current())return;
 if(wallet?.available_pen==null||!Number.isFinite(Number(wallet.available_pen)))throw Error('No se pudo verificar tu saldo disponible. Actualiza para continuar.');
 walletAvailable=Number(wallet.available_pen);window.cc326Wallet?.accept({userId:id,jwt,wallet});void refreshHomeWallet();
 if(!active()){showLocked();return;}
 await api('rpc/mc_sync_rents');if(!current())return;
 const items=await Promise.all([
  window.cc80.api('mc_carts?select=*&reseller_id=eq.'+uid+'&order=id.asc'),
  window.cc80.api('mc_movements?select=*&reseller_id=eq.'+uid+'&order=created_at.desc&limit=2000'),
  window.cc80.api('mc_people?select=*&reseller_id=eq.'+uid+'&limit=2000')
 ]);
 if(!current())return;[carts,moves,people]=items;renderList();
}
function currencyPanel(){return "";}
function walletPanel(){return "";}

function showLocked(){let el=$("mc158body");el.innerHTML=header()+'<section class="mc158box"><h3>Acceso a MI COCHERA</h3><p>Mientras la mensualidad esté vencida, tus carritos, cobros y deudas permanecen guardados y protegidos.</p><p>Activa la membresía desde Negocios con saldo real verificado, o utiliza un bono de activación autorizado.</p><button type="button" data-action="bonus" '+(num(account.bonus_pen)<15||account.suspended?"disabled":"")+'>Activar 30 días con S/ 15 de bono</button><p id="mc158notice" role="status"></p></section>';}
async function loadAdmin(current=()=>true){
 const [accountRows,clanUsers]=await Promise.all([
  window.cc80.api("mc_accounts?select=user_id,invite_code,currency,subscription_until,bonus_pen,suspended&order=created_at.desc&limit=300"),
  window.cc80.api("rpc/cc_admin_users_compact_v1","POST",{}).catch(()=>[])
 ]);
 if(!current())return;
 const names=new Map((Array.isArray(clanUsers)?clanUsers:[]).map(u=>[u.id,u.code]));
 accounts=accountRows.map(a=>({...a,invite_code:names.get(a.user_id)||'CLAN pendiente'}));
 $("mc158body").innerHTML=header()+'<section class="mc158box"><h3>Resellers MI COCHERA</h3><p>Consulta de cuentas y vigencias. Los bonos se administran desde el panel ADMIN central.</p><button type="button" data-action="bonuses">Abrir gestión de bonos</button><p id="mc158notice" role="status"></p><div class="mc158scroll"><table><thead><tr><th>Código</th><th>Suscripción</th><th>Bono</th><th>Cuenta</th></tr></thead><tbody>'+accounts.map(a=>'<tr><td>'+esc(a.invite_code)+'</td><td>'+esc(a.subscription_until?new Date(a.subscription_until).toLocaleDateString("es-PE"):"No activa")+'</td><td>S/ '+num(a.bonus_pen).toFixed(2)+'</td><td>'+esc(a.user_id.slice(0,8))+'…</td></tr>').join("")+'</tbody></table></div></section>';
}
function currencyCountryChanged(event){
 const select=event.target.closest('#mc158config select[name="country"]');
 if(!select)return;
 const code=select.selectedOptions[0]?.dataset.currency||"PEN";
 const hidden=select.form?.elements.namedItem("currency");
 const preview=$("mc158currencyPreview");
 if(hidden)hidden.value=code;
 if(preview)preview.textContent=code;
}
function person(id){return people.find(p=>p.id===id)||{};}
function balance(id){return moves.filter(m=>m.cart_id===id).reduce((s,m)=>s+num(m.amount_local),0);}
function cartHTML(c){
 const owner=person(c.owner_person_id),worker=person(c.worker_person_id),debt=Math.max(0,balance(c.id));
 return '<article class="mc158cart"><div class="mc158carttop"><div><small>C-'+String(c.id).padStart(3,'0')+' · '+esc(c.business_type)+'</small><h3>'+esc(c.alias||owner.full_name||'Carrito')+'</h3><p>Propietario: '+esc(owner.full_name)+' · '+esc(owner.document_number)+'</p>'+(worker.id?'<p>Trabajador: '+esc(worker.full_name)+'</p>':'')+'<small>Tarifa '+currency(c.daily_rate,c.currency)+' / día</small></div><div><strong class="'+(debt>0?'mc158debt':'')+'">'+currency(debt,c.currency)+'</strong><small>'+esc(c.state==='RETIRED'?'Retirado':'Activo')+'</small></div></div><div class="mc158actions"><button type="button" data-action="payment" data-cart="'+c.id+'" '+(debt>0?'':'disabled title="No hay deuda pendiente"')+'>Cobrar</button><button type="button" data-action="sale" data-cart="'+c.id+'">Hielo / venta</button><details class="mc314-more"><summary>Más acciones</summary><div><button type="button" data-action="history" data-cart="'+c.id+'">Historial</button><button type="button" data-action="whatsapp" data-cart="'+c.id+'">WhatsApp</button><button type="button" data-action="'+(c.state==='ACTIVE'?'retire':'reactivate')+'" data-cart="'+c.id+'">'+(c.state==='ACTIVE'?'Se retira':'Reactivar')+'</button></div></details></div></article>';
}
function renderRows(){
 const terms=normalize(filter).split(/\s+/).filter(Boolean);
 const shown=carts.filter(c=>{
  const text=normalize([c.alias,c.business_type,person(c.owner_person_id).full_name,person(c.owner_person_id).document_number,person(c.worker_person_id).full_name,person(c.worker_person_id).document_number,String(c.id),'C-'+String(c.id).padStart(3,'0')].join(' '));
  return (cartState==='ALL'||c.state===cartState)&&terms.every(term=>text.includes(term));
 });
 const rows=shown.map(c=>{
  const owner=person(c.owner_person_id),due=Math.max(0,balance(c.id)),active=c.state==='ACTIVE';
  return '<tr class="'+(Number(c.id)===Number(selectedCartId)?'is-selected':'')+'"><td>'+String(c.id).padStart(3,'0')+'</td><td><span class="mc158cart-icon">🛒</span><strong>'+esc(c.alias||owner.full_name||'Carrito')+'</strong><small>'+esc(owner.full_name||c.business_type||'Sin propietario')+'</small></td><td>'+currency(c.daily_rate,c.currency||account.currency)+'</td><td><span class="mc158status '+(active?'is-active':'is-retired')+'">'+(active?'✓ Al día':'Retirado')+'</span></td><td class="'+(due>0?'mc158debt':'')+'">'+currency(due,c.currency||account.currency)+'</td><td><button class="mc158-row-open" type="button" data-action="select-cart" data-cart="'+c.id+'" aria-label="Ver carrito '+esc(c.alias||c.id)+'">›</button></td></tr>';
 }).join('');
 const body=$('mc158rows');if(body)body.innerHTML=rows||'<tr><td colspan="6" class="mc158empty">'+(carts.length?'No hay carritos que coincidan con la búsqueda.':'Todavía no tienes carritos registrados.')+'</td></tr>';
 const count=$('mc158count');if(count)count.textContent=shown.length+' de '+carts.length+' carritos';
}
function renderList(listOnly=false){
 const today=new Date().toLocaleDateString('en-CA');
 const kindIs=(m,keys)=>keys.includes(normalize(m.kind||m.movement_type||m.type));
 const movementDate=m=>String(m.occurred_on||m.created_at||'').slice(0,10);
 const todaySum=keys=>moves.filter(m=>kindIs(m,keys)&&movementDate(m)===today).reduce((s,m)=>s+Math.max(0,num(m.amount_local)),0);
 const activeCount=carts.filter(c=>c.state==='ACTIVE').length;
 const totalDebt=carts.reduce((s,c)=>s+Math.max(0,balance(c.id)),0);
 const selected=carts.find(c=>Number(c.id)===Number(selectedCartId))||carts[0]||null;
 if(selected)selectedCartId=selected.id;
 const owner=selected?person(selected.owner_person_id):{};
 const worker=selected?person(selected.worker_person_id):{};
 const selectedMoves=selected?moves.filter(m=>Number(m.cart_id)===Number(selected.id)):[];
 const rentalTotal=selectedMoves.filter(m=>kindIs(m,['rent','rental','alquiler'])).reduce((s,m)=>s+Math.max(0,num(m.amount_local)),0);
 const productTotal=selectedMoves.filter(m=>kindIs(m,['product','sale','venta'])).reduce((s,m)=>s+Math.max(0,num(m.amount_local)),0);
 const due=selected?Math.max(0,balance(selected.id)):0;
 const cur=selected?.currency||account.currency||'PEN';
 const detail=selected?'<div class="mc158detail-head"><span>🛒</span><div><small>CUENTA DEL CARRITO '+String(selected.id).padStart(3,'0')+'</small><h3>'+esc(selected.alias||owner.full_name||'Carrito')+'</h3></div><span class="mc158status '+(selected.state==='ACTIVE'?'is-active':'is-retired')+'">'+(selected.state==='ACTIVE'?'Activo':'Retirado')+'</span></div><div class="mc158person"><span class="mc158avatar">👤</span><div><strong>'+esc(owner.full_name||'Propietario no registrado')+'</strong><small>Propietario'+(owner.document_number?' · '+esc(owner.document_number):'')+'</small></div><span class="mc158rate">Tarifa diaria: <b>'+currency(selected.daily_rate,cur)+'</b></span></div>'+(worker.id?'<div class="mc158detail-line"><span>Trabajador</span><strong>'+esc(worker.full_name||'—')+'</strong></div>':'')+'<div class="mc158detail-line"><span>Alquiler acumulado</span><strong>'+currency(rentalTotal,cur)+'</strong></div><div class="mc158detail-line"><span>Productos vendidos</span><strong>'+currency(productTotal,cur)+'</strong></div><div class="mc158detail-debt"><span>🛒 Saldo pendiente</span><strong>'+currency(due,cur)+'</strong></div><div class="mc158detail-actions"><button type="button" data-action="payment" data-cart="'+selected.id+'" '+(due<=0?'disabled':'')+'>✓ Registrar pago</button><button type="button" data-action="sale" data-cart="'+selected.id+'">＋ Agregar producto</button><button type="button" data-action="history" data-cart="'+selected.id+'">Ver historial</button><button type="button" data-action="whatsapp" data-cart="'+selected.id+'">WhatsApp</button></div>':'<div class="mc158detail-head mc158detail-head-empty"><span>🛒</span><div><small>CUENTA DEL CARRITO</small><h3>Sin carrito seleccionado</h3></div><button type="button" data-action="history" disabled>Ver detalle</button></div><div class="mc158person"><span class="mc158avatar">👤</span><div><strong>Selecciona un carrito</strong><small>Cliente / propietario</small></div><span class="mc158rate">Tarifa diaria: <b>—</b></span></div><div class="mc158detail-line"><span>Alquiler</span><strong>—</strong></div><div class="mc158detail-line"><span>Productos</span><strong>—</strong></div><div class="mc158detail-debt"><span>🛒 Saldo pendiente</span><strong>—</strong></div><div class="mc158detail-actions"><button type="button" disabled>✓ Registrar pago</button><button type="button" disabled>▣ Agregar producto</button></div>';
 const body=$('mc158body');
 body.innerHTML=header()+'<div class="mc158dashboard"><aside class="mc158sidebar"><div class="mc158sidebar-brand"><img src="assets/clan-cartan-brand-original.webp" alt="Logotipo oficial CLAN CARTAN"></div><div class="mc158nav-item is-current"><span>⌂</span>Inicio</div><div class="mc158nav-item"><span>🛒</span>Carritos</div><div class="mc158nav-item"><span>▣</span>Ventas</div><div class="mc158nav-item"><span>⬡</span>Inventario</div><div class="mc158nav-item"><span>▤</span>Cobros</div><div class="mc158nav-item"><span>▥</span>Reportes</div><div class="mc158nav-item mc158nav-config" role="button" tabindex="0" data-action="currency" aria-label="Configurar país y moneda"><span>⚙</span>Configuración</div><div class="mc158sidebar-foot">CLAN CARTAN · MI COCHERA</div></aside><main class="mc158main"><section class="mc158kpis"><article class="mc158kpi kpi-green"><span>🛒</span><div><small>Carritos Activos</small><strong>'+activeCount+'</strong></div></article><article class="mc158kpi kpi-blue"><span>▦</span><div><small>Alquiler Hoy</small><strong>'+currency(todaySum(['rent','rental','alquiler']),cur)+'</strong></div></article><article class="mc158kpi kpi-purple"><span>⬡</span><div><small>Ventas Hoy</small><strong>'+currency(todaySum(['product','sale','venta']),cur)+'</strong></div></article><article class="mc158kpi kpi-red"><span>▤</span><div><small>Deuda Total</small><strong>'+currency(totalDebt,cur)+'</strong></div></article></section><section class="mc158quick"><button type="button" data-action="sale" data-cart="'+(selected?.id||'')+'" '+(!selected?'disabled':'')+'><span>＋</span><b>Registrar Venta</b><small>Asignar a un carrito</small></button><button type="button" data-action="payment" data-cart="'+(selected?.id||'')+'" '+(!selected||due<=0?'disabled':'')+'><span>▣</span><b>Registrar Pago</b><small>Alquiler o deuda</small></button><button type="button" data-action="new"><span>🛒</span><b>Nuevo Carrito</b><small>Cliente y tarifa diaria</small></button></section><section class="mc158workspace"><div class="mc158panel mc158list-panel"><div class="mc158panel-title"><h3>🛒 Carritos en Servicio</h3><span id="mc158count"></span></div><div class="mc158filters"><input id="mc158search" type="search" aria-label="Buscar carrito" placeholder="Buscar cliente, DNI o carrito…" value="'+esc(filter)+'"><select id="mc158state" aria-label="Filtrar estado"><option value="ALL">Todos los estados</option><option value="ACTIVE">Activos</option><option value="RETIRED">Retirados</option></select></div><div class="mc158table-wrap"><table class="mc158table"><thead><tr><th>#</th><th>Cliente / Carrito</th><th>Tarifa/Día</th><th>Estado</th><th>Saldo</th><th></th></tr></thead><tbody id="mc158rows"></tbody></table></div><p id="mc158notice" role="status"></p></div><div class="mc158panel mc158detail-panel">'+detail+'</div></section></main></div>';
 $('mc158state').value=cartState;
 $('mc158search').addEventListener('input',event=>{filter=event.target.value;renderRows();});
 $('mc158state').addEventListener('change',event=>{cartState=event.target.value;renderRows();});
 renderRows();
}
function drawer(title,body){$("mc158dialog")?.remove();const d=document.createElement("div");d.id="mc158dialog";d.className="mc158dialog";d.innerHTML='<section role="dialog" aria-modal="true"><header><h3>'+esc(title)+'</h3><button type="button" data-action="close-dialog">✕</button></header>'+body+'<p id="mc158dialogStatus" role="status"></p></section>';d.addEventListener("click",click);d.addEventListener("click",dniClick);d.addEventListener("submit",submit);document.body.append(d);}
function fields(prefix,title,optional){
 const name=prefix+"Name",doc=prefix+"Doc",kind=prefix+"Kind",phone=prefix+"Phone";
 return '<fieldset><legend>'+title+(optional?" (opcional)":"")+'</legend><label>Documento primero<select name="'+kind+'"><option value="DNI">DNI peruano</option><option value="CE">Carné de extranjería</option><option value="PASSPORT">Pasaporte</option><option value="CEDULA">Cédula extranjera</option><option value="OTHER">Otro</option></select></label><label>Número de documento<input name="'+doc+'" data-mc-dni="'+prefix+'" '+(optional?"":"required")+' maxlength="40" autocomplete="off"></label><button type="button" data-mc-verify="'+prefix+'">Buscar DNI</button><p id="mc158lookup'+prefix+'" class="mc158look" aria-live="polite">Ingresa 8 dígitos y pulsa Buscar DNI.</p><label>Nombres y apellidos<input name="'+name+'" '+(optional?"":"required")+' maxlength="160"></label><label>Celular<input name="'+phone+'" type="tel" maxlength="30"></label></fieldset>';
}
function newCart(){drawer("Registrar carrito · DNI primero",'<form id="mc158new">'+fields("owner","Propietario",false)+fields("worker","Trabajador",true)+'<label>Alias / apodo<input name="alias" maxlength="80" placeholder="El Paisa"></label><label>Tipo de negocio<input name="business" required maxlength="100" placeholder="Emoliente, anticuchos, frutera…"></label><label>Tarifa por día ('+esc(account.currency)+')<input type="number" name="rate" min=".01" step=".01" required></label><button type="submit">Guardar carrito</button></form>');}
function dniClick(event){
 const button=event.target.closest('[data-mc-verify]');if(!button||button.disabled)return;
 const form=button.closest('form'),input=form?.querySelector('[data-mc-dni="'+button.dataset.mcVerify+'"]');if(!input)return;
 button.disabled=true;Promise.resolve(lookupDni(input)).finally(()=>{button.disabled=false;});
}
async function lookupDni(input){
 const form=input.closest('form'),prefix=input.dataset.mcDni,kind=form.elements.namedItem(prefix+'Kind').value,dni=input.value.trim();
 const info=form.querySelector('#mc158lookup'+prefix),dest=form.elements.namedItem(prefix+'Name');if(!info||!dest)return;
 if(kind!=='DNI'||!/^\d{8}$/.test(dni)){info.textContent='Para consultar, selecciona DNI e ingresa exactamente 8 dígitos. Otros documentos se registran manualmente.';return;}
 const s=ses(),uid=s?.userId,jwt=s?.jwt;
 if(!uid||!jwt){info.textContent='Inicia sesión para consultar el DNI.';return;}
 const current=()=>form.isConnected&&ses()?.userId===uid&&ses()?.jwt===jwt&&input.value.trim()===dni&&form.elements.namedItem(prefix+'Kind').value===kind;
 let expectedName=dest.value;info.textContent='Buscando DNI…';
 const fillName=name=>{if(dest.value!==expectedName){info.textContent='Consulta recibida. Se conserva el nombre que editaste; revísalo antes de guardar.';return false;}dest.value=String(name).slice(0,160);expectedName=dest.value;return true;};
 try{
  const matches=await window.cc80.api('mc_people?select=full_name,phone,verification_source&document_type=eq.DNI&document_number=eq.'+dni+'&limit=1');
  if(!current())return;
  if(matches.length){
   const filled=fillName(matches[0].full_name);const phone=form.elements.namedItem(prefix+'Phone');if(!phone.value)phone.value=matches[0].phone||'';
   if(filled)info.textContent='Datos encontrados en tu cartera.';
  }
  if(matches[0]?.verification_source==='API_PERU')return;
  if(!s.root||!s.key){info.textContent='Consulta externa no disponible; puedes completar el nombre manualmente.';return;}
  const res=await fetch(s.root+'/functions/v1/mc-verify-dni',{method:'POST',headers:{apikey:s.key,Authorization:'Bearer '+jwt,'Content-Type':'application/json'},body:JSON.stringify({dni})});
  const data=await res.json();if(!current())return;
  if(res.ok&&(data.status==='found'||data.status==='saved')&&data.full_name){if(fillName(data.full_name))info.textContent='Identidad completada desde API Perú. Revisa los datos antes de guardar.';}
  else info.textContent=matches.length?'Datos internos disponibles; verificación oficial no disponible.':'Consulta no disponible. Completa el nombre manualmente.';
 }catch(_){if(current())info.textContent='Consulta externa no disponible; ingresa el nombre manualmente.';}
}

async function submit(e){
 if(!e.target.id?.startsWith("mc158"))return;
 e.preventDefault();if(busy)return;const actor=ses()?.userId,jwt=ses()?.jwt,form=e.target;const current=()=>ses()?.userId===actor&&ses()?.jwt===jwt;busy=true;let button=e.target.querySelector('button[type="submit"]');const label=button?.textContent;if(button){button.disabled=true;button.textContent='Guardando…';}form.setAttribute('aria-busy','true');
 try{
 if(e.target.id==="mc158config"){
  const f=e.target;await api("rpc/mc_configure_currency",{p_currency:f.elements.currency.value,p_country:f.elements.country.value.toUpperCase()});if(!current())return;form.closest("#mc158dialog")?.remove();await load();if(!current())return;note("Moneda de operación actualizada para MI COCHERA, MI ALQUILER y COBRA YA.");
 }else if(e.target.id==="mc158new"){
  const f=e.target,x=k=>f.elements.namedItem(k)?.value?.trim()||"";
  const id=await api("rpc/mc_create_cart",{p_alias:x("alias"),p_type:x("business"),p_rate:num(x("rate")),p_owner_kind:x("ownerKind"),p_owner_doc:x("ownerDoc"),p_owner_name:x("ownerName"),p_owner_phone:x("ownerPhone"),p_worker_kind:x("workerKind")||null,p_worker_doc:x("workerDoc")||null,p_worker_name:x("workerName")||null,p_worker_phone:x("workerPhone")||null});
  if(!current())return;form.closest("#mc158dialog")?.remove();await load();if(!current())return;note("Carrito registrado: C-"+String(id).padStart(3,"0"));
 }else if(e.target.id==="mc158pay"){
  const f=e.target;await api("rpc/mc_record_movement",{p_cart:Number(f.dataset.cart),p_kind:"PAYMENT",p_label:"Abono recibido",p_quantity:null,p_unit:null,p_amount:-num(f.elements.amount.value),p_method:f.elements.method.value});if(!current())return;form.closest("#mc158dialog")?.remove();await load();if(!current())return;note("Pago registrado.");
 }else if(e.target.id==="mc158sale"){
  const f=e.target,q=num(f.elements.quantity.value),price=num(f.elements.price.value);
  await api("rpc/mc_record_movement",{p_cart:Number(f.dataset.cart),p_kind:"PRODUCT",p_label:f.elements.item.value,p_quantity:q,p_unit:price,p_amount:Math.round(q*price*100)/100,p_method:null});if(!current())return;form.closest("#mc158dialog")?.remove();await load();if(!current())return;note("Producto agregado a la deuda.");
 }
 }catch(e){if(!current())return;const el=form.closest("#mc158dialog")?.querySelector("#mc158dialogStatus")||$("mc158notice");if(el)el.textContent="No se completó: "+String(e.message||e);}
 finally{busy=false;form.removeAttribute('aria-busy');if(button){button.disabled=false;button.textContent=label;}}
}
async function click(e){
 let btn=e.target.closest("[data-action]");if(!btn)return;
 e.preventDefault();const act=btn.dataset.action,id=Number(btn.dataset.cart),actor=ses()?.userId,jwt=ses()?.jwt;
 try{
 if(act==="close-dialog"){$("mc158dialog")?.remove();return;}
 if(act==="select-cart"){selectedCartId=id;renderList();return;}
 if(act==="close-module"){close();return;}
 if(act==="reload"){await load();return;}
 if(act==="new"){newCart();return;}
 if(act==="currency"){
  const currentCurrency=account.currency||"PEN";
  const options=Object.entries(countryMeta).filter(([,meta])=>carts.length===0||meta[2]===currentCurrency).map(([code,meta])=>'<option value="'+code+'" data-currency="'+meta[2]+'" '+((account.country||"PE")===code?"selected":"")+'>'+meta[0]+' '+meta[1]+' · '+meta[2]+'</option>').join("");
  drawer("País y moneda de tu negocio",'<form id="mc158config"><p class="mc158config-intro">Cada RESELLER configura una sola moneda de operación compartida por MI COCHERA, MI ALQUILER y COBRA YA. Los importes se registran directamente en esa moneda; no hay conversión cambiaria ni afecta STREAM BULL’S.</p><label>País de operación<select name="country" required>'+options+'</select></label><div class="mc158currency-preview"><small>MONEDA DE OPERACIÓN DE LOS TRES MÓDULOS</small><strong id="mc158currencyPreview">'+esc(currentCurrency)+'</strong><input type="hidden" name="currency" value="'+esc(currentCurrency)+'"></div>'+(carts.length?'<p class="mc158config-lock">La moneda es compartida por los tres módulos. Si ya existen importes en otra moneda, el sistema impedirá cambiarla para proteger los registros históricos. No se realizan conversiones.</p>':'<p class="mc158config-lock">Configura el país y la moneda antes de registrar importes en cualquiera de los tres módulos. Después, el sistema protegerá la moneda para conservar la integridad de los saldos.</p>')+'<button type="submit">Guardar país y moneda</button></form>');return;
 }
 if(act==="bonuses"){close();window.cc166OpenAdminBonuses?.();return;}
 if(act==="wallet"){close();window.cc166OpenWallet?.("summary",()=>window.mc158Open());return;}
 if(['bonus','retire','reactivate'].includes(act)){
  if(busy)return;const actor=ses()?.userId,jwt=ses()?.jwt;
  const question=act==='bonus'?'¿Usar S/ 15 del bono ADMIN para activar 30 días?':act==='retire'?'Se detendrán los cargos diarios futuros. La deuda histórica permanecerá.':'¿Reactivar este carrito conservando su historial?';
  if(!confirm(question))return;busy=true;btn.disabled=true;
  try{
   if(act==='bonus')await api('rpc/mc_activate_with_bonus',{p_request:crypto.randomUUID()});
   else await api('rpc/mc_change_cart_state',{p_cart:id,p_new_state:act==='retire'?'RETIRED':'ACTIVE'});
   if(ses()?.userId!==actor||ses()?.jwt!==jwt)return;await load();
  }finally{busy=false;btn.disabled=false;}
  return;
 }
 if(act==="whatsapp"){
  const cart=carts.find(c=>c.id===id);if(!cart)return;
  const owner=person(cart.owner_person_id),worker=person(cart.worker_person_id);
  const candidates=[owner,worker].map(person=>{let digits=String(person.phone||'').replace(/[^0-9]/g,'');if(/^9[0-9]{8}$/.test(digits))digits='51'+digits;return {person,digits};});
  const choice=candidates.find(item=>/^[1-9][0-9]{9,14}$/.test(item.digits));
  if(!choice){note('Registra un WhatsApp válido del propietario o trabajador, con código de país.');return;}
  const recipient=choice.person,digits=choice.digits;
  const due=Math.max(0,balance(id));
  const text="Hola, "+(recipient.full_name||"cliente")+". Te escribimos por tu carrito C-"+String(id).padStart(3,"0")+" ("+(cart.alias||cart.business_type||"Mi Cochera")+"). "+(due>0?"Tu saldo pendiente es "+currency(due,cart.currency)+". ":"No registramos deuda pendiente. ")+"Por favor, comunícate con el responsable de tu cochera. Mensaje preparado por tu administrador desde MI COCHERA | CLAN CARTAN.";
  const link='https://wa.me/'+digits+'?text='+encodeURIComponent(text);
  const opened=window.open(link,'_blank','noopener,noreferrer');
  if(!opened){const status=$('mc158notice');if(status){status.textContent='Si WhatsApp no se abrió, utiliza este enlace: ';const a=document.createElement('a');a.href=link;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Abrir WhatsApp';status.append(a);}}
  return;
 }
 if(act==="payment"){if(balance(id)<=0){note("No hay deuda pendiente para registrar un abono.");return;}drawer("Cobrar · C-"+id,'<form id="mc158pay" data-cart="'+id+'"><p>Deuda pendiente: '+currency(balance(id),account.currency)+'</p><label>Importe recibido<input name="amount" type="number" min=".01" max="'+Math.max(0,balance(id)).toFixed(2)+'" step=".01" required></label><label>Medio<select name="method"><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Transferencia</option></select></label><button type="submit">Registrar abono</button></form>');return;}
 if(act==="sale"){drawer("Agregar hielo o producto · C-"+id,'<form id="mc158sale" data-cart="'+id+'"><label>Producto<input name="item" value="Hielo" required maxlength="120"></label><label>Cantidad<input name="quantity" type="number" min=".001" step="any" value="1" required></label><label>Precio por unidad ('+esc(account.currency)+')<select name="price"><option value="1.50">1.50</option><option value="2">2.00</option><option value="3">3.00</option></select></label><p>Se acumula como deuda del carrito hasta registrar el pago.</p><button type="submit">Agregar producto</button></form>');return;}
 if(act==="history"){const c=carts.find(c=>c.id===id);let records=moves.filter(m=>m.cart_id===id);drawer("Historial · "+(c?.alias||"C-"+id),'<div class="mc158scroll"><table><thead><tr><th>Fecha</th><th>Movimiento</th><th>Importe</th></tr></thead><tbody>'+records.map(m=>'<tr><td>'+esc(m.occurred_on)+'</td><td>'+esc(m.label)+'</td><td>'+currency(m.amount_local,m.currency)+'</td></tr>').join("")+'</tbody></table></div>');return;}
 }catch(e){if(ses()?.userId===actor&&ses()?.jwt===jwt)note("Error: "+String(e.message||e));}
}
async function refreshHomeWallet(){
 const label=$("mc158-home-wallet"),current=ses();
 if(!label)return;
 label.setAttribute('data-cc-wallet-amount','');
 if(!current?.jwt){label.textContent="S/ --";return;}
 const userId=current.userId,jwt=current.jwt;
 try{
  const uid=encodeURIComponent(userId);
  const wallet=await api('rpc/cc_finance_wallet');
  if(ses()?.userId!==userId||ses()?.jwt!==jwt)return;
  if(wallet?.available_pen==null||!Number.isFinite(Number(wallet.available_pen)))throw Error('Saldo sin verificar');
  label.textContent=currency(Number(wallet.available_pen),'PEN');
 }catch(_){if(ses()?.userId===userId&&ses()?.jwt===jwt)label.textContent="S/ --";}
}
function mountHomeBadge(){
 const host=$("cc95-user");
 if(!host)return;
 const watcher=new MutationObserver(()=>void refreshHomeWallet());
 watcher.observe(host,{attributes:true,attributeFilter:["style"]});
 if(ses()?.jwt)void refreshHomeWallet();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mountHomeBadge);else mountHomeBadge();
document.addEventListener('cc192-session-ended',()=>{loadSequence++;ownerId=null;account=null;carts=[];moves=[];people=[];walletAvailable=null;filter='';cartState='ALL';close();const body=$('mc158body');if(body)body.textContent='Inicia sesión para abrir MI COCHERA.';});
window.mc158Open=open;
window.mc158Close=close;
})();
