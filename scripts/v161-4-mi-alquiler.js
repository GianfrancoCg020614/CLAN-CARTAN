/* CLAN CARTAN · MI ALQUILER V161.4
   Avisos operativos al teléfono del inquilino (NO envíos automáticos), búsqueda, Excel y PDF.
   No modifica saldos, token de API Perú ni otros módulos. */
(function(){
'use strict';
const $=id=>document.getElementById(id),ss=()=>window.CC_V53_SESSION;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cash=v=>'S/ '+Number(v||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const api=path=>window.cc80.api(path);
const rpc=(name,body)=>window.cc80.api('rpc/'+name,'POST',body);
const today=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;};
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const dateDiff=(d,now=today())=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d)))return null;return Math.round((Date.parse(d+'T00:00:00Z')-Date.parse(now+'T00:00:00Z'))/86400000);};
const phoneDigits=p=>{let s=String(p||'').replace(/\D/g,'');if(/^9\d{8}$/.test(s))s='51'+s;return /^\d{10,15}$/.test(s)&&!/^0+$/.test(s)?s:null;};
const id=()=>{if(crypto?.randomUUID)return crypto.randomUUID();const a=new Uint8Array(16);crypto.getRandomValues(a);a[6]=(a[6]&15)|64;a[8]=(a[8]&63)|128;const h=[...a].map(x=>x.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);};
let owner=null,loaded=false,loading=false,error='',ledger=[],guarantees=[],expenses=[],notices=[],ctx=null,alerts=[],allRows=[];
function clear(){owner=null;loaded=false;loading=false;error='';ledger=[];guarantees=[];expenses=[];notices=[];ctx=null;alerts=[];allRows=[];}
const code=u=>u.code||((u.kind==='LOCAL'?'L-':'H-')+String(u.serial||0).padStart(3,'0'));
function status(days){if(days===null)return ['Sin fecha','other'];if(days<0)return ['Vencido hace '+Math.abs(days)+' día(s)','late'];if(days===0)return ['Vence hoy','today'];if(days<=5)return ['Vence en '+days+' día(s)','soon'];return ['Vence en '+days+' días','later'];}
const getLeaseLabel=(l,c)=>{const u=c.units.find(x=>String(x.id)===String(l.unit_id))||{};return code(u)+' · '+String(u.alias||'');};
function generated(c){
 const le=c.leases.filter(l=>l.state==='ACTIVE');
 return le.map(l=>{const t=c.tenants.find(x=>x.id===l.tenant_id)||{},u=c.units.find(x=>String(x.id)===String(l.unit_id))||{};
  const due=String(l.next_due_on||''),days=dateDiff(due),tel=phoneDigits(t.whatsapp),permit=t.consent_whatsapp===true;
  const paid=ledger.filter(x=>x.lease_id===l.id).reduce((total,x)=>total+Number(x.amount_pen||0),0);
  const opened=notices.some(n=>n.lease_id===l.id&&n.due_on===due&&phoneDigits(n.phone_snapshot)===tel&&n.event_type==='OPENED');
  return {lease:l,unit:u,tenant:t,due,days,tel,permit,opened,owed:Math.max(0,paid),code:code(u)};
 }).sort((a,b)=>(a.days??99999)-(b.days??99999));
}
async function load(c){
 if(loading||loaded&&owner===c.sessionId)return;
 loading=true;owner=c.sessionId;error='';
 try{
  const q='&reseller_id=eq.'+encodeURIComponent(c.sessionId);
  const paths=['ma_ledger?select=*&order=created_at.desc&limit=5000'+q,'ma_guarantee_events?select=*&order=created_at.desc&limit=3000'+q,'ma_expenses?select=*&order=created_at.desc&limit=3000'+q,'ma_whatsapp_notice_events?select=*&order=created_at.desc&limit=3000'+q];
  const data=await Promise.all(paths.map(api));
  if(ss()?.userId!==c.sessionId){clear();return;}
  [ledger,guarantees,expenses,notices]=data.map(x=>Array.isArray(x)?x:[]);
  loaded=true;alerts=generated(c);allRows=[];
 }catch(e){loaded=false;error='No se pudieron cargar los avisos: '+String(e.message||e);}
 finally{loading=false;if(owner===c.sessionId&&$('ma1611layer')&&!$('ma1611layer').hidden&&$('ma1611layer').querySelector('.ma1611-nav button[data-area="avisos"].active'))window.ma1612Enhance?.('avisos',$('ma1611content'));}
}
function findSimilar(hay,needle){if(hay.includes(needle))return true;if(needle.length<4)return false;
 // tolerar un error de escritura por palabra; no realiza consultas a servidores.
 return hay.split(/[^a-z0-9]+/).some(w=>{if(Math.abs(w.length-needle.length)>1)return false;let i=0,j=0,err=0;while(i<w.length&&j<needle.length){if(w[i]===needle[j]){i++;j++;continue;}err++;if(err>1)return false;if(w.length>needle.length)i++;else if(w.length<needle.length)j++;else{i++;j++;}}return err+Math.max(w.length-i,needle.length-j)<=1;});
}
function searchCards(text){const needle=norm(text);const terms=needle.split(/\s+/).filter(Boolean);return alerts.filter(a=>{const t=a.tenant,u=a.unit,l=a.lease;const blob=norm([a.code,u.alias,u.kind,u.floor,t.full_name,t.document_number,t.whatsapp,l.state,l.mode,a.due].join(' '));return terms.every(x=>findSimilar(blob,x));});}
function whatsAppLink(a){const txt='Hola '+a.tenant.full_name+', te escribimos por el alquiler de '+a.code+(a.unit.alias?' ('+a.unit.alias+')':'')+'. '+(a.days<0?'El vencimiento fue el ':'El vencimiento es el ')+a.due+'. '+(a.owed>0?'Saldo registrado pendiente: '+cash(a.owed)+'. ':'')+'Por favor, confirma tu fecha de pago o renovación. Gracias.';
 return 'https://wa.me/'+a.tel+'?text='+encodeURIComponent(txt);
}
function rowHTML(a){const [label,level]=status(a.days);const can=a.permit&&a.tel;const state=a.opened?'<span class="ma4-opened">Enlace abierto a este número</span>':'';
 const btn=can?'<a class="ma4-wa" href="'+esc(whatsAppLink(a))+'" target="_blank" rel="noopener noreferrer" data-ma4-notice="'+esc(a.lease.id)+'">Abrir WhatsApp ↗</a>':'<small class="ma4-disabled">'+(!a.permit?'Sin autorización de avisos':'WhatsApp inválido o sin registrar')+'</small>';
 return '<article class="ma4-row"><div><strong>'+esc(a.code)+' · '+esc(a.tenant.full_name||'Inquilino')+'</strong><small>'+esc(a.unit.alias||'')+' · '+esc(a.lease.mode==='DAY'?'Diario':'Mensual')+' · Vence '+esc(a.due)+'</small><small>Saldo registrado '+cash(a.owed)+' · '+esc(a.tel?'+'+a.tel:'Sin teléfono válido')+'</small>'+state+'</div><div class="ma4-side"><span class="ma4-flag '+level+'">'+esc(label)+'</span>'+btn+'</div></article>';
}
function renderList(items){const el=$('ma4-results');if(!el)return;el.innerHTML=items.length?items.slice(0,250).map(rowHTML).join(''):'<p>No hay contratos activos que coincidan con la búsqueda.</p>';const n=$('ma4-count');if(n)n.textContent=items.length+' contrato(s) encontrados'+(items.length>250?' · mostrando 250':'');}
function panel(c){alerts=generated(c);const urgent=alerts.filter(a=>a.days!==null&&a.days<=5).length;
 return '<section class="ma4-wrap"><header class="ma4-head"><div><small>CLAN CARTAN · MI ALQUILER V161.4</small><h3>🔔 Alertas y reportes</h3><p>Recordatorios al WhatsApp que cada RESELLER registró para su inquilino.</p></div><button type="button" data-ma4-action="refresh">↻ Actualizar</button></header>'+
 '<div class="ma4-stats"><div><b>'+alerts.length+'</b><small>Contratos activos</small></div><div><b>'+urgent+'</b><small>Vencidos o próximos (5 días)</small></div><div><b>'+alerts.filter(a=>a.permit&&a.tel).length+'</b><small>Contactos habilitados</small></div></div>'+
 '<div class="ma4-toolbar"><label>Buscar por nombre, DNI, código, teléfono o local<input id="ma4-search" type="search" autocomplete="off" placeholder="Ej. H-001, Juan, 987..." aria-label="Buscar contratos"></label><div class="ma4-actions"><button type="button" data-ma4-action="urgent">Solo vencimientos</button><button type="button" data-ma4-action="all">Todos</button><button type="button" data-ma4-action="xlsx">Exportar Excel .xlsx</button><button type="button" data-ma4-action="pdf">Imprimir / PDF</button></div></div>'+
 '<p id="ma4-status" role="status">Avisos a 5, 3, 1 días y el vencimiento. Los enlaces se abren manualmente; no se envían mensajes sin tu intervención.</p><small id="ma4-count"></small><div id="ma4-results">'+alerts.slice(0,250).map(rowHTML).join('')+'</div>'+
 '<p class="ma4-disclaimer">«Enlace abierto» no confirma entrega ni lectura en WhatsApp. Si se cambia el número o la fecha, se genera un aviso nuevo. Para envío desatendido se requiere WhatsApp Business Platform y autorización verificable.</p></section>';
}
function enhance(area,target,c){if(area!=='avisos')return false;if(!c?.account||!ss()?.jwt)return false;
 if(!c.account.active){target.innerHTML='<div class="ma4-wrap"><p>Acceso a reportes bloqueado: la membresía MI ALQUILER no está vigente. Se conservan los datos.</p></div>';return true;}
 if(owner!==c.sessionId)clear();ctx=c;
 if(error){target.innerHTML='<p class="ma4-error">'+esc(error)+'</p><button type="button" data-ma4-action="refresh">Reintentar</button>';return true;}
 if(!loaded){target.innerHTML='<div class="ma4-wrap"><p>Consultando vencimientos de tu cartera…</p></div>';void load(c);return true;}
 target.innerHTML=panel(c);return true;
}
async function lookupDni(button){const form=button.closest('form[data-ma-form="tenant"]');if(!form)return;
 const dni=form.elements.namedItem('document')?.value?.trim(),kind=form.elements.namedItem('kind')?.value;
 const info=form.querySelector('#ma4-dni-status'),name=form.elements.namedItem('name');if(!info||!name)return;
 if(kind!=='DNI'||!/^\d{8}$/.test(dni)){info.textContent='Para consultar API Perú selecciona DNI e ingresa exactamente 8 dígitos.';return;}
 const s=ss();if(!s?.jwt||!s?.root||!s?.key){info.textContent='Necesitas iniciar sesión en CLAN CARTAN.';return;}
 button.disabled=true;info.textContent='Consultando tu cartera y servicio de DNI…';const previous=dni;
 try{
  const res=await fetch(s.root+'/functions/v1/ma-verify-dni',{method:'POST',headers:{apikey:s.key,Authorization:'Bearer '+s.jwt,'Content-Type':'application/json'},body:JSON.stringify({dni})});
  const data=await res.json().catch(()=>({}));
  if(!form.isConnected||form.elements.namedItem('document')?.value?.trim()!==previous)return;
  if(res.ok&&(data.status==='found'||data.status==='saved')&&data.full_name){name.value=String(data.full_name).slice(0,160);info.textContent=data.status==='saved'?'Nombre encontrado en tu cartera (sin nueva consulta externa).':'Nombre consultado mediante API Perú. Revisa los datos antes de guardar.';}
  else{const reasons={operator_not_approved:'Sin autorización vigente para consulta externa.',quota_exhausted:'Cupo API Perú agotado.',provider_not_configured:'Token API Perú no configurado.',subscription_inactive:'Membresía no activa.',not_found:'No se encontró el DNI.',provider_unavailable:'Proveedor no disponible.',membership_unavailable:'No se pudo validar la membresía.'};info.textContent=(reasons[data.reason]||'Consulta no disponible.')+' Puedes registrar manualmente.';}
 }catch(_){info.textContent='No se pudo conectar con API Perú. Puedes registrar manualmente.';}finally{button.disabled=false;}
}
// Hojas de cálculo OOXML completas, sin librerías remotas ni fórmulas inyectables.
const xml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
function sheetXML(rows){return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((val,j)=>{let v=val==null?'':String(val);let col='';let z=j+1;while(z){col=String.fromCharCode(65+(z-1)%26)+col;z=Math.floor((z-1)/26);}return '<c r="'+col+(i+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xml(v)+'</t></is></c>';}).join('')+'</row>').join('')+'</sheetData></worksheet>';}
function crc32(bytes){let c=0xFFFFFFFF;for(const b of bytes){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xEDB88320:0);}return(c^0xFFFFFFFF)>>>0;}
function zipStore(files){const enc=new TextEncoder();let offset=0;const out=[],central=[];const u16=(arr,n)=>arr.push(n&255,(n>>8)&255),u32=(arr,n)=>arr.push(n&255,(n>>8)&255,(n>>16)&255,(n>>24)&255);
 for(const [name,data] of files){const nameBytes=enc.encode(name),bytes=enc.encode(data),crc=crc32(bytes);let h=[];u32(h,0x04034b50);u16(h,20);u16(h,0x800);u16(h,0);u16(h,0);u16(h,0);u32(h,crc);u32(h,bytes.length);u32(h,bytes.length);u16(h,nameBytes.length);u16(h,0);
 const head=new Uint8Array(h);out.push(head,nameBytes,bytes);
 let ch=[];u32(ch,0x02014b50);u16(ch,20);u16(ch,20);u16(ch,0x800);u16(ch,0);u16(ch,0);u16(ch,0);u32(ch,crc);u32(ch,bytes.length);u32(ch,bytes.length);u16(ch,nameBytes.length);u16(ch,0);u16(ch,0);u16(ch,0);u16(ch,0);u32(ch,0);u32(ch,offset);
 central.push(new Uint8Array(ch),nameBytes);offset+=head.length+nameBytes.length+bytes.length;
 }
 const csize=central.reduce((n,a)=>n+a.length,0);let end=[];u32(end,0x06054b50);u16(end,0);u16(end,0);u16(end,files.length);u16(end,files.length);u32(end,csize);u32(end,offset);u16(end,0);
 return new Blob([...out,...central,new Uint8Array(end)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function workbook(sheets){let files=[['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((s,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>'],
 ['_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
 ['xl/workbook.xml','<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>'<sheet name="'+xml(s[0])+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>'],
 ['xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((s,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'</Relationships>']];
 sheets.forEach((s,i)=>files.push(['xl/worksheets/sheet'+(i+1)+'.xml',sheetXML(s[1])]));return zipStore(files);
}
function cols(head,arr,keys){return [head,...arr.map(o=>keys.map(k=>o[k]==null?'':o[k]))];}
function exportSheets(c){
 const sheets=[
 ['Inmuebles',cols(['Código','Nombre','Dirección'],c.properties,['id','name','address'])],
 ['Unidades',cols(['Código','Tipo','Alias','Piso','Día PEN','Mes PEN','Estado'],c.units.map(u=>({code:code(u),...u})),['code','kind','alias','floor','daily_rate','monthly_rate','state'])],
 ['Inquilinos',cols(['Tipo doc.','Documento','Nombre','WhatsApp','Autorizó avisos'],c.tenants.map(t=>({...t,consent_whatsapp:t.consent_whatsapp?'Sí':'No'})),['document_type','document_number','full_name','whatsapp','consent_whatsapp'])],
 ['Contratos',cols(['Unidad','Inquilino','Modalidad','Tarifa PEN','Inicio','Vencimiento','Estado'],c.leases.map(l=>({...l,unit:code(c.units.find(u=>Number(u.id)===Number(l.unit_id))||{}),tenant:(c.tenants.find(t=>t.id===l.tenant_id)||{}).full_name})),['unit','tenant','mode','rate','start_on','next_due_on','state'])],
 ['Movimientos',cols(['Contrato','Tipo','Concepto','Importe PEN','Vence','Medio'],ledger,['lease_id','kind','label','amount_pen','due_on','method'])],
 ['Garantias',cols(['Contrato','Acción','Importe PEN','Motivo','Fecha'],guarantees,['lease_id','action','amount_pen','reason','created_at'])],
 ['Gastos',cols(['Categoría','Descripción','Importe PEN','Fecha'],expenses,['category','description','amount_pen','occurred_on'])],
 ['Avisos',cols(['Contrato','Teléfono','Vence','Evento','Fecha'],notices,['lease_id','phone_snapshot','due_on','event_type','created_at'])]
 ];
 return workbook(sheets);
}
function saveFile(blob,name){const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function printReport(c){const win=window.open('','_blank');if(!win){setMessage('Permite ventanas emergentes para imprimir.',true);return;}
 const report=alerts.map(a=>'<tr><td>'+esc(a.code)+'</td><td>'+esc(a.tenant.full_name)+'</td><td>'+esc(a.due)+'</td><td>'+esc(status(a.days)[0])+'</td><td>'+cash(a.owed)+'</td></tr>').join('');
 win.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>MI ALQUILER · Reporte '+today()+'</title><style>body{font:13px Arial;padding:24px;color:#222}h1{font-size:19px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;text-align:left;padding:7px}th{background:#eee}small{color:#777}@media print{body{padding:0}}</style></head><body><h1>CLAN CARTAN · MI ALQUILER</h1><p>Reporte de vencimientos · '+today()+'</p><table><thead><tr><th>Unidad</th><th>Inquilino</th><th>Vencimiento</th><th>Estado</th><th>Saldo PEN</th></tr></thead><tbody>'+report+'</tbody></table><p><small>Reporte privado generado para el RESELLER. Los datos no se envían a terceros al imprimir.</small></p></body></html>');win.document.close();win.focus();win.print();}
function setMessage(text,error=false){const p=$('ma4-status');if(p){p.textContent=text;p.classList.toggle('ma4-error',error);}}
async function opened(e){const a=e.target.closest('a[data-ma4-notice]');if(!a||!ctx||!ss()?.jwt)return;const entry=alerts.find(x=>x.lease.id===a.dataset.ma4Notice);if(!entry||!entry.permit||!entry.tel)return;
 // La navegación se produce por el href del usuario; no bloquear ni afirmar envío.
 try{await rpc('ma_log_notice',{p_lease:entry.lease.id,p_due_on:entry.due,p_phone:entry.tenant.whatsapp,p_request:id()});entry.opened=true;setMessage('Enlace WhatsApp abierto. El envío debe confirmarse en WhatsApp.');}
 catch(err){setMessage('WhatsApp abierto, pero no se registró la apertura: '+String(err.message||err),true);}
}
async function action(e){const b=e.target.closest('[data-ma4-action]');if(!b||!ctx)return;e.preventDefault();const action=b.dataset.ma4Action;
 if(action==='urgent'){renderList(searchCards($('ma4-search')?.value||'').filter(a=>a.days!==null&&a.days<=5));return;}
 if(action==='all'){renderList(searchCards($('ma4-search')?.value||''));return;}
 if(action==='pdf'){printReport(ctx);return;}
 if(action==='xlsx'){saveFile(exportSheets(ctx),'MI_ALQUILER_'+today()+'.xlsx');setMessage('Excel generado con ocho hojas para uso privado.');return;}
 if(action==='refresh'){loaded=false;error='';await window.ma1612OnOpen?.();return;}
}
function init(){document.addEventListener('click',e=>{if(e.target.closest('button[data-ma4-dni]')){e.preventDefault();void lookupDni(e.target.closest('button'));}});
 document.addEventListener('click',e=>{if(e.target.closest('a[data-ma4-notice]'))void opened(e);});document.addEventListener('click',action);
 document.addEventListener('input',e=>{if(e.target.id==='ma4-search')renderList(searchCards(e.target.value));});
 document.addEventListener('click',e=>{if(e.target.closest('#cc54logout'))clear();},true);
}
window.ma1614Enhance=enhance;window.ma1614Test=Object.freeze({phoneDigits,dateDiff,workbook,exportSheets,searchCards});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();