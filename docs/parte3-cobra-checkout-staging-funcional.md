# COBRA YA — checkout autenticado en STAGING (Parte 3/7)

**Implementado el 24-10-2026 únicamente en STAGING** Supabase `szcplebbqhtcgxhvmxdv`. Nada de esta funcionalidad modifica la producción.

## Arquitectura funcional nueva

1. La página de ensayo `/staging/cobra-ya.html` abre Supabase Auth del **proyecto STAGING**; no reutiliza sesiones del proyecto PROD.
2. Los saldos REAL y bono COBRA YA se consultan con el JWT del usuario y políticas RLS de lectura propia.
3. El botón genera un UUIDv4 inmutable y llama a `/functions/v1/cc-clan-cobra-checkout` con `funding=REAL|ACTIVATION_BONUS`. **NO** envía `user_id`, precio, rol, referencia de entrega ni key secreta.
4. La Edge Function verifica el token con `/auth/v1/user`, toma **el ID desde la respuesta verificada**, y llama a `cc_clan_cobra_checkout_staging` usando privilegios reservados al servidor.
5. La función SQL valida que no hay suscripción activa, inserta una constancia de acceso interno, debita exactamente S/ 15 de REAL o bono COBRA y crea periodo de acceso de 30 días **en una única transacción**. Un error revierte TODO, incluida la constancia. Bloqueo por usuario y UUID de solicitud garantizan idempotencia y evitan suscripciones simultáneas duplicadas.
6. Una activación REAL dispara regla de referido (S/ 5 como máximo una vez por invitador/referido/mes), según permisos del invitador; una activación con bono no paga comisión.
7. La lectura de `cc_clan_cobra_access_periods` está autorizada únicamente para su propietario mediante RLS; la mutación solo para service_role. No se habilita la función SQL al navegador.

## Pruebas ejecutadas con BEGIN / ROLLBACK en la base STAGING

- Sin dinero no se debita ni deja una constancia de entrega huérfana.
- S/ 30 REAL -> activación COBRA S/ 15 -> saldo S/ 15, 30 días de acceso.
- Reintentar mismo UUID -> mismo vencimiento, ningún segundo descuento.
- Nuevo UUID durante suscripción vigente -> rechazado sin segundo descuento.
- S/ 20 bono COBRA -> activación S/ 15 -> bono restante S/ 5 sin comisión.
- Referido RESELLER elegible: primera activación COBRA REAL genera S/ 5; otra activación REAL en MI ALQUILER en el mismo mes no duplica bono.
- ROLLBACK dejó 0 usuarios simulados y 0 accesos ficticios permanentes.
- `anon` y `authenticated` NO pueden ejecutar la RPC monetaria directamente.
- Las pruebas unitarias del cliente están incluidas en CI y `node --test`.

## Importante: NO es integración productiva de COBRA YA

El módulo principal histórico todavía utiliza `cc_pay_cobra_subscription_real`, `cc_activate_cobra_welcome_bonus` y `cy_subscription_status` del proyecto PROD. `cy_clients`, `cy_loans` y sus políticas de acceso NO se trasladaron a STAGING, así que el nuevo periodo `cc_clan_cobra_access_periods` es **un derecho de acceso al laboratorio**, NO habilita todavía los formularios y operaciones reales del COBRA YA original.

Para conectar la aplicación completa es necesario portar el esquema y la lógica COBRA a STAGING, unificar su verificación de vigencia con la nueva tabla (sin tocar PROD), y correr una prueba desde el navegador con un usuario STAGING real y fondos de prueba validados por ADMIN.

La verificación de petición HTTP con JWT auténtico de un usuario de pruebas no se realizó en esta sesión, porque no se dispone de sus credenciales en el entorno; nunca registrar tokens ni contraseñas en GitHub.

## Controles

- El endpoint `cc-clan-cobra-checkout` tiene `verify_jwt=false` en la pasarela de Edge **porque valida cada JWT contra Supabase Auth dentro de la función**. Las solicitudes sin sesión verificada se rechazan.
- El servidor rechaza Origins externos al dominio de previews de CLAN CARTAN (y localhost de desarrollo). CORS no reemplaza la verificación del JWT.
- Las claves service_role permanecen exclusivas de Edge Function; la única clave incluida en la vista web es la PUBLICABLE de STAGING.
- No incorporar claves de PROD ni crear fondos REAL de producción para ensayos.
