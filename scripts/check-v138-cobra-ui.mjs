// COBRA YA V138: pruebas estáticas, no modifican usuarios, préstamos ni saldos.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html, /<meta name="cc-deploy-version" content="V151-20261020">/);
const begin=html.indexOf('<script>',html.indexOf('id="cy63detail"'));
assert.ok(begin>0,'Script de COBRA YA ausente');
const end=html.indexOf('</script>',begin);
const js=html.slice(begin+8,end);
assert.ok(js.includes("node.innerHTML+'</body></html>'"),'Cronograma imprimible alterado');
new Script(js,{filename:'inline-cobra-v138.js'});
for(const token of ['cy138-card-buttons','class="cy138-card"','cy138-paid','cy71new','cy138-actions-menu','class="cy69edit"','class="cy53pay"','class="cy65extend"','class="cy68notify"','class="cy71close"','class="cy63view cy138-view"']){
 assert.ok(js.includes(token),'Falta acción preservada: '+token);
}
assert.ok(!js.includes('<th>Editar</th><th>Finalizar</th>'), 'Se mantuvo tabla desbordada');
assert.ok(js.includes("balance<=0.005"),'Estado pagado no depende del saldo');
assert.ok(js.includes("¿Confirmas que RECIBISTE"),'Pago total sin confirmación expresa');
assert.ok(js.includes("rpc/cy_record_payment"),'No usa RPC de abono');
assert.ok(js.includes("Pago total recibido y confirmado por el prestamista"),'Abono no deja auditoría');
assert.ok(js.includes("rpc/cy_close_paid_loan"),'Se perdió finalización protegida');
assert.ok(js.includes("rpc/cy_extend_loan_months"),'Se perdió la prórroga');
assert.ok(html.includes('/* V138: tarjetas compactas Cobra Ya'), 'No hay estilos móviles');
console.log('V138: tarjetas, scripts, pagos confirmados, acciones e historial conservados.');
