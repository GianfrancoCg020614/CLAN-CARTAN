import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import {activarCobraEnStaging, STAGING_SUPABASE_URL} from './parte3-cobra-checkout-client.mjs';
import {initializeDemoLoans} from './parte3-cobra-staging-loans.mjs';

const PUBLISHABLE_KEY='sb_publishable_ZkjYbLS7ecPJiFnFihmAaQ_eGIDLHHq';
const supabase=createClient(STAGING_SUPABASE_URL,PUBLISHABLE_KEY,{
 auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}
});
const $=id=>document.getElementById(id);
const money=n=>new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(Number(n));
let busy=false,currentUserId=null,requestId=null,pendingFunding=null;
let hasAccess=false,hasReal=false,hasBonus=false;
const notice=text=>{$('notice').textContent=text;};
const loans=initializeDemoLoans({supabase,currentUser:()=>currentUserId,accessAllowed:()=>hasAccess});
async function listarClientesFicticios(userId){
 if(!userId||currentUserId!==userId||!hasAccess)return;
 const root=$('demoClientList');
 root.textContent='Consultando clientes ficticios…';
 const {data,error}=await supabase.from('cy_clients')
   .select('id,client_code,full_name,created_at')
   .eq('owner_id',userId)
   .order('created_at',{ascending:false}).limit(20);
 if(currentUserId!==userId||!hasAccess)return;
 if(error){root.textContent='No se pudo cargar el directorio de pruebas.';return;}
 root.replaceChildren();
 if(!data?.length){root.textContent='Todavía no hay clientes de prueba registrados.';return;}
 for(const client of data){
  const item=document.createElement('p');
  item.textContent=(client.client_code||'CY-DEMO')+' · '+client.full_name;
  root.appendChild(item);
 }
}
async function agregarClienteFicticio(){
 if(busy||!hasAccess||!currentUserId)return;
 busy=true;disableBtns();
 const userId=currentUserId;
 $('demoAddClient').disabled=true;
 try{
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||user?.id!==userId)throw Error('Sesión de pruebas no verificada');
  const demoName='Cliente ficticio '+new Date().toISOString().slice(0,19).replace('T',' ');
  const {error}=await supabase.from('cy_clients')
    .insert({owner_id:user.id,full_name:demoName,alias:'DEMO'});
  if(error)throw Error('No fue posible agregar el cliente de prueba');
  await listarClientesFicticios(userId);
  await loans.refresh();
  notice('Cliente ficticio registrado en STAGING. El saldo no se modificó.');
 }catch(e){notice(e.message||'No fue posible registrar el cliente');}
 finally{busy=false;disableBtns();}
}
$('demoAddClient').addEventListener('click',()=>void agregarClienteFicticio());
const disableBtns=()=>{
 $('payReal').disabled=busy||hasAccess||!hasReal;
 $('payBonus').disabled=busy||hasAccess||!hasBonus;
 $('refresh').disabled=busy;
 $('demoAddClient').disabled=busy||!hasAccess;
};
async function refresh(){
 const expectedUserId=currentUserId;
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user||user.id!==expectedUserId){
  hasAccess=true;hasReal=false;hasBonus=false;$('clientDirectory').hidden=true;$('loanDemoSection').hidden=true;loans.clear();disableBtns();
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
  hasAccess=true;hasReal=false;hasBonus=false;$('loanDemoSection').hidden=true;loans.clear();disableBtns();
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
 $('clientDirectory').hidden=!hasAccess;
 $('loanDemoSection').hidden=!hasAccess;
 disableBtns();
 if(hasAccess){await listarClientesFicticios(user.id);await loans.refresh();}
 else loans.clear();
 notice('Saldos y vigencia verificados en STAGING.');
}
async function updateSession(){
 const {data}=await supabase.auth.getSession();
 const logged=Boolean(data.session?.user);
 $('loginPanel').hidden=logged;
 $('checkoutPanel').hidden=!logged;
 if(logged){currentUserId=data.session.user.id;await refresh();}
 else{currentUserId=null;hasAccess=false;hasBonus=false;hasReal=false;requestId=null;pendingFunding=null;$('clientDirectory').hidden=true;$('loanDemoSection').hidden=true;loans.clear();notice('Ingresa con tu cuenta de STAGING para comenzar.');}
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
 }catch(err){notice(err.message);}finally{busy=false;$('loginButton').disabled=false;disableBtns();}
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
