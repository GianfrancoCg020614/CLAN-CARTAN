# CLAN CARTAN · V138 — Préstamos de COBRA YA más simples
Fecha: 19 de octubre de 2026 (Perú). Acumula y preserva toda la continuidad de V137.
Origen visual: captura del titular del módulo **Préstamos y abonos**, con tabla horizontal y exceso de botones.

## Diseño solicitado
- Las filas de préstamos se presentan como **tarjetas responsivas**, con nombre de cliente, capital, fecha de vencimiento, semáforo y saldo pendiente/cancelado.
- **Solo tres controles principales por préstamo:** `Ver`, `Ya pagó` o `Nuevo préstamo` según saldo, y `Acciones` (desplegable).
- `Acciones` mantiene **Editar**, **Registrar abono parcial**, **Ampliar 1 mes**, **Notificar por WhatsApp**, y **Finalizar préstamo pagado** cuando aplique. No se elimina ninguna capacidad, solo se agrupa.
- `Ya pagó` NO registra pagos bancarios automáticos: el prestamista debe confirmar expresamente que ya recibió directamente **el monto TOTAL pendiente**; solo entonces ejecuta la RPC existente `cy_record_payment` para esa diferencia. Pagos parciales siguen en `Acciones`; se conservan IDs e historial. Al quedar saldo cero, el botón principal cambia a `Nuevo préstamo` para ese cliente.
- `Nuevo préstamo` selecciona al mismo cliente en el formulario existente, **no recicla el ID del préstamo anterior ni modifica registros existentes**.
- `Finalizar` sigue como acción separada cuando corresponde y usa `cy_close_paid_loan`; no se confunde pago del prestatario con dinero de las billeteras CLAN CARTAN.
- Cambios realizados exclusivamente en HTML, CSS y UI; sin migraciones SQL, cambios en usuarios ni modificaciones de saldo. Versionado propuesto `V138-20261019`.

## Procedimiento de entrega
- Rama de copia anterior: `resguardo/v137-antes-tarjetas-cobra-20261019`.
- Rama de cambio: `dev/v138-tarjetas-cobra`; revisión PR #8.
- Prueba `node scripts/check-v138-cobra-ui.mjs` adicional, más suite histórica GitHub Actions.
- Confirmar visualmente en teléfono una vez desplegado, login de RESELLER, abono parcial, pago total, nuevo préstamo, filtros, y que no haya efecto sobre saldos internos.
- Las decisiones V135–V137 sobre Lemon/DALE, Binance y recargas manuales permanecen sin cambios y **sin cobros habilitados**.
