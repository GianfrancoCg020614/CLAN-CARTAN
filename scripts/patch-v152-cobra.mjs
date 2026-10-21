// V152 — actualiza interfaz real COBRA YA sin recrear tablas ni historiales.
import fs from 'node:fs';
const path='index.html';let html=fs.readFileSync(path,'utf8');
const one=(before,after)=>{
 if(html.includes(after))return;
 if(!html.includes(before))throw Error('V152: no existe marcador: '+before.slice(0,75));
 html=html.replace(before,after);
};
one('cy_clients?select=id,full_name,document_number,phone,email,address,district,address_reference,notes,owner_id',
    'cy_clients?select=id,full_name,alias,client_code,document_number,phone,email,address,district,address_reference,notes,owner_id');
const aliasLabel='<label>Alias / apodo (opcional)<input name="alias" maxlength="80" autocomplete="off" placeholder="Ej. Don Pepe"></label>';
one('<label>WhatsApp del cliente<input name="phone"',aliasLabel+'<label>WhatsApp del cliente<input name="phone"');
one("const payload={owner_id:current.userId,full_name:String(f.get('name')||'').trim(),",
    "const payload={owner_id:current.userId,full_name:String(f.get('name')||'').trim(),alias:String(f.get('alias')||'').trim().slice(0,80)||null,");
one('document.getElementById(\'cy53clientSelect\').innerHTML=c.map(x=>`<option value="${esc(x.id)}">${esc(x.full_name)}</option>`).join(\'\');',
    'document.getElementById(\'cy53clientSelect\').innerHTML=c.map(x=>`<option value="${esc(x.id)}">${esc(x.alias?x.alias+" · ":"")}${esc(x.full_name)}</option>`).join(\'\');');
one("\n}\nrenderCy64Rows();\ndocument.querySelectorAll('.cy62editclient')",
    "\n window.cy152OnLoansRendered?.();\n}\nrenderCy64Rows();\ndocument.querySelectorAll('.cy62editclient')");
one("notice('Datos sincronizados con Supabase.');}catch(e){notice('Error: '+e.message)}}",
    "window.cy152OnRefresh?.({clients:state.clients,loans:state.loans,installments:state.installments,payments:state.payments,collaterals:state.collaterals},"+
    "{api:request,refresh,open:openDetail,extend:cy140OpenExtension,notify:cy68Notify,edit:(id)=>{const item=state.clients.find(x=>x.id===id);if(item&&window.cc119EditClient)window.cc119EditClient(item,refresh,notice);}});"+
    "notice('Datos sincronizados con Supabase.');}catch(e){notice('Error: '+e.message)}}");
const quickMarker="select.addEventListener('change',preview);";
const quickCode=`const fast=document.createElement('div');fast.className='cy152-extension-quick';
for(const value of [1,2])if(value<=max){
 const b=document.createElement('button');b.type='button';b.textContent='+'+value+' mes'+(value===1?'':'es');
 b.addEventListener('click',()=>{select.value=String(value);preview();});fast.append(b);
}
select.after(fast);
`+quickMarker;
one(quickMarker,quickCode);
one('scripts/v119-clients.js?v=151','scripts/v119-clients.js?v=152');
const tag='<script src="scripts/v152-cobra-fast.js?v=152"></script>';
if(!html.includes(tag)){
 const pos=html.lastIndexOf('</body>');if(pos<0)throw Error('Falta cierre body');
 html=html.slice(0,pos)+tag+'\n'+html.slice(pos);
}
one('name="cc-deploy-version" content="V151-20261020"','name="cc-deploy-version" content="V152-20261020"');
const scripts=(html.match(/<script src="scripts\/v152-cobra-fast\.js\?v=152"><\/script>/g)||[]);
if(scripts.length!==1)throw Error('V152 cargado más de una vez');
fs.writeFileSync(path,html);
console.log('V152: alias, código de búsqueda, historial, acciones rápidas y WhatsApp integrados.');
