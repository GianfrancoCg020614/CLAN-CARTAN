# CLAN CARTAN E.I.R.L. — CONTINUIDAD V136 (recargas manuales reales)
Fecha: 19-OCT-2026 (hora Perú). Esta versión conserva TODAS las decisiones y tablas V119–V135. Documento anterior: `docs/V135-RESUMEN-Y-CONTINUIDAD.md`.

## Decisión expresa del propietario (REVISA Y SUSTITUYE LA PROHIBICIÓN ANTERIOR DE MANUAL)
El propietario AUTORIZÓ volver a ofrecer **recargas MANUALES reales con aprobación ADMIN**, inspiradas en CyberLink, mientras se busca la integración **100 % automática**. No habilitar recarga TEST como real. Son flujos DISTINTOS:
- AUTOMÁTICA: requerirá proveedor firmado/verificado y seguirá inhabilitada hasta obtenerlo.
- MANUAL: cliente registra solicitud real, **ADMIN comprueba personalmente ingreso externo** y aprueba o rechaza; solo aprobar suma el saldo real una vez. El usuario puede ver su historial de pedidos y movimientos.
- El QR de cobro PEN debe ser de **LEMON**; no usar Mercado Pago ni TAYPI como QR sustituto.

## ADVERTENCIA CONTRACTUAL y control obligatorio
**Los términos oficiales de Lemon Perú prohíben uso comercial de billetera personal.**
Fuente: https://lemon.me/peru/peru-terms/t%C3%A9rminos-y-condiciones-billetera-electr%C3%B3nica.
La disponibilidad del **formulario real de solicitud manual** NO significa que ya se puedan enviar cobros al Lemon personal.
Configuración en Supabase:
- Tabla `public.cc_manual_recharge_settings`, fila `id=1`: `collection_enabled=false`, `merchant_permission_verified=false`, `qr_asset_url=null`. Inactiva por defecto.
- El QR y datos del destinatario SOLO aparecen si personal autorizado de CLAN CARTAN confirma mediante contrato una **modalidad Lemon comercial** y configura estos campos por canal server-side autorizado.
- La RPC de aprobación comprueba nuevamente `collection_enabled and merchant_permission_verified` antes de permitir cualquier crédito; botón ADMIN deshabilitado si no existe autorización.
- Prohibido editar flags o insertar QR personal antes de tener autorización escrita. **NO hacer pagos de prueba reales todavía.**

## Lo implementado V136 en Supabase
Migración `supabase/migrations/20261019020000_v136_manual_recharges.sql` aplicada al proyecto `pqalxtrcyrpmwqdlibqd`:
- `cc_manual_recharge_requests`: importes S/1–1000, dos billeteras, payer_name, referencia declarada opcional, solicitud con ID, estado PENDING/APPROVED/REJECTED, timestamps y usuario autenticado; RLS solo permite SELECT al dueño. El cliente NO tiene permisos directos de insertar/actualizar saldos.
- `cc_submit_manual_recharge`: usuario crea orden real pendiente en `cc_real_topup_orders` y vínculo manual atómico; un pendiente por billetera y máximo 3 solicitudes por 24 h. Nunca suma fondos.
- `cc_admin_manual_recharge_queue`: solo ADMIN verificado contra `cc_admins`, cola limitada a 100.
- `cc_admin_decide_manual_recharge`: exclusivamente ADMIN verificado; rechazar siempre permitido; aprobar exige cuenta Lemon comercial habilitada, checkbox de ingreso real, ID único del depósito verificado, monto original/orden pendiente y usuario diferente del aprobador. Transacción única: acredita `cc_real_service_wallets`, inserta `cc_real_wallet_ledger` y marca pedido `CREDITED`; referencia bancaria única protegida por UNIQUE. Si falla, toda la transacción se revierte.
- No hay bots, OCR ni crédito por fotos o declaraciones; un comprobante del cliente no es prueba.
- Las restricciones de billeteras se mantienen: no retiros, no pago de préstamos de clientes, no envío entre distintos usuarios.

## Interfaz real de formulario y ADMIN
- Archivos `scripts/v136-manual-recharges.js`, `styles/v136-manual-recharges.css`.
- En la billetera aparece enlace **Recarga manual**, formulario para COBRA YA / STREAM BULL'S, importe, nombre y referencia del depositante; estado de cuenta recaudadora; lista de solicitudes.
- Dentro de misma pantalla el ADMIN autenticado encuentra **ADMIN · Recargas pendientes**, ID de solicitud, nombre, importe, fecha, campo de ID de operación bancaria confirmado, banco, casilla de verificación, botones **Aprobar y acreditar** o **Rechazar**.
- El historial V132/V135 incorpora automáticamente órdenes pendientes y créditos posteriores de esta modalidad porque comparten `cc_real_topup_orders` y `cc_real_wallet_ledger`.
- En ausencia de autorización comercial solo registra solicitudes sin mostrar QR ni permitir aprobación/abono.
- No se modificaron registros, clientes, códigos, perfiles, cronogramas, pruebas ni saldos existentes.

## PASOS PARA ADMIN después de obtener aprobación comercial Lemon
1. Pedir a Lemon/GMoney autorización escrita para cobrar clientes por servicios digitales CLAN CARTAN E.I.R.L. usando modalidad LEMON comercial y su QR; confirmar límites y condiciones.
2. Configurar en Supabase de forma privada `cc_manual_recharge_settings` con la dirección del QR comercial verificado, texto oficial del destinatario, `merchant_permission_verified=true` y `collection_enabled=true`. **No publicar datos secretos ni QR personal en GitHub.**
3. Iniciar sesión como ADMIN en https://www.clancartan.com/; entrar a **Billetera / Recarga manual** y actualizar.
4. Cliente autenticado solicita recarga indicando cuenta/importe/nombre; luego paga el importe exacto al QR Lemon COMERCIAL mostrado. El cliente puede consignar la referencia declarada.
5. ADMIN abre cola, contrasta el depósito REAL en Lemon: banco, nombre, importe, destino, fecha y transacción única; introducir referencia bancaria VERIFICADA, marcar casilla y aprobar; si no llegó o no coincide: RECHAZAR.
6. Actualizar saldos y movimientos de ambas billeteras; comprobar que un segundo intento con la misma referencia no duplique saldo; nunca aprobar tu propia recarga.
7. Cuando exista API Lemon/GMoney autorizada, incorporar recargas automáticas por separado. Manual puede permanecer como respaldo, previa política operacional.

## Pendientes
- Cuenta Lemon comercial autorizada + QR compatible. Mientras falten NO se permite dinero real.
- Prueba completa con cliente y ADMIN distintos, cuenta autorizada, operación real mínima, integración con venta REAL y activación de servicios. No fingir que el flujo ya está validado con dinero.
- Notificaciones de solicitud/rechazo y comprobante de recarga específico si se considera necesario.
- Paginación de reportes a más de los 500 últimos movimientos, conciliación bancaria avanzada y devolución de reembolsos por fallos reales (V135 tiene RPC pero no automatismo conectado).

## Continuidad general CLAN CARTAN
Ver `docs/V135-RESUMEN-Y-CONTINUIDAD.md`, `docs/CONTINUIDAD-V130-2026-10-18.md` y `docs/V134-QR-LEMON-REQUISITO-OBLIGATORIO.md`. Dominio www.clancartan.com; Cloudflare Pages; repositorio GianfrancoCg020614/CLAN-CARTAN. No perder decisión QR Lemon; no reemplazar con Mercado Pago; no activar recargas automáticas ni usar billetera personal Lemon para cobros comerciales sin contrato.
