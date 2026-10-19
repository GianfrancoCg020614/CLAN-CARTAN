# CLAN CARTAN E.I.R.L. — CONTINUIDAD V135
Fecha de cierre de trabajo: 18/19 octubre de 2026 (Perú).
Dominio oficial: https://www.clancartan.com/ · GitHub: GianfrancoCg020614/CLAN-CARTAN (main) · Supabase: pqalxtrcyrpmwqdlibqd.
Esta versión es **acumulativa**, conserva las decisiones V119 a V134 y no sustituye registros anteriores.

## Objetivos confirmados por el propietario
CLAN CARTAN integra **COBRA YA** (gestión de préstamos de terceros, NO presta dinero) y **STREAM BULL'S** (catálogo de servicios digitales) con identidad, registro y login único. Usabilidad simple, iconos de sesión, marca visible, tarjeta de producto con los mínimos botones. Registro internacional manual; código invitado opcional; códigos consecutivos COBRA1, COBRA2… / BULL1, BULL2…; precios diferenciados según login/acceso. COBRA YA con roles ADMIN y RESELLER; no login de prestatarios, datos DNI solo en clientes de COBRA YA con API Perú y confirmación de uso consentida; nunca borrar datos ajenos a RENIEC al reconciliar identidad.

## Billeteras: reglas invariables
- Dos billeteras INTERNAS de servicio, **COBRA YA** y **STREAM BULL'S**, propiedad del mismo usuario, saldos PEN de verdad aislados de los saldos de PRUEBA; transferencia SOLO entre estas dos billeteras DEL MISMO usuario.
- Prohibidos retiros, pago de préstamos de prestatarios o transferencias a otros usuarios.
- El bono de invitación previamente definido (S/5 por mensualidad cobrada, ADMIN configurable) se registrará como saldo interno y sujeto a reglas de integridad cuando se conecte el pago real, no se simula.
- Pago/activación de servicios automática una vez que el movimiento auténtico esté registrado.
- **QR del método PEN debe ser LEMON**, sin sustituirlo por Mercado Pago ni TAYPI. No publicar QR personal comercial ni habilitar abonos reales hasta acuerdo comercial Lemon/GMoney y webhook/API de confirmación autorizados. Cuenta personal Lemon no tiene API depositaria y existen restricciones contractuales de uso comercial. Actualmente los métodos LEMON_DALE y BINANCE siguen deshabilitados. Binance Merchant espera aprobación y credenciales Merchant.
- No aceptar pantallazos, nombre/importe/receipts, QR estáticos sin verificación ni aprobación manual de recargas. No enviar dinero de prueba hasta proveedor aprobado.

## Entrega técnica V135 (respecto de V132/V134)
1. Migración Supabase **v135_real_wallet_refunds**: tabla `cc_real_wallet_refunds` ligada a `cc_real_wallet_spends` original, ID de reembolso irrepetible, RLS de lectura por usuario y auditoría de razón/fecha. `cc_refund_verified_real_purchase(p_spend_reference,p_refund_reference,p_amount,p_reason)` solo service_role: ejecuta reembolso interno parcial o completo a la billetera original, bloqueo transaccional FOR UPDATE, suma reembolsada <= gasto verificado, falla atómicamente y retorna false al repetir exactamente la misma referencia.
2. `cc_my_real_wallet_movements` incluye ahora tipo REFUND positivo, sin mezclar datos de prueba. Compras/descuentos originales quedan intactos para auditar compras y reembolsos juntos.
3. `scripts/v132-wallet-movements.js` y `styles/v132-wallet-movements.css` ampliados con resumen de recargas, gastos, devoluciones y neto; filtros por tipo, ambas billeteras y mes calendario (Lima); botón **Ver** para constancia individual imprimible; exportes existentes PDF (imprimir) y Excel (CSV). No son facturas SUNAT ni certificados bancarios.
4. Versionado HTML V135 fuerza carga de JS/CSS actualizados y conserva estilos de portal/negocios sin sustituir los módulos existentes. CI extendida desde `check-v132-movements.mjs`.

## Limitaciones declaradas: NO marcar como activos
- El historial usa el máximo de los últimos 500 movimientos de cada usuario. Los resúmenes y reportes son **del filtro de esos 500**, no cálculo contable total histórico ni necesariamente saldo actual. Reflejar esto claramente.
- `cc_refund_verified_real_purchase` es una capacidad segura del backend, todavía **no conectada a un evento real de compra fallida**: no hay reembolsos automáticos ejecutándose ni panel ADMIN de autorización; se requiere integrar el evento fiable y su política contractual, sin permitir creación por el navegador.
- Compras/suscripciones antiguas de prueba permanecen separadas; gastos reales solo cuando se facture/entregue por flujo servidor `cc_charge_verified_real_wallet`.
- Comprobantes imprimibles son constancias INTERNAS, no facturas, ni movimientos verificables por tercero.
- Recargas Lemon/Binance no activas hasta conciliación autenticada autorizada y pruebas reales controladas.

## Compatibilidad, auditoría y preservación
No borrar ni sobrescribir usuarios, cartera, clientes, cronogramas, pagos anteriores, marcas, perfiles, códigos, invitaciones, configuraciones del dominio y correo. Los saldos reales y test previos no se migran ni se acreditan por esta implementación. Mantener RLS por `auth.uid()`, operaciones de escritura con `service_role` e idempotencia por referencias únicas.
Al retomar: leer este archivo, `docs/CONTINUIDAD-V130-2026-10-18.md`, `docs/V132-MOVIMIENTOS-BILLETERAS-2026-10-18.md`, `docs/V134-QR-LEMON-REQUISITO-OBLIGATORIO.md` y validar HEAD de main/SQL de Supabase.
