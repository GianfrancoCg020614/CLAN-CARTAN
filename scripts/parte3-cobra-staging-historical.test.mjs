import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readHistoricalDemo} from './parte3-cobra-staging-historical.mjs';
const base={client_id:'55555555-cccc-4555-8555-555555555555',issued_on:'2025-01-10',principal:'100',
 rawSchedule:'2025-02-10,40.00,40.00\n2025-03-10,40.00,20.00\n2025-04-10,40.00,0.00'};
test('acepta fechas históricas y estados pagado, parcial y pendiente',()=>{
 const row=readHistoricalDemo(base);
 assert.equal(row.schedule.length,3);
 assert.deepEqual(row.schedule.map(s=>s.paid_total),[40,20,0]);
 assert.equal(row.issued_on,'2025-01-10');
});
test('no modifica el vencimiento original ni calcula una fecha nueva',()=>{
 const row=readHistoricalDemo({...base,issued_on:'2023-01-10',rawSchedule:'2023-03-14,120,50'});
 assert.equal(row.schedule[0].due_on,'2023-03-14');
});
test('rechaza cuotas pagadas por más del monto y cronogramas desordenados',()=>{
 assert.throws(()=>readHistoricalDemo({...base,rawSchedule:'2025-02-10,100,150'}),/línea 1/);
 assert.throws(()=>readHistoricalDemo({...base,rawSchedule:'2025-04-10,60,0\n2025-02-10,50,0'}),/línea 2/);
});
test('rechaza fecha anterior al préstamo y total menor al capital',()=>{
 assert.throws(()=>readHistoricalDemo({...base,rawSchedule:'2024-01-10,120,0'}),/línea 1/);
 assert.throws(()=>readHistoricalDemo({...base,rawSchedule:'2025-03-10,90,0'}),/total de cuotas/);
});
test('requiere cliente ficticio y fecha realista',()=>{
 assert.throws(()=>readHistoricalDemo({...base,client_id:''}),/cliente ficticio/);
 assert.throws(()=>readHistoricalDemo({...base,issued_on:'2027-01-01'}),/fecha original/);
 assert.throws(()=>readHistoricalDemo({...base,issued_on:'2025-02-30'}),/fecha original/);
});
