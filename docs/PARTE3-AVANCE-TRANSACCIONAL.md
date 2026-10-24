# Parte 3/7 — registro transaccional (STAGING)

Migración aplicada en Supabase STAGING `szcplebbqhtcgxhvmxdv`:
`parte3_atomic_wallet_posting_staging`.

Función: `public.cc_clan_post_wallet_operation(uuid,text,text,numeric,text)`.
Solo `service_role` puede ejecutarla; `anon` y `authenticated` no.

Contrato:
- `p_wallet_kind`: `REAL` o `ACTIVATION_BONUS`
- `p_service`: `STREAM_BULLS`, `COBRA_YA`, `MI_COCHERA`, `MI_ALQUILER`
- `p_amount_pen`: decimal firmado, dos posiciones (positivo acredita; negativo debita)
- `p_operation_key`: idempotencia global, de 12 a 200 caracteres; la repetición idéntica no vuelve a cobrar
- REAL es compartido por los cuatro servicios; ACTIVATION_BONUS se mantiene separado por servicio y se prohíbe STREAM_BULLS
- Se rechaza saldo negativo y uso de llave repetida con parámetros distintos
- Se bloquea la fila durante la operación, y el movimiento y saldo se actualizan en una transacción PostgreSQL

**IMPORTANTE**: El procesamiento backend debe validar antes de invocar la RPC el origen, autorización de pagos y derecho al bono. La función no verifica comprobantes de pago.

Comprobaciones realizadas: la función existe y permisos anon=false, authenticated=false, service_role=true. STAGING tiene cero usuarios, por lo que aún no se ha ejecutado prueba E2E con cliente real.

**No está completa la Parte 3:** faltan integrar la API y la UI del portal, conciliar billeteras previas sin duplicar montos, ensayos con pagos autorizados, pruebas automáticas y preview de Cloudflare. No fusionar ni desplegar producción por ahora. La recompensa mensual de S/5 corresponde a Parte 4.

Nota: la migración desplegada está registrada en el historial de STAGING; exportar el SQL íntegro al directorio `supabase/migrations` en el siguiente ciclo de sincronización antes del merge.
