# CLAN CARTAN — Continuidad V146 (19-10-2026)

## Solicitud vigente
El titular quiere utilizar temporalmente **su QR personal de Binance Pay**, con una modalidad de **recargas manuales verificadas por ADMIN**, mientras recibe la aprobación de su cuenta empresarial. La integración automática Lemon/DALE y Binance se mantiene en el proyecto para más adelante. No borrar ni sustituir las funciones automáticas existentes.

**Falta material esencial: aún NO existe en el repositorio un QR personal Binance suministrado por el titular.** El recurso reservado es `assets/qr-binance-personal.png`. No inventar QR, Pay ID, destinatario ni capacidad de recarga automática. Cuando el usuario envíe el QR, verificar que corresponda a Binance Pay y agregar exactamente la imagen autorizada.

## Desarrollo aplicado a Supabase
- `cc_admin_verified_personal_topups`: registro inmutable por aplicación, destinado a recibos verificados por ADMIN. Unicidad de referencia por método, importe real recibido (PEN o USDT), tasa PEN/USDT, importe acreditado en PEN, destinatario, negocio y fecha.
- `cc_admin_credit_verified_personal_payment()`: solo ADMIN autentificado; obliga a confirmar recepción real, verifica destinatario, evita autocargas y duplicados, valida tasa e importe; credita billetera real atómicamente y produce auditoría financiera. No crea depósitos ni ejecuta pagos.
- Resumen `cc_admin_financial_summary()` y detalle `cc_admin_financial_events()` incluyen recargas personales confirmadas. Se muestran como entradas o equivalentes recibidos, **no como utilidad neta**, y separadas de bonos gratuitos.
- No se alteró `cc_cobra_real_payment_settings.enabled=false` ni habilitación de Binance Merchant automática; continúa la validación comercial pendiente.
- Cero transacciones de prueba creadas durante V146.

## Web
- `scripts/v146-personal-manual-topups.js` integra panel ADMIN de pago confirmado Binance personal USDT y Lemon personal PEN.
- Incorpora tarjeta Binance personal que solo muestra QR si el archivo real existe. Si falta, advierte al cliente que no debe enviar fondos.
- El portal `index.html` se actualiza mediante `scripts/patch-v145-production.mjs` y workflow `publicar-v145.yml`; versión visible V146 tras resultado exitoso.

## Reglas
- El QR personal nunca será presentado como Binance Merchant empresarial.
- ADMIN debe cotejar el depósito en la cuenta receptora antes de dar saldo. Las capturas no bastan.
- No retiros, pagos de préstamos con billeteras, ni transferencias entre distintos usuarios.
- Mantener saldos gratuitos COBRA YA restringidos exclusivamente para activación; nunca pueden ir a STREAM BULL'S.
- Conservar datos históricos, incluidos DEMO, hasta autorización expresa de borrado.
- Revisar condiciones de Binance y obligaciones contables/tributarias antes de destinar una cuenta personal a recepción habitual de pagos empresariales.

## Pendientes verificables
Obtener la imagen real del QR personal Binance Pay del titular y publicarla; realizar prueba autenticada de ADMIN y cliente sin crear pago ficticio; comprobar CI/Cloudflare. La activación con saldo real de COBRA YA continúa bloqueada por `enabled=false` de pagos comerciales y requiere resolución controlada; no afirmar lanzamiento completo por existir el nuevo panel manual.
