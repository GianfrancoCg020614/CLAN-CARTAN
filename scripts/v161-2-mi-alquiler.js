/* CLAN CARTAN · MI ALQUILER V161.2 · persistencia protegida de unidades, inquilinos y contratos.
 * Se carga sobre la interfaz V161.1. No crea pagos, recargas ni mensajes de WhatsApp.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const session=()=>window.CC_V53_SESSION;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const money=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const isoToday=()=>{let p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());let t=Object.fromEntries(p.map(x=>[x.type,x.value]));return t.year+'-'+t.month+'-'+t.day;};
const api=(path,method,body)=>window.cc80.api(path,method,body);
const rpc=(name,body)=>api('rpc/'+name,'POST',body||{});
let account=null,properties=[],units=[],tenants=[],leases=[],events=[],area='inmuebles',loading=false,busy=false,uid=null;
function reset(){account=null;properties=[];units=[];tenants=[];leases=[];events=[];uid=null;}
const ucode=u=>u?.code||((u?.kind==='LOCAL'?'L-':'H-')+String(u?.serial||0).padStart(3,'0'));
const tenancy=id=>tenants.find(t=>t.id===id)||{};
const unit=id=>units.find(u=>Number(u.id)===Number(id))||{};
const prop=id=>properties.find(p=>Number(p.id)===Number(id))||{};
const currentLease=id=>leases.find(l=>Number(l.unit_id)===Number(id)&&l.state==='ACTIVE');
function note(msg,error){const el=$('ma1612notice');if(el){el.textContent=String(msg);el.classList.toggle('error',!!error);}else if(error)console.warn('MI ALQUILER: '+msg);}
function section(title,summary,content){return '<div class="ma1612-top"><div><small>MI ALQUILER · V161.2</small><h3>'+title+'</h3><p>'+summary+'</p></div><button type="button" data-ma-action="reload">↻ Actualizar</button></div><p id="ma1612notice" role="status"></p>'+content;}
async function refresh(){
 const s=session();if(!s?.jwt||!s.userId){reset();throw Error('Inicia sesión para acceder a MI ALQUILER');}
 uid=s.userId;
 const raw=await rpc('ma_ensure_account');
 if(session()?.userId!==uid)throw Error('Cambió la sesión. Vuelve a ingresar.');
 account=Array.isArray(raw)?raw[0]:raw;
 if(!account||typeof account.active!=='boolean')throw Error('Respuesta de membresía no válida');
 if(!account.active){properties=[];units=[];tenants=[];leases=[];events=[];return;}
 const filter='&reseller_id=eq.'+encodeURIComponent(uid);
 const paths=[
  'ma_properties?select=*&order=id.asc'+filter,
  'ma_units?select=*&order=id.asc'+filter,
  'ma_tenants?select=*&order=created_at.desc'+filter,
  'ma_leases?select=*&order=created_at.desc'+filter,
  'ma_lease_events?select=*&order=created_at.desc&limit=500'+filter
 ];
 const rows=await Promise.all(paths.map(p=>api(p)));
 if(session()?.userId!==uid)throw Error('Sesión cambiada');
 [properties,units,tenants,leases,events]=rows.map(x=>Array.isArray(x)?x:[]);
}
function locked(){
 const admin=account?.role==='ADMIN';
 let status=account?.suspended?'Cuenta suspendida':account?.subscription_until?'Suscripción vencida':'Pendiente de activación';
 return section('Acceso a MI ALQUILER','La información de cada RESELLER está protegida.',
 '<div class="ma1612-locked"><strong>'+esc(status)+'</strong><p>Tu cuenta '+esc(account?.invite_code||'')+' permanece registrada y su información histórica se conservará. La membresía puede renovarse con un bono autorizado o saldo real verificado. No se acreditan recargas desde esta pantalla.</p>'+ (admin?'<p>ADMIN podrá operar sus propios inmuebles.</p>':'')+'</div>');
}
function actionButton(name,label,extra=''){return '<button type="button" data-ma-action="'+name+'" '+extra+'>'+label+'</button>';}
function renderProperties(){
 const occupied=units.filter(u=>currentLease(u.id)).length;
 const stats='<div class="ma1612-stats"><div><b>'+properties.length+'</b> Inmuebles</div><div><b>'+units.length+'</b> Habitaciones y locales</div><div><b>'+occupied+'</b> Ocupados</div><div><b>'+Math.max(0,units.length-occupied)+'</b> Registrados no ocupados</div></div>';
 const blocks=properties.map(p=>{
  const within=units.filter(u=>Number(u.property_id)===Number(p.id));
  return '<article class="ma1612-box"><header><div><h4>'+esc(p.name)+'</h4><small>'+esc(p.address||'Sin dirección')+'</small></div>'+actionButton('new-unit','＋ Cuarto/local','data-property="'+p.id+'"')+'</header>'+
  (within.length?'<div class="ma1612-list">'+within.map(u=>{
   const l=currentLease(u.id),t=l?tenancy(l.tenant_id):{};
   const status=l?'Ocupado':u.state==='CLEANING'?'En limpieza':u.state==='DISABLED'?'Inhabilitado':'Disponible';
   return '<div class="ma1612-line"><div><strong>'+esc(ucode(u))+' · '+esc(u.alias)+'</strong><small>'+esc(u.kind==='LOCAL'?'Local':'Habitación')+' · Piso '+esc(u.floor||'—')+' · '+esc(status)+'</small><small>Día '+money(u.daily_rate)+' · Mes '+money(u.monthly_rate)+'</small>'+(l?'<small>Inquilino: '+esc(t.full_name||'')+'</small>':'')+'</div><div class="ma1612-actions">'+(!l&&u.state!=='READY'?actionButton('ready','Lista para alquilar','data-unit="'+u.id+'"'):'')+(!l&&u.state==='READY'?actionButton('disable','Inhabilitar','data-unit="'+u.id+'"'):'')+'</div></div>';
  }).join('')+'</div>':'<p>Aún no hay habitaciones ni locales registrados.</p>')+'</article>';
 }).join('');
 return section('Habitaciones y locales','Inmuebles y unidades registrados en Supabase para tu cuenta.',stats+'<div class="ma1612-actions">'+actionButton('new-property','＋ Registrar inmueble')+'</div>'+blocks);
}
function renderTenants(){
 const content='<div class="ma1612-actions">'+actionButton('new-tenant','＋ Registrar inquilino')+'</div>'+
 (tenants.length?'<div class="ma1612-list">'+tenants.map(t=>'<div class="ma1612-line"><div><strong>'+esc(t.full_name)+'</strong><small>'+esc(t.document_type)+' · '+esc(t.document_number)+'</small><small>WhatsApp: '+esc(t.whatsapp||'No registrado')+' · Avisos: '+(t.consent_whatsapp?'Autorizados':'No autorizados')+'</small></div>'+actionButton('edit-tenant','Editar','data-tenant="'+t.id+'"')+'</div>').join('')+'</div>':'<p>No hay inquilinos registrados todavía.</p>');
 return section('Inquilinos','DNI primero, contacto de WhatsApp y consentimiento individual para avisos de alquiler.',content);
}
function renderLeases(){
 const rows=leases.map(l=>{const u=unit(l.unit_id),t=tenancy(l.tenant_id);
  return '<article class="ma1612-box"><header><div><h4>'+esc(ucode(u))+' · '+esc(t.full_name||'Inquilino')+'</h4><small>'+esc(l.mode==='DAY'?'Diario':'Mensual')+' · '+money(l.rate)+' / '+(l.mode==='DAY'?'día':'mes')+'</small><small>Ingreso: '+esc(l.start_on)+' · Vence: '+esc(l.next_due_on)+'</small><small>Estado: '+esc(l.state==='ACTIVE'?'Activo':'Finalizado')+' · Periodos: '+l.periods+'</small></div>'+
 (l.state==='ACTIVE'?'<div class="ma1612-actions">'+actionButton('extend','Ampliar','data-lease="'+l.id+'"')+actionButton('end','Se retira','data-lease="'+l.id+'"')+'</div>':'')+'</header></article>';
 }).join('');
 const recent=events.length?'<details class="ma1612-box"><summary>Historial de contratos ('+events.length+' movimientos)</summary><div class="ma1612-list">'+events.slice(0,100).map(e=>'<div class="ma1612-line"><span>'+esc(e.kind)+' · '+esc(e.created_at?.slice(0,10))+'</span><small>Periodos: '+Number(e.periods_delta||0)+' · Vence '+esc(e.due_after||'—')+'</small></div>').join('')+'</div></details>':'';
 return section('Contratos y vencimientos','Se registran contratos diarios o mensuales; los cobros y medidores se consultan en «Cobros y servicios».',
 '<div class="ma1612-actions">'+actionButton('new-lease','＋ Alquilar habitación/local')+'</div>'+ (leases.length?rows:'<p>No existen contratos registrados.</p>')+recent);
}
function pending(area){const isMoney=area==='finanzas';return section(isMoney?'Cobros y servicios':'Avisos y reportes','Los datos de habitaciones, locales e inquilinos ya están protegidos en Supabase.',
 '<div class="ma1612-locked"><strong>'+ (isMoney?'V161.3 · Integración financiera':'V161.4 · Avisos y exportaciones')+'</strong><p>'+ (isMoney?'Se incorporarán abonos, consumos, medidores, garantías, gastos y suscripción sin activar cobros externos no comprobados.':'Los mensajes utilizarán el WhatsApp registrado por el RESELLER a cada inquilino. Las consultas API Perú se validarán desde el backend.')+'</p></div>');}
function enhance(which,target){
 area=which;
 if(!target)return;
 if(!session()?.jwt){target.innerHTML=section('Sesión requerida','Inicia sesión en CLAN CARTAN para continuar.','');return;}
 if(loading){target.innerHTML='<p>Cargando datos protegidos de MI ALQUILER…</p>';return;}
 if(!account){target.innerHTML='<p>Preparando acceso…</p>';return;}
 if(!account.active){target.innerHTML=locked();return;}
 if(typeof window.ma1613Enhance==='function' && window.ma1613Enhance(area,target,{account,leases,units,tenants,properties,sessionId:uid})) return;
 if(typeof window.ma1614Enhance==='function' && window.ma1614Enhance(area,target,{account,leases,units,tenants,properties,sessionId:uid})) return;
 target.innerHTML=area==='inmuebles'?renderProperties():area==='inquilinos'?renderTenants():area==='contratos'?renderLeases():pending(area);
}
function rerender(){enhance(area,$('ma1611content'));}
let pendingLoad=null;
function load(){
 if(pendingLoad)return pendingLoad;
 const task=(async()=>{
  loading=true;rerender();
  try{await refresh();}catch(e){reset();const el=$('ma1611content');if(el)el.innerHTML=section('No se pudieron cargar los datos','Sin operaciones realizadas.', '<p class="ma1612-error">'+esc(e.message||e)+'</p>'+actionButton('reload','Reintentar'));}
  finally{loading=false;if(account)rerender();}
 })();
 pendingLoad=task;
 return task.finally(()=>{if(pendingLoad===task)pendingLoad=null;});
}
function dialog(title,form){
 $('ma1612dialog')?.remove();
 const d=document.createElement('div');d.className='ma1612-dialog';d.id='ma1612dialog';
 d.innerHTML='<section role="dialog" aria-modal="true" aria-label="'+esc(title)+'"><header><h3>'+esc(title)+'</h3><button type="button" data-ma-action="close">✕</button></header>'+form+'<p id="ma1612dialogstatus" role="status"></p></section>';
 document.body.append(d);
}
const input=(label,name,type='text',extra='')=>'<label>'+label+'<input name="'+name+'" type="'+type+'" '+extra+' required></label>';
function newProperty(){dialog('Registrar inmueble','<form data-ma-form="property">'+input('Nombre del edificio / inmueble','name','text','maxlength="120"')+input('Dirección / referencia','address','text','maxlength="250"')+'<button type="submit">Guardar inmueble</button></form>');}
function newUnit(property){if(!properties.length){note('Primero registra un inmueble.',true);return;}
 dialog('Registrar habitación o local','<form data-ma-form="unit"><label>Edificio<select name="property" required>'+properties.map(p=>'<option value="'+p.id+'" '+(String(property)===String(p.id)?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label><label>Tipo<select name="kind"><option value="HABITACION">Habitación</option><option value="LOCAL">Local</option></select></label>'+input('Nombre o alias','alias','text','maxlength="120"')+'<label>Piso / ubicación<input name="floor" maxlength="40"></label><label>Tarifa por día (S/)<input type="number" name="daily" value="0" min="0" max="100000" step="0.01" required></label><label>Tarifa mensual (S/)<input type="number" name="monthly" value="0" min="0" max="100000" step="0.01" required></label><p>Al menos una tarifa debe ser mayor que cero.</p><button type="submit">Guardar habitación / local</button></form>');}
function tenantForm(id){const t=tenants.find(x=>x.id===id)||{};
 dialog(t.id?'Editar inquilino':'Registrar inquilino','<p>Primero ingresa el DNI y pulsa Buscar. Se reutilizan los datos guardados antes de consultar API Perú.</p><form data-ma-form="tenant" data-id="'+esc(id||'')+'">'+input('Número de documento (DNI primero)','document','text','maxlength="40" value="'+esc(t.document_number||'')+'" '+(t.id?'readonly':''))+'<button type="button" data-ma4-dni>Buscar DNI</button>'+'<label>Tipo de documento<select name="kind">'+['DNI','CE','PASSPORT','CEDULA','OTHER'].map(k=>'<option value="'+k+'" '+(t.document_type===k?'selected':'')+'>'+k+'</option>').join('')+'</select></label><small id="ma4-dni-status" role="status">Primero se busca en tu cartera; si no existe, se consulta API Perú según autorización y cupo.</small>'+input('Nombres y apellidos','name','text','maxlength="160" value="'+esc(t.full_name||'')+'"')+'<label>WhatsApp del inquilino (con código de país)<input name="whatsapp" type="tel" maxlength="20" value="'+esc(t.whatsapp||'')+'" placeholder="+51987654321"></label><label class="ma1612-checkbox"><input type="checkbox" name="consent" '+(t.consent_whatsapp?'checked':'')+'> Autoriza recibir recordatorios del alquiler por WhatsApp.</label><p>La consulta de DNI desde servidor permite completar el nombre. Si no hay cupo o autorización, registra manualmente. El WhatsApp lo proporciona el RESELLER.</p><button type="submit">Guardar inquilino</button></form>');}
function leaseForm(){const free=units.filter(u=>u.state==='READY'&&!currentLease(u.id)),options=free.map(u=>'<option value="'+u.id+'">'+esc(ucode(u))+' · '+esc(u.alias)+' · Día '+money(u.daily_rate)+' / Mes '+money(u.monthly_rate)+'</option>').join('');
 if(!free.length||!tenants.length){note('Necesitas una habitación/local disponible y al menos un inquilino.',true);return;}
 dialog('Nuevo contrato de alquiler','<form data-ma-form="lease"><label>Habitación o local<select name="unit" required>'+options+'</select></label><label>Inquilino<select name="tenant" required>'+tenants.map(t=>'<option value="'+t.id+'">'+esc(t.full_name)+' · '+esc(t.document_number)+'</option>').join('')+'</select></label><label>Modalidad<select name="mode"><option value="MONTH">Mensual</option><option value="DAY">Por día</option></select></label><label>Fecha de ingreso<input type="date" name="start" max="'+isoToday()+'" value="'+isoToday()+'" required></label><p>La tarifa se toma de la habitación o local al crear el contrato. Abonos y garantías se registran aparte en «Cobros y servicios».</p><button type="submit">Registrar contrato</button></form>');}
async function onClick(e){const b=e.target.closest('[data-ma-action]');if(!b)return;e.preventDefault();const act=b.dataset.maAction;
 if(act==='close'){$('ma1612dialog')?.remove();return;}
 if(act==='new-property'){newProperty();return;}
 if(act==='new-unit'){newUnit(b.dataset.property);return;}
 if(act==='new-tenant'){tenantForm(null);return;}
 if(act==='edit-tenant'){tenantForm(b.dataset.tenant);return;}
 if(act==='new-lease'){leaseForm();return;}
 if(busy)return;
 try{
  busy=true;b.disabled=true;
  if(act==='reload'){await load();return;}
  if(act==='extend'){
   const count=Number(window.prompt('¿Cuántos días o meses adicionales?', '1'));
   if(!Number.isInteger(count)||count<1||count>365)return;
   await rpc('ma_extend_lease',{p_lease:b.dataset.lease,p_more:count});window.ma1613Invalidate?.();window.ma1614Invalidate?.();await load();return;
  }
  if(act==='end'){
   if(!window.confirm('¿Confirmar retiro? La habitación/local pasará a limpieza. El historial no se eliminará.'))return;
   await rpc('ma_end_lease',{p_lease:b.dataset.lease});window.ma1613Invalidate?.();window.ma1614Invalidate?.();await load();return;
  }
  if(act==='ready'||act==='disable'){
   await rpc('ma_set_unit_state',{p_unit:Number(b.dataset.unit),p_state:act==='ready'?'READY':'DISABLED'});await load();return;
  }
 }catch(err){note(err.message||err,true);}finally{busy=false;b.disabled=false;}
}
async function onSubmit(e){const form=e.target.closest('[data-ma-form]');if(!form)return;e.preventDefault();if(busy)return;
 const v=k=>String(form.elements.namedItem(k)?.value??'').trim();const btn=form.querySelector('[type=submit]');const ds=$('ma1612dialogstatus');
 busy=true;if(btn)btn.disabled=true;if(ds)ds.textContent='Guardando en Supabase…';
 try{
  const kind=form.dataset.maForm;
  if(kind==='property') await rpc('ma_add_property',{p_name:v('name'),p_address:v('address')});
  if(kind==='unit') await rpc('ma_add_unit',{p_property:Number(v('property')),p_kind:v('kind'),p_alias:v('alias'),p_floor:v('floor'),p_daily:Number(v('daily')),p_monthly:Number(v('monthly'))});
  if(kind==='tenant'){
   if(v('kind')==='DNI' && !/^\d{8}$/.test(v('document')))throw Error('El DNI debe tener exactamente 8 dígitos.');
   let phone=v('whatsapp').replace(/\s|\(|\)|-/g,'');if(/^9[0-9]{8}$/.test(phone))phone='+51'+phone;
   await rpc('ma_save_tenant',{p_id:form.dataset.id||null,p_kind:v('kind'),p_number:v('document'),p_name:v('name'),p_whatsapp:phone,p_consent:!!form.elements.namedItem('consent').checked});
  }
  if(kind==='lease') await rpc('ma_start_lease',{p_unit:Number(v('unit')),p_tenant:v('tenant'),p_mode:v('mode'),p_start:v('start')});
  window.ma1613Invalidate?.();window.ma1614Invalidate?.();$('ma1612dialog')?.remove();await load();note('Guardado correctamente.');
 }catch(err){if(ds){ds.classList.add('error');ds.textContent='No se guardó: '+String(err.message||err);} }
 finally{busy=false;if(btn)btn.disabled=false;}
}
function init(){
 document.addEventListener('click',onClick);
 document.addEventListener('submit',onSubmit);
 const layer=$('ma1611layer');if(layer&&!layer.hidden)void load();
 document.addEventListener('click',e=>{if(e.target.closest('#cc54logout'))reset();},true);
}
// No redeclarar la sesión original ni alterar otros módulos.
window.ma1612Enhance=enhance;
window.ma1612OnOpen=()=>load();
window.ma1612Reset=reset;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();