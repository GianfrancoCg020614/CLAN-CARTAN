// V150: actualizar de forma idempotente el formulario único emergente de COBRA YA.
import fs from 'node:fs';
const filename='index.html';
let html=fs.readFileSync(filename,'utf8');
function assertHas(s){if(!html.includes(s))throw Error('Falta el marcador DNI: '+s.slice(0,100));}
if(html.includes('name="cc-deploy-version" content="V150-20261020"')){
 console.log('V150: portal ya integrado.');
 process.exit(0);
}
assertHas('name="cc-deploy-version" content="V148-20261020"');
assertHas("const consent=document.getElementById('cy106consent');");
assertHas("if(consent?.checked){");
assertHas("body:JSON.stringify({dni:value,consent:true})");
assertHas('scripts/v119-clients.js?v=149');
assertHas('scripts/v148-manual-whatsapp.js?v=148');
// Retirar autorización repetida desde modal. La autorización documentada la configura ADMIN por operador.
html=html.replace(/<label[^>]*><input type="checkbox" id="cy106consent"[^>]*>Confirmo que tengo autorización para consultar los datos del DNI\.<\/label>/g,'');
const consentListener="document.getElementById('cy106consent').addEventListener('change',";
const start=html.indexOf(consentListener);
if(start<0)throw Error('No se encontró listener de consentimiento antiguo');
const end=html.indexOf('\n',start);
if(end<0)throw Error('Listener inesperado');
html=html.slice(0,start)+html.slice(end+1);
html=html.replace("const consent=document.getElementById('cy106consent');",
 "const approved=await request('rpc/cc_my_dni_auto_permission','POST',{});");
html=html.replace("if(consent?.checked){","if(approved===true){");
html=html.replace("body:JSON.stringify({dni:value,consent:true})","body:JSON.stringify({dni:value})");
html=html.replace("else cy105dniStatus.textContent='Para consultar el DNI, marca la autorización de tratamiento. Puedes ingresar el nombre manualmente.';",
 "else cy105dniStatus.textContent='Consulta automática pendiente de habilitación por ADMIN. Puedes ingresar el nombre manualmente.';");
html=html.replace("id=\"cc119newTitle\">Agregar cliente</h3>","id=\"cc119newTitle\">Agregar cliente</h3>");
html=html.replace('scripts/v119-clients.js?v=149','scripts/v119-clients.js?v=150');
html=html.replace('name="cc-deploy-version" content="V148-20261020"','name="cc-deploy-version" content="V150-20261020"');
const tag='<script src="scripts/v148-manual-whatsapp.js?v=148"></script>';
html=html.replace(tag,tag+'\n<script src="scripts/v150-dni-admin.js?v=150"></script>');
if(html.includes('id="cy106consent"')||html.includes('if(consent?.checked)')||!html.includes("if(approved===true)"))throw Error('La casilla DNI anterior no se eliminó correctamente');
if(!html.includes('scripts/v150-dni-admin.js?v=150'))throw Error('Falta ventana de configuración ADMIN');
fs.writeFileSync(filename,html);
console.log('V150 DNI: ventana única, búsqueda automática tras 8 dígitos y permiso documentado desde ADMIN.');
