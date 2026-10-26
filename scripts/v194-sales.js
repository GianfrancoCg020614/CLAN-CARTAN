/* CLAN CARTAN V194 · Liquidaciones sobre ventas reales; acceso validado en Supabase. */
(function(){
'use strict';
const by=id=>document.getElementById(id);
const dom=(t,txt)=>{const e=document.createElement(t);if(txt!==undefined)e.textContent=String(txt);return e;};
const btn=(txt,fn)=>{const b=dom('button',txt);b.type='button';b.className='cc166-secondary';b.addEventListener('click',fn);return b;};
const fmt=n=>'S/ '+Number(n||0).toLocaleString('es-PE',{minimumFractionDigits:2,maximumFractionDigits:2});
const api=(fn,params)=>window.cc80.api('rpc/'+fn,'POST',params);
const peruDate=d=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);const part=k=>p.find(x=>x.type===k)?.value;return part('year')+'-'+part('month')+'-'+part('day');};
const validRows=r=>Array.isArray(r)?r:[];
const line=(parent,label,value)=>{const r=dom('div');r.className='cc194-line';r.append(dom('span',label),dom('strong',value));parent.append(r);};
let queued=false;
function mount(){
 const container=by('cc166-content'),session=window.CC_V53_SESSION;
 if(!container||!session?.userId||!session.jwt||by('cc194-liquidaciones'))return;
 const heading=container.querySelector('.cc166-section-title h2')?.textContent||'';
 if(!/^(Supervisión de pedidos|Ventas y entregas|Liquidación de ventas|Mis ventas)/.test(heading))return;
 const admin=heading.includes('Supervisión')||heading.includes('Liquidación de ventas');
 const node=dom('section');node.id='cc194-liquidaciones';node.className='cc166-card cc194-card';
 const heading2=dom('h2',admin?'Liquidación de ventas por SÚPER RESELLER':'Detalle y control de mis ventas');
 const sub=dom('p',admin?'ADMIN: filtra por vendedor, registra liquidaciones y pagos reales ya efectuados.':'Consulta solo tus ventas y los pagos que el ADMIN ha registrado.');
 node.append(heading2,sub);
 const form=dom('div');form.className='cc194-form';
 let sellers=dom('select'),selected=session.userId;
 if(admin){const label=dom('label','SÚPER RESELLER');sellers.setAttribute('aria-label','Vendedor');label.append(sellers);form.append(label);sellers.append(dom('option','Cargando vendedores…'));}
 const today=peruDate(new Date()),first=today.slice(0,7)+'-01';
 const dateField=(labelText,value)=>{const label=dom('label',labelText),input=dom('input');input.type='date';input.value=value;label.append(input);form.append(label);return input;};
 const start=dateField('Desde',first),end=dateField('Hasta',today);
 const frequency=dom('select');
 for(const v of ['PERSONALIZADO','SEMANAL','QUINCENAL','MENSUAL']){const op=dom('option',v);op.value=v;frequency.append(op);}
 if(admin){const frequencyLabel=dom('label','Frecuencia');frequencyLabel.append(frequency);form.append(frequencyLabel);}
 const message=dom('p','Selecciona las fechas y presiona «Ver detalle».'),results=dom('div'),actions=dom('div');
 message.setAttribute('role','status');actions.className='cc194-actions';
 const show=msg=>message.textContent=String(msg);
 const loadButton=btn('Ver detalle de ventas',()=>void refresh());
 actions.append(loadButton);node.append(form,actions,message,results);
 const oldLabel=[...container.querySelectorAll('.cc166-metric small')].find(e=>e.textContent.includes('Comisión ADMIN sobre ganancia'));
 if(oldLabel)oldLabel.textContent='Comisión ADMIN sobre venta';
 const navigation=by('cc166-nav');
 for(const button of navigation?.querySelectorAll('button')||[]){
  const text=[...button.querySelectorAll('span')].find(e=>e.textContent==='Supervisar pedidos');
  if(text)text.textContent='Liquidación de ventas';
 }
 container.insertBefore(node,container.children[1]||null);
 function accountSelected(){return admin?sellers.value:session.userId;}
 const alive=()=>node.isConnected&&window.CC_V53_SESSION?.userId===session.userId;
 const datesOK=()=>start.value&&end.value&&end.value>=start.value&&
  Math.abs((Date.parse(end.value)-Date.parse(start.value))/86400000)<=366;
 const run=async(name,p)=>{if(!alive())throw Error('Inicia sesión nuevamente');return api(name,p);};
 async function refresh(){
  const seller=accountSelected();
  if(!seller||!datesOK()){show('Selecciona vendedor y un rango de fechas válido (máximo 366 días).');return;}
  loadButton.disabled=true;show('Consultando ventas y liquidaciones auténticas…');results.replaceChildren();
  try{
   const p={p_seller:seller,p_from:start.value,p_to:end.value};
   const [rows,liqs]=await Promise.all([run('cc_portal_sales_report_v194',p),run('cc_portal_liquidations_v194',p)]);
   if(!alive()||accountSelected()!==seller)return;
   present(validRows(rows),validRows(liqs),seller);
   show('Reporte obtenido. Las ventas anuladas o disputadas no se incluyen en el total pagadero.');
  }catch(e){if(alive())show('No se pudo cargar el reporte: '+String(e.message||e));}
  finally{if(alive())loadButton.disabled=false;}
 }
 function present(rows,liqs,seller){
  results.replaceChildren();
  const report=dom('div');report.className='cc194-report';
  const legitimate=rows.filter(o=>o.status==='PAID_AWAITING_DELIVERY'||o.status==='FULFILLED');
  const sum=(a,key)=>a.reduce((x,o)=>x+Number(o[key]||0),0);
  const v=sum(legitimate,'price_pen'),a=sum(legitimate,'admin_fee_pen'),b=sum(legitimate,'seller_payable_pen');
  const stats=dom('div');stats.className='cc194-stats';
  line(stats,'Ventas confirmadas',fmt(v));line(stats,'Comisión ADMIN',fmt(a));line(stats,'Importe para vendedor',fmt(b));
  report.append(stats);
  const tools=dom('div');tools.className='cc194-actions';
  tools.append(btn('Descargar Excel (CSV)',()=>download(rows,seller)));
  tools.append(btn('Imprimir / Guardar PDF',()=>window.print()));
  if(admin){tools.append(btn('Generar liquidación oficial',async()=>{
   if(!legitimate.some(x=>!x.liquidation_id)){show('No hay nuevas ventas para liquidar.');return;}
   if(!window.confirm('¿Generar liquidación de '+start.value+' a '+end.value+' para el vendedor seleccionado? No se realizará un pago automático.'))return;
   try{await run('cc_portal_create_liquidation_v194',{p_seller:seller,p_from:start.value,p_to:end.value,p_frequency:frequency.value});show('Liquidación registrada, sin movimiento automático de dinero.');await refresh();}
   catch(e){show('No se generó: '+String(e.message||e));}
  }));}
  report.append(tools);
  const table=dom('div');table.className='cc194-table';
  if(!rows.length)table.append(dom('p','Sin ventas registradas en este período.'));
  for(const o of rows){
   const item=dom('article');item.className='cc194-sale';
   const name=dom('strong',peruDate(new Date(o.created_at))+' · '+o.service+' · '+o.title);
   const numbers=dom('p',fmt(o.price_pen)+' · ADMIN '+Number(o.admin_percent)+'%: '+fmt(o.admin_fee_pen)+' · Vendedor: '+fmt(o.seller_payable_pen));
   const status=dom('small',o.status+' · Pedido '+o.id+(o.liquidation_id?' · Liquidado':' · Sin liquidar'));
   item.append(name,numbers,status);table.append(item);
  }
  report.append(table);
  const settlementBox=dom('div');settlementBox.className='cc194-settlements';settlementBox.append(dom('h3','Liquidaciones y pagos'));
  if(!liqs.length)settlementBox.append(dom('p','Todavía no hay liquidaciones registradas para este período.'));
  for(const l of liqs){
   const item=dom('article');item.className='cc194-sale';
   item.append(dom('strong','Liquidación '+String(l.id).slice(0,8)+' · '+l.state));
   item.append(dom('p',l.period_from+' al '+l.period_to+' · '+l.sales_count+' ventas · Total vendedor '+fmt(l.seller_amount)));
   item.append(dom('p','Pagado '+fmt(l.paid_amount)+' · Pendiente '+fmt(l.pending_amount)));
   for(const p of (Array.isArray(l.payments)?l.payments:[])){item.append(dom('small',peruDate(new Date(p.date))+' · Pago '+fmt(p.amount)+' · '+p.method+' · '+p.reference));}
   if(admin&&Number(l.pending_amount)>0){
    item.append(btn('Registrar pago efectuado',async()=>{
     const amount=window.prompt('Monto que realmente pagaste al vendedor (S/), máximo '+fmt(l.pending_amount),'');
     if(amount===null)return;
     const n=Number(amount);
     if(!Number.isFinite(n)||n<=0||n>Number(l.pending_amount)||Math.abs(n*100-Math.round(n*100))>0.000001){show('Monto inválido.');return;}
     const method=window.prompt('Medio de pago: TRANSFERENCIA, YAPE, PLIN, EFECTIVO u OTRO','YAPE');
     if(method===null)return;
     const chosen=method.trim().toUpperCase();
     if(!['TRANSFERENCIA','YAPE','PLIN','EFECTIVO','OTRO'].includes(chosen)){show('Medio de pago inválido.');return;}
     const ref=window.prompt('Referencia del pago realmente efectuado (mínimo 3 caracteres)','');
     if(ref===null||ref.trim().length<3){show('Falta referencia válida.');return;}
     if(!window.confirm('¿Confirmas que YA pagaste '+fmt(n)+' mediante '+chosen+'? Esto solo registra el pago, NO transfiere dinero.'))return;
     try{await run('cc_portal_record_liquidation_payment_v194',{p_id:l.id,p_amount:n,p_method:chosen,p_reference:ref.trim()});show('Pago registrado en el historial.');await refresh();}
     catch(e){show('No se registró el pago: '+String(e.message||e));}
    }));
   }
   settlementBox.append(item);
  }
  results.append(report,settlementBox);
 }
 if(admin)void (async()=>{
  try{
   const people=validRows(await run('cc_portal_admin_accounts_v2',{})).filter(p=>p.super_enabled||p.role_assigned==='SUPER_RESELLER');
   if(!alive())return;
   sellers.replaceChildren(dom('option','Selecciona un súper reseller…'));
   sellers.firstChild.value='';
   for(const p of people){const o=dom('option',(p.registry_code||'')+' · '+(p.registry_alias||p.display_name||p.email));o.value=p.user_id;sellers.append(o);}
   if(!people.length)show('Aún no hay súper resellers para consultar.');
  }catch(e){if(alive())show('No se pudo consultar el directorio: '+String(e.message||e));}
 })();
}
function download(rows,seller){
 const cols=['Fecha','Pedido','Plataforma','Producto','Estado','Venta PEN','Comisión ADMIN %','ADMIN PEN','SÚPER RESELLER PEN','Liquidación'];
 const data=[cols,...rows.map(r=>[r.date,r.id,r.service,r.title,r.status,r.price_pen,r.admin_percent,r.admin_fee_pen,r.seller_payable_pen,r.liquidation_id||''])];
 const quote=s=>'"'+String(s??'').replaceAll('"','""')+'"';
 const blob=new Blob(['\uFEFF'+data.map(row=>row.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=dom('a');a.href=url;a.download='CLAN-CARTAN-'+seller.slice(0,8)+'-ventas.csv';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function init(){
 const style=dom('style');style.textContent='.cc194-card{margin-top:20px}.cc194-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:12px 0}.cc194-form label{display:flex;flex-direction:column;gap:6px;font-size:13px}.cc194-form input,.cc194-form select{width:100%;padding:10px;border-radius:8px}.cc194-actions{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}.cc194-stats{display:grid;gap:9px;margin:12px 0}.cc194-line{display:flex;justify-content:space-between;gap:12px}.cc194-sale{border-top:1px solid #7775;padding:12px 2px}.cc194-sale p{margin:6px 0}.cc194-sale small{display:block;overflow-wrap:anywhere}@media print{body *{visibility:hidden!important}#cc194-liquidaciones,#cc194-liquidaciones *{visibility:visible!important}#cc194-liquidaciones{position:absolute;top:0;left:0;width:100%;background:white;color:black}#cc194-liquidaciones button,#cc194-liquidaciones input,#cc194-liquidaciones select{display:none!important}}';
 document.head.append(style);
 new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount();});}).observe(document.body,{subtree:true,childList:true});
 mount();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();