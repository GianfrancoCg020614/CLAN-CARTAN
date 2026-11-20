# V398 — soporte humano y apariencia

## Cambio

Soporte interno con las cuentas existentes: consultas por motivo y negocio, búsqueda por nombre/asunto/código, pendientes/solucionadas, conversación cliente/ADMIN, reapertura y capturas privadas PNG/JPG/WebP (5 MB). No hay IA ni indicador ficticio de agentes conectados. ADMIN abre la bandeja desde «Soporte humano» en su panel. El cliente ve únicamente sus consultas.

Preferencia día/noche compartida con el inicio y los cuatro negocios, guardada con la clave existente `cc164-theme`. Paletas suaves, controles accesibles y formularios existentes. MI ALQUILER incorpora ocupación/disponibilidad reales y accesos a sus operaciones existentes. Las salidas principales de los cuatro negocios vuelven al inicio público sin cerrar sesión; las X de formularios conservan la vista de origen.

## Datos y permisos

Migración aditiva `20261120062023_human_support_v398.sql`. Aplicada en el proyecto existente, sin modificar tablas financieras, registros anteriores, Auth ni reglas de activación.

Dos tablas privadas en `cc_internal`, RLS habilitado y sin lectura/escritura directa para clientes. La API pública usa SECURITY INVOKER y llama a implementación privada con validación explícita de `auth.uid()` y ADMIN según `cc_admins`. Sin autorización basada en user_metadata. Los avisos INFO «RLS sin políticas» de estas tablas privadas son intencionados: acceso directo denegado y operaciones autorizadas únicamente por función. Referencia: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

Bucket `cc-support398` privado, políticas de lectura/subida restringidas al dueño de la consulta o ADMIN. Sin reemplazar ni borrar adjuntos históricos. Enlaces de lectura firmados por 60 segundos. El soporte no requiere activación vigente para poder pedir ayuda con una renovación.

Mensajes e inicio de consultas usan UUID de solicitud único y bloqueos por consulta para reintentos simultáneos. Paginación de consultas (20) y mensajes (50), actualización de conversación cada 10 segundos sólo si está visible. Adjuntar/descargar nunca genera movimientos financieros.

## Verificación

- Migración completa desde cero y suite SQL en PostgreSQL local; fixtures sintéticos, sin operaciones de clientes.
- Aislamiento entre dos propietarios, acceso ADMIN, lectura/escritura no autorizada denegada, historial de estados, reintentos y acceso privado a adjuntos.
- Ocho solicitudes simultáneas idénticas: una consulta y un mensaje.
- Navegador con interfaz real local y RPC sobre PostgreSQL local: cliente/ADMIN, creación, respuesta, resolución, reapertura, texto escapado, respuesta perdida y reintento sin duplicación, captura y cierre. PC/390/320.
- Storage HTTP simulado en pruebas de adjuntos; políticas verificadas en PostgreSQL. No se hizo una conversación ni subida con una cuenta real de producción.
- Navegación: 14 casos, ambos modos en los cuatro negocios; sesión conservada, formularios y regreso al inicio.
- MI ALQUILER: suite existente con datos/monedas/formularios/búsqueda/exportaciones/activación, tres tamaños.
- STREAM: 39 casos de roles y regresión mediante HTTP local. El ejecutor adicional standalone file:// no terminó en este entorno; las mismas fixtures sí pasaron mediante HTTP.
- Preferencia visual: sistema operativo, elección explícita, recarga, sincronización entre pestañas y almacenamiento local bloqueado.
- Sintaxis de scripts y 13 bloques inline; diff sin errores de espacios.
- Producción: RLS, privilegios, wrapper invoker, bucket privado y dos políticas comprobados; petición anónima a soporte rechazada (401).

Las capturas en `artifacts/v398` son capturas reales de Chromium local con datos sintéticos, no imágenes generadas ni cuentas de clientes de producción.

## Reproducir soporte local

Usar una base desechable en un Postgres existente con roles `anon` y `authenticated`:

1. Aplicar `tests/fixtures/support398.sql` solamente en esa base local.
2. Aplicar la migración V398.
3. Ejecutar `scripts/test-v398-support.sql`.
4. Servir el repositorio por HTTP en 127.0.0.1:8000. `python scripts/test-v398-support-browser.py` usa `docker exec cobra-v371-test` y base `support398test`; adaptar esos nombres a la máquina local.
5. `python scripts/test-v398-theme-browser.py` comprueba persistencia de apariencia.

## Respaldo y reversión

Respaldo Git completo verificado: `/workspace/clan-before-day-night-v398.bundle`, base `3345878de66dfe28da9798d2c09a4b4bc75f4a17`. No se modificaron datos previos. Se comprobó que main seguía en esa revisión antes de publicar.

Para revertir: revertir el commit V398 en main y publicar por el flujo existente de Cloudflare Pages. Conservar tablas, mensajes y bucket. Si se necesita detener sólo la API, revocar EXECUTE de `public.cc_support398(text,jsonb)` a authenticated y conservar el historial; restaurar ese GRANT para reactivarla. No borrar tablas ni archivos de soporte.

## Comprobación por el propietario

Iniciar sesión → «Soporte humano» → Nueva consulta. En ADMIN, abrir «Soporte humano», buscarla, responder y marcar solucionada. Desde la cuenta cliente, revisar respuesta, adjuntar una captura y confirmar reapertura. Verificar día/noche y «Volver a CLAN CARTAN» en cada negocio.

Limitaciones: atención humana asíncrona (sin promesa de horario); sin notas de voz ni asistente IA. La validación con dos sesiones reales y Storage real queda para el propietario; no se utilizaron credenciales ajenas ni se enviaron mensajes a clientes.
