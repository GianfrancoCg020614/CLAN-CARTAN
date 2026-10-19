// V145 — parche idempotente de index.html (archivo demasiado grande para Contents API).
import fs from 'node:fs';
const file='index.html';
let html=fs.readFileSync(file,'utf8');
function replace(oldText,newText){
 if(html.includes(newText))return;
 if(!html.includes(oldText))throw Error('Marcador de integración no encontrado: '+oldText.slice(0,70));
 html=html.replace(oldText,newText);
}
replace('content="V142-20261019"','content="V145-20261019"');
replace('Los saldos y cobros aún son de prueba.','El saldo real se acredita únicamente tras verificar cada pago. Los bonos gratuitos solo activan COBRA YA.');
replace('Versión de prueba · Una cuenta para los dos servicios · Sin cobros de dinero real','Una cuenta para los dos servicios · Recargas sujetas a verificación del proveedor');
replace("Stream Bull's · catálogo de DEMOSTRACIÓN. Precios y operaciones comerciales todavía no conectados a Supabase.","STREAM BULL’S · catálogo informativo. Compras en línea pendientes de validación del proveedor.");
replace('Dos saldos independientes. Solo puedes transferir entre tus propias billeteras. Esta versión utiliza exclusivamente dinero ficticio.','Dos billeteras con saldo real confirmado. Las transferencias solo se realizan entre saldos reales del mismo titular. Los bonos de activación no son transferibles.');
replace('<section id="cc80wallet" aria-label="Billeteras de prueba">','<section id="cc80wallet" aria-label="Billeteras internas">');
replace('<script src="scripts/v127-wallet-switch.js?v=127b"></script>',
'<script src="scripts/v127-wallet-switch.js?v=145"></script>\n<script src="scripts/v145-cobra-access.js?v=145"></script>\n<script src="scripts/v145-commerce-guard.js?v=145"></script>');
replace('<script src="scripts/v136-manual-recharges.js?v=137"></script>',
'<script src="scripts/v136-manual-recharges.js?v=145"></script>');
const style=`<style id="cc145-production-ui">
/* V145: ocultar acciones de saldo de prueba heredadas. No borrar datos. */
#cc80wallet > .cc80balances,
#cc80wallet > label[for^="cc80"],
#cc80wallet > #cc80from, #cc80wallet > #cc80amount,
#cc80wallet > #cc80transfer, #cc80wallet > #cc80refresh,
#cc80wallet > #cc80status, #cc80wallet .cc113-central-topup,
#cc93-affiliate, #cc127-cobra-test, #cc127-bull-test{display:none!important}
#cc80wallet > small{display:none!important}
</style>
`;
if(!html.includes('id="cc145-production-ui"'))replace('<script src="scripts/v113-wallet.js?v=115"></script>',style+'<script src="scripts/v113-wallet.js?v=115"></script>');
if(!html.includes('v145-cobra-access.js'))throw Error('No se agregó el nuevo módulo.');
fs.writeFileSync(file,html);
console.log('V145: entrada de producción actualizada, módulos nuevos vinculados y registro DEMO histórico conservado.');
