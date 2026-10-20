// V140: pruebas estáticas del selector de prórrogas y mensajes WhatsApp.
// No envía mensajes ni genera movimientos en la base de datos.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.match(html, /content="V148-20261020"/);
const start=html.indexOf('<script>',html.indexOf('id="cy63detail"'));
const end=html.indexOf('</script>',start);
assert.ok(start>0&&end>start,'Script COBRA YA no encontrado');
const js=html.slice(start+8,end);
new Script(js,{filename:'cobra-ya-v140.js'});
for(const marker of [
 'cy140OpenExtension', 'cy140Months', 'cy140Total', 'cy140Added',
 'cy140OldDue','cy140Due','cy140Days','cy140Reason',
 "rpc/cy_extend_loan_months", 'p_added_months:added',
 "x+'T12:00:00'", 'cy140-overlay',
 '🐍 *COBRA YA*','💵 *Capital:*','📈 *Interés mensual:*',
 '💰 *Total a pagar:*','📅 *Vencimiento:*',
 '✨ Descubre nuestros servicios y soluciones digitales:',
 '🌐 https://www.clancartan.com/',
 'encodeURIComponent(lines.join'
]){
 assert.ok(js.includes(marker),'No se encontró comportamiento V140: '+marker);
}
assert.ok(!js.includes("const monthsInput=prompt('¿Cuántos"),'Selector antiguo ambiguo sigue activo');
assert.ok(!js.includes('El enlace se incorpora cuando ADMIN configure'), 'Nota histórica de enlace ausente en SMS');
assert.ok(html.includes('/* V140: panel móvil de prórrogas'), 'Falta estilo móvil para la vista previa');
assert.ok(js.includes("loan.status!=='ACTIVE'"),'Prórroga debe denegar préstamos inactivos');
assert.ok(js.includes("oldMonths+added"),'No se presenta el plazo acumulado');
assert.ok(js.includes("Date.UTC"),'Falta cálculo del contador en días');
console.log('V140: selector, suma de plazo y contador de días, enlaces y emojis válidos.');
