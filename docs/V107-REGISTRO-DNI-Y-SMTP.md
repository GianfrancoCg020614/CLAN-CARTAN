> **HISTÓRICO, REVERSIÓN APLICADA EN V108:** el usuario indicó que la consulta DNI corresponde **únicamente a COBRA YA**. Los cambios de registro público que describe V107 fueron revertidos y la Edge Function pública se deshabilitó (HTTP 410). Véase [V108 manual](V108-REGISTRO-CLANCARTAN-MANUAL.md). No seguir estas instrucciones V107 para producción.

# CLAN CARTAN V107 — DNI primero en registro público

**Fecha:** 18-OCT-2026 (UTC). **Producción:** https://www.clancartan.com/

## Cambios aplicados
- Portal `index.html` con `cc-deploy-version=V107-20261018`: registro de CLAN CARTAN comienza por DNI (Perú seleccionado por defecto), autorización expresa y autocompletado de nombres.
- Cuando se ingresan los 8 dígitos y se marca autorización, el navegador consulta `cc-dni-registro` sin exigir sesión previa, con espera de 650 ms para evitar llamadas accidentales. El usuario debe comprobar el nombre devuelto.
- Documentos extranjeros u otros tipos de documentos conservan la entrada manual. Si proveedor falla, se agota el cupo o se supera la tasa por red, el nombre se ingresa manualmente.
- Después del DNI se solicitan país, moneda, ubicación, WhatsApp (no obligatorio), correo electrónico (obligatorio para cuenta y OTP) y contraseña. **API Perú NO devuelve correo, teléfono ni dirección**.
- Correo/contraseña se sitúan dentro del formulario de registro y vuelven a la cabecera en modo inicio de sesión. Mantener comportamiento de una sola cuenta para COBRA YA y STREAM BULL'S.
- Se añadieron textos específicos para orientar al usuario si falla el envío SMTP.

## Backend Supabase
- Nueva Edge Function `cc-dni-registro`, versión 2 en Supabase con `verify_jwt=false` únicamente para este flujo sin sesión. Código fuente versionado en `supabase/functions/cc-dni-registro/index.ts`.
- Permite solo orígenes `www.clancartan.com`, `clancartan.com` y respaldo `clan-cartan.pages.dev`; valida DNI 8 dígitos y consentimiento `true`. Orígenes HTTP externos se rechazan.
- Usa `APIPERU_TOKEN` y `SUPABASE_SERVICE_ROLE_KEY` dentro del servidor, nunca se entrega el token al navegador ni se guarda en GitHub.
- Tabla `public.cc_public_dni_rate_limit` con RLS habilitado y sin permisos de lectura para `anon` ni `authenticated`: solo registra un HMAC de la dirección de red, nunca el IP en claro ni un DNI o nombre.
- Función RPC `cc_claim_public_dni_quota` exclusiva de `service_role`; hasta **2 consultas por dirección de red cada 24 horas** y **100 consultas totales mensuales** compartidas con la consulta DNI de clientes en COBRA YA. Reservas atómicas, incluidas fallidas para no exceder presupuesto.
- Servicio externo `POST https://api.apiperu.dev/dni`. Responde solo con nombre completo (si existe), evita registrar datos del DNI y maneja la falta de disponibilidad de forma manual.
- **Seguridad antes de ampliar a público:** añadir verificación anti-bot (Cloudflare Turnstile validado desde servidor) y política de consultas legítimas / transparencia de protección de datos. CORS y límites IP no equivalen a autenticación de identidad.

## Diagnóstico del error de registro del 18-OCT-2026
- En `Supabase > Auth logs` la petición de creación de cuenta `POST /signup` devolvió `500` por **`535 5.7.8 Authentication failed`** del servidor SMTP. Eso indica fallo en credenciales SMTP, no error del DNI ni de la plantilla `{{ .Token }}`.
- **Acción humana requerida:** en Supabase Authentication > SMTP Settings, comprobar usuario SMTP de Brevo y reemplazar la contraseña por una **clave SMTP de Brevo** actual, NO API key general, NO APIPERU_TOKEN, NO contraseña de inicio de sesión; guardar y probar con un correo autorizado.
- No consultar un DNI de terceros ni enviar emails sin autorización. No reintentar sistemáticamente mientras SMTP falla; puede crear registros pendientes y agotar límites.

## Confirmaciones pendientes
- GitHub Actions validación y publicación del `index.html` marcado V107; comprobar sitio en navegador sin caché.
- **No se ha realizado una consulta DNI real con titular autorizado** ni un envío OTP de extremo a extremo tras la modificación.
- No se han borrado cuentas, clientes, préstamos, billeteras, cuotas ni snapshots. Rama anterior: `resguardo/v106-antes-registro-dni-2026-10-18`.
