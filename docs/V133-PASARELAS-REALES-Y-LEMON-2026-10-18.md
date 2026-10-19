# CLAN CARTAN V133 — Recargas automáticas, investigación de proveedores y sandbox protegido

Fecha de análisis: 18-10-2026 (Perú). Continuidad de V132. Esta rama NO habilita fondos reales ni altera saldos.

## Decisión: NO utilizar Lemon personal para cobranza comercial
La documentación oficial de la billetera electrónica Lemon/GMoney prohíbe expresamente utilizar la billetera personal con fines comerciales o en representación de terceros, con riesgo de bloqueo o cierre. No usar el QR/CCI Lemon personal para recaudación de CLAN CARTAN E.I.R.L. sin autorización contractual por escrito.
- Fuente: https://lemon.me/peru/peru-terms/t%C3%A9rminos-y-condiciones-billetera-electr%C3%B3nica
- Lemon es billetera para recibir dinero, pero su QR y datos personales NO proveen API de lectura de depósitos.

## Opciones de integración evaluadas
### GMoney (institución que emite dinero electrónico para Lemon)
- Su página oficial https://gmoney.com.pe/ publicita **APIs de Dispersión y Recaudo**, Yape Afiliados y servicio BaaS.
- Contacto corporativo público: comunicaciones@gmoney.pe; atención: atencionalusuario@gmoney.pe. Preguntar habilitación de COMERCIO con RUC de CLAN CARTAN E.I.R.L., precios, sandbox, referencias únicas, firma de webhook, liquidación y compatibilidad con cuenta comercial distinta de Lemon personal.
- La existencia de sus APIs empresariales NO significa que la cuenta personal Lemon pueda consumirlas ni que tengan precios accesibles para microrecargas.

### TAYPI (pasarela QR publicada por tercero; validación comercial pendiente)
- Página pública https://taypi.pe/para-empresas/ anuncia API REST, QR únicos, Webhooks HMAC SHA-256, sandbox, liquidación T+1 al CCI del comercio tras KYB, y tarifa 2.50% + S/0.20 + IGV; mínimo S/1.
- Documentación https://docs.taypi.pe/integracion, /seguridad, /webhooks, /ambientes
- Registrarse como COMERCIO con RUC, validar proveedor e infraestructura/contrato, identidad jurídica, disponibilidad, reclamaciones y costos por escrito ANTES de pagos reales; esta investigación se basa en materiales publicados por el proveedor y no constituye auditoría de solvencia/regulación.
- Para un cobro S/5: comisión estimada (5*0.025+0.20)*1.18=S/0.3835; neto ~S/4.62 antes de otros costos. Para S/20: (20*.025+.20)*1.18=S/0.826; neto ~S/19.17.
- IMPORTANTE: liquidar al CCI Lemon personal puede violar los T&C y no debe configurarse sin contrato de uso comercial por escrito.

### Mercado Pago Perú
- Mercado Pago Checkout API Yape permite pago síncrono confirmado y webhooks. https://www.mercadopago.com.pe/developers/es/docs/checkout-api-orders/payment-integration/websites/yape?scope=prod
- Tarifas de Checkout web publicadas (según liquidación): 3.49% + S/1 al instante, o equivalentes según modalidad. S/5 soporta comisión fija relativamente alta. Confirmar cotización real y tributos: https://www.mercadopago.com.pe/herramientas-para-vender/check-out
- Respaldo con proveedor establecido si la alternativa QR de comisión más baja no supera la debida diligencia.

### Binance Merchant
- La solicitud sigue en revisión. Mantener Binance personal deshabilitado; esperar Merchant API autorizada.

## Implementación técnica V133 (en rama de desarrollo)
- `supabase/functions/_shared/taypi-auth.mjs`: firma solicitudes HMAC-SHA256 con timestamp/método/ruta/body y VERIFICA notificaciones HMAC-SHA256 del cuerpo crudo, límite 16 KB, ventana de 5 minutos, evento de pago exitoso, PEN, referencia única y monto PEN.
- `scripts/check-v133-taypi.mjs`: pruebas con credenciales FICTICIAS de firma válida, monto alterado, timestamp vencido, rechazo de cancelación y moneda incorrecta.
- ¡Este código es SOLO un módulo auxiliar de pruebas! No se creó ninguna orden, no existe un webhook desplegado, no se enviaron claves, no hay acreditación de saldo.
- Antes de usarlo: validar respuesta de creación de orden, referencia exacta, ID de comercio en contrato, confirmar pago independientemente contra API del proveedor, reserva de orden bajo auth.uid, SQL atómico con único ID externo, prevención de callbacks repetidos, ajustes/refunds, prueba de concurrentes, reintegros y saldo insuficiente.
- Para minimizar costo de Supabase se recomienda webhook autenticado + verificación vía API al recibirlo, y fallback eventual con baja frecuencia. No hacer polling cada 15 segundos de todos los usuarios en Supabase.

## Activación pendiente — sólo el titular/comercio puede completar afiliación
1. Seleccionar proveedor y aprobar términos comerciales, confirmar que acepta la actividad real de STREAM BULL'S y COBRA YA (software de terceros, no préstamos).
2. Completar alta/KYB y registrar una **cuenta de liquidación COMERCIAL** que el proveedor autorice.
3. Crear credenciales sandbox y configurar secretos por conexión segura de Supabase. Nunca compartir API secrets/OTP en ChatGPT ni GitHub.
4. Ejecutar sandbox y verificación de idempotencia. Luego prueba mínima real supervisada tras habilitación y contrato.
5. Sólo tras confirmar acreditación real y tratamiento de reembolsos activar módulo en Cloudflare.

## Estado de CLAN CARTAN protegido
- En Supabase, `cc_auto_topup_method_status` mantiene Lemon y Binance bloqueados.
- V132 sigue con RLS por usuario e historial real de recargas, transferencias y gastos. No alterar saldos de prueba ni de producción.
