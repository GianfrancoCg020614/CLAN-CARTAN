# V320 — Finanzas sobre el proyecto existente

## Auditoría y compatibilidad

El saldo común ya existe como suma de asientos contables de cc_real_service_wallets. V320 no crea una billetera monetaria nueva ni consolida mediante copias de saldos. Reutiliza cc_portal_charge_unified, cc_real_wallet_spends, cc_real_wallet_refunds y la atribución única cc_clan_attributions. Las recargas continúan en los circuitos verificados existentes. La comisión de productos ya se calculaba sobre el precio pagado y se guardaba en cada orden; se conserva ese cálculo y se añade historial de cambios.

Se compararon huellas de saldos, usuarios, pedidos y vigencias antes y después de la migración. Coincidieron sin cambios. No se alteraron saldos reales ni se generaron bonos retroactivos. La revisión en producción fue de lectura y no creó operaciones de prueba.

## Reglas futuras

COBRA YA, MI COCHERA y MI ALQUILER: S/20 por mes. STREAM BULL’S reseller: S/25 por mes. Es un mes calendario en hora de Lima desde el comienzo de cada periodo; renovar conserva la vigencia ya pagada. Las tarifas futuras se configuran en ADMIN y conservan historial. Los periodos anuales ya pagados siguen vigentes hasta su vencimiento original. Se reconoce tanto STREAM_365 histórico como STREAM_MONTHLY en los permisos.

Cada pago mensual elegible genera S/5 una sola vez para su referidor CLAN. Registros, recargas y compras de productos no generan este bono. La operación usa transacción, bloqueo e identificador único. Los bonos se acreditan en el saldo común, no en un monedero nuevo. Los bonos promocionales históricos mantienen sus restricciones y no se convierten en dinero.

Un reembolso mensual revoca el periodo correspondiente y revierte su bono. Si el bono ya se gastó, se registra reversión pendiente, se descuenta del disponible y se recupera con saldo o ingresos posteriores antes de comprar. No se permite saldo monetario negativo. Para evitar recortar renovaciones posteriores, se devuelve primero el último periodo pagado.

## Ventas y liquidaciones

ADMIN selecciona proveedor y fechas inclusivas en hora de Lima. Semana: últimos 7 días; quincena: últimos 15; mes: mes actual; rango personalizado hasta 366 días. Las filas muestran ORD, cuentas CLAN, producto, precio/descuento registrado, ajustes, comisión histórica, obligación del proveedor, pagos y pendiente. Los pedidos históricos sin precio de lista muestran «No registrado».

La aprobación reserva ventas entregadas y no transfiere dinero. Las aprobaciones previas reducen lo disponible. El administrador registra después Yape, Plin o transferencia, referencia única y comprobante privado. Se admiten pagos parciales; no se admite sobrepago ni la repetición del mismo medio/referencia o comprobante. Los comprobantes no son públicos. Una aprobación sin pagos se puede cancelar con motivo.

Los reembolsos de productos se concilian contra los gastos originales y conservan la comisión aplicada al comprar. Si ya se pagó al proveedor, se registra la diferencia pendiente para compensar futuras liquidaciones; no se borra ni cambia el pago anterior. Una aprobación parcialmente pagada puede cerrarse con motivo: se libera solo su remanente y se conserva el pago efectuado antes de ajustar sus órdenes.

Excel: archivo XLSX sin dependencias externas, celdas de texto sin fórmulas ejecutables y cantidades numéricas. PDF: vista de impresión preparada para guardar como PDF desde el navegador. Las transferencias externas son exclusivamente manuales.

## Verificación

Pruebas SQL con dinero ficticio: cuatro tarifas, renovación, vencimiento y reactivación, cuatro bonos, ausencia de referidor, insuficiencia de saldo, reintento, devolución y reversión, tarifas con historial, aislamiento de RPC, compra real con comisión cambiada, reportes de 7/15/31 días y personalizados, pago parcial/completo, sobrepago, devolución posterior a liquidación, conciliación e invariancia de ventas anteriores. PostgreSQL 16 también prueba dos solicitudes simultáneas con un solo descuento/bono.

Navegador: ADMIN y usuario, filtros, XLSX/PDF, referencia conservada tras fallo de red, aprobación sin transferencia, comprobante privado y pago parcial, descarte de reportes obsoletos y referidos. Datos ficticios, nunca operaciones de prueba en producción.

Las credenciales OAuth de Gmail/Outlook siguen dependiendo del propietario según V318/V319; esta implementación conserva el consultor ORD, inventario y métodos de entrega.

Migración aplicada y guardada con la versión real de Supabase: `20261105072557_v320_unified_finance_monthly_settlements.sql`. Se comprobó que las RPC anónimas están bloqueadas, las tablas privadas no admiten escrituras de clientes y el bucket de comprobantes no es público. Los avisos de seguridad existentes no aumentaron para acceso anónimo ni tablas sin políticas; las siete RPC nuevas son endpoints autenticados con comprobaciones de titular o ADMIN.
