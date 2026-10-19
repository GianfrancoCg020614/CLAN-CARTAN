# CLAN CARTAN E.I.R.L. — CONTINUIDAD ACTUAL V141 (ESPECIFICACIÓN)
**Fecha:** 19-OCT-2026 (Perú). **V141 es punto documental de requisitos; versión funcional desplegada comprobada previamente: V140.** No implica que los bonos financieros estén implementados o que las recargas reales funcionen.

## PARA RETOMAR EN OTRO CHAT
Copiar:
> Continuamos CLAN CARTAN desde **V140 funcional y continuidad V141 de especificación**. Lee primero `docs/CONTINUIDAD-ACTUAL-V141-2026-10-19.md` y `docs/V141-BONOS-REFERIDOS-Y-MOVIMIENTOS.md`, luego `docs/V140-PRORROGAS-WHATSAPP-Y-CONTINUIDAD.md`, `docs/V139-AMPLIACIONES-MESES-Y-CONTADOR.md`, V137/V136/V135/V130. Revisa `main`, Supabase y Cloudflare antes de modificar. No pierdas usuarios, datos, invitaciones, cartera, préstamos, abonos, cronogramas, logos ni billeteras. Prioriza la implementación segura de S/5 por cada pago válido S/15 del reseller referido, incluido cada renovación, y un historial completo con saldo antes/después. No acredites dinero sin verificación auténtica.

## IDENTIDAD, PRODUCTO, LÍMITES
- Empresa operadora: **CLAN CARTAN E.I.R.L.**, correo **clancartan@gmail.com**. Dominio canónico **https://www.clancartan.com/**, Pages **https://clan-cartan.pages.dev/**. GitHub **GianfrancoCg020614/CLAN-CARTAN**, `main`. Supabase **pqalxtrcyrpmwqdlibqd** São Paulo.
- Portal, sesión, correo/OTP, registro único internacional manual (no RENIEC en alta general). Código invitado opcional durante inscripción; asignar código personal consecutivo único `COBRA1...` y `BULL1...`.
- **COBRA YA** administra préstamos **de terceros**, nunca presta capital: ADMIN/RESELLER, RLS por prestamista, sin login del prestatario. Cliente con DNI y verificación API Perú por petición autorizada; cambios oficiales de identidad no borran contactos ni historial. Interés mensual simple, múltiples monedas, garantía opcional, estado, abonos, edición, extensiones y notificación.
- **STREAM BULL'S** catálogo público y precios/compra según acceso. Branding original siempre visible; pocos botones y UI premium.
- Dos billeteras internas COBRA YA y STREAM BULL'S, reales aisladas de TEST, solo consumo de servicios/transferencia entre billeteras del MISMO usuario. Prohibidos retiros, pago de préstamos de clientes y transferencias a otras personas.

## V138–V140 — FUNCIONALIDAD DE PRÉSTAMOS
- V138: tarjetas responsivas con **Ver**, **Ya pagó** cuando hay saldo pendiente (confirmación explícita de dinero recibido directamente por el prestamista), o **Nuevo préstamo** cuando saldo cero; botón **Acciones** para editar, abono parcial, ampliar plazo, WhatsApp y finalizar. Historial original preservado.
- V139: backend `cy_extend_loan_months(uuid,integer,text)` hasta +12 meses y total máximo 120, en una sola transacción, manteniendo ID, abonos y monto original; vencimiento y días se recalculan.
- V140: **selector visual táctil +1, +2, … +12 meses** con plazo anterior, plazo TOTAL, vencimiento anterior/nuevo y contador de días previo a confirmar; historial de extensión y semáforo actualizados después. Sin incremento automático de intereses.
- V140 WhatsApp: mensajes legibles con emojis Unicode para registro, por vencer y vencido; capital/interés/plazo/saldo/vencimiento cuando aplica; promoción **https://www.clancartan.com/** para descubrir servicios, sin prometer acceso del prestatario a su deuda por login; `wa.me` prepara mensaje, el prestamista lo envía. Revisar apariencia real en móvil.

## V141 — DECISIONES FINANCIERAS NUEVAS Y COMPLETAS
El detalle normativo íntegro de conceptos, estados, escenarios, saldos y excepciones está en **[V141 Bonos por referidos y movimientos](V141-BONOS-REFERIDOS-Y-MOVIMIENTOS.md)**. No acortar ni reinterpretar sin autorización del propietario.

1. RESELLER cobra/accede con pago S/15 **real y válido** inicial o renovación.
2. Código **COBRA** indicado al registro liga permanentemente reseller referido con **un** titular de código. Programa DIRECTO de **un nivel**; no cambios posteriores, múltiples invitadores, autorreferidos, duplicados ni fraude. `cc_invitation_attributions.registered_user_id` ya es PRIMARY KEY.
3. Titular invitador recibe **+S/5** por **cada pago válido de S/15** del referido, primera activación Y todas sus renovaciones elegibles. **Un bono por pago** y beneficiario; no generar al registrarse, recargar sin pagar ni usar saldos test.
4. Bonos cancelados/reembolsados se compensan con movimientos negativos auditados y motivos (nunca borrar eventos), sin dobles compensaciones.
5. **Toda** operación de suscripción, renovación, compra, bono, descuento, reembolso, ajuste y reversión debe generar asiento consultable: tipo, concepto, importe, saldo anterior, saldo posterior, fecha/hora, estado, referencia única, origen, pago relacionado y reseller referido cuando corresponda. Extenderlo a recargas y transferencias internas para contabilidad integral.
6. Conceptos textuales: «Bono por suscripción inicial del referido» (+S/5), «Bono por renovación del referido» (+S/5), «Reembolso de bono por suscripción» (−S/5), «Reembolso de bono por renovación» (−S/5), «Pago por suscripción» (−S/15), «Pago por renovación» (−S/15), «Descuento por suscripción o renovación», «Reembolso de suscripción o renovación», y equivalentes para compras.
7. Ejemplo «Descuento por renovación +S/3»: **ahorro/beneficio informativo**, no sumar ficticiamente S/3 al saldo. Descuento se relaciona con pago neto; solo bonos contra S/15 efectivamente cobrados, salvo nueva instrucción sobre promociones.
8. Crear controles únicos servidor-side y transacciones atómicas con bloqueo concurrente, RLS, idempotencia por pago, reversión coherente y reporte completo paginado; el actual historial de máximo 500 registros no es contabilidad integral.
9. **Pendiente de IMPLEMENTAR y VALIDAR** integración de activación y renovación real con sistema financiero/ledger. Los anteriores S/15 de prueba NO generan bono verdadero. Nunca indicar que bono real S/5 funciona sin pruebas.

## COBROS Y ESTADOS QUE SIGUEN BLOQUEADOS
- Lemon/DALE PEN: referencia del número **923319637**, QR Lemon publicado como imagen informativa, no QR Yape interoperable garantizado. Sin permiso comercial Lemon/GMoney ni confirmación auténtica de ingresos no habilitar uso comercial ni recepción de dinero real.
- Binance Pay USDT: cuenta personal ≠ Merchant aprobado. Sin APIs Merchant, credenciales y webhook firmado, **deshabilitado**.
- V136 reintrodujo **solicitud manual controlada** con aprobación ADMIN, pero el cobro/acreditación real sigue prohibido sin autorización comercial y cotejo independiente. No volver a regla V130 «prohibido manual» ignorando V136. Una orden pendiente no suma saldo.
- Conservación estricta de usuarios, suscripciones, abonos, préstamos, correcciones, balances, perfil y códigos. No elevar tests a dinero. No poner secretos en GitHub.

## VERIFICACIÓN DEL CHECKPOINT
- `main` leído: documentación funcional hasta V140. RPC `cy_extend_loan_months` en Supabase.
- En el instante de la auditoría: **11 préstamos**, **0 ampliaciones registradas**, **0 asientos en `cc_real_wallet_ledger`** y bandera `cc_manual_recharge_settings.collection_enabled=false`. Ningún movimiento real ni bono nuevo provocado por este checkpoint.
- Atribución única: `cc_invitation_attributions.registered_user_id` es PK; verificar privilegios, triggers y reglas de inscripción antes de afirmar inmutabilidad global robusta.
- Este documento y el documento V141 preservan **decisiones/criterios de aceptación**, NO despliegan nuevas tablas de bonos ni abren recargas. La planificación e implementación segura de ese libro económico es trabajo pendiente.
- Respetar migraciones, backups restaurables y el hecho de que GitHub no contiene copia de datos/Auth/secrets de Supabase.

## FUENTES INTERNAS CONSERVADAS
- [V141 — detalle completo](V141-BONOS-REFERIDOS-Y-MOVIMIENTOS.md)
- [V140 — prórrogas y WhatsApp](V140-PRORROGAS-WHATSAPP-Y-CONTINUIDAD.md)
- [V139 — plazos y días](V139-AMPLIACIONES-MESES-Y-CONTADOR.md)
- [V138 — tarjetas de préstamos](V138-CARTERAS-COBRA-ACCIONES.md)
- [V137](V137-DALE-GARANTIA-CONTINUIDAD.md) · [V136](V136-MANUAL-REAL-Y-CONTINUIDAD.md) · [V135](V135-RESUMEN-Y-CONTINUIDAD.md) · [V130](CONTINUIDAD-V130-2026-10-18.md).
