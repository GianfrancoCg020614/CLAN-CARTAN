# CLAN CARTAN — V134: QR Lemon obligatorio para recargas PEN (decisión comercial)

Fecha: 2026-10-18 (Perú). Decisión expresa del propietario tras revisión V133.

## Requisito no negociable del usuario
- El QR visible al comprador para una recarga en soles **debe ser un QR de LEMON**, no QR de Mercado Pago ni TAYPI.
- Conservar experiencia simple: nombre del depositante, importe, QR Lemon, estado pendiente/verificado/acreditado, movimientos, recarga sin aprobación manual.
- El usuario insiste en **100 % automático**: pago verificado auténticamente, sin validar capturas ni sumar saldo por datos autodeclarados. En caso de confirmación incompleta, no acreditar.
- El requisito del QR Lemon aplica al método PEN LEMON/DALE; cualquier método alternativo necesita instrucción nueva del titular, no sustituirlo silenciosamente.
- No introducir servicios de terceros como QR en UI PEN por iniciativa técnica.

## Límite técnico y contractual REAL (no eludir)
- Los [términos oficiales Lemon Perú](https://lemon.me/peru/peru-terms/t%C3%A9rminos-y-condiciones-billetera-electr%C3%B3nica) indican que su billetera personal no se puede usar para fines comerciales ni en representación de terceros. Riesgo de bloqueo. **No mostrar al público el QR personal como cobro comercial** sin autorización escrita o modalidad de comercio compatible.
- Un QR Lemon estático puede recibir dinero, pero no provee evento seguro de depósito a Supabase. Ni HTTP polling al front-end, capturas, nombre, importe, correo, ni identificador escrito por el pagador bastan para acreditar dinero.
- **No existe integración API de movimientos entrantes disponible actualmente para la cuenta personal del usuario**. No prometer recarga inmediata ni ejecutar prueba real mientras no esté resuelto.
- Mantener `LEMON_DALE` deshabilitado en `cc_auto_topup_method_status` hasta que exista autorización comercial + confirmación programática verificable.
- No modificar balances reales/ledger ni desactivar la protección de idempotencia.

## Próximo paso viable sin cambiar la marca QR
Contactar con Lemon/GMoney (emisor de dinero electrónico de Lemon en Perú) para solicitar:
1. **Modalidad comercial Lemon con QR Lemon** autorizada para CLAN CARTAN E.I.R.L.
2. Webhook firmado o API de cobros entrantes/identificador transacción, con contrato y sandbox.
3. Aclaración de si permite conservar exactamente el QR personal existente o exige QR Lemon comercial distinto.
4. Comisiones mínimas en operaciones S/5 y S/10, límites y liquidación.
5. Soporte de vincular cada depósito a una orden única del sistema, reversas y resolución de pagos no identificados.

Si Lemon/GMoney no permite QR Lemon comercial + confirmación autenticada, **los requisitos actuales son técnicamente incompatibles**. Debe informarse al usuario y solicitar cambio de restricción; nunca simular recargas reales.

## Preparativos vigentes
- V131/V132 ya tienen estructuras SQL de órdenes, historial y billeteras separadas reales/test.
- V133 contiene investigación y módulo de firma de prueba para otro proveedor, **sin conexión real**, y NO se usará para el QR Lemon.
- CLAN CARTAN conservará sin cambios su flujo, diseño y nombres. No tocar claves ni saldos.
