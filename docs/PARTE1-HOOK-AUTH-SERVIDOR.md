# Parte 1: consentimiento necesario en el servidor (preparación y pruebas aisladas)

## ¿Por qué se necesita?
El registro oficial ya solicita Términos y privacidad por separado, pero el navegador es controlado por el usuario. Para que un acceso directo al endpoint Auth no evite estas declaraciones se recomienda el **Before User Created Hook** oficial de Supabase.

Referencia de producto: https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook

## Archivos
- `docs/sql-propuestas/parte1-before-user-created.sql`: función Postgres pura y permisos limitados.
- `scripts/check-parte1-backend.sql`: 14 verificaciones, incluido acceso por roles, sin cuentas reales.
- `.github/workflows/probar-parte1-auth.yml`: ejecuta la propuesta en un Postgres **efímero de CI**, no en Supabase conectado.

## Requisitos para habilitarla en Auth real
1. Disponer de Supabase staging aislado (obligatorio antes de tocar proyecto real).
2. Aplicar SQL en staging y verificar hook vía API Auth real, confirmación de email, OTP, login y recuperación; evaluar compatibilidad con alta por invitación y proveedores externos.
3. Configurar `[auth.hook.before_user_created]` con URI `pg-functions://postgres/cc_internal/cc_part1_before_user_created` en staging; en producción utilizar la configuración de Auth Hooks del panel una vez aprobada.
4. Guardar evidencia de pruebas y el estado previo de la configuración para rollback.
5. Validar que correos Brevo y desafíos Turnstile estén correctamente configurados si se habilitan.
6. Aplicar exclusivamente después de aprobación y backup de esquema; no instalar configuraciones de hook no verificadas.

## Alcance
- Publicidad sigue voluntaria; el hook solo exige `legal_accepted` y `data_processing_accepted`, y sus versiones oficiales exactas.
- Rechaza declaraciones falsas o ausentes con error 422. No almacena datos personales por sí mismo, ni modifica contraseñas ni saldos.
- El usuario puede editar user_metadata después; nunca utilizarla como autorización ni como prueba invulnerable de haber leído los textos.
- Es necesario un **registro de auditoría inmutable y con acceso restringido** si se exige una evidencia de consentimiento fuerte; el flujo histórico `cc_user_details.accepted_at` y `cc_marketing_consent_history` ya conserva algunas declaraciones iniciales.
- **Estado**: diseñado/probado en CI aislada, pendiente de pruebas de API Auth real en staging e instalación. No afirmar servidor activo porque no lo está.

## Coste de staging
Supabase informó un coste de **US$ 0,01344 por hora** por rama de desarrollo. La autorización expresa del coste aún debe confirmarse antes de crear esa rama. Sin esta autorización, la CI temporal de Postgres no genera coste de rama Supabase y no toca su base real.

## Integración oficial
El frontend de Parte 1 ya está publicado en `main` con SHA `f6db47014efd139008805805222444e854cfe8e9`. Este PR agrega exclusivamente controles preparados y pruebas técnicas sin activar nada en Auth de producción.
