// Corrige exclusivamente el HTML imprimible que interrumpe el script de COBRAYA.
// No modifica saldos, contratos, datos de clientes ni endpoints.
import {readFileSync,writeFileSync} from 'node:fs';
const path='index.html';
const html=readFileSync(path,'utf8');
const bad=`+node.innerHTML+'<script src="scripts/v207-session-inactivity.js?v=207" defer></script>`;
const good=`+node.innerHTML+'</body></html>`;
const matches=html.split(bad).length-1;
if(matches===0 && html.includes(good)){console.log('Corrección ya aplicada');process.exit(0)}
if(matches!==1)throw Error('Se esperaba exactamente una ocurrencia; encontradas: '+matches);
const updated=html.replace(bad,good);
if(updated.length!==html.length+good.length-bad.length)throw Error('Cambio inesperado');
writeFileSync(path,updated);
console.log('Cronograma de COBRAYA reparado; cambio único verificado');
