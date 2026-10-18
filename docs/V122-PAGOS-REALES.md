# V122 — Lemon/DALE y Binance; pagos reales pendientes de conciliación

- Se confirmó «Lemond» = Lemon Perú, con DALE. El QR de Lemon proviene de la captura del titular; no se conoce el teléfono DALE y por tanto no se publica ningún número inventado.
- Binance Pay: URL obtenida leyendo QR adjunto: https://app.binance.com/uni-qr/812BvNys ; usuario mostrado: User-f81cdb6a. Verificar destinatario dentro de Binance antes de transferir.
- Se crean solicitudes PENDING en Supabase vía rpc cc_create_pending_real_topup sin acreditar saldo. Máximo 5 diarias, rechazo de segunda solicitud vigente de misma billetera.
- Los archivos de QR se adjuntan en assets/. No son prueba de pago y no confirman capacidades de webhook.
- No cambiar textos de «saldo de prueba» por «saldo real» mientras balance_test sea el origen. No convertir saldos existentes en dinero real.
- Pendiente: conciliación segura con proveedor, verificación de importe/moneda/destinatario/referencia, separación contable de dinero real y saldos de prueba, idempotencia, habilitación contractual de pagos comerciales, y pruebas end-to-end. Si la recepción es estática sin referencia asociable, gestionar pago manual sin recarga automática.
- Cloudflare Turnstile: aún no activado para login; requiere claves y verificación server-side, no mostrar widget decorativo.
