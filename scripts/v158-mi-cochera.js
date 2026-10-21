/* CLAN CARTAN V158 / MI COCHERA: modulo multiempresa protegido en Supabase.
 No intenta cobrar pagos comerciales ni transferir bonos. */
(function(){
"use strict";
const $=id=>document.getElementById(id),ses=()=>window.CC_V53_SESSION;
const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const num=x=>Number(x||0),currency=(v,c)=>({PEN:"S/",USD:"US$",EUR:"€",COP:"COP",MXN:"MXN",ARS:"ARS",CLP:"CLP",BOB:"Bs.",BRL:"R$",UYU:"UYU",PYG:"PYG",CRC:"CRC",DOP:"DOP",CAD:"CAD",GBP:"£"}[c]||c)+" "+num(v).toLocaleString("es-PE",{minimumFractionDigits:2,maximumFractionDigits:2});
const api=(p,b)=>window.cc80.api(p,"POST",b||{});
let account=null,carts=[],moves=[],people=[],accounts=[],realWallets=[],busy=false,filter="";
function host(){let root=$("mc158layer");if(root)return root;root=document.createElement("div");root.id="mc158layer";
 root.innerHTML='<div class="mc158wrap"><header class="mc158head"><div><small>CLAN CARTAN · TERCER MÓDULO</small><h2><img src="assets/mi-cochera-logo.svg" alt="Logotipo original MI COCHERA"> MI COCHERA <span>V158</span></h2><p>Carritos, alquiler diario, hielo, deudas e historial.</p></div><button type="button" id="mc158close">← Volver a CLAN CARTAN</button></header><div id="mc158body" aria-live="polite">Preparando acceso…</div></div>';
 document.body.append(root);$("mc158close").onclick=close;
 root.addEventListener("click",click);root.addEventListener("submit",submit);
 root.addEventListener("input",e=>{if(e.target?.matches("[data-mc-dni]")) void lookupDni(e.target);});
 return root;
}
function close(){let layer=$("mc158layer");if(layer)layer.style.display="none";if($("cc77home"))$("cc77home").style.display="block";}
function note(msg){let el=$("mc158notice");if(el)el.textContent=msg;else alert(msg);}
function active(){return ses()?.isAdmin || account && !account.suspended && new Date(account.subscription_until)>new Date();}
function header(){let date=account?.subscription_until?new Date(account.subscription_until).toLocaleDateString("es-PE"):"Sin activar";
 return '<section class="mc158status"><div><strong>Código: '+esc(account?.invite_code||"—")+'</strong><p>Suscripción S/ 15 por 30 días · renovación voluntaria</p><small>Vigencia: '+esc(date)+'</small></div><div><strong>Bono ADMIN: S/ '+num(account?.bonus_pen).toFixed(2)+'</strong><p>No transferible a otras billeteras ni usuarios</p></div></section>';}
async function open(){
 if(!ses()?.jwt){if(typeof window.cc77Auth==="function")window.cc77Auth(false);return;}
 const r=host();r.style.display="block";if($("cc77home"))$("cc77home").style.display="none";
 $("mc158body").innerHTML="<p>Cargando MI COCHERA…</p>";
 try{await load();}catch(e){$("mc158body").textContent="No se pudo abrir MI COCHERA: "+String(e.message||e);}
}
async function load(){
 if(ses()?.isAdmin){account=null;return await loadAdmin();}
 const rows=await api("rpc/mc_ensure_account");
 account=Array.isArray(rows)?rows[0]:rows;
 if(!account)throw Error("Sin cuenta.");
 const detail=await window.cc80.api("mc_accounts?select=country&user_id=eq."+encodeURIComponent(ses().userId));
 account.country=detail?.[0]?.country||"PE";
 realWallets=await window.cc80.api("cc_real_service_wallets?select=service,balance_pen&user_id=eq."+encodeURIComponent(ses().userId));
 if(!active()){showLocked();return;}
 await api("rpc/mc_sync_rents");
 const uid=encodeURIComponent(ses().userId);
 [carts,moves,people]=await Promise.all([
  window.cc80.api("mc_carts?select=*&reseller_id=eq."+uid+"&order=id.asc"),
  window.cc80.api("mc_movements?select=*&reseller_id=eq."+uid+"&order=created_at.desc&limit=2000"),
  window.cc80.api("mc_people?select=*&reseller_id=eq."+uid+"&limit=2000")
 ]);
 renderList();
}
function currencyPanel(){return '<section class="mc158status"><div><strong>País: '+esc(account?.country||"PE")+' · Moneda de cobros: '+esc(account?.currency||"PEN")+'</strong><p>No confundimos la moneda de los alquileres con la billetera, que siempre está en PEN.</p></div><button type="button" data-action="currency">Configurar país y moneda</button></section>';}
function walletPanel(){const balance=realWallets.find(w=>w.service==="MI_COCHERA")?.balance_pen||0;
 return '<section class="mc158status"><div><strong>Billetera MI COCHERA · saldo REAL '+currency(balance,"PEN")+'</strong><p>Saldo real confirmado, distinto del bono gratuito.</p></div><button type="button" data-action="transfer">⇄ Transferir saldo real entre mis billeteras</button></section>';}
function showLocked(){let el=$("mc158body");el.innerHTML=header()+currencyPanel()+walletPanel()+'<section class="mc158box"><h3>Acceso a MI COCHERA</h3><p>Mientras la mensualidad esté vencida, tus carritos, cobros y deudas permanecen guardados y protegidos.</p><p>Para activar, puedes usar saldo de bono gratuito otorgado por ADMIN. El pago con saldo real se habilitará solo tras comprobar el circuito comercial autorizado.</p><button type="button" data-action="bonus" '+(num(account.bonus_pen)<15||account.suspended?"disabled":"")+'>Activar 30 días con S/ 15 de bono</button><p id="mc158notice" role="status"></p></section>';}
async function loadAdmin(){
 accounts=await window.cc80.api("mc_accounts?select=user_id,invite_code,currency,subscription_until,bonus_pen,suspended&order=created_at.desc&limit=300");
 const options=accounts.map(a=>'<option value="'+esc(a.user_id)+'">'+esc(a.invite_code)+' · '+esc(a.user_id.slice(0,8))+'</option>').join("");
 $("mc158body").innerHTML=header()+'<section class="mc158box"><h3>ADMIN · Resellers MI COCHERA</h3><p>Panel exclusivo ADMIN. Bonos gratuitos entran a la billetera promocional del RESELLER; nunca al saldo transferible.</p><form id="mc158grant"><label>RESELLER<select name="user" required>'+options+'</select></label><label>Bono gratuito en soles<input name="amount" type="number" min=".01" max="10000" step=".01" required></label><label>Motivo<input name="reason" maxlength="250" value="Bono gratuito ADMIN"></label><button type="submit">Otorgar bono gratuito</button></form><p id="mc158notice" role="status"></p><div class="mc158scroll"><table><thead><tr><th>Código</th><th>Suscripción</th><th>Bono</th><th>Cuenta</th></tr></thead><tbody>'+accounts.map(a=>'<tr><td>'+esc(a.invite_code)+'</td><td>'+esc(a.subscription_until?new Date(a.subscription_until).toLocaleDateString("es-PE"):"No activa")+'</td><td>S/ '+num(a.bonus_pen).toFixed(2)+'</td><td>'+esc(a.user_id.slice(0,8))+'…</td></tr>').join("")+'</tbody></table></div></section>';
}
function person(id){return people.find(p=>p.id===id)||{};}
function balance(id){return moves.filter(m=>m.cart_id===id).reduce((s,m)=>s+num(m.amount_local),0);}
function renderList(){
 const shown=carts.filter(c=>[c.alias,c.business_type,person(c.owner_person_id).full_name,person(c.owner_person_id).document_number,person(c.worker_person_id).full_name,person(c.worker_person_id).document_number,String(c.id)].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(filter.toLowerCase()));
 const pending=carts.reduce((s,c)=>s+Math.max(0,balance(c.id)),0);
 $("mc158body").innerHTML=header()+currencyPanel()+walletPanel()+'<div class="mc158stats"><span><b>'+carts.filter(c=>c.state==="ACTIVE").length+'</b> activos</span><span><b>'+carts.filter(c=>balance(c.id)>0).length+'</b> con deuda</span><span><b>'+currency(pending,account.currency)+'</b> por cobrar</span></div><section class="mc158box"><div class="mc158tools"><input id="mc158search" placeholder="Alias, dueño, trabajador, DNI o código C-…" value="'+esc(filter)+'"><button type="button" data-action="new">＋ Registrar carrito</button><button type="button" data-action="reload">↻ Actualizar</button></div><p id="mc158notice" role="status"></p><div class="mc158cards">'+shown.map(c=>{
 const owner=person(c.owner_person_id),worker=person(c.worker_person_id),debt=Math.max(0,balance(c.id));
 return '<article class="mc158cart"><div class="mc158carttop"><div><small>C-'+String(c.id).padStart(3,"0")+' · '+esc(c.business_type)+'</small><h3>'+esc(c.alias||owner.full_name||"Carrito")+'</h3><p>Propietario: '+esc(owner.full_name)+' · '+esc(owner.document_number)+'</p>'+(worker.id?'<p>Trabajador: '+esc(worker.full_name)+'</p>':"")+'<small>Tarifa '+currency(c.daily_rate,c.currency)+' / día</small></div><div><strong class="'+(debt>0?"mc158debt":"")+'">'+currency(debt,c.currency)+'</strong><small>'+esc(c.state==="RETIRED"?"Retirado":"Activo")+'</small></div></div><div class="mc158actions"><button type="button" data-action="payment" data-cart="'+c.id+'">Cobrar</button><button type="button" data-action="sale" data-cart="'+c.id+'">Hielo / venta</button><button type="button" data-action="history" data-cart="'+c.id+'">Historial</button><button type="button" data-action="'+(c.state==="ACTIVE"?"retire":"reactivate")+'" data-cart="'+c.id+'">'+(c.state==="ACTIVE"?"Se retira":"Reactivar")+'</button></div></article>';
 }).join("")+'</div></section>';
 $("mc158search").addEventListener("input",e=>{filter=e.target.value;renderList();const input=$("mc158search");input.focus();input.setSelectionRange(input.value.length,input.value.length);});
}
function drawer(title,body){$("mc158dialog")?.remove();const d=document.createElement("div");d.id="mc158dialog";d.className="mc158dialog";d.innerHTML='<section role="dialog" aria-modal="true"><header><h3>'+esc(title)+'</h3><button type="button" data-action="close-dialog">✕</button></header>'+body+'<p id="mc158dialogStatus" role="status"></p></section>';d.addEventListener("click",click);d.addEventListener("submit",submit);document.body.append(d);}
function fields(prefix,title,optional){
 const name=prefix+"Name",doc=prefix+"Doc",kind=prefix+"Kind",phone=prefix+"Phone";
 return '<fieldset><legend>'+title+(optional?" (opcional)":"")+'</legend><label>Documento primero<select name="'+kind+'"><option value="DNI">DNI peruano</option><option value="CE">Carné de extranjería</option><option value="PASSPORT">Pasaporte</option><option value="CEDULA">Cédula extranjera</option><option value="OTHER">Otro</option></select></label><label>Número de documento<input name="'+doc+'" data-mc-dni="'+prefix+'" '+(optional?"":"required")+' maxlength="40" autocomplete="off"></label><p id="mc158lookup'+prefix+'" class="mc158look" aria-live="polite">Al ingresar DNI de 8 dígitos buscaremos primero en tu cartera.</p><label>Nombres y apellidos<input name="'+name+'" '+(optional?"":"required")+' maxlength="160"></label><label>Celular<input name="'+phone+'" type="tel" maxlength="30"></label></fieldset>';
}
function newCart(){drawer("Registrar carrito · DNI primero",'<form id="mc158new">'+fields("owner","Propietario",false)+fields("worker","Trabajador",true)+'<label>Alias / apodo<input name="alias" maxlength="80" placeholder="El Paisa"></label><label>Tipo de negocio<input name="business" required maxlength="100" placeholder="Emoliente, anticuchos, frutera…"></label><label>Tarifa por día ('+esc(account.currency)+')<input type="number" name="rate" min=".01" step=".01" required></label><button type="submit">Guardar carrito</button></form>');}
async function lookupDni(input){
 const form=input.closest("form"),prefix=input.dataset.mcDni,kind=form.elements.namedItem(prefix+"Kind").value,dni=input.value.trim();
 if(kind!=="DNI"||!/^\d{8}$/.test(dni))return;
 const info=$("mc158lookup"+prefix);info.textContent="Buscando DNI…";
 const dest=form.elements.namedItem(prefix+"Name");
 try{
  const matches=await window.cc80.api("mc_people?select=full_name,phone,verification_source&document_type=eq.DNI&document_number=eq."+dni+"&limit=1");
  if(input.value.trim()!==dni)return;
  if(matches.length){dest.value=matches[0].full_name;const phone=form.elements.namedItem(prefix+"Phone");if(!phone.value)phone.value=matches[0].phone||"";info.textContent="Datos encontrados en tu cartera.";}
  if(matches[0]?.verification_source==="API_PERU")return;
  const s=ses();const res=await fetch(s.root+"/functions/v1/mc-verify-dni",{method:"POST",headers:{"apikey":s.key,Authorization:"Bearer "+s.jwt,"Content-Type":"application/json"},body:JSON.stringify({dni})});
  const data=await res.json();if(input.value.trim()!==dni)return;
  if(res.ok&&data.status==="found"){dest.value=data.full_name;info.textContent="Identidad completada desde API Perú.";}
  else info.textContent=matches.length?"Datos internos disponibles; verificación oficial no disponible.":"Sin cupo o autorización API: completa nombre manualmente.";
 }catch(_){info.textContent="Consulta externa no disponible; ingresa el nombre manualmente.";}
}
async function submit(e){
 if(!e.target.id?.startsWith("mc158"))return;
 e.preventDefault();if(busy)return;busy=true;let button=e.target.querySelector('button[type="submit"]');if(button)button.disabled=true;
 try{
 if(e.target.id==="mc158grant"){
  const f=e.target;
  const next=await api("rpc/mc_admin_grant_bonus",{p_reseller:f.elements.user.value,p_amount:num(f.elements.amount.value),p_request:crypto.randomUUID(),p_note:f.elements.reason.value});
  note("Bono registrado: nuevo saldo promocional S/ "+num(next).toFixed(2));await loadAdmin();
 }else if(e.target.id==="mc158config"){
  const f=e.target;await api("rpc/mc_configure_currency",{p_currency:f.elements.currency.value,p_country:f.elements.country.value.toUpperCase()});$("mc158dialog")?.remove();await load();note("Moneda y país actualizados para esta cochera.");
 }else if(e.target.id==="mc158transfer"){
  const f=e.target;await api("rpc/mc_transfer_real_balance",{p_from:f.elements.from.value,p_to:f.elements.to.value,p_amount:num(f.elements.amount.value),p_request:f.dataset.request});$("mc158dialog")?.remove();await load();note("Transferencia real verificada y registrada. El bono gratuito permanece intransferible.");
 }else if(e.target.id==="mc158new"){
  const f=e.target,x=k=>f.elements.namedItem(k)?.value?.trim()||"";
  const id=await api("rpc/mc_create_cart",{p_alias:x("alias"),p_type:x("business"),p_rate:num(x("rate")),p_owner_kind:x("ownerKind"),p_owner_doc:x("ownerDoc"),p_owner_name:x("ownerName"),p_owner_phone:x("ownerPhone"),p_worker_kind:x("workerKind")||null,p_worker_doc:x("workerDoc")||null,p_worker_name:x("workerName")||null,p_worker_phone:x("workerPhone")||null});
  $("mc158dialog")?.remove();await load();note("Carrito registrado: C-"+String(id).padStart(3,"0"));
 }else if(e.target.id==="mc158pay"){
  const f=e.target;await api("rpc/mc_record_movement",{p_cart:Number(f.dataset.cart),p_kind:"PAYMENT",p_label:"Abono recibido",p_quantity:null,p_unit:null,p_amount:-num(f.elements.amount.value),p_method:f.elements.method.value});$("mc158dialog")?.remove();await load();note("Pago registrado.");
 }else if(e.target.id==="mc158sale"){
  const f=e.target,q=num(f.elements.quantity.value),price=num(f.elements.price.value);
  await api("rpc/mc_record_movement",{p_cart:Number(f.dataset.cart),p_kind:"PRODUCT",p_label:f.elements.item.value,p_quantity:q,p_unit:price,p_amount:Math.round(q*price*100)/100,p_method:null});$("mc158dialog")?.remove();await load();note("Producto agregado a la deuda.");
 }
 }catch(e){const el=$("mc158dialogStatus")||$("mc158notice");if(el)el.textContent="No se completó: "+String(e.message||e);}
 finally{busy=false;if(button)button.disabled=false;}
}
async function click(e){
 let btn=e.target.closest("[data-action]");if(!btn)return;
 e.preventDefault();const act=btn.dataset.action,id=Number(btn.dataset.cart);
 try{
 if(act==="close-dialog"){$("mc158dialog")?.remove();return;}
 if(act==="reload"){await load();return;}
 if(act==="new"){newCart();return;}
 if(act==="currency"){
  const codes=["PEN","USD","EUR","COP","MXN","ARS","CLP","BOB","BRL","UYU","PYG","CRC","DOP","CAD","GBP"];
  drawer("País y moneda de tu cochera",'<form id="mc158config"><p>Configura la moneda antes de crear el primer carrito. No se permite convertir deudas históricas por simple cambio de símbolo.</p><label>País (ISO, dos letras)<input name="country" required minlength="2" maxlength="2" value="'+esc(account.country||"PE")+'" placeholder="PE, CO, MX"></label><label>Moneda<select name="currency">'+codes.map(c=>'<option value="'+c+'" '+(account.currency===c?"selected":"")+'>'+c+'</option>').join("")+'</select></label><button type="submit">Guardar moneda</button></form>');return;
 }
 if(act==="transfer"){
  const opts=["MI_COCHERA","COBRA_YA","STREAM_BULLS"];
  const labels={MI_COCHERA:"MI COCHERA",COBRA_YA:"COBRA YA",STREAM_BULLS:"STREAM BULL’S"};
  const mk=arr=>arr.map(x=>'<option value="'+x+'">'+labels[x]+' · '+currency(realWallets.find(w=>w.service===x)?.balance_pen||0,"PEN")+'</option>').join("");
  drawer("Transferir saldo REAL",'<form id="mc158transfer" data-request="'+crypto.randomUUID()+'"><p>Solo se mueve dinero real verificado entre billeteras del MISMO usuario. Los bonos nunca se transfieren.</p><label>Desde<select name="from">'+mk(opts)+'</select></label><label>Hacia<select name="to">'+mk(opts)+'</select></label><label>Importe en soles<input name="amount" type="number" min=".01" max="100000" step=".01" required></label><button type="submit">Confirmar transferencia</button></form>');return;
 }
 if(act==="bonus"){if(!confirm("¿Usar S/ 15 del bono ADMIN para activar 30 días?"))return;await api("rpc/mc_activate_with_bonus",{p_request:crypto.randomUUID()});await load();return;}
 if(act==="retire"||act==="reactivate"){if(!confirm(act==="retire"?"Se detendrán los cargos diarios futuros. La deuda histórica permanecerá.":"¿Reactivar este carrito conservando su historial?"))return;await api("rpc/mc_change_cart_state",{p_cart:id,p_new_state:act==="retire"?"RETIRED":"ACTIVE"});await load();return;}
 if(act==="payment"){drawer("Cobrar · C-"+id,'<form id="mc158pay" data-cart="'+id+'"><p>Deuda pendiente: '+currency(balance(id),account.currency)+'</p><label>Importe recibido<input name="amount" type="number" min=".01" max="'+Math.max(0,balance(id)).toFixed(2)+'" step=".01" required></label><label>Medio<select name="method"><option>Efectivo</option><option>Yape</option><option>Plin</option><option>Transferencia</option></select></label><button type="submit">Registrar abono</button></form>');return;}
 if(act==="sale"){drawer("Agregar hielo o producto · C-"+id,'<form id="mc158sale" data-cart="'+id+'"><label>Producto<input name="item" value="Hielo" required maxlength="120"></label><label>Cantidad<input name="quantity" type="number" min=".001" step="any" value="1" required></label><label>Precio por unidad ('+esc(account.currency)+')<select name="price"><option value="1.50">1.50</option><option value="2">2.00</option><option value="3">3.00</option></select></label><p>Se acumula como deuda del carrito hasta registrar el pago.</p><button type="submit">Agregar producto</button></form>');return;}
 if(act==="history"){const c=carts.find(c=>c.id===id);let records=moves.filter(m=>m.cart_id===id);drawer("Historial · "+(c?.alias||"C-"+id),'<div class="mc158scroll"><table><thead><tr><th>Fecha</th><th>Movimiento</th><th>Importe</th></tr></thead><tbody>'+records.map(m=>'<tr><td>'+esc(m.occurred_on)+'</td><td>'+esc(m.label)+'</td><td>'+currency(m.amount_local,m.currency)+'</td></tr>').join("")+'</tbody></table></div>');return;}
 }catch(e){note("Error: "+String(e.message||e));}
}
window.mc158Open=open;
window.mc158Close=close;
})();