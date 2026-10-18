# CLAN CARTAN V121 — Preparación de recargas con Lemon Perú / DALE

Fecha: 18-10-2026. Negocios: COBRA YA y STREAM BULL'S.

## Objetivo comercial
- El cliente elige su propia billetera COBRA YA o STREAM BULL'S y el importe en PEN.
- Paga a CLAN CARTAN E.I.R.L. por QR interoperable o al número afiliado a DALE de una cuenta Lemon válida.
- Solo cuando un proveedor autorizado confirme el pago de forma independiente, se acredita una sola vez el importe exacto al saldo INTERNO para consumir servicios.
- Quedan prohibidos: retiros, pagos de préstamos desde las billeteras, traspasos entre usuarios distintos. Se mantienen únicamente transferencias entre las dos billeteras de la MISMA cuenta.
- Los bonos y saldos de prueba no son acreditaciones de dinero real.

## Entregado (infraestructura, SIN ACTIVAR cobros)
- En Supabase COBRA-YA, migración `v121_lemon_dale_pending_topup_orders` crea `public.cc_real_topup_orders` con ID único, usuario titular, servicio, importe, PEN, proveedor, estado y eventual ID de transacción externa.
- RLS activado. Solo el titular autenticado ve y puede crear órdenes PENDING. Los clientes NO pueden cambiar estados, IDs del proveedor ni marcar pagos o acreditar saldos.
- Restricción única de ID de transacción por proveedor para impedir asignar el mismo pago a dos solicitudes.
- No se alteraron `cc_service_wallets`, `cc_test_topup_requests` ni funciones de suscripción de prueba. No se envía ni cobra dinero real.
- `CREDITED` es únicamente un estado previsto del esquema; NO existe hoy función que acredite saldo a partir de este estado. No marcar una orden como CREDITED sin una transacción comprobada y una acreditación atómica e idempotente.

## Pendiente imprescindible para funcionamiento real
1. Confirmar que el proveedor del usuario es **Lemon Perú** (escrito «lemod») y que la cuenta receptora está habilitada para uso comercial por CLAN CARTAN E.I.R.L.
2. Obtener datos de cobro públicos verificados (QR de recepción, número de teléfono DALE), sin pedir PIN, contraseña ni token en chat.
3. Contratar, obtener autorización o habilitar una integración con API/webhook verificable **de pagos entrantes**, para identificar ID único, destinatario, importe, moneda, momento y referencia/usuario. Lemon/DALE para usuarios finales NO equivale automáticamente a ofrecer dicha API.
4. Si el QR/número son estáticos y no admiten referencia asociable a una orden, resolver un mecanismo seguro de conciliación que NO dependa del comprobante aportado por el pagador.
5. Validar pago del lado servidor usando datos autenticados del proveedor, firma/token, lista de cuentas receptoras autorizadas y comparación exacta de importe, moneda, estado, cuenta y orden; asegurar idempotencia/transacción atómica en Supabase.
6. Separar saldos reales de saldos de prueba e implementar créditos/débitos y beneficios solo tras revisión legal, tributaria y contractual de recargas prepagadas. Habilitar la UI QR/DALE únicamente al pasar pruebas integrales y configurar producción.
7. Probar: pago válido, duplicado/repetido, cancelado, monto no coincidente, referencia equivocada, distinto usuario, webhook falsificado y caída/reintento del proveedor.

## Regla de seguridad
**NO poner QR ni número de recarga como método activo para pagos reales en la página sin confirmación fiable y acreditación comprobada.** Nunca abonar un saldo por la pantalla de «Pago realizado», un screenshot, SMS del pagador o un simple envío de formulario. El estado actual continúa siendo PILOTO de saldos ficticios.

Referencias: https://help.lemon.me/pe/es/articles/10486600-operar-con-soles y https://www.dale.pe/
