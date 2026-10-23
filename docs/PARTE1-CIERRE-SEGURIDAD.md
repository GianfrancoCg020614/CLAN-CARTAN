# CLAN CARTAN · Parte 1/7 — control de aceptación del registro

**Fecha:** 23 de octubre de 2026 · **Proyecto oficial:** `pqalxtrcyrpmwqdlibqd`.
**Staging independiente:** `szcplebbqhtcgxhvmxdv` en organización CLAN CARTAN; creación cotizada por Supabase en **US$ 0/mes**.

## Producción web
El formulario ya fue publicado vía PR #33, commit `f6db47014efd139008805805222444e854cfe8e9`. Conserva usuario existente, inicio de sesión, recuperación, OTP, negocio y finanzas. 
- Dos aceptaciones requeridas: Términos y tratamiento necesario de datos.
- Publicidad voluntaria, inicialmente desmarcada, con revocación en perfil.
- No se habilita el botón Registrar si no se marcan ambas aceptaciones.
- Validación compartida de correo, nombre, documento, teléfono, región, distrito y contraseña (mínimo 12 caracteres).
- Previene solicitudes de alta duplicadas.

## Staging de Supabase
Se crearon y ejecutaron dos migraciones **solo en staging**, sin importar datos personales de la web oficial:
1. `docs/sql-propuestas/parte1-before-user-created.sql`: validación previa de versiones, privacidad y términos; no exige consentimiento comercial.
2. `docs/sql-propuestas/parte1-consent-audit-and-guard.sql`: trigger BEFORE INSERT en `auth.users`; tabla `cc_part1_legal_consents` inmutable para el usuario, con RLS y vista de sus propias declaraciones; trigger AFTER INSERT para captura.

Prueba transaccional ejecutada en staging: alta sin declaración rechazada, alta con dos aceptaciones permitida, constancia grabada y conservada solo el tiempo necesario. La prueba terminó con **0 usuarios de prueba y 0 filas de consentimiento de prueba**.

## Automatización de calidad
- `scripts/check-parte1-produccion.mjs`: regresión del frontend y compatibilidad con login, OTP, recuperación.
- `scripts/check-parte1-backend.sql`: 14 casos del validador y privilegios en PostgreSQL efímero de GitHub Actions.
- `scripts/check-parte1-auth-local.mjs`: altas, login, recuperación, rechazo de altas sin aceptación, RLS y constancia con Supabase CLI LOCAL; GitHub Actions.
- `docs/sql-propuestas/parte1-rollback.sql`: revertir únicamente los triggers nuevos, sin borrar datos ni tocar registros existentes.

## Seguridad
- Nunca conceder roles desde `raw_user_meta_data`. Los consentimientos declarados son evidencia operativa de declaración inicial, no equivalen a prueba legal de lectura.
- La tabla de consentimiento debe permitir SELECT solo al titular vía RLS. No concede INSERT/UPDATE/DELETE al usuario.
- La lógica de bloqueo solo se activa en nuevas inserciones en `auth.users`, no altera contraseñas, sesiones ni cuentas existentes.
- El control oficial Supabase **Before User Created Hook** puede usarse en vez del trigger de compatibilidad cuando se gestione su configuración desde el panel: no activar ambos como dos reglas distintas. Los dos han de usar la misma validación.
- El SQL propuesto es idempotente y tiene rollback explícito. No eliminar historial de consentimiento al revertir triggers.
- Para revisar notificaciones por correo y CAPTCHA se requieren pruebas con proveedores y claves de producción; no atribuirles validación externa sin evidencia.

## Criterio de cierre
La Parte 1 se podrá dar por terminada cuando, además del frontend oficial:
- Supabase en producción tenga las dos validaciones instaladas y auditadas.
- GitHub Actions pase los tests SQL y Supabase Auth local.
- Cloudflare Pages despliegue `main` sin errores.
- Sea posible verificar que no se alteraron usuarios y saldos existentes.
- Se comunique explícitamente cualquier prueba del proveedor OTP o Turnstile que siga sin completar.

La Parte 2 queda a continuación: código CLAN universal, conservación de aliases de referido y registro de atribución; no activar pagos de S/5 antes de su Parte 4.
