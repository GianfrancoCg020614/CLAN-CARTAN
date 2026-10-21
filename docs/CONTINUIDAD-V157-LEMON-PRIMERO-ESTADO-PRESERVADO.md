# CLAN CARTAN E.I.R.L. — CONTINUIDAD V157
## PUNTO 1: LEMON/DALE PRIMERO — ESTADO PRESERVADO
**Actualizado:** 21 de octubre de 2026 (Perú).

> DOCUMENTO DE CONTINUIDAD. Conserva decisiones, evidencias y pendientes de CLAN CARTAN. No activa cobros ni modifica producción. La implementación real sigue en código y SQL versionados.

### Regla de prioridad — NO CAMBIAR
1. **Punto 1:** comprobar el circuito completo de recargas: RESELLER solicita, ADMIN verifica ingreso auténtico por canal autorizado, se acredita una sola vez, contabilidad y auditoría concuerdan. PRIORIDAD ACTUAL: **LEMON/DALE PRIMERO**. Después Binance.
2. **Punto 2:** evaluar y activar el cobro comercial de la suscripción COBRA YA de **S/15 mensuales** solo cuando el usuario confirme terminado correctamente el punto 1. **Actualmente deshabilitado**.

### Productos / identidad y acceso
- Portal único oficial **https://www.clancartan.com/**, compañía **CLAN CARTAN E.I.R.L.**
- Módulos independientes **COBRA YA** (gestión de préstamos ajenos) y **STREAM BULL'S** (servicios digitales), inicio de sesión central y roles exclusivamente **ADMIN** y **RESELLER**. Conservar datos históricos, sin borrarlos al vencer el acceso. Suscripción COBRA YA voluntaria, precio previsto S/15 por mes; se mantiene desactivada mientras dura Punto 1.
- Los cobros de préstamos de terceros se pagan **directamente al prestamista**, nunca a cuentas ni billeteras de CLAN CARTAN.
- Las billeteras internas solo compran servicios de la plataforma, no se retiran ni se transfieren a usuarios distintos. Puede transferirse saldo real entre las dos billeteras del **mismo** usuario conforme a reglas existentes; los **bonos gratuitos ADMIN de bienvenida** van en billetera promocional separada, solo activan COBRA YA, y **nunca** se transfieren a STREAM BULL'S ni se registran como ingresos. Bonos por referidos tienen reglas diferenciadas.
- Identidad gráfica: logo de cobra con monedas/reloj en COBRA YA integrado en V154 (`scripts/v152-cobra-fast.js`); el usuario entregó logo de bull terrier dorado y pidió que sea el emblema oficial de STREAM BULL'S. **Comprobar integración visual en STREAM BULL'S antes de afirmar que ya aparece en producción**.
- Funcionalidad COBRA YA: DNI de cliente y API Perú, fallback manual; préstamos, cuotas, prorrogas +1/+2 meses, cronogramas, avisos WhatsApp, gestión rápida, contabilidad y auditoría. No modificar el registro general CLAN CARTAN para hacer consulta RENIEC automáticamente.

### Lemon / DALE — contexto PERSONAL y prioridad actual
- **DECISIÓN ACTUAL DEL TITULAR:** Lemon/DALE es su billetera **PERSONAL**. Indicó que asume el riesgo y que **otra persona podría enviar dinero a su Lemon**. NO precisó definitivamente si esa transferencia será **personal** o pago comercial de un RESELLER: **preguntar una sola aclaración antes de proponer una transferencia de prueba real**.
- **Regla no modificable:** asumir riesgos no constituye autorización comercial del proveedor. Cuenta personal no se debe marcar como comercio autorizado sin confirmación verificable. Conservar `cc_manual_recharge_settings.collection_enabled=false` y `merchant_permission_verified=false` hasta autorización comercial real.
- QR Lemon/DALE ya en proyecto, usar **solo QR** en la vista pública; NO exponer teléfono ni CCI como texto. Este ocultamiento no garantiza que información del receptor no sea recuperable al escanear el QR.
- Mantener dos modalidades de interfaz **Manual** y **Automática**, con **los mismos QR** (Lemon y Binance) cuando se muestran. Automática sigue con **verificación manual temporal**; ninguna captura ni referencia de cliente acredita sola.
- Formulario: billetera, monto, botón YA PAGUÉ, monto y método, número de operación, WhatsApp de contacto ADMIN y comprobante en el propio chat; registrar **PENDING** hasta verificación externa ADMIN. Evitar doble acreditación a través de rutas manual/automática.
- Una **transferencia personal** de importe pequeño desde una tercera persona puede comprobar si el QR personal recibe fondos (confirmando identidad y consentimiento), pero **no** prueba autorización comercial ni autoriza acreditación a un RESELLER en CLAN CARTAN.
- Para comprobar sin dinero la seguridad financiera, usar **transacciones SQL con BEGIN...ROLLBACK**, con cuentas ADMIN y RESELLER autorizadas. No crear movimientos, pruebas ni saldos permanentes.
- Pregunta pendiente para seguir correctamente: **¿La otra persona hará una transferencia personal de comprobación a tu Lemon, o es un RESELLER pagando una recarga comercial de CLAN CARTAN?** Nunca presionar para pagar o subir comprobantes privados al chat.

### Binance — segundo medio, conservado
- Binance Pay **USDT** va a la cuenta Binance elegida por el titular (ID público mostrado **1276635702**) y las billeteras de CLAN CARTAN expresan saldo **PEN**.
- En V156 se añadió tabla dinámica para 1,5,10,20,50 USDT y monto personalizable: tasa **compradora real** PEN/USDT verificada por ADMIN, costos, margen de protección y vigencia corta; con cotización ausente mostrar **«Sin cotización vigente»**, nunca tasa inventada ni supuesta USDT=USD.
- Acreditación Binance exige ingresos USDT auténticos y **liquidación neta PEN auténtica** antes de abono; importe acreditado = menor entre tasa protegida y PEN neto liquidado. Solo ADMIN con verificación y referencias únicas. La cuenta Binance PERSONAL no tiene autorización comercial confirmada; `cc_binance_personal_policy.commercial_authorized=false`.
- Simulaciones reversibles de V156: 5 USDT, tasa hipotética mercado S/3.70, costos 1.5%, margen 3%, tasa protegida S/3.5335, tabla S/17.66 referenciales y liquidación S/17 (acredita solo S/17). **Fue prueba SQL con ROLLBACK, NO transacción real**.
- En V156 se corrigió fallo de concatenación SQL que impedía cotizar. V153 introduce deduplicación global entre canales y registro de operaciones verificadas.
- Las validaciones de portal y desplegado de GitHub Pages llegaron a «success» en el commit de continuidad V156 **ed6ea05ab67d**; la visibilidad en navegador y la autorización comercial son verificaciones independientes.

### Comprobación REAL de Supabase al guardar V157
A fecha de esta consulta de lectura:
- Lemon `collection_enabled=false`, `merchant_permission_verified=false`.
- Binance `commercial_authorized=false`.
- Recuento de solicitudes de recarga, avisos, recargas personales verificadas, `cc_real_wallet_ledger`, billeteras reales, `cc_wallet_financial_audit`, registro antirrepetición, bonos ADMIN concedidos y billeteras promocionales: **todo 0**.
- `cc_cobra_real_payment_settings.enabled=false`.
- Estos números son una fotografía temporal, no garantía de que permanecerán en cero.

### Próximos pasos ordenados
1. Resolver si la transferencia Lemon de la tercera persona será **personal (verifica solo el QR)** o un pago comercial de **RESELLER**; no confundirlas. No habilitar cuenta personal comercial por declaración de asunción de riesgo.
2. En paralelo, comprobaciones reversibles y revisión de UI RESELLER y ADMIN de Lemon, incluyendo rechazo de doble abono, segregación de saldo y auditoría.
3. Obtener autorización oficial de producto comercial de Lemon/DALE o un proveedor autorizado para recaudación CLAN CARTAN antes de hacer recibir pagos comerciales reales a través de la plataforma.
4. Solo entonces ejecutar y comprobar recarga real del Punto 1 con consentimiento y evidencia externa: RESELLER → medio autorizado → ADMIN → acreditación única → registros/contabilidad/auditoría. Y después tratar Binance.
5. **NO activar Punto 2** hasta orden expresa del usuario después de confirmar Punto 1.

### Documentos y rutas de continuidad
- `docs/CONTINUIDAD-V153-PRUEBA-RECARGAS-PUNTO-1.md`: registro de pagos, seguridad intercanales.
- `docs/CONTINUIDAD-V154-LOGO-COBRA-PUNTO-1.md`: logo COBRA YA y despliegue.
- `docs/CONTINUIDAD-V155-QR-LEMON-BONO-NO-TRANSFERIBLE-PUNTO1.md`: QR-only Lemon, bono intransferible.
- `docs/CONTINUIDAD-V156-BINANCE-USDT-PEN-PUNTO1.md`: tabla USDT/PEN, tasa protegida, pruebas reversibles.
- Repositorio: `GianfrancoCg020614/CLAN-CARTAN` rama `main`; base Supabase `pqalxtrcyrpmwqdlibqd`. Mantener Cloudflare Pages, logs de conciliación y acceso ADMIN auditado.


### V157.1 — protección adicional y pruebas Lemon ya ejecutadas
- Al revisar código de Supabase se halló que la función administrativa heredada `cc_admin_credit_verified_personal_payment` permitía acreditar Lemon/DALE PERSONAL con la sola confirmación ADMIN sin evaluar los flags de autorización comercial.
- Se aplicó en producción una barrera backend `cc_internal.cc_require_authorized_lemon_personal_credit()` con trigger BEFORE INSERT `cc_personal_lemon_authorization_guard` sobre `cc_admin_verified_personal_topups`. Bloquea crédito Lemon personal mientras no sean verdaderos `collection_enabled` y `merchant_permission_verified`. No borra datos ni activa cobros.
- Migración versionada: `supabase/migrations/20261021002500_v157_lemon_personal_authorization_guard.sql`, commit `2186eb06ae4175fb0524a443e4d7b69c6046acf0`.
- Prueba financiera SQL completamente **reversible**: rechaza la acreditación Lemon mientras no hay autorización; simula en la misma transacción una habilitación **ficticia** y S/5 para el RESELLER COBRA YA; una única operación crea un recibo verificado, una entrada de auditoría y un saldo ficticio de S/5; repetir la referencia resulta **bloqueado**. El ensayo fue revertido explícitamente con ROLLBACK.
- Al concluir: autorización Lemon FALSE/FALSE, suscripción comercial COBRA YA FALSE, solicitudes reales 0, acreditaciones personales 0, billeteras reales 0, auditoría 0 y recibos únicos 0. **NO HUBO PAGO REAL**.
- El siguiente paso de usuario sigue siendo definir si el dinero que otra persona enviará a Lemon es exclusivamente una **transferencia personal de comprobación de QR** o un **pago de un RESELLER por servicios**. No presentar la primera como prueba de recarga comercial autorizada ni aconsejar la segunda sin permiso comercial.
