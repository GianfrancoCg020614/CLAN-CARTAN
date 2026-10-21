# MI ALQUILER V162.1 · Billetera real unificada y recargas compartidas

**Origen:** V162 (sin publicación). **Rama:** `integracion/mi-alquiler-v162-1-billeteras`. No fusionar ni desplegar hasta validaciones con cuentas autorizadas.

## Implementado
- Se incorpora `MI_ALQUILER` como cuarto servicio de `cc_real_service_wallets` (fuente única de dinero REAL). Saldo inicial PEN 0; ninguna prueba acredita dinero real.
- `ma_ensure_account` muestra ese saldo compartido; `ma_wallets` queda como estructura histórica, sin duplicar ni sumar saldo desde esa tabla.
- `ma_transfer_real_balance` transfiere entre COBRA YA, STREAM BULL'S, MI COCHERA y MI ALQUILER **únicamente billeteras del mismo auth.uid()**. Referencia UUID idempotente; mutex transaccional y saldo insuficiente bloqueado. Usa la auditoría global y nunca consulta ni mueve bonos.
- `ma_activate_real_wallet` permite renovación voluntaria S/15 por 30 días cargada **solo al saldo real MI_ALQUILER**, con referencia global única. La activación alternativa desde bono ADMIN sigue siendo independiente.
- La recarga MI ALQUILER reutiliza los QR `assets/qr-dale-gianfranco.svg` y `assets/qr-binance-personal.png`, igual que los demás servicios. Interfaz: monto → YA PAGUÉ → depositante, método, número de operación → solicitud.
- Lemon crea orden y solicitud pendientes en la contabilidad compartida mediante `cc_submit_manual_recharge`; los ADMIN ven la solicitud en la cola existente. Banco/QR y comprobantes NO acreditan automáticamente.
- Binance llama a la notificación existente `cc_notify_binance_personal_usdt`, que exige política comercial activa y tipo USDT→PEN reciente y protegido; en caso contrario rechaza la solicitud, sin acreditar.
- ADMIN puede configurar número de WhatsApp de atención con `ma_admin_set_support_whatsapp`. Una solicitud aceptada prepara aviso al número configurado; si no hay número aún, permite copiar el mensaje. Registrar apertura ≠ pago verificado.
- No se revelan CCI, teléfono de Lemon ni claves en el navegador. No se mezclan importes cobrados a inquilinos, garantías, bonos ni deudas con billeteras.

## Seguridad y estado comercial
- Políticas **sin cambio**: Lemon `collection_enabled=false`, `merchant_permission_verified=false`, Binance personal `commercial_authorized=false` en la comprobación de esta etapa.
- Eso significa que los QR son informativos y la conciliación comercial real está **bloqueada**. No pedir depósitos a usuarios mientras estén deshabilitados. ADMIN solo podrá acreditar por rutas expresamente autorizadas y conciliadas.
- Pruebas de sintaxis/estáticas mediante CI. Intenté una prueba transaccional con `BEGIN/ROLLBACK`, pero el entorno de seguridad bloqueó su ejecución; **no afirmar E2E financiero completo**. Debe repetirse en staging con cuentas autorizadas y sin dinero real.
- Los bonos continúan en `ma_accounts.bonus_pen` y cuentas promocionales de cada módulo; no son fuente de transferencias.
- La rama pública `main` y saldos de los otros tres negocios no fueron modificados por GitHub; Supabase sí recibió las migraciones aditivas/restrictivas V162.1.

## Para una salida comercial
1. Verificar legal y técnicamente las cuentas receptoras y conciliación real de Lemon y Binance.
2. Cotejar depósitos, referencias interplataforma y saldos anterior/posterior, con límites, doble envío e idempotencia.
3. Probar transferencia entre cada par de cuatro billeteras del MISMO usuario, denegación de otro usuario, bono intacto y pagos de S/15.
4. Añadir pruebas de UI móvil con cuentas reales autorizadas y revisar accesibilidad.
5. Aprobar explícitamente integración y publicación en Cloudflare.
