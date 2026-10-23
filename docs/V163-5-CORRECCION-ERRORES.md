# V163.5 — Corrección de errores de sincronización
Revisión: 22–23 de octubre de 2026. Rama `feature/v163-5-integracion-segura`.

## Incidencias corregidas
1. **Recarga prematura**: `ma1612OnOpen` devolvía `undefined` por `void load()`, aunque los módulos financieros y de avisos usaban `await`. Ahora devuelve la `Promise` de carga de datos. Las solicitudes simultáneas de apertura comparten una única carga.
2. **Saldo obsoleto en alertas**: la vista de avisos cacheaba el libro de movimientos, incluso después de un pago, consumo o garantía registrado con éxito desde Finanzas. Ahora Finanzas invalida la caché y la siguiente vista de Avisos recarga del servidor.
3. **Prueba de regresión**: `scripts/check-v163-5-loading.mjs` reproduce la espera del backend y el refresco posterior a movimientos, sin realizar pagos ni acceder a datos personales.

## Alcance y preservación
Modificados exclusivamente módulos JS de MI ALQUILER y pipeline CI. No se cambia ningún RPC, saldo, tabla, migración, Auth, dominio ni el código de los otros tres sistemas. Aplicar solo en rama de integración; preservar PR #31 como borrador hasta E2E. Pruebas bancarias y autenticación real siguen pendientes.
