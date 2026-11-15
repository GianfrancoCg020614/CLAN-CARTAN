# V391 · Catálogo con dos precios y equivalente USD referencial

Base `ab16996ddb7b3efb3ccf8ee97ded318eef7c3759`. Respaldo recuperable verificado: `/workspace/clan-cartan-before-v391.bundle`. Se conserva GitHub/main → Cloudflare Pages; sin staging, migraciones, pagos reales ni cambios de roles.

## Comportamiento

El Súper reseller autorizado sigue registrando ambos precios obligatorios en PEN y su costo. Ahora cada campo tiene un equivalente USD que cambia al escribir; sus publicaciones muestran cada precio junto a su equivalente. Se mantiene la validación del servidor costo ≤ distribuidor ≤ público, dos decimales; el formulario también verifica los decimales del costo antes de enviar.

El catálogo muestra exclusivamente el precio aplicable decidido por Supabase, junto a su equivalente: público para visitante/afiliado y distribuidor para los perfiles que la función existente autoriza. La UI no determina una tarifa financiera ni expone un precio distribuidor por la conversión. Publicaciones e historial conservan sus identificadores y precios originales. Si falla la consulta de precios propios, el distribuidor figura «sin verificar» y no se permite editarlo con un valor supuesto. Se impide la ejecución duplicada del puente de catálogo cuando lo solicitan el HTML y el cargador legado.

## Cotización

Fuente: https://open.er-api.com/v6/latest/USD, documentada en https://www.exchangerate-api.com/docs/free. Se usa la tasa PEN de la base USD: USD referencial = PEN / PEN por USD. Se muestran fuente, fecha/hora en Lima y la aclaración de que el cobro es en soles. Atribución visible «Rates By Exchange Rate API». No se presenta como cotización de Google, SUNAT, tasa bancaria ni oferta de cambio garantizada.

Sin API key ni nuevas funciones/servicios. El navegador solicita únicamente la cotización pública, sin JWT, apikey, cookies, referrer, precios ni datos de clientes. Se almacena localmente solo la tasa PEN y sus timestamps. Se comparte una solicitud en curso entre campos/tarjetas; caché hasta la próxima actualización publicada (5 minutos de tolerancia), con límite absoluto de 36 horas. Refresco al volver a la pestaña y revisión cada minuto si hay referencias visibles. Errores: espera una hora antes de otra solicitud, timeout de 6 segundos, no inventa tasa ni usa una tasa vencida.

La referencia puede diferir de la tasa bancaria y redondea a dos decimales. No convierte billeteras, no modifica monedas de otros negocios y no ofrece cobros en dólares. Para aceptar USD reales sería necesaria una regla empresarial de liquidación, spread, comisiones y redondeo; queda fuera de esta entrega.

## Comisión vigente: producción tiene precedencia sobre migraciones históricas

La definición en producción de `cc_portal_purchase_stream_product` aplica `fee := round(effective_price * percent / 100, 2)` y `payable := effective_price - fee`. Una migración histórica del repositorio calculaba la comisión sobre precio menos costo; esa migración no se ejecuta y no se usa como autoridad. Se conserva exactamente la fórmula de producción y el porcentaje de cada Súper reseller. Hash revisado: `6efcb43b8044469d105e32268c82401d`.

Esta visualización no reduce el cobro ni la comisión de la página por convertir USD. No garantiza rentabilidad del vendedor ni un tipo de cambio ejecutable. La compra sigue cotizándose y validándose en PEN por el servidor con su clave idempotente existente.

## Verificación y reversión

20 casos Chromium sobre el index real local: visitante, afiliado, pendiente, reseller y Súper a 1366/390/320; cotización válida, ambos campos obligatorios, conversión en vivo, payload de publicación en PEN y sin nuevos campos financieros, sin pagos reales; fallo de red, tasa antigua/cero/futura y caché válida. Capturas reales con productos y datos de prueba, nunca publicaciones reales de clientes. Los controles existentes de roles, checkout, publicaciones, finanzas y otros negocios se ejecutan en GitHub antes de integrar. Se corrigió además un fixture SQL LOCAL/CI de agenda: al cruzar medianoche UTC, crear un préstamo con vencimiento mañana en Lima podía incumplir la guarda de futuro. Ahora crea préstamos realmente futuros y asigna las fechas de cuotas sintéticas en el setup local, como los otros casos de calendario. No modifica ninguna función ni fecha de producción. El fixture corregido pasó en PostgreSQL aislado.

Después de publicar: comprobar Cloudflare, meta V391, PC/celular y hashes de los JS/CSS modificados. No equivale a certificar pagos reales ni disponibilidad futura de la fuente externa. Si esta falla, el precio en PEN y el catálogo siguen operativos y USD indica «no disponible».

Reversión: revertir el commit de UI en main mediante el flujo existente. No hay SQL, esquema ni operaciones que revertir. Nunca borrar transacciones de clientes.
