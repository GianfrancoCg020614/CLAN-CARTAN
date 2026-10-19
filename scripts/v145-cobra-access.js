/* CLAN CARTAN V145: activacion con saldo real o bono COBRA YA, sin saldos de prueba. */
(function(){
'use strict';
const $=id=>document.getElementById(id),s=()=>window.CC_V53_SESSION;
const api=(p,b)=>window.cc80.api(p,'POST',b||{});
const cash=x=>'S/ '+Number(x||0).toFixed(2);
let busy=false;
function notice(t){if($('cy55msg'))$('cy55msg').textContent=t;}
async function refresh(){
 if(!s()?.jwt||s().isAdmin)return;
 const uid=s().userId,pay=$('cy55pay'),gift=$('cc145giftButton');
 if(pay)pay.disabled=true;if(gift)gift.disabled=true;
 try{
 const [sub,real,free,config]=await Promise.all([
 api('rpc/cy_subscription_status'),
 window.cc80.api('cc_real_service_wallets?select=balance_pen&service=eq.COBRA_YA&user_id=eq.'+encodeURIComponent(uid)),
 window.cc80.api('cc_cobra_welcome_bonus_wallets?select=balance_pen&user_id=eq.'+encodeURIComponent(uid)),
 api('rpc/cc_cobra_checkout_status')]);
 if(s()?.userId!==uid)return;
 const row=Array.isArray(sub)?sub[0]||{}:sub;
 const active=!!(row.authorized&&row.active),amount=Number(real?.[0]?.balance_pen||0),bonus=Number(free?.[0]?.balance_pen||0),enabled=config?.[0]?.enabled===true;
 $('cy55balance').textContent=cash(amount);
 $('cy55state').textContent=active?'Acceso vigente':'Sin activar';
 $('cy113due').textContent=active&&row.expires_at?new Date(row.expires_at).toLocaleDateString('es-PE'):'Sin activar';
 $('cy55pay').textContent=active?'Suscripcion vigente':!enabled?'Pago real no habilitado':amount<15?'Saldo insuficiente':'Pagar S/15';
 $('cy55pay').disabled=busy||active||!enabled||amount<15;
 $('cc145giftAmount').textContent='Bono de activacion: '+cash(bonus)+' (no transferible)';
 gift.disabled=busy||active||bonus<15;
 document.querySelectorAll('#cy53client button[type="submit"],#cy53loan button[type="submit"]').forEach(b=>b.disabled=!active);
 }catch(e){notice('No se pudo verificar el acceso: '+String(e.message||e));}
}
async function activate(kind){
 if(busy||!s()?.jwt)return;
 if(!confirm(kind==='bonus'?'¿Utilizar S/15 del bono gratuito para activar COBRA YA por 30 días?':'¿Pagar S/15 con saldo real confirmado por 30 días?'))return;
 busy=true;
 try{
 const ref=await api(kind==='bonus'?'rpc/cc_activate_cobra_welcome_bonus':'rpc/cc_pay_cobra_subscription_real');
 if(!ref)throw Error('Sin confirmación');
 notice('Activación registrada. Referencia: '+ref);
 if(window.cy54?.refreshAuth)await window.cy54.refreshAuth();
 }catch(e){notice('No se completó la activación: '+String(e.message||e));}
 finally{busy=false;await refresh();}
}
function mount(){
 if(!$('cy55subscription')||!window.cy55||!window.cc80?.api)return;
 const button=$('cy55pay');
 button.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();void activate('real');},true);
 const box=document.createElement('div');box.id='cc145gift';box.className='cy113-extra';
 box.innerHTML='<strong>Bono exclusivo COBRA YA</strong><p id="cc145giftAmount">Consultando…</p><button id="cc145giftButton" type="button">Activar 30 días con S/15 de bono</button><small>No genera ingreso, ni comisión de referido. No se transfiere a STREAM BULL’S.</small>';
 $('cy55subscription').appendChild(box);
 $('cc145giftButton').addEventListener('click',()=>void activate('bonus'));
 const topup=$('cy113topup');if(topup)topup.hidden=true;
 const transfer=$('cy113transferArea');if(transfer)transfer.hidden=true;
 for(const id of ['cy113recharge','cy113transfer']){const b=$(id);if(b)b.hidden=true;}
 const note=$('cy55subscription').querySelector('.cy113-note');if(note)note.textContent='Únicamente saldos reales confirmados o bonos exclusivos de activación.';
 window.cy55.status=refresh;window.cy55.pay=()=>activate('real');
 void refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
})();