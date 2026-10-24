import { cargarBilleteraClan, soles } from './parte3-billetera-consulta.mjs';

/**
 * Panel de lectura de Parte 3. No modifica saldo ni procesa recargas.
 * Requiere recibir el cliente Supabase autenticado de la página anfitriona.
 */
export async function montarBilleteraClan({ contenedor, supabaseCliente }) {
  if (!(contenedor instanceof Element)) throw new TypeError('Contenedor obligatorio');
  contenedor.replaceChildren();
  const seccion=document.createElement('section');
  seccion.className='cc-clan-wallet-readonly';
  seccion.setAttribute('aria-label','Billetera única CLAN CARTAN');
  const titulo=document.createElement('h2'); titulo.textContent='Mi billetera CLAN CARTAN';
  const estado=document.createElement('p'); estado.setAttribute('role','status');
  const actualizar=document.createElement('button'); actualizar.type='button'; actualizar.textContent='Actualizar saldo';
  const real=document.createElement('p');
  const bonos=document.createElement('div');
  const movimientos=document.createElement('div');
  const aviso=document.createElement('p');
  aviso.textContent='Consulta informativa: las recargas Lemon Cash (DALE) y Binance personal se acreditan solo tras verificación administrativa.';
  seccion.append(titulo,estado,actualizar,real,bonos,movimientos,aviso);
  contenedor.append(seccion);
  let activo=true;
  async function cargar() {
    actualizar.disabled=true; estado.textContent='Consultando saldos…';
    try {
      const datos=await cargarBilleteraClan(supabaseCliente);
      if(!activo) return;
      real.textContent='Saldo REAL único: '+soles(datos.saldoReal);
      bonos.replaceChildren();
      const bt=document.createElement('h3'); bt.textContent='Bonos de activación (separados)'; bonos.append(bt);
      const servicios=['COBRA_YA','MI_COCHERA','MI_ALQUILER'];
      for(const servicio of servicios) {
        const valor=datos.bonosActivacion.find(b=>b.service===servicio)?.balance_pen??'0.00';
        const item=document.createElement('p'); item.textContent=servicio.replaceAll('_',' ')+': '+soles(valor); bonos.append(item);
      }
      movimientos.replaceChildren();
      const mt=document.createElement('h3'); mt.textContent='Últimos movimientos'; movimientos.append(mt);
      if(!datos.movimientos.length) {const p=document.createElement('p');p.textContent='Aún no hay movimientos registrados en esta billetera.';movimientos.append(p);}
      for(const mov of datos.movimientos) {
        const p=document.createElement('p');
        p.textContent=[new Date(mov.created_at).toLocaleString('es-PE'),mov.service, mov.wallet_kind,soles(mov.amount_pen)].join(' · ');
        movimientos.append(p);
      }
      estado.textContent='Datos actualizados';
    }catch {
      if(activo) {real.textContent='';bonos.replaceChildren();movimientos.replaceChildren();estado.textContent='No fue posible consultar el saldo; comprueba tu sesión y entorno.';}
    }finally {if(activo) actualizar.disabled=false;}
  }
  actualizar.addEventListener('click', cargar);
  await cargar();
  return ()=>{activo=false; actualizar.removeEventListener('click',cargar); contenedor.replaceChildren();};
}
