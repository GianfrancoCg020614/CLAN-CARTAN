# CLAN CARTAN V156 · Cotización Binance USDT → saldo PEN, protección contra pérdidas · PUNTO 1
Fecha: 21 OCT 2026, Perú. Repositorio: GianfrancoCg020614/CLAN-CARTAN.

## Decisión del titular
El RESELLER envía USDT a la cuenta Binance autorizada de CLAN CARTAN (ID público 1276635702). La plataforma muestra una **tabla** con cantidades USDT y estimación del saldo que se abonará en soles PEN para COBRA YA o STREAM BULL'S.

### Interfaz
- `scripts/v156-usdt-quote.js`: tabla USD*T* / PEN para 1, 5, 10, 20 y 50 USDT, más calculadora personalizable en USDT.
- Muestra cotización compradora verificada, costos de conversión %, margen protector %, tipo de cambio neto PEN/USDT y caducidad.
- Usa RPC `cc_current_usdt_pen_quote_v125` (solo cotizaciones publicadas válidas, dos minutos y volumen suficiente); nunca inventa tasa de mercado. Al no existir cotización fresca se muestran guiones y mensaje «Sin cotización vigente». No se efectúa acreditación basada en esos guiones.
- ADMIN puede publicar cotización observada y comprobable mediante `cc_admin_publish_usdt_pen_quote`, con oferta ejecutable y referencia, mínimo 0.25 % de costos y 2 % de protección. No se fuerza tasa 1 USDT = 1 USD ni tasa USD/PEN sin observar realmente un comprador de USDT.
- Se integró el nuevo script en el portal desde `scripts/patch-v152-cobra.mjs`, con cache-busting V156 para QR manual; workflow `publicar-v145.yml` y chequeo `check-v156-usdt.mjs`.
- Cuenta personal Binance NO equivale a Merchant; se conserva opción personal con función bloqueada en producción hasta tener autorización verificable.

### Circuito de notificación
- `cc_notify_binance_personal_usdt` registra monto **original USDT** y el saldo PEN meramente estimado más la tasa y referencia. Rechaza si no existe autorización comercial vigente y oferta ejecutable fresca.
- Botón `YA PAGUÉ` distingue monto USDT de monto PEN al elegir Binance; WhatsApp envía ambas magnitudes claramente, y estado sigue PENDING hasta verificación.
- Cola ADMIN `cc_admin_manual_notification_queue_v156` muestra cantidad USDT enviada y soles estimados; permite abrir panel seguro para liquidación verificada.
- Avisos se marcan VERIFIED al cotejar ID y USDT realmente recibidos, aunque el PEN neto liquidado resulte inferior a la previsión.

### Restricción de no pérdidas y datos reales
- Se conserva V153 antirrepetición global de referencia de pago.
- `cc_binance_personal_policy.commercial_authorized` permanece FALSE, de manera que nadie puede usar la cuenta personal para activar cobros comerciales sin autorización.
- La acreditación de USDT se tramita solo por `cc_admin_credit_verified_binance_personal`, exige ADMIN y comprobación de ingreso USDT real **Y conversión real a PEN**, ambos con referencias únicas, tasa protegida válida, oferta suficiente y datos auditados.
- El monto acreditado se calcula como el menor entre (USDT * cotización neta, truncado a 2 decimales) y el saldo PEN **neto realmente liquidado** tras costos. Así el sistema no permite acreditar por encima de lo efectivamente obtenido y reduce el riesgo contable de una conversión desfavorable. Requiere que ADMIN verifique los movimientos externos; no se puede garantizar un margen en cualquier mercado futuro.
- El RPC anterior `cc_admin_credit_verified_personal_payment` ya no puede acreditar Binance sin los campos de liquidación nuevos (trigger de control); permanece para Lemon/DALE PEN.
- `cc_admin_verified_personal_topups` conserva cotización, USDT, liquidación real, referencias y auditoría.

### Fallo corregido
La función preexistente `cc_admin_publish_usdt_pen_quote` usaba operador + para concatenar texto PostgreSQL, bloqueando cotizaciones. V156.2 lo corrigió por `||`.

### Pruebas técnicas ejecutadas y revertidas
- Bajo BEGIN/ROLLBACK simulación administrativa con oferta **HIPOTÉTICA** de S/3.70 PEN/USDT, costos 1.5 % y margen 3 % → tasa neta S/3.5335 por USDT (NO es precio de mercado real).
- RESELLER simulado declaró 5 USDT, tabla calculó **S/17.66** referenciales.
- ADMIN simulado confirmó 5 USDT y PEN netos liquidados hipotéticos S/17: saldo acreditado S/17, referencia única, registro en auditoría, aviso VERIFIED.
- Sin permiso comercial, los avisos y créditos Binance son rechazados.
- Después del ROLLBACK no quedó cotización, saldo, movimiento, permiso ni depósito ficticio. Se verificará de nuevo al cerrar la entrega.
- El workflow CI valida scripts y funciones antes de publicación.

## Continuidad PUNTO 1
1. Verificar autorización comercial real para recibir pagos por QR personal o migrar a Binance Merchant.
2. Publicar por ADMIN una **oferta real ejecutable** comprobada (sin datos privados) y costos verificables, y comprobar tabla de conversión en web.
3. RESELLER efectúa recarga real y ADMIN verifica recepción USDT y conversión PEN neta antes de acreditar. No usar el QR antes de confirmar autorización.
4. Comprobar saldo, contabilidad, auditoría, trazabilidad e idempotencia de la operación real.
5. ÚNICAMENTE después declarar PUNTO 1 finalizado. El PUNTO 2 (suscripción comercial S/15) continúa desactivado.

Se mantienen roles ADMIN/RESELLER, préstamo entre particulares pagado directamente al prestamista, y bono gratuito exclusivo COBRA YA intransferible.
