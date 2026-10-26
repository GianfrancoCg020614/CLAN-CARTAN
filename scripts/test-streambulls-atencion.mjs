import assert from 'node:assert/strict';
import './streambulls-operations-core.js';
const C=globalThis.SBOperationsCore;
const now=new Date('2026-10-26T10:00:00-05:00');
const base=()=>C.fixtures(now);
const run=(title,test)=>{test();console.log('PASS · '+title);};
run('30 días: fecha inicial día 1 y cierre día 30 a las 23:59',()=>{
 assert.equal(C.calendarDurationEnd('2026-10-02T00:00:00-05:00',30),'2026-10-31T23:59:00-05:00');
});
run('Vencimientos hoy/mañana/3/7 días en Lima',()=>{
 const m=C.metrics(base(),now);
 for(const n of [0,1,3,7])assert.ok(m.releasing.some(x=>x.days===n));
 assert.ok(m.expiring3.length<m.expiring7.length);
});
run('Filtros acumulativos sin perfiles duplicados',()=>{
 const m=C.metrics(base(),now);
 assert.equal(new Set(m.expiring7.map(x=>x.c.id)).size,m.expiring7.length);
});
run('No liberar sin confirmar retirada real',()=>{
 const s=base(),a=s.assignments.find(x=>x.contractId==='k1');
 C.markPending(s,a.id);
 assert.ok(!C.available(s,now).some(x=>x.accountId==='n1'&&x.position===1));
 assert.throws(()=>C.release(s,a.id,false));
 C.release(s,a.id,true);
 assert.ok(C.available(s,now).some(x=>x.accountId==='n1'&&x.position===1));
});
run('Una renovación no modifica el plazo de otros perfiles',()=>{
 const s=base(),other=s.contracts.find(x=>x.id==='k4').end;
 C.renew(s,'k2',30);
 assert.equal(s.contracts.find(x=>x.id==='k4').end,other);
 assert.ok(!C.metrics(s,now).expiring7.some(x=>x.c.id==='k2'));
});
run('Renovar perfil pendiente retira liberación anunciada',()=>{
 const s=base(),a=s.assignments.find(x=>x.contractId==='k2');
 C.markPending(s,a.id);C.renew(s,'k2',30);
 assert.equal(a.state,'ACTIVE');
});
run('Las cuentas suspendidas o sin permiso no ofrecen espacios',()=>{
 const free=C.available(base(),now);
 assert.ok(!free.some(x=>x.accountId==='n3'));
 assert.ok(!free.some(x=>x.accountId==='c1'));
});
run('No admitir dos clientes en la misma posición',()=>{
 const s=base();assert.throws(()=>C.addClient(s,{accountId:'n1',position:2,client:'NUEVO',start:C.localStart('2026-10-26'),end:C.localEnd('2026-11-25'),price:15,paid:0}));
});
run('Traslado muestra alerta por vigencia insuficiente y reserva destino',()=>{
 const s=base(),r=C.requestTransfer(s,'k3','n2',4,now);
 assert.equal(r.needsAccountRenewal,true);
 assert.ok(!C.available(s,now).some(x=>x.accountId==='n2'&&x.position===4));
 assert.throws(()=>C.requestTransfer(s,'k4','n2',4,now));
});
run('Traslado sin retiro confirmado se rechaza, con confirmación preserva contrato',()=>{
 const s=base(),before={...s.contracts.find(x=>x.id==='k3')};
 const t=C.requestTransfer(s,'k3','n2',4,now).transfer;
 assert.throws(()=>C.confirmTransfer(s,t.id,false));
 C.confirmTransfer(s,t.id,true);
 const after=s.contracts.find(x=>x.id==='k3');
 for(const key of ['end','paid','price','start'])assert.equal(after[key],before[key]);
 assert.equal(s.assignments.filter(x=>x.contractId==='k3'&&x.state==='ACTIVE').length,1);
});
run('WhatsApp es manual y sin contraseñas',()=>{
 const s=base(),c=s.contracts.find(x=>x.id==='k1');c.phone='+51912345678';
 const url=C.whatsapp(c,'transfer');
 assert.ok(url.startsWith('https://wa.me/51912345678?text='));
 assert.ok(!/pin|contrase.a/i.test(decodeURIComponent(url)));
});
run('Crear cuenta y cliente con contrato individual',()=>{
 const s=base(),a=C.addAccount(s,{service:'Disney',code:'DISNEY 002',alias:'Demo',start:C.localStart('2026-10-26'),end:C.localEnd('2026-11-26'),capacity:2,allowReuse:true});
 const c=C.addClient(s,{accountId:a.id,position:1,client:'CLIENTE NUEVO',phone:'',email:'',start:C.localStart('2026-10-26'),end:C.localEnd('2026-11-20'),price:30,paid:10});
 assert.equal(c.contract.paid,10);assert.ok(C.available(s,now).some(x=>x.accountId===a.id&&x.position===2));
});
console.log('Todas las verificaciones de STREAM BULL’S superadas.');
