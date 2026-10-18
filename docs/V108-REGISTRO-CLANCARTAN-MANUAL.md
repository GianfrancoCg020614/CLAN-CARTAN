# V108 — Registro general manual; DNI automático solo para COBRA YA

**Fecha:** 18-OCT-2026. **Portal oficial:** https://www.clancartan.com/

## Cambio solicitado por el titular
- Se revierte el flujo de V107 que pedía DNI al inicio del registro de cuenta CLAN CARTAN y consultaba API Perú antes de tener cuenta.
- `index.html` recuperado exactamente del respaldo `resguardo/v106-antes-registro-dni-2026-10-18`, salvo el cambio de marca de despliegue a `V108-20261018`.
- En CLAN CARTAN, las personas vuelven a completar manualmente el formulario original de registro (nombre completo, país, tipo y número de documento, contacto, ubicación, correo y contraseña).
- El código de seis dígitos para confirmar el correo sigue formando parte del registro; **su entrega no se considera operativa hasta reparar el SMTP**.
- La API Perú y su autocompletado se conservan SOLO en el módulo de clientes de **COBRA YA**, que utiliza `cc-consulta-dni`, con JWT obligatorio.
- STREAM BULL'S y el acceso compartido no se modificaron.

## Cierre seguro de la consulta DNI previa al registro
- Se sustituyó el código desplegado de `cc-dni-registro` por un endpoint inerte que devuelve **HTTP 410** y `status=disabled`. Su código fuente actualizado está en `supabase/functions/cc-dni-registro/index.ts`.
- No se eliminó ninguna cuenta ni dato. Los objetos auxiliares `cc_public_dni_rate_limit` y `cc_claim_public_dni_quota` se conservan, sin uso desde que se deshabilitó el endpoint, como parte del historial técnico.
- El código de V107 previo al cambio sigue conservado en la rama `resguardo/v107-antes-reversion-formulario-2026-10-18`.
- Las cuotas API Perú y `APIPERU_TOKEN` se mantienen disponibles para COBRA YA.

## Estado del error de registro
- Supabase Auth mostró `535 5.7.8 Authentication failed` en una solicitud `POST /signup`. Es un **error de autenticación SMTP contra Brevo** y no se resuelve cambiando DNI o los campos del formulario.
- Revisar `Authentication > Emails > SMTP Settings` en Supabase y usar la **clave SMTP** válida de Brevo como contraseña; no una API key general ni la clave de inicio de sesión.
- Una vez corregido, probar registro y recepción de código de 6 dígitos con una cuenta propia. No publicar tokens ni contraseñas.

## Verificaciones y respaldo
- `scripts/check-v100.mjs` actualizado para exigir nombre ANTES del DNI en el formulario principal, no incluir `cc107consent` ni `cc-dni-registro` en la página y mantener `rpc/cy_lookup_dni_saved` de COBRA YA.
- GitHub Actions valida la sintaxis y las reglas comerciales; verificar publicación de `V108-20261018` después del despliegue.
- No se modificaron clientes, préstamos, abonos, billeteras, roles, carpetas ni snapshots de Supabase. Mantener respaldos `resguardo/v106-antes-registro-dni-2026-10-18` y `resguardo/v107-antes-reversion-formulario-2026-10-18`.
