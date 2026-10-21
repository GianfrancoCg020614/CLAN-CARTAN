# CLAN CARTAN V152 · COBRA YA de gestión rápida

Actualización V152 sobre V151. COCHERA permanece como proyecto/módulo independiente: se reutilizan únicamente ideas de interfaz y control, nunca la cartera, usuarios ni billeteras.

## Entregado
- Búsqueda parcial por nombre, DNI/documento, celular, alias, código interno de cliente y referencia de préstamo; un solo listado de tarjetas COBRA YA.
- Alias opcional guardado en `cy_clients.alias`, independiente del nombre legal. Código `CY-000001` en `cy_clients.client_code`, único y consecutivo desde su asignación.
- Acciones rápidas integradas a tarjetas existentes: registrar abono realmente recibido por el prestamista, preparar WhatsApp y abrir ficha del cliente. Las transacciones invocan `cy_record_payment` sujeto a permisos y no modifican billeteras.
- Ficha emergente con préstamos activos/finalizados, pagos, saldo e historial conservado; mantiene el ID del cliente, los IDs de préstamos y el cronograma original. Préstamo nuevo genera su propio ID, no recicla el anterior.
- Selector de prórroga existente `cy_extend_loan_months` con accesos +1 y +2, vista previa de meses totales, fecha y contador; sin nuevo préstamo.
- WhatsApp preparado (sin envío automático): inicio, próximo vencimiento, vencido, abono recibido y cancelado. Usa `wa.me` con URL del portal. Nunca envía dinero de préstamos a CLAN CARTAN.
- Panel ADMIN: cola de avisos con correo de destinatario `cc_admin_manual_notification_queue` (solo ADMIN) dentro del resumen financiero existente. Distingue aviso `PENDING` de depósito verificado, no acredita por captura; para Binance la tasa y los USDT se verifican aparte.
- Roles siguen ADMIN/RESELLER. RLS `cc_internal.can_manage_cy` limita lectura y edición al RESELLER con acceso vigente y ADMIN con lectura global. La renovación mensual sigue voluntaria y los datos permanecen guardados al vencer.
- Recargas manuales y automáticas muestran mismos QR pero aún crean avisos pendientes vía `cc_notify_manual_payment`; la automatización real aguarda integración autorizada.

## Pruebas y límites
Las pruebas automáticas evalúan sintaxis, versión y referencias de RPC; no realizan consultas DNI reales ni movimientos financieros.
El esquema, RLS y privilegios fueron contrastados en Supabase. En la base consultada, al implementar V152 no existían solicitudes/recibos auditados reales; por tanto **no se ha probado una operación de dinero real de extremo a extremo**. Se requiere prueba posterior con un cliente autorizado y ADMIN verificando en cuenta receptora.
El indicador `cc_cobra_real_payment_settings.enabled` continúa desactivado; no activar servicios o cargos ficticios ni confundir activación promocional con ingreso.

## Infraestructura
GitHub: GianfrancoCg020614/CLAN-CARTAN, rama main. Cloudflare Pages: www.ClanCartan.com. Supabase: pqalxtrcyrpmwqdlibqd.
Archivos: `scripts/v152-cobra-fast.js`, `scripts/v152-admin-reconcile.js`, `scripts/patch-v152-cobra.mjs`, `scripts/check-v152-cobra.mjs` y migración V152. Preservar registros y versiones previas; no purgarlos sin autorización.
