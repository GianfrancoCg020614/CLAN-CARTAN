# CLAN CARTAN — continuidad V143 (19-10-2026)

## Implementado en Supabase
- Bono gratuito ADMIN en `cc_admin_promo_grants` con idempotencia por referencia, permisos ADMIN y destinatario RESELLER.
- Bono separado en `cc_cobra_welcome_bonus_wallets`, **no** en `cc_real_service_wallets`; el saldo es exclusivo de activación COBRA YA y no puede transferirse a STREAM BULL'S.
- Activación mediante `cc_activate_cobra_welcome_bonus()`, 15 PEN de bono y 30 días, sin crear un pago de dinero real ni comisión de referido. `cc_cobra_welcome_bonus_activations` registra estas activaciones.
- Controles de acceso `cc_internal.cobra_entitled`, `cc_internal.require_cobra_payment_for_approval` y `cy_subscription_status` adaptados a este período.
- `cc_admin_financial_summary()` distingue efectivo recibido por recargas verificadas, bonos asignados, bonos consumidos, consumos de servicios, devoluciones y saldos reales pendientes. No equiparar recargas con utilidad neta ni con factura.

## Integración interfaz en scripts/v136-manual-recharges.js
- ADMIN: formulario para bono de bienvenida, importe, correo y motivo. Confirmación y referencia única por operación.
- ADMIN: panel de resumen financiero consultado desde Supabase.
- RESELLER: botón para activar con bono de S/15, con confirmación explícita.
- Se conserva ADMIN de verificación manual de recargas. Continúa sujeto a autorización comercial y verificación del depósito.

## No afirmar como completado
- Se preservan datos históricos de prueba; el usuario decidirá cuándo eliminarlos. No transformar registros DEMO en ingresos reales.
- Se debe localizar y retirar DEMO de otras pantallas de producción sin cambiar origen/estatus de datos históricos.
- Cloudflare Pages, navegador móvil, casos E2E de permisos y pago real no se han validado.
- No habilitar recargas Lemon/DALE o Binance sin integración autorizada y confirmación genuina del proveedor.
- Contabilidad presentada es resumen operativo, no ganancia fiscal calculada ni documento SUNAT.
- No marcar todo V143 como publicado hasta comprobar versión real en www.clancartan.com.

## Restricciones permanentes
Sin retiros, sin pago de préstamos ajenos con billeteras, sin transferencias entre usuarios. Únicamente saldo real del mismo usuario puede moverse entre COBRA YA y STREAM BULL'S. Bono gratuito jamás se transfiere ni genera S/5 de referido.
