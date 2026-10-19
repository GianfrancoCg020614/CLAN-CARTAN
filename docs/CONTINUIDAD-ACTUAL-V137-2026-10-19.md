# CLAN CARTAN E.I.R.L. — CONTINUIDAD ACTUAL V137
**Fecha de control:** 19 de octubre de 2026 (Perú). **Este documento NO modifica ni aumenta la versión funcional, no activa cobros y no sustituye los documentos históricos.**
**Repositorio:** https://github.com/GianfrancoCg020614/CLAN-CARTAN · rama principal `main`.
**Versión vigente examinada:** V137. **HEAD observado antes de este documento:** `6ee259e6fadbce4c4757ce67db699e3afd0cc1b2`.
**Sitio oficial:** https://www.clancartan.com/ · respaldo https://clan-cartan.pages.dev/
**Backend:** Supabase COBRA-YA, proyecto `pqalxtrcyrpmwqdlibqd`, región São Paulo.

## Mensaje para iniciar el siguiente chat
> Continuamos CLAN CARTAN desde la **V137**. Lee primero `docs/CONTINUIDAD-ACTUAL-V137-2026-10-19.md`, después `docs/V137-DALE-GARANTIA-CONTINUIDAD.md`, `docs/V136-MANUAL-REAL-Y-CONTINUIDAD.md`, `docs/V135-RESUMEN-Y-CONTINUIDAD.md` y el historial V130. Comprueba el HEAD de `main` y el estado real de Supabase antes de programar. Conserva absolutamente todo lo anterior; prioriza pagos Lemon/DALE y Binance con conciliación auténtica y preparación comercial COBRA YA. No habilites cobros sin autorización y pruebas.

## Reglas y prioridades preservadas
1. **CLAN CARTAN E.I.R.L.** opera la plataforma con una identidad y sesión única para **COBRA YA** (software para prestamistas terceros; la empresa no presta) y **STREAM BULL'S** (catálogo público y membresías). Mantener logos, branding, acceso sencillo, navegación móvil, roles y códigos de invitación consecutivos `COBRA1...` y `BULL1...`.
2. **COBRA YA:** ADMIN y RESELLER; cada RESELLER solo administra sus clientes y préstamos por RLS; no crear login para prestatarios. No borrar cartera, clientes, abonos, cronogramas, intereses, prórrogas, garantías, monedas ni historial. Interés mensual simple sobre capital. Campo visible «¿Qué dejó en garantía? (opcional)» con almacenamiento existente; sin garantía permitido.
3. Registro CLAN CARTAN **manual** e internacional; DNI mediante API Perú solo en el módulo de clientes COBRA YA cuando usuario autorizado pulsa verificar. Si RENIEC devuelve identidad distinta, corregir solamente campos de identidad autorizados, nunca email, WhatsApp, dirección, notas ni registros asociados; no consumir cupos de consulta en segundo plano.
4. Dos billeteras separadas `COBRA_YA` y `STREAM_BULLS` en PEN para consumo de servicios; **jamás** retiros, pagos de préstamos de terceros o transferencias entre usuarios. Transferencias solo entre billeteras del **mismo** usuario; mantener completamente separados saldos de prueba y saldos reales. Bonos referidos S/5 (ADMIN configurable) solo sobre cobros legítimos, sin regalarlos por registro.
5. **Atención a cambio de decisión:** V130 decía que no habría modalidad manual; **V136 la modificó expresamente**: permitir SOLICITUD de recarga manual de fondos reales con aprobación de ADMIN, junto a una futura recarga 100% automática. No regresar a la prohibición V130 ni convertir saldo test en saldo verdadero. La aprobación debe comprobar de manera independiente y trazable el dinero ingresado a una cuenta comercial autorizada, y acreditar una sola vez con transacción idempotente. El flujo manual **no está habilitado para recaudar** mientras falte autorización.
6. **LEMON / DALE (PEN):** número de referencia `923319637`; titular indicado en interfaz `Luis Gianfranco Carbajal Gomez`. En `assets/qr-dale-gianfranco.svg` hay un QR Lemon Cash publicado **solo como referencia informativa**, no QR Yape y compatibilidad con Yape no garantizada. La validez del formato QR/CRC no prueba posibilidad de pago comercial ni acreditación bancaria. Evitar publicar instrucciones de enviar dinero mientras no se habilite el servicio. No sustituir el QR por Mercado Pago ni TAYPI sin solicitud expresa; comprobar QR original/beneficiario y condiciones comerciales Lemon/GMoney.
7. **Binance Pay (USDT):** la cuenta/QR personal no implica acceso Merchant. API Merchant, claves, órdenes, firmas/webhooks y tasa USDT/PEN verificable siguen siendo requisitos para la acreditación automática, con controles de caducidad y concurrencia. Nunca afirmar que ya funciona solo porque existe código.
8. Las solicitudes manuales de V136, recargas, historial, constancias internas, gastos y reembolsos de V135 no autorizan cobro real ni sustituyen factura SUNAT. Preservar RLS, roles, unicidad de referencias e idempotencia. No exponer claves en GitHub, web ni chat.

## Estado verificado al preparar este checkpoint
- Rama `main` en V137. README apunta a documentos V137/V136/V135. Archivos `assets/qr-dale-gianfranco.svg`, `scripts/v122-recharges.js` y `scripts/v136-manual-recharges.js` existen. La interfaz automática mantiene ambos métodos desactivados ante la falta de confirmación real.
- **Supabase: 7 clientes, 9 préstamos, 0 asientos de crédito real en `cc_real_wallet_ledger`, 0 órdenes `CREDITED`, 0 solicitudes manuales** en el instante de la consulta. Datos existentes no se tocaron.
- `cc_manual_recharge_settings` fila `id=1`: `collection_enabled=false` y `merchant_permission_verified=false`. **No cambiar estos flags sin autorización comercial documentada.**
- Rama de trabajo histórica `dev/v131-pagos-verificados-ci` existe pero está **divergida** respecto de `main` y es anterior a varios cambios V137. No fusionarla ni revertir `main` automáticamente; revisar diferencias por archivo antes de reutilizarla.
- No hay pruebas confirmadas de pago real de extremo a extremo ni evidencia de que los usuarios puedan recargar y activar comercialmente. La existencia de funciones SQL o UI no equivale a operación en vivo.

## Prioridad para continuar
1. Confirmar acceso comercial contractual a Lemon/GMoney, canal autorizado de cobro PEN, QR/destinatario oficial y verificación real de abonos; confirmar Binance Pay Merchant y firma del webhook. De faltar, **no cobrar** y mantener controles cerrados.
2. Revisar flujos manuales V136 y automáticos V131, con vistas CLIENTE y ADMIN; nunca aprobar por foto/SMS/declaración del pagador.
3. Implementar o revisar recepción externa autenticada, asociación individual de orden, identidad del receptor, monto y moneda, comprobación de duplicados, expiración y acreditación SQL atómica con saldo real.
4. Solo con un medio autorizado, ejecutar una prueba real mínima supervisada desde cuenta cliente distinta de ADMIN, y comprobar saldo antes/después, movimiento, orden, conciliación, rechazo, duplicado y reversa. No simular evidencia ni operar con billetera Lemon personal para comercio sin autorización.
5. Verificar ventas y suscripción reales, activación automática de servicios cuando se debite saldo **real**, comprobantes, límites, reportes, seguridad RLS, Turnstile y operación comercial de COBRA YA.
6. Confirmar CDN/Cloudflare Pages, pruebas de UI móvil con cuenta, scripts y CI. Conservar gráficos de marca, código de invitaciones, correo/OTP, catálogo público y todo el historial.
7. Mantener trazabilidad de decisiones y documentación por versión; GitHub no es copia externa integral de las tablas, Auth y secretos Supabase. No eliminar ni sobrescribir datos existentes.

## Referencias históricas (conservar)
- [V137](V137-DALE-GARANTIA-CONTINUIDAD.md) · [V136](V136-MANUAL-REAL-Y-CONTINUIDAD.md) · [V135](V135-RESUMEN-Y-CONTINUIDAD.md)
- [V130](CONTINUIDAD-V130-2026-10-18.md) · [V134 QR](V134-QR-LEMON-REQUISITO-OBLIGATORIO.md) · [V132 movimientos](V132-MOVIMIENTOS-BILLETERAS-2026-10-18.md).
