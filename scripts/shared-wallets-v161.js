/* CLAN CARTAN V161 | Parte 4 - interfaz compartida de billeteras.
   Preparado para integracion final. NO acredita ni mueve dinero.
   Montar en <div data-cc-wallet-panel data-service="MI_COCHERA"></div>.
   El adaptador backend futuro debe autenticar usuario, consultar saldos reales,
   verificar deposito en servidor e impedir duplicados.
*/
(function () {
'use strict';
const SERVICES=Object.freeze({COBRA_YA:'COBRA YA',STREAM_BULLS:"STREAM BULL'S",MI_COCHERA:'MI COCHERA'});
const METHODS=Object.freeze({LEMON:'Lemon / DALE',BINANCE:'Binance Pay (USDT)'});
const ROOT_URL='https://www.clancartan.com/';
function money(v){return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(v)||0);}
function validAmount(v){return typeof v==='number'&&Number.isFinite(v)&&v>=0;}
function describeWallet(record){
 if(!record||!validAmount(record.real)||!validAmount(record.bonus)||!validAmount(record.pending)) return null;
 // El bono no es dinero recargado y permanece restringido a su servicio.
 return Object.freeze({real:record.real,bonus:record.bonus,pending:record.pending,totalVisible:record.real+record.bonus});
}
function transferEligibility(request){
 const r=request||{};
 if(!SERVICES[r.from]||!SERVICES[r.to]||r.from===r.to)return {allowed:false,reason:'Servicios de origen y destino inválidos'};
 if(!r.sameAuthenticatedOwner)return {allowed:false,reason:'Solo billeteras del mismo titular'};
 if(r.sourceKind!=='REAL_VERIFIED')return {allowed:false,reason:'Bonos, saldos TEST y pendientes no son transferibles'};
 if(!Number.isSafeInteger(r.amountCents)||r.amountCents<=0)return {allowed:false,reason:'Monto inválido'};
 if(!Number.isSafeInteger(r.availableRealCents)||r.amountCents>r.availableRealCents)return {allowed:false,reason:'Saldo real insuficiente'};
 return {allowed:true,reason:'Elegibilidad preliminar; el servidor debe revalidarla'};
}
function creditPolicy(payment){
 if(!payment||payment.providerVerified!==true||!payment.serverReference||!payment.receivedAmountVerified||payment.duplicate!==false)
   return {canCredit:false,reason:'No hay verificación de proveedor y referencia única'};
 return {canCredit:false,reason:'La acreditación solo puede ejecutarse en backend transaccional autorizado'};
}
function draw(root, data){
 const service=root.dataset.service;
 if(!SERVICES[service])return;
 root.replaceChildren();
 const wrap=document.createElement('section');
 wrap.style.cssText='font:inherit;color:inherit;border:1px solid #96783b;border-radius:16px;padding:16px;background:#121419';
 const heading=document.createElement('h3');heading.textContent='Billetera · '+SERVICES[service];heading.style.cssText='margin:0 0 12px;color:#eac77d';
 const account=describeWallet(data);
 const status=document.createElement('p');status.style.cssText='margin:6px 0';
 status.textContent=account?'Saldo disponible mostrado: '+money(account.totalVisible):'Saldo pendiente de cargar desde servidor';
 wrap.append(heading,status);
 if(account){
  const p=document.createElement('p');
  p.textContent='Recargas verificadas: '+money(account.real)+' · Bono restringido: '+money(account.bonus)+' · Pendiente (no disponible): '+money(account.pending);
  p.style.cssText='margin:8px 0';wrap.append(p);
 }
 const label=document.createElement('label');label.textContent='Método de recarga · ';
 const sel=document.createElement('select');
 sel.style.cssText='padding:8px;border-radius:8px;margin:8px;background:#1d2128;color:white';
 for(const [value,name] of Object.entries(METHODS)){const option=document.createElement('option');option.value=value;option.textContent=name;sel.append(option);}
 label.append(sel);wrap.append(label);
 const amount=document.createElement('input');amount.type='number';amount.min='0.01';amount.step='0.01';amount.placeholder='Monto a recargar (S/)';amount.setAttribute('aria-label','Monto de recarga PEN');
 amount.style.cssText='width:100%;box-sizing:border-box;padding:10px;margin:8px 0;background:#232733;color:white;border:1px solid #686868;border-radius:8px';
 wrap.append(amount);
 const notice=document.createElement('p');notice.style.cssText='font-size:12px;opacity:.85';
 notice.textContent='QR e ID de pago: solo mostrar los configurados y autorizados por ADMIN. Sin confirmación del proveedor, la recarga queda pendiente.';
 wrap.append(notice);
 const action=document.createElement('button');action.type='button';action.textContent='YA PAGUÉ · preparar solicitud';action.style.cssText='padding:10px;border-radius:9px;background:#bd9c55;color:#111;border:0;cursor:pointer';
 const msg=document.createElement('p');msg.setAttribute('role','status');
 action.addEventListener('click',()=>{
  const n=Number(amount.value);
  if(!amount.value||!Number.isFinite(n)||n<=0||Math.round(n*100)!==n*100){msg.textContent='Ingrese un monto positivo con máximo dos decimales.';return;}
  msg.textContent='Solicitud pendiente: '+money(n)+' · '+METHODS[sel.value]+'. Tras integrar V161 se solicitará referencia de operación y comprobación en el servidor. Esto no acredita fondos.';
  root.dispatchEvent(new CustomEvent('clancartan:recharge-intent',{bubbles:true,detail:{service,method:sel.value,amountPEN:n}}));
 });
 wrap.append(action,msg);root.append(wrap);
}
function mountAll(wallets={}){
 document.querySelectorAll('[data-cc-wallet-panel]').forEach(root=>draw(root,wallets[root.dataset.service]));
}
window.ClanCartanWalletV161=Object.freeze({services:SERVICES,methods:METHODS,money,describeWallet,transferEligibility,creditPolicy,mountAll,homepage:ROOT_URL});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountAll());
else mountAll();
})();