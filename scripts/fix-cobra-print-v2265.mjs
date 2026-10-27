// Repara únicamente el cierre del documento imprimible COBRAYA.
// Conserva contratos, pagos, historial y demás lógica.
import {readFileSync,writeFileSync} from 'node:fs';
const path='index.html';
const html=readFileSync(path,'utf8');
const start=`+node.innerHTML+'<script src="scripts/v207-session-inactivity.js?v=207" defer></script>`;
const end="');w.document.close();";
const replacement=`+node.innerHTML+'</body></html>');w.document.close();`;
const at=html.indexOf(start);
if(at<0){
 if(html.includes(replacement)){console.log('Corrección ya aplicada');process.exit(0)}
 throw Error('No se encontró el segmento original; no se modifica el archivo');
}
if(html.indexOf(start,at+1)>=0)throw Error('Segmento duplicado; abortado');
const endAt=html.indexOf(end,at+start.length);
if(endAt<0 || endAt-at>300)throw Error('Cierre esperado ausente o demasiado distante; abortado');
const segment=html.slice(at,endAt+end.length);
if(!segment.includes('</body></html>'))throw Error('El segmento no contiene cierre HTML; abortado');
const updated=html.slice(0,at)+replacement+html.slice(endAt+end.length);
if(!updated.includes("node.innerHTML+'</body></html>'"))throw Error('No quedó cierre de impresión');
writeFileSync(path,updated);
console.log('Segmento de impresión COBRAYA reparado y delimitado, caracteres retirados:',segment.length-replacement.length);
