# Auditoría de conectores de entrega (2026-10-24) — SOLO LECTURA sobre producción

En el proyecto Supabase producción se identificaron operaciones reales existentes:
- COBRA YA: `cc_pay_cobra_subscription_real` y `cy_subscription_status`, `cc_cobra_real_access_periods`.
- MI ALQUILER: `ma_activate_real_wallet`, `ma_activate_bonus`.
- MI COCHERA: `mc_activate_with_bonus`, `mc_subscription_events`, `mc_accounts`; no se verificó aún una RPC de activación REAL equivalente.
- STREAM BULL'S: tablas `sb_*` presentes en producción; todavía no se verificó una rutina de activación REAL con comprobante de entrega.

STAGING por ahora únicamente cuenta con infraestructura de billetera unificada, registros de entrega y recompensas; NO alberga los esquemas completos de servicio que ya existen en producción.

Se desplegó una Edge Function puente `cc-clan-service-fulfillment` ACTIVE únicamente en STAGING (configuración `verify_jwt=false`; autenticación por HMAC por servicio). No puede usarse desde el navegador. Se requieren secretos de cada backend de servicio en el gestor de secretos de Supabase; sin ellos devuelve `service_not_configured` y no acredita pagos. La prueba HTTP externa de rechazo de firma quedó pendiente; no afirmar que se pasó.

**Bloqueo actual:** definir y desplegar en STAGING las implementaciones reales de entrega/vigencia de cada servicio; después hacer que su backend firme la confirmación y llame al puente, pasando pruebas de no-entrega, entrega, balance, referencias repetidas y reversos. No migrar las transacciones financieras a producción sin ello.

No se modificó la base de producción.
