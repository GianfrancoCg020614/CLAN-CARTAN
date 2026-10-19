# V131 — Preparación técnica sin activar dinero real
Fecha: 18-10-2026, Perú. Origen: V130 `595ebfe0af9ca404dc03025dd6ed2a47333ffe70`.

## Evidencia observada
- GitHub: despliegue Pages del commit V130 tuvo resultado exitoso en GitHub Actions; eso NO certifica versión pública servida por dominio oficial.
- Verificación de dominio en Actions falló: `www.clancartan.com` entregó marcador V129 y `scripts/v116-account.js` ya declara V127, por lo que la regla antigua que exige V116 produce falso negativo; respaldo Pages sí mostró marcador esperado en el registro consultado.
- Validador de portal fallaba en una cadena obsoleta de saldos de prueba. Se conservó el validador histórico y CI ahora llama `scripts/check-v130.mjs`, con prueba independiente de firma `scripts/check-binance-webhook.mjs`.
- Supabase: proyecto COBRA-YA activo; funciones Edge públicas existentes limitadas a consultas DNI. No hay receptor desplegado de confirmación de pagos.
- Existen tablas de órdenes/saldos reales y RPC privilegiada de crédito de DALE, pero no hay evidencia de transacción verificada de Lemon/DALE ni de Binance.
- Ambos métodos de recarga reportan `enabled=false` mediante `cc_auto_topup_method_status`. Las RPC para crear solicitudes de pago están revocadas a roles de usuario.

## Lo preparado
- `supabase/functions/_shared/binance-pay-verify.mjs` es un verificador independiente de firmas RSA-SHA256 de Binance Pay Merchant con comprobaciones de certificado fijado, sello temporal, firma sobre cuerpo original, evento de pago exitoso, moneda e importe entero en micro-USDT.
- No es una Edge Function publicada. No escucha pagos ni puede aumentar saldos. Los campos exactos de evento y política de certificados deben validarse con el contrato comercial vigente ANTES de usarlo como producción.
- `scripts/check-binance-webhook.mjs` aporta pruebas sintéticas de firma válida, alteración, certificado equivocado, temporalidad, cancelación y moneda errónea. No usa credenciales reales.

## Bloqueantes de producción (se mantienen)
1. Lemon/DALE: obtener cuenta comercial autorizada que ofrezca referencias de cobro individual y confirmación autenticada por servidor. Un QR o teléfono receptor no confirman recepción.
2. Binance Pay: habilitar Merchant API legítima, generar órdenes únicas servidor-servidor y obtener certificación/credenciales y webhooks oficiales. Un QR de perfil personal no equivale a Merchant API.
3. Confirmar esquema real de eventos, estados parciales y devoluciones, receptor autorizado, certificados/rotación, no reutilización de IDs y cobertura de conversión PEN-USDT.
4. Construir receptor autenticado en Supabase con comprobación del evento en API de proveedor, transacción SQL atómica/idempotente, mecanismo de reintento y monitoreo; probar simultaneidad, duplicados, pagos alterados, montos distintos, expirados y reintegros.
5. Revisar términos del servicio, obligaciones comerciales/tributarias y tratamiento de fondos prepagados antes de comercializar.
6. Revalidar dominio oficial, marca de despliegue y assets con regla por recurso realmente versionado.

**No enviar dinero a los QR ni comunicar a usuarios que el saldo se acreditará automáticamente.** No se ha probado ninguna recarga real ni se han modificado los saldos de usuarios.