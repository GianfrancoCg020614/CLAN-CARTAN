# Parte 3/7 — Billetera única CLAN CARTAN y bonos separados

## Decisiones obligatorias
- Una sola billetera de saldo **REAL** por usuario para STREAM BULL'S, COBRA YA, MI COCHERA y MI ALQUILER.
- Bonos de **activación separados** del saldo REAL, restringidos a COBRA YA, MI COCHERA y MI ALQUILER.
- STREAM BULL'S jamás consume bonos de activación; se valida en servidor, no solo en la interfaz.
- Las recompensas mensuales por referidos de S/5 reales se implementan en Parte 4, solo por activación mensual pagada y verificada.
- Nunca convertir el bono de activación en saldo real ni mezclar importes TEST con reales.

## Compatibilidad y despliegue
La producción actual usa `cc_real_service_wallets` y `cc_real_wallet_ledger`, y bonos preexistentes como `cc_cobra_welcome_bonus_wallets`.
La migración adjunta solo introduce tablas aditivas y RLS. **No traslada saldos**.
Las antiguas cuatro subbilleteras se conservan sin borrar ni modificar hasta conciliar movimientos y saldos por usuario; debe comprobarse sumatoria exacta, transacciones duplicadas, reversos y bloqueo de escrituras antiguas antes de la transición.

## Gate para habilitar operaciones
1. Copia de seguridad, recuentos y saldos antes/después por usuario.
2. Migración y pruebas de rechazo: gastos con bono en STREAM BULL'S, doble operación, saldo insuficiente, acceso cruzado, escritura pública y pago no verificado.
3. API/RPC transaccional con permisos mínimos e idempotencia. El cliente nunca debe actualizar balances.
4. UI que muestre saldo REAL único y bonos separados por servicio.
5. Pruebas E2E en staging con datos sintéticos, CI y preview de Cloudflare.
6. Rollback documentado y revisión antes de activar la escritura productiva.

**Estado inicial de esta rama:** capa de datos preparada para probar en staging; no indica que exista funcionalidad de gasto, recarga, UI terminada ni publicación en producción.
