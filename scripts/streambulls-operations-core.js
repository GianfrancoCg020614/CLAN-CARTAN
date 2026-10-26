/* STREAM BULL'S — operaciones por cuentas/perfiles. Núcleo independiente, sin conexión a producción.
   Contratos y posiciones separados, fechas America/Lima; demo = datos sintéticos. */
(function(root){
'use strict';
const TZ='America/Lima', MS=86400000;
const pad=n=>String(n).padStart(2,'0');
const parts=(value=new Date())=>{
 const x=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
 const v=k=>x.find(p=>p.type===k).value;
 return v('year')+'-'+v('month')+'-'+v('day');
};
const shift=(day,n)=>new Date(Date.parse(day+'T12:00:00Z')+n*MS).toISOString().slice(0,10);
const localEnd=(day)=>day+'T23:59:00-05:00';
const localStart=day=>day+'T00:00:00-05:00';
const after=(day,days)=>shift(day,days);
const dayOffset=(n,at=new Date())=>shift(parts(at),n);
const daysFromNow=(timestamp,now=new Date())=>Math.floor((Date.parse(parts(timestamp)+'T12:00:00Z')-Date.parse(parts(now)+'T12:00:00Z'))/MS);
const left=(end,now=new Date())=>Math.max(0,Math.floor((new Date(end)-new Date(now))/60000));
const countdown=(end,now=new Date())=>{
 const m=left(end,now);return Math.floor(m/1440)+'d '+pad(Math.floor(m%1440/60))+'h '+pad(m%60)+'m';
};
const calendarDurationEnd=(start,days)=>{
 if(!Number.isInteger(Number(days))||days<1||days>366)return null;
 return localEnd(shift(parts(start),Number(days)-1));
};
const money=n=>Math.round(Number(n)*100)/100;
const id=()=>Math.random().toString(36).slice(2,11);
function fixtures(now=new Date()){
 const d=n=>dayOffset(n,now),t=n=>localEnd(d(n));
 const accounts=[
  {id:'n1',service:'Netflix',code:'NETFLIX 001',alias:'Cuenta principal A',start:localStart(d(-20)),end:t(5),status:'ACTIVE',capacity:5,allowReuse:true},
  {id:'n2',service:'Netflix',code:'NETFLIX 002',alias:'Cuenta principal B',start:localStart(d(-14)),end:t(25),status:'ACTIVE',capacity:5,allowReuse:true},
  {id:'n3',service:'Netflix',code:'NETFLIX 003',alias:'Suspendida',start:localStart(d(-12)),end:t(18),status:'SUSPENDED',capacity:3,allowReuse:true},
  {id:'d1',service:'Disney',code:'DISNEY 001',alias:'Cuenta Disney',start:localStart(d(-15)),end:t(9),status:'ACTIVE',capacity:4,allowReuse:true},
  {id:'c1',service:'ChatGPT',code:'CHATGPT 001',alias:'Plan individual',start:localStart(d(-10)),end:t(20),status:'ACTIVE',capacity:1,allowReuse:false}
 ];
 const specs=[
 ['k1','n1',1,'ANA DEMO',0,15,15],['k2','n1',2,'LORENA DEMO',1,15,15],
 ['k3','n1',3,'ZARATE DEMO',40,45,45],['k4','n1',4,'LUIS DEMO',3,15,10],
 ['k5','n2',1,'EVA DEMO',7,20,20],['k6','n2',2,'CARLOS DEMO',-1,15,15],
 ['k7','n2',3,'SUSANA DEMO',2,25,0],['k8','d1',1,'DANIEL DEMO',3,18,18],
 ['k9','n3',1,'BERTA DEMO',15,20,20]
 ];
 const contracts=specs.map(([id,accountId,position,name,days,price,paid])=>{
 const account=accounts.find(a=>a.id===accountId);
 return {id,service:account.service,client:name,phone:'',email:'',
 start:localStart(d(-25)),connected:localStart(d(-25)),end:t(days),
 price,paid,status:'ACTIVE',devices:'Registro referencial sin credenciales'};
 });
 const assignments=specs.map(([contractId,accountId,position],i)=>({
 id:'slot'+(i+1),contractId,accountId,position,state:'ACTIVE',
 assignedAt:localStart(d(-25)),removedAt:null
 }));
 return {version:2,accounts,contracts,assignments,transfers:[],events:[],nextId:100};
}
const byId=(a,id)=>a.find(x=>x.id===id);
const currentAssignment=(s,cid)=>s.assignments.find(a=>a.contractId===cid&&a.state!=='CLOSED');
const accountFor=(s,cid)=>{
 const al=currentAssignment(s,cid);return al?byId(s.accounts,al.accountId):null;
};
const available=(s,now=new Date())=>{
 const blocked=new Set(s.assignments.filter(a=>a.state!=='CLOSED').map(a=>a.accountId+':'+a.position));
 const reserved=new Set(s.transfers.filter(t=>t.state==='PENDING').map(t=>t.accountId+':'+t.position));
 return s.accounts.filter(a=>a.status==='ACTIVE'&&new Date(a.end)>new Date(now)&&a.allowReuse)
 .flatMap(a=>Array.from({length:a.capacity},(_,i)=>({
  accountId:a.id,code:a.code,service:a.service,position:i+1,accountEnd:a.end,
  remaining:countdown(a.end,now),key:a.id+':'+(i+1)
 }))).filter(x=>!blocked.has(x.key)&&!reserved.has(x.key));
};
const liveRows=(s,now=new Date())=>s.assignments.filter(a=>a.state!=='CLOSED').map(a=>{
 const c=byId(s.contracts,a.contractId),account=byId(s.accounts,a.accountId);
 if(!c||!account)return null;
 const due=money(c.price-c.paid);
 const diff=Math.floor((new Date(account.end)-new Date(c.end))/MS);
 const expired=new Date(c.end)<new Date(now);
 const days=daysFromNow(c.end,now);
 return {...a,c,account,due,days,expired,
 remaining:countdown(c.end,now),accountRemaining:countdown(account.end,now),
 mainSurplus:Math.max(0,diff),
 payState:due<=0?'PAGADO':c.paid>0?'PARCIAL':'DEBE',
 needsTransfer:account.status!=='ACTIVE'||new Date(account.end)<new Date(c.end)};
}).filter(Boolean);
function metrics(s,now=new Date()){
 const rows=liveRows(s,now),free=available(s,now);
 const current=rows.filter(r=>r.c.status==='ACTIVE'&&r.state==='ACTIVE');
 const soon=current.filter(r=>r.days>=0&&r.days<=7&&!r.expired);
 const release=current.filter(r=>r.days>=0&&r.days<=7&&!r.expired);
 return {rows,free,
 expiringToday:soon.filter(r=>r.days===0),expiring3:soon.filter(r=>r.days<=3),
 expiring7:soon,expired:current.filter(r=>r.expired),
 debtors:rows.filter(r=>r.due>0),releasing:release,
 pending:rows.filter(r=>r.state==='PENDING_RELEASE'),
 transfer:rows.filter(r=>r.needsTransfer),
 mainExpiring:s.accounts.filter(a=>a.status==='ACTIVE'&&daysFromNow(a.end,now)>=0&&daysFromNow(a.end,now)<=7),
 reactivate:s.accounts.filter(a=>a.status==='ENDED')};
}
function assert(test,msg){if(!test)throw Error(msg);}
const event=(s,type,details)=>s.events.unshift({id:id(),at:new Date().toISOString(),type,...details});
function renew(s,contractId,days){
 const c=byId(s.contracts,contractId),a=currentAssignment(s,contractId);
 assert(c,'Contrato inexistente');assert(Number.isInteger(days)&&days>=1&&days<=366,'Duración inválida');
 const old=c.end;c.end=localEnd(shift(parts(c.end),days));c.status='ACTIVE';
 if(a&&a.state==='PENDING_RELEASE')a.state='ACTIVE';
 event(s,'RENOVACIÓN',{contractId,from:old,to:c.end});return c;
}
function markPending(s,assignmentId){
 const a=byId(s.assignments,assignmentId);
 assert(a&&a.state==='ACTIVE','No existe asignación activa');
 a.state='PENDING_RELEASE';event(s,'PENDIENTE DE LIBERACIÓN',{contractId:a.contractId,assignmentId});return a;
}
function release(s,assignmentId,confirmed){
 const a=byId(s.assignments,assignmentId);
 assert(a&&a.state==='PENDING_RELEASE','Primero marca pendiente de liberación');
 assert(confirmed===true,'Debes confirmar la retirada efectiva del acceso');
 assert(!s.transfers.some(t=>t.assignmentId===a.id&&t.state==='PENDING'),'Hay traslado pendiente');
 a.state='CLOSED';a.removedAt=new Date().toISOString();
 event(s,'LIBERACIÓN CONFIRMADA',{contractId:a.contractId,assignmentId:a.id});return a;
}
function requestTransfer(s,contractId,accountId,position,now=new Date()){
 const c=byId(s.contracts,contractId),a=currentAssignment(s,contractId);
 assert(c&&a&&c.status==='ACTIVE','Sin contrato activo y asignado');
 const target=byId(s.accounts,accountId);
 assert(target&&target.service===c.service,'Plataforma incompatible');
 assert(target.status==='ACTIVE'&&target.allowReuse&&new Date(target.end)>now,'Cuenta destino inactiva o no autorizada');
 const found=available(s,now).find(x=>x.accountId===accountId&&x.position===position);
 assert(!!found,'Posición destino ocupada o reservada');
 const t={id:id(),contractId,assignmentId:a.id,accountId,position,state:'PENDING',requested:new Date().toISOString()};
 s.transfers.push(t);event(s,'TRASLADO SOLICITADO',{contractId,from:a.accountId,to:accountId,position});
 return {transfer:t,needsAccountRenewal:new Date(target.end)<new Date(c.end)};
}
function confirmTransfer(s,transferId,accessRemoved){
 const t=byId(s.transfers,transferId);
 assert(t&&t.state==='PENDING','No hay traslado pendiente');
 assert(accessRemoved===true,'Confirma retirada real del acceso anterior');
 const a=byId(s.assignments,t.assignmentId),c=byId(s.contracts,t.contractId);
 assert(a&&a.state!=='CLOSED'&&c,'Asignación original cambió');
 const target=byId(s.accounts,t.accountId);
 assert(target&&target.status==='ACTIVE'&&target.allowReuse&&new Date(target.end)>new Date(),
   'Cuenta destino ya no cumple las condiciones');
 assert(!s.assignments.some(x=>x.accountId===t.accountId&&x.position===t.position&&x.state!=='CLOSED'),
   'Destino ya ocupado');
 a.state='CLOSED';a.removedAt=new Date().toISOString();
 const next={id:id(),contractId:t.contractId,accountId:t.accountId,position:t.position,
 state:'ACTIVE',assignedAt:new Date().toISOString(),removedAt:null};
 s.assignments.push(next);t.state='DONE';t.completed=new Date().toISOString();
 event(s,'TRASLADO CONFIRMADO',{contractId:t.contractId,from:a.accountId,to:t.accountId,position:t.position});
 return next;
}
function addAccount(s,v){
 assert(v.code&&v.service&&v.end&&v.start,'Completa servicio, código y fechas');
 assert(!s.accounts.some(a=>a.code.toLowerCase()===v.code.toLowerCase()),'Código ya registrado');
 assert(v.capacity>=1&&v.capacity<=12,'Capacidad inválida');
 assert(new Date(v.end)>new Date(v.start),'Vigencia inválida');
 const a={id:id(),code:v.code,alias:v.alias||'',service:v.service,start:v.start,end:v.end,
 capacity:v.capacity,status:'ACTIVE',allowReuse:!!v.allowReuse};
 s.accounts.push(a);event(s,'CUENTA CREADA',{accountId:a.id});return a;
}
function addClient(s,v){
 const ac=byId(s.accounts,v.accountId);
 assert(ac,'Cuenta no encontrada');
 assert(v.client&&v.price>=0&&v.paid>=0&&v.paid<=v.price,'Datos o importes inválidos');
 assert(v.start&&v.end&&new Date(v.end)>new Date(v.start),'Fechas inválidas');
 assert(available(s).some(x=>x.accountId===ac.id&&x.position===v.position),'El espacio no está disponible');
 const c={id:id(),service:ac.service,client:v.client,phone:v.phone||'',email:v.email||'',
 start:v.start,end:v.end,connected:v.start,price:money(v.price),paid:money(v.paid),
 status:'ACTIVE',devices:''};
 s.contracts.push(c);
 s.assignments.push({id:id(),contractId:c.id,accountId:ac.id,position:v.position,
 state:'ACTIVE',assignedAt:new Date().toISOString(),removedAt:null});
 event(s,'CLIENTE ASIGNADO',{contractId:c.id,accountId:ac.id,position:v.position});
 return {contract:c,needRenewAccount:new Date(ac.end)<new Date(c.end)};
}
function pay(s,contractId,value){
 const c=byId(s.contracts,contractId);assert(c,'Contrato inexistente');
 const n=money(value);assert(n>0&&n<=money(c.price-c.paid),'Monto supera la deuda');
 c.paid=money(c.paid+n);event(s,'PAGO REGISTRADO (DEMO)',{contractId,amount:n});
 return c;
}
function renewAccount(s,accountId,days){
 const a=byId(s.accounts,accountId);assert(a,'Cuenta inexistente');
 assert(Number.isInteger(days)&&days>=1&&days<=366,'Días inválidos');
 a.end=localEnd(shift(parts(a.end),days));a.status='ACTIVE';
 event(s,'CUENTA PRINCIPAL RENOVADA',{accountId,days});return a;
}
function whatsapp(c,kind='upcoming'){
 if(!c.phone)return null;
 const ph=c.phone.replace(/[^0-9]/g,'');
 if(!/^[1-9][0-9]{7,14}$/.test(ph))return null;
 const t={
 upcoming:'Hola, '+c.client+'. Tu servicio '+c.service+' vence el '+parts(c.end)+'. ¿Deseas renovarlo?',
 expired:'Hola, '+c.client+'. Tu servicio '+c.service+' venció el '+parts(c.end)+'. Escríbenos para renovarlo.',
 renewal:'Hola, '+c.client+'. Te compartimos información para renovar '+c.service+'. Vencimiento registrado: '+parts(c.end)+'.',
 debt:'Hola, '+c.client+'. Registramos un pago pendiente de '+c.service+'. Fecha de vencimiento: '+parts(c.end)+'.',
 transfer:'Hola, '+c.client+'. Queremos coordinar el cambio de asignación de '+c.service+' conservando tu fecha de vencimiento: '+parts(c.end)+'.'
 };
 return 'https://wa.me/'+ph+'?text='+encodeURIComponent(t[kind]||t.upcoming);
}
root.SBOperationsCore=Object.freeze({TZ,parts,shift,localEnd,localStart,after,dayOffset,daysFromNow,
 left,countdown,calendarDurationEnd,money,fixtures,byId,currentAssignment,accountFor,
 available,liveRows,metrics,renew,markPending,release,requestTransfer,confirmTransfer,
 addAccount,addClient,pay,renewAccount,whatsapp});
})(typeof window!=='undefined'?window:globalThis);
