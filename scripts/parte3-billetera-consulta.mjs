/**
 * CLAN CARTAN Parte 3: lector de saldos para vistas autenticadas.
 * NO autoriza recargas, bonos ni débitos desde navegador.
 * @param {object} supabaseCliente SDK autenticado del entorno correcto.
 */
export async function cargarBilleteraClan(supabaseCliente) {
  if (!supabaseCliente?.auth?.getUser || !supabaseCliente?.from) throw new Error('Cliente Supabase requerido');
  const { data: auth, error: authError } = await supabaseCliente.auth.getUser();
  if (authError || !auth?.user?.id) throw new Error('Debes iniciar sesión para consultar tu billetera');
  const [real, bonos, operaciones] = await Promise.all([
    supabaseCliente.from('cc_clan_real_wallets').select('balance_pen,updated_at').eq('user_id', auth.user.id).maybeSingle(),
    supabaseCliente.from('cc_clan_activation_bonus_wallets').select('service,balance_pen,updated_at').eq('user_id', auth.user.id),
    supabaseCliente.from('cc_clan_wallet_operations').select('id,wallet_kind,service,amount_pen,created_at').eq('user_id', auth.user.id).order('created_at',{ascending:false}).limit(50)
  ]);
  for (const r of [real,bonos,operaciones]) if (r.error) throw new Error('No se pudo consultar la billetera');
  return Object.freeze({
    saldoReal: real.data?.balance_pen ?? '0.00',
    bonosActivacion: (bonos.data ?? []).filter(b=>b.service !== 'STREAM_BULLS'),
    movimientos: operaciones.data ?? [],
    actualizado: real.data?.updated_at ?? null
  });
}
export function soles(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n)) throw new Error('Importe inválido');
  return new Intl.NumberFormat('es-PE',{style:'currency',currency:'PEN'}).format(n);
}
