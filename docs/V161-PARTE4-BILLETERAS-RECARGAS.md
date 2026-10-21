# V161 — Parte 4: billeteras, recargas y movimientos (preparación)
Fecha: 21 octubre 2026. **No instalada en las pantallas actuales, no probada E2E.**

Componente: `scripts/shared-wallets-v161.js`. API de renderización de saldo (real + bono visible, pendientes aparte), elección de Lemon/DALE o Binance Pay (USDT), validación de monto e intención de recarga. No envía datos a backend y no hace acreditaciones.

### Contrato para integración final
- Un solo modelo visual para COBRA YA, STREAM BULL'S y MI COCHERA; separar billetera por módulo y titular.
- Saldo visible = dinero real validado + bono permitido del servicio, desglose siempre visible; el bono no es dinero recargado.
- Bonos ADMIN de Mi Cochera son **intransferibles** incluso hacia billeteras propias de los otros módulos. Mantener también intransferibles los bonos de bienvenida restringidos COBRA YA. Transferencias entre billeteras **del mismo usuario** solamente con saldo de recargas reales que las reglas y backend permitan.
- Los pagos de préstamos van al prestamista, nunca a esta billetera. No retiros ni transferencias entre usuarios. No doble acreditación de la misma operación entre módulos.
- Lemon/DALE: usar QR personal autorizado del titular; ocultar número celular/CCI en vista pública. ADMIN puede registrar recepción manual confirmada previa verificación bancaria propia; el navegador solo envía solicitud.
- Binance Pay: USDT recibido real a Binance ID indicado por titular, no USDT declarado. Mostrar tabla USDT↔PEN con tasa referencial y neta segura (comisiones, margen y redondeo hacia abajo), captura de fecha y expiración de tasa; confirmar operación con conciliación backend. No utilizar el selector visual de monedas para determinar acreditación.
- Flujo visual previsto: «Monto a recargar» → «YA PAGUÉ» → completar monto, método y número de operación → WhatsApp prellenado; cada solicitud queda PENDIENTE hasta aprobación de ADMIN o confirmación autenticada del proveedor.
- La interfaz **no debe fabricar WhatsApp ni datos de pago** hasta que estén configurados en V161; este componente solamente emite `clancartan:recharge-intent` como evento de interfaz.
- El backend deberá validar sesión y rol, autenticar webhook, conciliar importe recibido, moneda, propietario, hash/referencia externa única, evitar reintentos duplicados, efectuar movimientos en una única transacción y auditar saldos anterior/posterior.
- Historial paginado de recargas, bonos, renovaciones, transferencias, compras, ajustes, reembolsos y reversiones con filtros ADMIN. Mantener saldos TEST separados.
- Sin activar flags de pagos comerciales, sin generar saldos ficticios y sin modificar tablas ni datos reales durante esta Parte 4.

### Estado
Archivo creado como componente autónomo. **Pendiente de conexión a V161, verificación del QR real, controles backend, pruebas de seguridad/contabilidad y validación E2E.**