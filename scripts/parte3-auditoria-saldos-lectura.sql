-- Parte 3/7: inspección NO DESTRUCTIVA. Ejecutar en Supabase producción con rol autorizado.
-- Columnas inspeccionadas directamente en information_schema (2026-10-23).
-- La salida no representa conciliación por usuario: todavía debe asociarse identidad y validar fuente de cada movimiento.
select 'REAL_cc_real_service_wallets' as fuente, count(*) as registros,
 coalesce(sum(balance_pen),0)::numeric(14,2) as total_pen from public.cc_real_service_wallets
union all
select 'REAL_ma_wallets',count(*),coalesce(sum(real_verified_pen),0)::numeric(14,2) from public.ma_wallets
union all
select 'TEST_cc_wallets',count(*),coalesce(sum(balance_test),0)::numeric(14,2) from public.cc_wallets
union all
select 'TEST_cc_service_wallets',count(*),coalesce(sum(balance_test),0)::numeric(14,2) from public.cc_service_wallets;
-- Importante: excluir TEST de REAL; nunca sumar saldos de distintas fuentes sin analizar solapamientos.
-- Requerido antes de liberar: conciliación usuario por usuario, fondos recibidos y saldos fuente;
-- bloquear doble escritura vieja/nueva; copia de respaldo, pruebas de concurrencia e idempotencia.
