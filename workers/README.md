# Sondeo privado de depósitos

Código: recharge-poller.mjs. Worker: clan-cartan-recharge-poller, misma cuenta Cloudflare de Pages. Compatibilidad: 2026-11-05. Cron: */5 * * * *. workers.dev y previews deshabilitados; sin rutas públicas. Observabilidad y trazas habilitadas.

Binding secreto: CC_RECHARGE_POLL_TOKEN. Solo su hash SHA-256 se almacena en cc_internal.recharge_schedule.secret_hash. Generar/rotar el valor dentro del entorno seguro de despliegue, sin devolverlo ni registrarlo; actualizar ambos extremos antes de activar. No introducir claves en el código o en GitHub. La credencial solo permite invocar la detección de avisos, nunca acreditar fondos.

Las actualizaciones del Worker se despliegan separadas de Pages mediante Cloudflare API/CLI, conservando el binding secreto existente. Pruebas: node scripts/test-v322-worker.mjs. No recrear el proyecto Pages ni la base de datos.
