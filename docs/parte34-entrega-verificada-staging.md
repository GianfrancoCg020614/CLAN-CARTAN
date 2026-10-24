# STAGING — Validación de entrega antes del cobro (Partes 3 y 4)

Migración ejecutada en STAGING: `parte34_verified_fulfillment_gate_staging`.

**Hallazgo**: `cc_clan_activate_with_real_wallet` anteriormente podía descontar saldo REAL y premiar al referido aunque no se hubiese entregado el producto o servicio.

**Corrección**: tabla privada `cc_clan_service_fulfillment_receipts`, accesible solo al backend, y comprobación dentro de `cc_clan_activate_with_real_wallet`. Antes de cobrar se exige un comprobante de servicio entregado con activación, usuario, servicio, precio y referencia coincidentes. La inserción de ese comprobante la debe efectuar un backend confiable tras verificar el suministro real, nunca el navegador ni solo un clic del usuario.

**Prueba ejecutada**: con usuario ficticio y saldo de S/20 en una transacción revertida, activación S/10 sin comprobante rechazada sin descuento; con comprobante sintético válido se descontó una sola vez y quedó saldo S/10; se ejecutó `ROLLBACK`.

**Pendiente**: conectar las implementaciones reales de entrega de STREAM BULL'S, COBRA YA, MI COCHERA y MI ALQUILER con este registro, diseñar reserva/confirmación/compensación para entrega externa y revisar límites de reintentos. No pasar a producción todavía.

Advertencia: el comprobante registrado manualmente por SQL en la prueba es sintético, **no acredita una entrega verdadera**. No se deben activar cobros de usuario real mientras no exista integración verificable de cada plataforma.
