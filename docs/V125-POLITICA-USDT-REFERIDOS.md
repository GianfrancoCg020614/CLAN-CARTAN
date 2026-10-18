# CLAN CARTAN V125 — Protección comercial USDT/PEN + invitaciones Binance
Fecha: 18 de octubre de 2026. Estado: código actualizado; pagos externos en validación.

## Políticas de conversión
- Para recibir USDT por Binance Pay y acreditar su equivalente en PEN, tomar como referencia un precio **realmente vendible** de USDT frente a PEN: los anuncios de compradores en Binance P2P Perú con límites y liquidez suficientes para ese volumen, medio de cobro habilitado y verificación del comerciante. NO utilizar el precio bancario del dólar sin considerar el USDT real, ni el tipo de cambio promedio, ni una oferta no ejecutable.
- ADMIN puede publicar una tasa verificada manualmente en panel de recargas. Datos obligatorios: precio bruto comprador PEN/USDT, importe USDT realmente cubierto por esa oferta, costo estimado de conversión, margen comercial y referencia del anuncio/hora/medio de cobro. Confirmación expresa por ADMIN. Sin este registro o feed confiable NO se ofrecen órdenes de Binance.
- Cálculo: **tasa comercial PEN/USDT = precio bruto × (1 - (costo estimado % + margen comercial %) / 100)**. El neto mostrado incluye ambos descuentos, identificados antes de generar la solicitud (no se descuentan otra vez al acreditar).
- Política inicial configurable: **0,5 % costo estimado y 2 % margen comercial**. Estos son valores iniciales de gestión, NO comisión oficial universal ni promesa de rentabilidad. Se debe contrastar cada costo real; Binance anunció en abril de 2026 una comisión maker P2P PEN de 0,25 % para ese segmento, que no necesariamente se aplica a todas las operaciones.
- Ejemplo puramente didáctico: precio de comprador S/3,700000 por USDT, costo 0,5 % y margen 2 % ⇒ tasa comercial S/3,607500; 10 USDT ⇒ **S/36,08**. No es una tasa real de mercado vigente.
- El backend compara el precio bruto con el último precio publicado en seis horas; una variación >5 % bloquea nueva publicación y obliga a comprobar antes de seguir. Volumen configurable (mín. 0,5 y máx. 1000 USDT), vigencia máxima de la cotización publicada por el ADMIN de dos minutos y orden del usuario de hasta tres minutos pero nunca más allá de la vigencia de la tasa.
- La tasa queda congelada en la orden válida: si se paga totalmente dentro del plazo, esa tasa se respeta aunque la acreditación se efectúe después de verificar el proveedor. Pago incompleto, tardío, equivocado, duplicado o sin ID conciliable queda sujeto a revisión del operador, sin acreditación automática.
- **Ningún porcentaje garantiza no perder dinero**. Si no hay precio realista o volumen vendible, plataforma pausa Binance. El negocio asume riesgos de variaciones bruscas, fallos de contraparte, USDT, liquidación y costos imprevistos; definir límites y liquidez y buscar cotización ejecutable/hedge si se pretende garantizar precio.

## Implementación V125
- Supabase: tabla `cc_usdt_pen_reference_rates` incorpora precio bruto, costo, margen y liquidez, con restricción para que el precio neto concuerde exactamente con la fórmula y cotización caduque máximo en tres minutos.
- Orden `cc_real_topup_orders` conserva precio bruto, costo, margen y liquidez al momento de generarse. Banco de prueba permanece separado de billetera real.
- RPC `cc_current_usdt_pen_quote_v125`: solo devuelve precios vigentes, desglosando costo y margen.
- RPC `cc_create_pending_usdt_topup`: chequea disponibilidad, volumen, precio, coste y margen exclusivamente en servidor, congela datos y devuelve importe a abonar en PEN; NO acredita efectivo.
- Protección de liquidez compartida: cada solicitud bloquea transaccionalmente el cupo USDT global; se resta la suma de órdenes Binance pendientes que aún no vencieron antes de aceptar otra solicitud. No se promete el mismo volumen a varios clientes simultáneos.
- RPC `cc_admin_publish_usdt_pen_quote`: exige que `cc_internal.is_admin()` sea verdadero, además de permiso autenticado. Revisa márgenes permitidos, montos, precio y alteraciones recientes. Interfaz ADMIN en un bloque de control desplegable para cargar una fuente comprobada.
- No hemos cargado cotizaciones ficticias o de referencia a producción. Hasta conectar una fuente de mercado verificable o cargar una oferta real, botón de orden Binance queda detenido por cotización ausente.
- Los saldos de prueba, préstamos y las dos billeteras internas continúan sin cambios.

## Promoción Binance
- Añadido aviso a usuarios nuevos de Binance para que registren su cuenta con código promocional oficial de CLAN CARTAN ANTES de crear cuenta Binance, sujeto a términos de Binance.
- No existe código de invitación de Binance proporcionado hasta ahora. **No confundir** con el nombre de usuario de pago `User-f81cdb6a`, enlace QR de Binance Pay, ni los códigos internos `COBRA1/BULL1`.
- La meta etiqueta `cc-binance-referral-code` del HTML está preparada; en blanco muestra solicitud del código vía correo `clancartan@gmail.com`. Cuando el titular entregue su código real, actualizar la meta etiqueta para que el aviso lo muestre y permita copiarlo.
- Se recomienda utilizar únicamente el código/link oficial de referidos de Binance; no prometer bonificación garantizada al usuario, ya que requisitos y campañas pueden variar.

## Pendientes críticos
- Obtener fuente automática verificable de cotizaciones P2P ejecutables o un mecanismo de cobertura/liquidación rápida; la fuente actual es cotización validada manualmente por ADMIN.
- Binance Pay cuenta personal: no equivale a Merchant con API, orden única y webhook firmado. Sin autenticación externa no acreditar saldo por QR, captura o botón del cliente.
- No utilizar `cc_credit_verified_real_topup` para Binance: está reservado a cobros DALE/PEN y NO procesa USDT. Implementar una función separada de conciliación Binance Merchant y solo después habilitar acreditación automática.
- Protección Cloudflare Turnstile y verificación backend requieren completar configuración real de claves.
