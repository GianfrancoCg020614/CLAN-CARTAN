# V129 — Identidad visual STREAM BULL'S premium

Fecha de ejecución: 18-10-2026. Sitio oficial: https://www.clancartan.com

## Implementado
- CSS de STREAM BULL'S en turquesa neón premium (#18e7d0, #2dbdff) aplicado a su tarjeta de la portada y la vista pública de catálogo, buscador y botones.
- CSS acotado a la tarjeta de STREAM BULL'S y a body.view-store. Se preserva COBRA YA V128 con su verde financiero, sus imágenes y todos sus procedimientos de backend.
- Archivo cargado: `styles/v128-cobra-premium.css?v=129`. Se incrementó marcador de despliegue HTML a `V129-20261018` para evitar caché anterior.
- Verificada respuesta pública de Cloudflare: página y archivo CSS sirven versión V129.
- La prueba visual interactiva con navegador TinyFish está bloqueada por saldo insuficiente del servicio externo; revisión de código y disponibilidad de recursos completada.

## Recargas: estado real y seguridad
- La página ya presenta opciones Lemon/DALE (PEN) y Binance Pay (USDT); las solicitudes se crean como PENDING.
- El backend de Supabase dispone de tablas para saldos reales y órdenes, y de una función restringida `cc_credit_verified_real_topup` para acreditar una orden Lemon/DALE después de verificar externamente la transacción.
- NO se encontró una Edge Function que reciba webhooks autenticados del proveedor Lemon/DALE o Binance. Por ello todavía NO se acreditan pagos automáticamente al recibir fondos en QR o número.
- NO confundir saldos de prueba (funciones `_test`) con dinero real, ni eliminar las advertencias de simulación mientras el flujo de suscripción siga usando saldos de prueba.
- Solo se puede usar la función de crédito verificado con evidencia de transacción real obtenida de un canal confiable del proveedor; jamás basarse solo en comprobantes remitidos por compradores.

## Pendiente con intervención del titular
1. Para cobros 100% automáticos, conseguir acceso autorizado a una API/webhook o pasarela empresarial que notifique transacciones entrantes verificables y permita asociar orden, importe, moneda, destinatario y transacción única. Confirmar que el uso comercial de Lemon/DALE y Binance está permitido.
2. Configurar las credenciales del proveedor exclusivamente en secretos de Supabase/Cloudflare, nunca en HTML, GitHub público ni el chat.
3. Una vez contratado el proveedor, desarrollar receptor de webhook con validación de firma, idempotencia y conciliación transaccional, probar cobros, duplicados, reembolsos y errores; solo entonces activar crédito automático.
4. Para Cloudflare Turnstile, crear widget para `clancartan.com` y `www.clancartan.com`; configurar sitekey público y verificación server-side Siteverify con el secreto guardado seguro. El sitio actualmente tiene `cc-turnstile-sitekey` vacío: no asumir que la captura mostrada previamente significa integración activa.

Las preferencias del usuario para Stream Bull's y Cobra Ya, la infraestructura y los datos de los clientes existentes permanecen intactos.
