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
const adminTag='<script src="scripts/v152-admin-reconcile.js?v=152"></script>';
if(!html.includes(adminTag)){
 const pos=html.lastIndexOf('</body>');if(pos<0)throw Error('Falta cierre del documento');
 html=html.slice(0,pos)+adminTag+String.fromCharCode(10)+html.slice(pos);
}
// V156: tabla USDT/PEN y cache-busting de formularios de recarga protegidos.
one('scripts/v146-personal-manual-topups.js?v=147','scripts/v146-personal-manual-topups.js?v=156');
one('scripts/v136-manual-recharges.js?v=147','scripts/v136-manual-recharges.js?v=156');
const usdtTag='<script src="scripts/v156-usdt-quote.js?v=156"></script>';
if(!html.includes(usdtTag)){
 const pos=html.lastIndexOf('</body>');if(pos<0)throw Error('Falta cierre body');
 html=html.slice(0,pos)+usdtTag+'\\n'.replace('\\n',String.fromCharCode(10))+html.slice(pos);
}
const style=`<style id="cy152-fast-style">
#cy152toolbar{margin:14px 0;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--panel)}
#cy152toolbar label{display:block;font-weight:650}#cy152toolbar input{width:100%;margin-top:8px;min-height:45px;padding:10px 12px;border-radius:9px;background:var(--bg2);color:var(--text);border:1px solid var(--line2)}
#cy152toolbar .cy152-hint{color:var(--muted);font-size:12px;margin:8px 0 0}
#cy53layer .cy138-card-buttons{display:flex;flex-wrap:wrap;gap:8px}
#cy53layer .cy138-card-buttons>.cy152-quick{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));width:100%;gap:8px}
#cy53layer .cy152-quick>button{min-height:44px;padding:8px 5px;border-radius:8px;font-size:12px;white-space:normal}
#cy53layer .cy138-card-buttons>.cy138-actions{width:100%}
#cy53layer .cy138-card [hidden]{display:none!important}
#cy53layer .cy152-alias-code{white-space:normal;color:var(--muted)}
#cy53layer .cy152-dossier-link{padding:4px 7px;font-size:12px;margin:3px}
#cy53layer .cy152-extension-quick{display:flex;gap:10px;margin:10px 0}
#cy53layer .cy152-extension-quick>button{flex:1;min-height:44px;border:1px solid #4faeae}
.cy152-overlay{position:fixed;inset:0;z-index:1000550;background:rgba(0,9,17,.85);display:flex;justify-content:center;align-items:center;padding:16px;overflow:auto}
.cy152-dialog{width:min(100%,610px);max-height:calc(100dvh - 34px);overflow-y:auto;background:var(--bg3);color:var(--text);border:1px solid var(--line2);border-radius:18px;padding:18px;box-shadow:0 18px 60px #0008}
.cy152-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.cy152-dialog-head h3{margin:0 0 10px}.cy152-dialog-head button{background:var(--card)}
.cy152-dialog label{display:block;margin:14px 0 10px;font-size:13px;font-weight:650}
.cy152-dialog label input,.cy152-dialog label select,.cy152-dialog textarea{display:block;width:100%;margin-top:7px;min-height:43px;background:var(--bg2);border:1px solid var(--line2);border-radius:9px;color:var(--text);padding:9px}
.cy152-dialog label.cy152-consent{display:flex;gap:10px;align-items:flex-start}
.cy152-dialog .cy152-consent input{width:19px;min-height:19px;margin:0;flex:0 0 19px}
.cy152-dialog .cy152-primary{background:#12ad9e;color:#081d21;font-weight:700}
.cy152-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
.cy152-history,.cy152-client-head{border:1px solid var(--line2);border-radius:12px;padding:11px;margin:10px 0}
.cy152-history p,.cy152-client-head p{margin:5px 0;font-size:13px;color:var(--muted)}
.cy152-dialog .cy152-wa{display:block;text-align:center;background:#15b75b;color:white;text-decoration:none;padding:13px;border-radius:9px;font-weight:800}
.cy152-dialog .cy152-wa[aria-disabled="true"]{opacity:.5;pointer-events:none}
.cy152-extension{font-size:12px;border-left:2px solid #168eaa;padding-left:8px}
#cy152adminReconcile{border-top:1px solid var(--line2);margin-top:18px;padding-top:14px}
#cy152adminReconcile .cc136entry{margin:10px 0;padding:10px;border:1px solid var(--line);border-radius:10px}
@media(max-width:420px){#cy53layer .cy152-quick>button{font-size:11px;padding:7px 3px}.cy152-dialog{padding:13px}}
</style>`;
if(!html.includes('id="cy152-fast-style"'))html=html.replace('</head>',style+String.fromCharCode(10)+'</head>');
one('name="cc-deploy-version" content="V151-20261020"','name="cc-deploy-version" content="V152-20261020"');
const scripts=(html.match(/<script src="scripts\/v152-cobra-fast\.js\?v=152"><\/script>/g)||[]);
if(scripts.length!==1)throw Error('V152 cargado más de una vez');
fs.writeFileSync(path,html);
console.log('V152: alias, código de búsqueda, historial, acciones rápidas y WhatsApp integrados.');
