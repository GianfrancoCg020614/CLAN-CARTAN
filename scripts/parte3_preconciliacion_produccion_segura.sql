-- CLAN CARTAN | Auditoría de PRECONCILIACIÓN, SOLO LECTURA.
-- EJECUTAR SOLO en PRODUCCIÓN con privilegios de auditoría.
-- No modifica saldo, no migra, no presenta identificadores personales.
with
 wallet as (
  select user_id, count(*) as numero_billeteras,
   sum(balance_pen) as total_real, min(balance_pen) as minimo_real
  from public.cc_real_service_wallets group by user_id
 ),
 service_summary as (
  select service, count(*) as cuentas, coalesce(sum(balance_pen),0) as saldo_real_pen,
   count(*) filter(where balance_pen<0) as saldos_negativos
  from public.cc_real_service_wallets group by service
 ),
 referral_collision as (
  select referred_user_id,date_trunc('month',credited_at at time zone 'America/Lima') as mes,
    count(*) as pagos
  from public.cc_cobra_referral_bonuses
  where status not in ('REVERSED')
  group by referred_user_id,date_trunc('month',credited_at at time zone 'America/Lima')
 )
select 'wallet_total' as indicador,count(*)::text as valor from wallet
union all
select 'saldo_global_pen',coalesce(sum(total_real),0)::text from wallet
union all
select 'usuarios_con_saldo_negativo',count(*)::text from wallet where minimo_real<0
union all
select 'pagos_referido_multiples_mismo_mes',count(*)::text from referral_collision where pagos>1
union all
select 'servicios_con_saldo_negativo',count(*)::text from service_summary where saldos_negativos>0;

-- Control de saldos por servicio (agregados, nunca por identidad).
select service,count(*) as billeteras,coalesce(sum(balance_pen),0) as total_real_pen
from public.cc_real_service_wallets group by service order by service;

-- Un saldo histórico NO debe copiarse a la nueva billetera sin definir un
-- corte temporal, una clave de migración irreversible, la conciliación con
-- operaciones de origen y la prevención de doble crédito.
