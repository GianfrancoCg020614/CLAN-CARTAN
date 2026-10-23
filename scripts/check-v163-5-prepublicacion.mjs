import fs from 'node:fs';
const state=JSON.parse(fs.readFileSync('docs/V163-5-ESTADO.json','utf8'));
const tests=JSON.parse(fs.readFileSync('docs/matriz-e2e-v163-4.json','utf8'));
const remaining=Object.entries(state.gates||{}).filter(([,ok])=>ok!==true).map(([key])=>key);
const incomplete=tests.filter(t=>t.estado!=='Aprobada'||!String(t.evidencia||'').trim()||!String(t.revisor||'').trim()).map(t=>t.id);
if(remaining.length||incomplete.length||state.controls.production_merge_approved!==true){
 console.error('V163.5 NO AUTORIZADA para publicar: sin evidencia completa.');
 console.error('Gates pendientes:',remaining.join(', ')||'ninguno');
 console.error('E2E pendientes:',incomplete.join(', ')||'ninguno');
 process.exitCode=1;
}else{console.log('Evidencias registradas. Aún requiere revisión humana, respaldo y decisión de despliegue.');}