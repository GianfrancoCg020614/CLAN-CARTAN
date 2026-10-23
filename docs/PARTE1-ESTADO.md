# CLAN CARTAN · PARTE 1/7 · Estado de implementación

**Fecha:** 23 de octubre de 2026 (America/Lima)

**Rama de trabajo:** `feature/parte1-cuenta-registro-seguridad`

**Rama base preservada:** `feature/v163-5-integracion-segura`

**Respaldo adicional:** `respaldo/v163-5-antes-parte1-20261023`, creado desde commit `c8cc3be541d61c0968b9f1232cb72db18b40c6fe`.

## Cambios funcionales en esta parte

- Validador de registro común para la web existente y una página de pruebas independiente.
- Confirmación doble de Términos y privacidad para habilitar registro. La casilla de publicidad sigue separada, inicialmente desmarcada, revocable y **no bloquea**.
- El formulario real valida correo, nombre, documento, teléfono, ubicación, contraseña y los dos consentimientos.
- Protección contra solicitudes de registro duplicadas y recuperación del bloqueo correcto tras errores.
- Cloudflare preview informa el estado de pruebas; no permite iniciar sesión, registrar, confirmar correo, reenviar confirmación ni recuperar cuentas usando el Supabase real.
- Página de pruebas independiente `/pruebas/parte1.html` que utiliza datos ficticios y no hace solicitudes de red.
- Los cuatro negocios conservan una sola identidad mediante Supabase Auth existente; no se tocan roles ni membresías.
- Propuesta de auditoría de consentimiento inicial en `docs/sql-propuestas/parte1-consentimiento.sql` (**NO aplicada**).

## Supabase: solo auditoría de lectura, sin escritura

Proyecto real conectado: `pqalxtrcyrpmwqdlibqd`. **Sin conexión a la base de datos real para las pruebas.**

La inspección inicial encontró 6 usuarios Auth, 1 fila de preferencia publicitaria y 7 triggers de alta existentes. No se copiaron contraseñas ni datos personales.

Advertencias actuales de seguridad del linter (no solucionadas en producción):
- 3 funciones `SECURITY DEFINER` ejecutables por `anon`, requieren revisión específica.
- 66 funciones `SECURITY DEFINER` accesibles a autenticados; necesitan auditoría granular y pueden estar autorizadas.
- Protección contra contraseñas filtradas: 1 recomendación pendiente.
- 10 avisos informativos de tablas con RLS activo sin políticas, no necesariamente inseguros.

Consulta: https://supabase.com/docs/guides/database/database-linter

## Límites reales de esta entrega

- **Supabase de staging todavía no configurado**: solo existe un proyecto Supabase conectado, que también utiliza la web oficial.
- La prueba del registro es una SIMULACIÓN LOCAL de UI y reglas, sin crear cuentas.
- El servidor Auth de producción aún no tiene comprobado un hook obligatorio de consentimientos; el metadata de signup no sustituye validación de servidor.
- Turnstile y Brevo no han pasado E2E de entrega o desafío.
- Los saldos, referidos CLAN, bonos, pagos, código S/5 mensual y migración de billetera pertenecen a las siguientes partes, sin cambios financieros aquí.
- Persisten 24 escenarios E2E de MI ALQUILER por ejecutar en staging.
- **No se fusionará este PR ni se publicará en el dominio oficial sin aprobación `APROBADO, ACTUALIZAR CLAN CARTAN`.**

## Próxima puerta de calidad

- Ejecutar `node scripts/check-parte1-registro.mjs` y las pruebas de regresión existentes mediante GitHub Actions.
- Verificar despliegue Cloudflare Pages `preview` y comparar HEAD `main` antes y después.
- Probar manualmente formulario aislado en escritorio y móvil; establecer Supabase separado antes de E2E Auth.

## Verificación de código y despliegue de la Parte 1

- GitHub Actions, commit `d9695c9d61e68086117a48b87eff3fb246ddd4f6`: **SUCCESS**.
- Workflow: https://github.com/GianfrancoCg020614/CLAN-CARTAN/actions/runs/40019186015
- Cloudflare Pages preview, commit `d9695c9d61e68086117a48b87eff3fb246ddd4f6`: **SUCCESS**.
- Vista aislada (sin conexiones de red): https://6ff9bb89.clan-cartan.pages.dev/pruebas/parte1.html
- PR borrador de esta Parte 1: https://github.com/GianfrancoCg020614/CLAN-CARTAN/pull/32
- Código principal `main` comprobado sin cambios: `1119615c6aed1d9bc5ef6f2ad0af370d3128e78a`.
- **Los flujos reales de altas, OTP y consentimiento de base de datos no se han probado con staging Supabase**, porque no hay instancia separada conectada.
