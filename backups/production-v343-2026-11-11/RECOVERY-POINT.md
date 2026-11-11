# CLAN CARTAN — Punto de recuperación de producción V343

Fecha de verificación: 2026-11-11 (UTC)

## Alcance y referencia exacta

- Repositorio: https://github.com/GianfrancoCg020614/CLAN-CARTAN
- Rama de producción: `main`
- Commit de producción respaldado: `360a834ec5fa2bde7adb45512808bb18bab7823c`
- Mensaje: `V343: añadir retorno visible al panel desde MI COCHERA`
- Rama de recuperación: `backup/production-v343-2026-11-11`
- Esta rama se creó directamente desde el commit exacto de producción indicado arriba. No es una rama de staging ni se usará para desarrollar.

## Cloudflare Pages

- Proyecto: `clan-cartan`
- Dominio principal: https://www.clancartan.com
- Dominio alternativo: https://clancartan.com
- Rama de producción conectada: `main`
- Deployment de producción verificado: `767d709b-d0c8-40d5-aba2-61d9affdc6e2`
- URL del deployment: https://767d709b.clan-cartan.pages.dev
- Commit desplegado: `360a834ec5fa2bde7adb45512808bb18bab7823c`
- Estado de las etapas: queued, initialize, clone_repo, build y deploy = success.

## Supabase

- Proyecto: `CLAN CARTAN`
- Project ref: `pqalxtrcyrpmwqdlibqd`
- Región: `sa-east-1`
- Estado observado: `ACTIVE_HEALTHY`
- Motor PostgreSQL: 17.11
- Última migración registrada al verificar: `20261110171713` — `allow_audited_automatic_lemon_approval_without_fake_reviewer`.

### Objetos de MI COCHERA observados

Tablas:
- `public.mc_accounts`
- `public.mc_bonus_events`
- `public.mc_carts`
- `public.mc_invitation_attributions`
- `public.mc_movements`
- `public.mc_people`
- `public.mc_real_transfer_requests`
- `public.mc_recharge_intents`
- `public.mc_stays`
- `public.mc_subscription_events`

Funciones principales observadas:
- `mc_create_cart`
- `mc_record_movement`
- `mc_change_cart_state`
- `mc_sync_rents`
- `mc_my_cart_balances_v328`
- `mc_configure_currency`
- Funciones de activación, bono, invitaciones y transferencias.

No se ejecutó SQL de modificación ni se alteraron filas, billeteras, clientes, carritos o movimientos durante esta verificación.

## Importante sobre el respaldo de base de datos

Este punto de recuperación de GitHub conserva el código y la referencia del despliegue. El inventario anterior documenta objetos de base de datos, pero NO es un dump completo de PostgreSQL ni una copia de los datos de clientes. La integración disponible no ofrece una operación para forzar/exportar aquí un backup físico completo de Supabase. Antes de cualquier cambio de esquema o datos, confirmar en Supabase Dashboard que existe un backup/PITR restaurable y exportar por el mecanismo oficial disponible para el plan del proyecto.

## Observaciones de seguridad detectadas (no modificadas)

- El asesor de Supabase reportó RLS deshabilitado en `cc_internal.lemon_assisted_settings` (nivel crítico). No se cambió automáticamente porque requiere definir políticas de acceso antes de habilitarlo.
- Los asesores también reportaron funciones SECURITY DEFINER ejecutables por roles anon/authenticated y tablas con RLS habilitado sin políticas. Deben revisarse individualmente; no se aplicaron cambios durante el respaldo.

## Regla para el siguiente trabajo

Continuar en la rama `main` y publicar directamente mediante el flujo GitHub → Cloudflare Pages → www.clancartan.com. Mantener esta rama como referencia de recuperación V343. No crear STAGING ni usar TinyFish. Cualquier cambio futuro en Supabase debe tener migración, revisión de RLS/seguridad y verificación antes de considerarse terminado.
