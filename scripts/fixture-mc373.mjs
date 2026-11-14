import fs from 'node:fs';
import {businessDialogFixture} from './fixture-v311-business-dialogs.mjs';
import {usabilityFixture} from './fixture-v314-usability.mjs';
import {dniFixture} from './fixture-v313-dni.mjs';
import {cleanupFixture} from './fixture-v312-cleanup.mjs';
fs.mkdirSync('artifacts/mc373',{recursive:true});
for(const k of ['cochera','alquiler','cobra'])fs.writeFileSync('artifacts/mc373/311-'+k+'.html',businessDialogFixture(k));
for(const k of ['cochera','contabilidad','avisos'])fs.writeFileSync('artifacts/mc373/314-'+k+'.html',usabilityFixture(k));
for(const k of ['cochera','alquiler'])fs.writeFileSync('artifacts/mc373/313-'+k+'.html',dniFixture(k));
fs.writeFileSync('artifacts/mc373/312.html',cleanupFixture());
let html=businessDialogFixture('cochera');html=html.slice(0,html.lastIndexOf('<script>'));
html+=`<script>const base=cc80.api;cc80.api=async(p,m,b)=>{
if(p==='rpc/cc_finance_wallet')return {available_pen:17};
if(p.startsWith('mc_carts?'))return Array.from({length:13},(_,i)=>({id:i+1,alias:i===0?'Paisa':'Carrito '+(i+1),state:i===2?'RETIRED':'ACTIVE',owner_person_id:'p1',worker_person_id:'p2',daily_rate:4,currency:i===1?'USD':'PEN',business_type:'Emoliente'}));
if(p.startsWith('mc_people?'))return [{id:'p1',full_name:'Juan Rodríguez Pérez',doc_number:'12345678',phone:'987654321'},{id:'p2',full_name:'María Torres',phone:'+51912345678'}];
if(p==='rpc/mc_list_corrections')return [];if(p.startsWith('mc_movements?'))return [{id:1,cart_id:1,amount_local:1507.50,kind:'RENT',occurred_on:'2026-11-13',created_at:'2026-11-13T12:00:00Z'},{id:2,cart_id:2,amount_local:17,kind:'RENT',occurred_on:'2026-11-13',created_at:'2026-11-13T12:00:00Z'},{id:3,cart_id:3,amount_local:9,kind:'RENT',occurred_on:'2026-11-13',created_at:'2026-11-13T12:00:00Z'}];return base(p,m,b);};window.cc166OpenPanel=()=>window.__returned=true;mc158Open();</script></body></html>`;
fs.writeFileSync('artifacts/mc373/premium.html',html);
