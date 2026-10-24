# Parte 4/7 — Corrección aplicada en STAGING

Migración ejecutada en STAGING: `parte4_recompensas_reseller_vigencia_staging`.

## Hallazgo
La restricción anterior de `public.cc_market_seller_roles.role` solo permitía `ADMIN` y `SUPER_RESELLER`. Impedía reconocer a un RESELLER normal para acreditar S/5.

## Corrección
- `cc_market_seller_roles.role`: ahora permite `ADMIN`, `RESELLER` y `SUPER_RESELLER`.
- Se añadió `valid_until timestamptz`; un RESELLER requiere membresía activa y vigencia positiva a la fecha de activación del referido.
- El SUPER RESELLER requiere `active=true`, concedido mediante flujo de autorización ADMIN.
- Se actualizó la RPC `cc_clan_credit_verified_referral`: mantiene server-only, verifica atribución, membresía y pago REAL antes del asiento, y marca PAID únicamente al concluir la transacción.
- `anon` y `authenticated` NO tienen permiso EXECUTE; `service_role` sí.

## Pendiente antes de producción
No existe aún un registro integral de activación de servicios pagada REAL en la base de datos; `cc_clan_verified_real_activations` debe ser alimentada exclusivamente por el backend de pago y activación verificados. Integrar emisión controlada de comprobantes y probar E2E, incluyendo el otorgamiento automático RESELLER tras S/25 REAL con vencimiento a 12 meses. No mover fondos reales ni activar en PROD.

Nota: las tablas de control y la RPC ya están en STAGING; esta documentación permite reproducir y revisar cambios, pero para despliegue formal todavía debe consolidarse el SQL de las migraciones del entorno.
