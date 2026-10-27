/* CLAN CARTAN: usuarios reales, solo administradores verificados en Supabase. */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let rows=[];
function mount(){
 const root=document.getElementById('cc79logged'),session=window.CC_V53_SESSION;
 if(!root||!session?.jwt||!window.cc80?.api)return;
 if(document.getElementById('cc-admin-users-real'))return;
 const section=document.createElement('section');section.id='cc-admin-users-real';
 section.style.cssText='margin:18px 0;padding:18px;border:1px solid var(--border,#64748b55);border-radius:16px';
 section.innerHTML='<h3>Usuarios registrados</h3><p id="cc-users-status">Comprobando permisos…</p><div id="cc-users-body"></div>';
 root.parentNode.insertBefore(section,root);
 window.cc80.api('rpc/cc_admin_users_compact_v1','POST',{}).then(data=>{
  if(!section.isConnected||window.CC_V53_SESSION?.userId!==session.userId){section.remove();return;}
  rows=Array.isArray(data)?data:[];
  section.querySelector('#cc-users-status').textContent=rows.length+' cuentas · Código CLAN único';
  const body=section.querySelector('#cc-users-body');
  body.innerHTML='<input id="cc-users-search" type="search" placeholder="Buscar nombre, correo, celular o CLAN" aria-label="Buscar usuarios" style="width:100%;padding:11px;margin:10px 0;border-radius:9px"><div id="cc-users-list"></div>';
  body.querySelector('input').addEventListener('input',render);
  render();
 }).catch(()=>section.remove());
}
function render(){
 const root=document.getElementById('cc-admin-users-real');if(!root)return;
 const query=(root.querySelector('#cc-users-search')?.value||'').toLocaleLowerCase();
 const list=root.querySelector('#cc-users-list');if(!list)return;
 const filtered=rows.filter(u=>[u.code,u.name,u.email,u.phone].some(v=>String(v||'').toLocaleLowerCase().includes(query)));
 list.innerHTML=filtered.map(u=>'<details style="padding:12px 0;border-bottom:1px solid #8884"><summary style="cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px"><span><strong>'+esc(u.code)+'</strong> · '+esc(u.name)+'<small style="display:block;opacity:.75">'+esc(u.email)+'</small></span><span style="white-space:nowrap">'+(u.admin?'Administrador':u.super_reseller?'Super Reseller':'Usuario')+'　▾</span></summary><div style="padding:12px 4px;display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px;font-size:14px"><span>Celular: '+esc(u.phone||'No registrado')+'</span><span>Registro: '+esc(u.created_at?new Date(u.created_at).toLocaleDateString('es-PE'):'—')+'</span><span>Documento: '+esc([u.document_type,u.document_number].filter(Boolean).join(' ')||'No registrado')+'</span><span>Ubicación: '+esc([u.region,u.province,u.district].filter(Boolean).join(', ')||'No registrada')+'</span></div></details>').join('')||'<p>No hay coincidencias.</p>';
}
window.ccAdminUsersRefresh=mount;
document.addEventListener('click',()=>{if(window.CC_V53_SESSION?.jwt)setTimeout(mount,100);});
setTimeout(mount,800);
})();