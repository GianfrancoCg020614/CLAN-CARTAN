# CLAN CARTAN — Lemon/DALE: vías verificables, 18-10-2026 (Perú)

## Hechos con fuentes oficiales
- Lemon Perú permite **recibir soles** por número celular, CCI y QR. DALE es el canal de interoperabilidad, no constituye por sí mismo una API de notificaciones para desarrolladores:
  - https://help.lemon.me/pe/es/articles/9400829-que-es-dale
  - https://help.lemon.me/pe/es/articles/9392353-como-deposito-soles-en-mi-cuenta-de-lemon
  - https://help.lemon.me/pe/es/articles/9948445-como-puedo-compartir-mi-qr-para-recibir-soles-en-lemon
- Lemon publica un SDK de **Mini-Apps** para servicios dentro de Lemon y rampas fiat/crypto; esto **no demuestra** una API pública para leer depósitos de terceros en la billetera personal ni firmar webhooks de DALE: https://lemon.me/peru/build
- No se identificó en las fuentes oficiales revisadas una API comercial pública certificable que entregue a CLAN CARTAN referencias por operación, confirmación autenticada de créditos PEN, importes y destinatarios.
- Supabase `cc_auto_topup_method_status` devuelve **LEMON_DALE=false** y **BINANCE=false** (revisado en lectura SQL). Mantener.

## Solicitud concreta que el titular puede elevar a soporte Lemon
Canal público oficial: soporte@lemon.me o chat de Lemon.
Solicitar respuesta documental sobre:
1. ¿La cuenta personal Lemon/DALE admite **uso comercial** de cobros de servicios digitales y recargas internas de una E.I.R.L. en Perú?
2. ¿Existe cuenta/contrato comercios o partner que habilite API de **recepción de depósitos en PEN**, webhooks firmados o consulta autenticada de transacciones?
3. ¿Se pueden crear referencias/códigos únicos por orden para distinguir cliente, destino, importe y conciliación independiente?
4. Si existe: documentación del API, sandbox, clave/certificado, firma/verificación, política de repetición, refunds, contracargos, límites, precios y liquidación.
5. ¿Existe integración autorizada con agregadores externos? Exigir pruebas de autorización/seguridad del agregador; **no compartir claves de Lemon ni OTP** con intermediarios no verificados.

## Reglas de aceptación de integración
- La única evidencia para acreditar es confirmación independiente autenticada del proveedor **más** conciliación con orden única (ID externo, valor PEN exacto, destinatario, moneda, estado definitivo).
- SQL transaccional/idempotente; un mismo ID externo jamás acredita dos órdenes. Descartar comprobantes de pantalla, SMS, scraping de app/correo, botón «Ya pagué», y recargas manuales.
- Sin esta evidencia, **no mostrar en checkout el número, CCI ni QR personal de Lemon**; no solicitar al cliente transferir fondos.
- Las billeteras reales `cc_real_service_wallets` están separadas de `balance_test`; no mezclar ni habilitar compras cobradas desde pruebas.
- Con proveedor compatible, preferir Edge Function verificador + RPC atómica, con costos reducidos por evento, sin monitor continuo.

## Alternativas con API pública para PEN
- Mercado Pago Perú documenta Yape a través de Checkout API y confirmación de órdenes en modo automático:
  https://www.mercadopago.com.pe/developers/es/docs/checkout-api-orders/payment-integration/websites/yape
- Culqi documenta pagos Yape usando checkout o API; verificar contrato/cargos del comercio:
  https://docs.culqi.com/es/documentacion/pagos-online/cargo-unico/tokens-yape/
- Izipay publica API/sandbox y métodos Yape/Plin; requiere alta comercial y credenciales:
  https://developers.izipay.pe/
- Elegir por costos efectivos **para tickets S/1, S/5, S/15, S/20**, mínimos, vigencia y modalidad de liquidación. No asumir que resultarán rentables sin tarifas escritas.

## Estado de ejecución
Documentación de viabilidad añadida a la rama de preparación V131. No se generó ningún cobro, seña, webhook, ni recarga real. La rama no se fusionó a `main`. Para habilitar una pasarela es imprescindible autorización legítima de proveedor y prueba de extremo a extremo.
