# CLAN CARTAN — V124 · Binance Pay USDT para recargas internacionales

**Fecha:** 18-10-2026. El usuario autorizó definir recargas Binance en **USDT** y Lemon/DALE en **PEN**.

## Modelo de moneda
- DALE: ingresa PEN, importe acreditable futuro = importe confirmado en PEN, sin convertir.
- Binance Pay: se paga USDT y la billetera CLAN CARTAN guarda **equivalente PEN**.
- Fórmula: `importe_acreditable_pen = ROUND(usdt_confirmados * tasa_pen_por_usdt_congelada, 2)` (menos una comisión solo si fue informada de antemano y expresamente incluida en el presupuesto). De inicio, comisión de conversión asumida cero: no descontar tasas ocultas.
- Ejemplo EXCLUSIVAMENTE ilustrativo: 10.00 USDT × 3.70 PEN/USDT = 37.00 PEN. **No es tipo de cambio real**, no anunciarlo como cotización vigente.
- Mostrar moneda de pago (**USDT**), tasa, fuente, caducidad, importe equivalente PEN y comisión antes de que el cliente pague. Cotización definitiva queda congelada en una orden individual durante máximo 10 minutos.
- Cuando no existe tasa verificada vigente, el checkout Binance **no debe permitir crear una solicitud ni instruir un pago**. Nunca inventar un tipo de cambio ni aceptar tasas introducidas por el navegador.

## Base de datos implementada
- Migración `v124_binance_usdt_quote_no_auto_credit`.
- `cc_usdt_pen_reference_rates`: historial de tasa PEN por USDT, origen, observación y vigencia; solo un operador de servidor autorizado puede insertar o modificar tasas. Aún **no se registró cotización real**.
- `cc_real_topup_orders`: `amount_pen` es monto previsto para acreditar; `payment_currency` y `payment_amount` distinguen USDT del pago vs. PEN del saldo; conserva `quote_rate_pen_per_usdt`, `quote_source`, `quote_valid_until` y `expires_at`. Restricción SQL exige igualdad entre USDT × tasa y equivalente PEN.
- `cc_create_pending_real_topup` admite SOLO Lemon/DALE en PEN, para impedir tratar 10 USDT como S/ 10.
- `cc_current_usdt_pen_quote` informa la tasa actual únicamente cuando la fuente la actualizó recientemente.
- `cc_create_pending_usdt_topup` crea solicitudes BINANCE como `PENDING`, calcula exclusivamente en el backend, devuelve USDT, tasa, PEN y vencimiento. Limita importe, solicitudes por día y duplicación mientras otra orden siga pendiente.
- Ninguna de estas funciones mueve dinero, acredita saldo ni confirma pagos.
- Los permisos RLS impiden que los usuarios cambien cotizaciones o incrementen directamente la billetera real.

## Integración por hacer
1. Configurar fuente fiable y autorizada de USDT/PEN (cotización directa o USDT/USD × USD/PEN), con política publicada de diferencial/comisiones; comprobar consistencia y limitar desviaciones, fallos y tasas caducadas.
2. Confirmar si la cuenta Binance dispone de perfil **Binance Pay Merchant** con API oficial. El QR personal `User-f81cdb6a` no proporciona automáticamente webhooks de cobros vinculados a órdenes.
3. Implementar recepción real autenticada (webhook firmado verificable), conciliación por ID único de pedido, importe efectivamente recibido en USDT, beneficiario autorizado, caducidad y pago único. Solo entonces ejecutar acreditación atómica e idempotente.
4. Completar reglas contables, regulatorias, de protección de datos y cobros internacionales. No prometer reembolsos o retiros desde billeteras (prohibidos según producto) sin revisión de los derechos aplicables.
5. No mezclar saldos reales con los campos `balance_test` ni activar compras reales con funciones de `test`.

## Cloudflare
El acceso Cloudflare informado como «guardado» no aparece todavía como sesión Cloudflare reconocida por el perfil de navegador disponible, y el navegador de automatización reportó fondos insuficientes. Sitekey de producción de Turnstile sigue vacía en HTML. El secreto debe configurarse **solo** en Supabase Auth, nunca en frontend ni GitHub; requiere activar Turnstile en el panel Cloudflare, capturar sitekey y verificar server-side antes de anunciar protección activa.

Fuentes: https://merchant.binance.com/en/docs/functionalities/webhooks ; https://supabase.com/docs/guides/auth/auth-captcha
