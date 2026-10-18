# V110 — Código de invitado por negocio y afiliación

**Fecha de implementación:** 18-OCT-2026. **Portal:** https://www.clancartan.com/

## Reglas acordadas
- El registro general de CLAN CARTAN mantiene campos manuales y confirmación de correo con OTP de 8 dígitos.
- Campo nuevo opcional: **Código de invitado**. Ejemplos `COBRA1`, `COBRA2` o `BULL1`, `BULL2`.
- Cada persona elegible puede recibir **un código por negocio** en el que tenga membresía activa: `COBRA*` para COBRA YA (`COBRA_YA`) y `BULL*` para STREAM BULL'S (`STREAM_BULLS`).
- Categorías reconocidas por el backend: `AFFILIATE` (AFILIADO), `RESELLER`, `SUPER_RESELLER`.
- Códigos consecutivos y únicos asignados con secuencias independientes; nunca derivados del documento de identidad ni compartidos entre diferentes titulares.
- La invitación es **opcional**, y al registrarse se verifica contra el servidor; los códigos inexistentes o de afiliados inactivos se rechazan mostrando opción de dejar vacío el campo.
- El vínculo al código se registra en el servidor como `REGISTERED` al crearse una cuenta en Supabase Auth. Identifica `registered_user_id`, `inviter_user_id`, `business_id`, `code_id` y `code_snapshot`; el cliente no puede modificar libremente una atribución guardada.
- **No cambia roles, membresías, accesos, permisos, suscripciones ni saldos. No abona automáticamente ninguna comisión**. El pago de bonificaciones solo podrá habilitarse al verificar el hecho económico que corresponda y con controles adicionales.

## Esquema y procedimientos aplicados en Supabase
Migración: `v110_eligible_affiliate_invitation_codes_and_signup_attribution` en proyecto `pqalxtrcyrpmwqdlibqd`.
- Secuencias: `public.cc_invitation_cobra_seq`, `public.cc_invitation_bull_seq`.
- Tablas: `public.cc_invitation_codes` (único por usuario/negocio y código global), `public.cc_invitation_attributions` (único por nuevo usuario). RLS activo, sin permisos directos a `anon` ni `authenticated`.
- Trigger sobre `cc_memberships`: `cc_membership_invitation_issue` llama `cc_internal.issue_business_invitation()` al crear/activar membresías.
- Trigger sobre `auth.users`: `cc_signup_invitation_capture` llama `cc_internal.record_signup_invitation()` para guardar la atribución durante signup, si el código es válido y la membresía del invitador se encuentra activa.
- RPC `cc_validate_invitation_code(text)`: permite validar (sin exponer nombres, cuentas ni teléfonos de los afiliados) y devuelve solamente negocio y validez. Abierta para invitados.
- RPC `cc_my_invitation_codes()`: limitada a JWT autenticado y devuelve únicamente códigos del propio usuario con membresías activas; se usa para mostrarlos/copiar al ingresar.
- El primer código que quedó asignado al `RESELLER` activo de COBRA YA es `COBRA1`; no se crearon códigos BULL hasta que haya un afiliado autorizado activo de STREAM BULL'S.
- Pruebas SQL de validación realizadas: `COBRA1` válido y `BULL999` inválido.

## Interfaz web
- Marca de despliegue `V110-20261018` en `index.html`.
- En registro se añade campo `cc110-invite`, junto a confirmar contraseña, que acepta código en mayúsculas y puede rellenarse desde el enlace `https://www.clancartan.com/?ref=COBRA1`.
- Valida el código por RPC antes del `POST /auth/v1/signup` y lo envía en metadata `invitation_code`. El servidor verifica nuevamente el código antes de registrar la atribución.
- Una vez ingresado un usuario habilitado, aparece un área **Tus códigos de invitación** con posibilidad de copiar código o enlace propio. Un usuario sin membresía habilitada no recibe códigos todavía.
- No se modificó la función autenticada de DNI de COBRA YA ni la desactivación de la consulta pública de DNI del registro general, ni el OTP de ocho cifras.

## Seguridad y alcance pendiente de prueba
- Falta probar con una **cuenta nueva de control**, código auténtico y correo de titular autorizado, comprobando tanto OTP como la atribución guardada.
- Falta probar desde una cuenta con rol `AFFILIATE` y `SUPER_RESELLER` activa en cada negocio. No asignar roles falsos ni pagar membresías por el solo uso del código.
- Para mostrar que el referido produce comisión, será necesario definir y automatizar reglas de cobro efectivamente acreditado, no solo registro; eso NO se ejecuta en V110.
- Un código secuencial es fácil de adivinar. El propósito es atribución, no autorización ni secreto; evitar conceder privilegios por introducirlo y considerar protección anti-abuso para grandes volúmenes de registro.
- Backups de código y datos anteriores intactos; rama previa `resguardo/v109-antes-invitaciones-2026-10-18`.
