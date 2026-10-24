import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {activarCobraEnStaging, STAGING_SUPABASE_URL} from './parte3-cobra-checkout-client.mjs';

const PUBLISHABLE_KEY='sb_publishable_ZkjYbLS7ecPJiFnFihmAaQ_eGIDLHHq';
const supabase=createClient(STAGING_SUPABASE_URL,PUBLISHABLE_KEY,{
 auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}
});
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(n));
let busy=false,currentUserId=null,requestId=null,pendingFunding=null;
let hasAccess=false,hasReal=false,hasBonus=false;
const notice=text=>{$('notice').textContent=text;};
const disableBtns=()=>{
 $('payReal').disabled=busy||hasAccess||!hasReal;
 $('payBonus').disabled=busy||hasAccess||!hasBonus;
 $('refresh').disabled=busy;
};
async function refresh(){
 const expectedUserId=currentUserId;
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user||user.id!==expectedUserId){
  hasAccess=true;hasReal=false;hasBonus=false;disableBtns();
  notice('Sesión de STAGING no verificada. Cierra sesión y vuelve a entrar.');
  return;
 }
 $('signedIn').textContent='Cuenta STAGING: '+(user.email||'usuario autenticado');
 const [wallet,bonuses,active]=await Promise.all([
  supabase.from('cc_clan_real_wallets').select('balance_pen').eq('user_id',user.id).maybeSingle(),
  supabase.from('cc_clan_activation_bonus_wallets').select('balance_pen').eq('user_id',user.id).eq('service','COBRA_YA').maybeSingle(),
  supabase.from('cc_clan_cobra_access_periods').select('ends_at').eq('user_id',user.id).gt('ends_at',new Date().toISOString()).order('ends_at',{ascending:false}).limit(1)
 ]);
 if(user.id!==currentUserId)return;
 if(wallet.error||bonuses.error||active.error){
  hasAccess=true;hasReal=false;hasBonus=false;disableBtns();
  $('accessStatus').textContent='No fue posible verificar saldos o acceso; cobros bloqueados.';
  notice('Error de consulta a STAGING. No se autoriza ninguna activación.');
  return;
 }
 const amount=wallet.data?Number(wallet.data.balance_pen):null;
 const bonus=bonuses.data?Number(bonuses.data.balance_pen):null;
 $('realAmount').textContent=amount===null?'Billetera pendiente':money(amount);
 $('bonusAmount').textContent=bonus===null?'Sin bono registrado':money(bonus);
 const expires=active.data?.[0]?.ends_at||null;
 hasAccess=Boolean(expires);
 hasReal=amount!==null&&amount>=15;
 hasBonus=bonus!==null&&bonus>=15;
 $('accessStatus').textContent=expires?'Acceso vigente hasta: '+new Date(expires).toLocaleString('es-PE'):'Sin suscripción COBRA YA vigente en STAGING';
 disableBtns();
 notice('Saldos y vigencia verificados en STAGING.');
}
async function updateSession(){
 const {data}=await supabase.auth.getSession();
 const logged=Boolean(data.session?.user);
 $('loginPanel').hidden=logged;
 $('checkoutPanel').hidden=!logged;
 if(logged){currentUserId=data.session.user.id;await refresh();}
 else{currentUserId=null;hasAccess=false;hasBonus=false;hasReal=false;requestId=null;pendingFunding=null;notice('Ingresa con tu cuenta de STAGING para comenzar.');}
}
$('loginForm').addEventListener('submit',async e=>{
 e.preventDefault();
 if(busy)return;
 busy=true;$('loginButton').disabled=true;notice('Verificando sesión STAGING…');
 try{
  const {error}=await supabase.auth.signInWithPassword({
   email:$('email').value.trim(),password:$('password').value
  });
  $('password').value='';
  if(error)throw Error('No fue posible iniciar sesión en STAGING.');
  await updateSession();
 }catch(err){notice(err.message);}finally{busy=false;$('loginButton').disabled=false;}
});
$('logout').addEventListener('click',async()=>{
 if(busy)return;
 await supabase.auth.signOut();
 await updateSession();
 notice('Sesión STAGING cerrada.');
});
$('refresh').addEventListener('click',()=>{if(!busy)void refresh();});
async function activate(funding){
 if(busy||hasAccess||(funding==='REAL'?!hasReal:!hasBonus))return;
 const label=funding==='REAL'?'saldo REAL':'bono de activación';
 if(!confirm('¿Activar COBRA YA por 30 días usando S/ 15 de '+label+' en STAGING?'))return;
 busy=true;disableBtns();notice('Solicitando activación segura de COBRA YA…');
 if(!requestId||pendingFunding!==funding){requestId=crypto.randomUUID();pendingFunding=funding;}
 try{
  const result=await activarCobraEnStaging({
   supabaseCliente:supabase,funding,requestId
  });
  requestId=null;pendingFunding=null;
  await refresh();
  notice('Activación confirmada en STAGING. Vigencia: '+new Date(result.access_until).toLocaleString('es-PE'));
 }catch(err){
  // Conservar requestId por idempotencia: un reintento no debe cobrar dos veces.
  notice(err.message+' Si lo reintentas sin recargar, se utiliza la misma referencia.');
 }finally{busy=false;disableBtns();}
}
$('payReal').addEventListener('click',()=>void activate('REAL'));
$('payBonus').addEventListener('click',()=>void activate('ACTIVATION_BONUS'));
await updateSession();
