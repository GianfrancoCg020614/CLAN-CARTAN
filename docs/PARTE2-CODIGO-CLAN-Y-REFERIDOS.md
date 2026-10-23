# CLAN CARTAN · PARTE 2/7 — Único código CLAN y compatibilidad

**Alcance:** Una cuenta por usuario, un código `CLANn` permanente y único. Sin otorgar S/ 5 ni activar plataformas, sin pagos ni movimiento de fondos.

## Nuevo comportamiento
- Usuarios anteriores reciben `CLAN1`, `CLAN2`, ... en orden estable de creación; la secuencia continúa automáticamente para las nuevas altas.
- URL única para los cuatro negocios: `https://www.clancartan.com/?ref=CLAN1#registro`.
- El registro valida el código exclusivamente en Supabase mediante `cc_clan_validate_code` antes de crear el usuario. También acepta COBRA/BULL/COCHERA/ALQUILER históricos.
- Cada usuario conserva su código en `cc_clan_codes`. Tabla RLS con lectura solo por propietario. La atribución se guarda una sola vez al **crear** el usuario, no desde `raw_user_meta_data` después del registro.
- `cc_clan_attributions` tiene un `PRIMARY KEY (referred_user_id)`, no admite autoreferido ni ediciones desde el cliente.
- `cc_clan_legacy_aliases` conserva los códigos anteriores como alias, asociados al mismo propietario; sus tablas y funciones originales permanecen.
- Para atribuciones históricas duplicadas, se conserva la primera atribución registrada y las discrepancias se guardan en `cc_clan_attribution_conflicts` con acceso cerrado, nunca se reasignan invitados silenciosamente.
- El panel `Mis referidos CLAN` muestra código, copiar, compartir, número de invitaciones y últimas fechas sin exponer correos ni documentos de referidos.
- Las recompensas **S/ 5 por referido y mes** solo se aplicarán en Parte 4, tras activación o renovación totalmente descontada de saldo REAL verificado. Máximo S/ 5 por cada referido/mes; si no activa no hay premio.
- Los bonos ADMIN/bienvenida se reservan a activaciones de COBRA YA, MI COCHERA y MI ALQUILER; jamás STREAM BULL'S.

## Datos históricos preservados
La emisión de códigos históricos de COBRA/BULL y de cuentas de MI COCHERA/MI ALQUILER se conserva internamente como compatibilidad, aunque ya no aparecen como códigos recomendados en el panel central. No se modifican credenciales, membresías, dinero ni reglas de cobro.

## Seguridad y pruebas
- SQL `supabase/migrations/20261023225000_v172_clan_global_referrals.sql`.
- Pruebas de frontend `node scripts/check-v172-clan.mjs`.
- Prueba de integración con Supabase Auth local `bash scripts/parte2-start-local.sh`: registrar, autenticar, verificar CLAN, vincular referido, probar RLS e impedir cambios.
- CI `.github/workflows/probar-parte2-clan.yml` y regresión de portal.
- Migración primero en proyecto **`szcplebbqhtcgxhvmxdv` (staging)**. No copiar registros personales ni saldos reales a staging.
- Producción `pqalxtrcyrpmwqdlibqd`: solo tras aprobar CI, comprobar alias y función de alta en staging, respaldar commit y verificar saldos/usuarios.

## Reversión
El rollback no debe borrar la nueva tabla de códigos ni las atribuciones. Desactivar únicamente triggers propios y revertir el frontend usando `respaldo/main-antes-parte2-20261023`. Archivo: `docs/sql-propuestas/parte2-clan-rollback.sql`.

## Limitaciones explícitas
- La opción MI ALQUILER en el registro indica interés; el módulo completo no se publica en esta parte.
- El resumen muestra inscritos por código: aún no indica activaciones ni ingresos, pues eso requiere la Parte 4.
- Los enlaces antiguos funcionan como alias, pero la emisión interna de códigos legacy puede continuar mientras existen sistemas antiguos; solo el código CLAN se presenta al usuario.
- Las funciones de validación públicas devuelven solo validez y nombre genérico, sin revelar identidad del invitador. Deben auditarse posibles abusos por automatización para el crecimiento del portal.
