-- CLAN CARTAN: control de aprobación para migración de billetera única.
-- SOLO LECTURA, ejecutar en Supabase PRODUCCIÓN.
-- No interpreta el saldo TEST como dinero REAL, ni mezcla bonos.
with fuentes as (
 select 'REAL_SERVICIOS' fuente,count(*) cantidad,coalesce(sum(balance_pen),0) saldo
 from public.cc_real_service_wallets
 union all select 'REAL_MI_ALQUILER',count(*),coalesce(sum(real_verified_pen),0) from public.ma_wallets
 union all select 'BONO_COBRA',count(*),coalesce(sum(balance_pen),0) from public.cc_cobra_welcome_bonus_wallets
 union all select 'BONO_COCHERA',count(*),coalesce(sum(bonus_pen),0) from public.mc_accounts
 union all select 'BONO_ALQUILER',count(*),coalesce(sum(bonus_pen),0) from public.ma_accounts
), movimientos as (
 select (select count(*) from public.cc_real_wallet_ledger) ledger_real,
 (select count(*) from public.cc_real_wallet_spends) gastos_reales,
 (select count(*) from public.cc_admin_verified_personal_topups) recargas_verificadas,
 (select count(*) from public.cc_real_wallet_refunds) devoluciones
)
select
 (select coalesce(sum(cantidad),0) from fuentes where fuente like 'REAL_%') as cuentas_reales_historicas,
 (select coalesce(sum(saldo),0) from fuentes where fuente like 'REAL_%') as saldo_real_historico_total,
 (select coalesce(sum(cantidad),0) from fuentes where fuente like 'BONO_%') as cuentas_promocionales_historicas,
 (select coalesce(sum(saldo),0) from fuentes where fuente like 'BONO_%') as bonos_historicos_total,
 movimientos.*,
 case when
 (select coalesce(sum(cantidad),0) from fuentes)=0 and
 ledger_real=0 and gastos_reales=0 and recargas_verificadas=0 and devoluciones=0
 then 'SIN_DATOS_HISTORICOS_EN_FUENTES_CONSULTADAS'
 else 'REQUIERE_CONCILIACION_PERSONALIZADA_NO_MIGRAR_AUTOMATICAMENTE'
 end as resultado
from movimientos;

-- Un informe vacío NO autoriza retirar módulos antiguos o activar producción.
-- Requiere corte consistente, inventario completo, pruebas de regresión de
-- login y cuatro servicios, acceso a backend y plan de reversión.
