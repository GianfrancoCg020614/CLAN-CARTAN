/* CLAN CARTAN V161 — Parte 5: panel de control de lectura y listas de verificación.
 * Interfaz NO financiera. Permisos y contabilidad deben validarse EN SERVIDOR.
 * No escribe datos, no activa pagos ni otorga roles.
 */
(function(){
'use strict';
const SERVICES=Object.freeze(['COBRA_YA','STREAM_BULLS','MI_COCHERA']);
const SECTIONS=Object.freeze([
 ['suscripciones','Suscripciones: activas, próximas, vencidas y suspendidas'],
 ['recargas','Recargas: solicitudes pendientes, verificadas, rechazadas'],
 ['bonos','Bonos: otorgados, restringidos, usados y revertidos'],
 ['finanzas','Contabilidad: saldos previos y posteriores, referencias únicas'],
 ['auditoria','Auditoría: actor, fecha, operación y estado'],
 ['riesgos','Seguridad: alertas, duplicados, reembolsos y accesos']
]);
const STATUS=Object.freeze(['PENDING','VERIFIED','REJECTED','REVERSED','CANCELLED']);
function normalize(row){
 if(!row||typeof row!=='object')return null;
 return {id:String(row.id||''),type:String(row.type||''),service:SERVICES.includes(row.service)?row.service:'UNKNOWN',
 status:STATUS.includes(row.status)?row.status:'UNKNOWN',date:String(row.date||''),concept:String(row.concept||'')};
}
function view(root,authorized,snapshot){
 if(!root)return;
 root.replaceChildren();
 const wrap=document.createElement('section');wrap.style.cssText='background:#14161c;color:#e8e8e8;padding:18px;border:1px solid #a0834a;border-radius:16px;font:inherit';
 const h=document.createElement('h3');h.textContent='CLAN CARTAN · ADMIN';wrap.appendChild(h);
 if(!authorized){const p=document.createElement('p');p.textContent='Acceso no disponible. Se requiere verificación de ADMIN en el servidor.';wrap.appendChild(p);root.appendChild(wrap);return;}
 const p=document.createElement('p');p.textContent='Vista informativa. Ninguna aprobación, bloqueo o pago se ejecuta desde este componente.';wrap.appendChild(p);
 const list=document.createElement('ul');
 for(const [key,title] of SECTIONS){const li=document.createElement('li');const count=snapshot&&Number.isSafeInteger(snapshot[key])&&snapshot[key]>=0?snapshot[key]:'—';li.textContent=title+' · '+count;list.appendChild(li);}
 wrap.appendChild(list);root.appendChild(wrap);
}
function mountAll(context){
 const isAdmin=context?.serverVerifiedAdmin===true;
 document.querySelectorAll('[data-cc-admin-panel]').forEach(root=>view(root,isAdmin,context?.counts));
}
window.ClanCartanAdminV161=Object.freeze({SERVICES,SECTIONS,STATUS,normalize,mountAll});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountAll());
else mountAll();
})();
/* Archivo preparado para el módulo V194. */
