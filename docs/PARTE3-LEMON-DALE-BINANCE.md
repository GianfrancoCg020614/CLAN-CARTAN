# PARTE 3/7 — Medios de recarga: Lemon Cash (DALE) y Binance

Decisión confirmada por el titular, 2026-10-23 (Perú).

## Billetera destino
Una sola billetera REAL CLAN CARTAN, de uso compartido en STREAM BULL'S, COBRA YA, MI COCHERA y MI ALQUILER. Los bonos de activación son separados y nunca se aceptan en STREAM BULL'S.

## Lemon Cash (DALE)
- Recibir PEN mediante cuenta Lemon Cash / DALE (número o CCI configurados exclusivamente por administrador).
- El cliente registra una solicitud de recarga y una referencia opcional **no es prueba de pago**.
- El operador coteja recepción real con el movimiento en su app/cuenta y verifica monto, fecha, titular, referencia única y no duplicación.
- Solo un backend administrativo autorizado ejecuta el crédito (RPC solo service_role) una vez confirmada la recepción externa; no entregar al navegador ni service_role ni controles de aprobación.
- En ausencia de una API transaccional pública autorizada para el comerciante, NO afirmar verificación automática. Mantener PENDING_REVIEW sin acreditar.

## Binance
- Ya existen `cc-binance-create-order` y `cc-binance-pay-webhook`, que están diseñadas para flujo Merchant firmado y conciliación externa. La implementación actual limita órdenes a COBRA_YA y STREAM_BULLS, rango S/1–S/10 y acredita tablas heredadas. **No habilitar ni reutilizar a ciegas como si abonasen la billetera unificada.**
- Requiere acceso real a Binance Pay Merchant y sus credenciales configuradas en servidor, no en frontend; validar orden en servidor, firma con clave pública, estado final, monto PEN contra orden original, ID de liquidación, duplicados y conversiones/conversiones reversas.
- Si la cuenta Binance disponible es personal/P2P, usar revisión manual del ingreso: nunca simular webhook Merchant.
- Cada fuente de fondos debe acreditar solo UNA vez en el nuevo libro, sin simultáneamente acreditar el viejo.

## Pendiente antes del cierre
- Configuración propietaria de cuentas receptoras, con datos sensibles solo en secretos del proveedor.
- Confirmación sobre capacidad Binance Merchant o uso personal; controles de aprobación para DALE.
- Migración de integraciones existentes y puntos UI, conciliación detallada de saldos por usuario y pruebas E2E de abonos, gastos, reintentos, reversos, concurrencia y rollback.
- No activar recargas reales ni fusionar cambios a `main` todavía.

Referencias oficiales:
- https://help.lemon.me/pe/es/articles/9400829-que-es-dale
- https://merchant.binance.com/en/docs/functionalities/webhooks
