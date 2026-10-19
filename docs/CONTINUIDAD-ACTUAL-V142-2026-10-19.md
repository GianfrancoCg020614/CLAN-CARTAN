# CLAN CARTAN — CONTINUIDAD ACTUAL V142 (19 OCT 2026)
**Base funcional previa:** V140, especificación V141; implementación técnica de auditoría y suscripción real V142 **con bandera de lanzamiento cerrada**. Ver [V142 especificación e implementación](V142-BONOS-REALES-Y-AUDITORIA.md).

## Para iniciar el siguiente chat
> Continuamos CLAN CARTAN desde V142. Lee `docs/CONTINUIDAD-ACTUAL-V142-2026-10-19.md` y `docs/V142-BONOS-REALES-Y-AUDITORIA.md`, después V141, V140, V137. Comprueba GitHub main, CI y Supabase antes de alterar nada. Preserva CLAN CARTAN E.I.R.L., COBRA YA, STREAM BULL'S, usuarios, referidos, préstamos, cronogramas, DNI/API Perú, dos billeteras y todos los saldos TEST/REAL. Siguiente objetivo: verificar en entorno aislado la suscripción REAL S/15, +S/5 por invitación/renovación, reversión y movimientos, y terminar Lemon/DALE y Binance con autorizaciones oficiales; no habilitar producción sin pagos auténticos.

## Lo preservado
- Referidos de un nivel: código COBRA directo y asignación inmutable, +S/5 únicamente por cada activación/renovación **real y de S/15 completos** de RESELLER referido, un bono por pago.
- V138 tarjetas Ver / Ya pagó / Acciones; V139/V140 selector +1…+12 meses, plazo total y contador de días; WhatsApp con emojis y `https://www.clancartan.com/`.
- V136 solicitudes manuales y ADMIN controlado únicamente tras permiso comercial; V142 no habilita ningún método Lemon/DALE ni Binance.
- Backend V142 mantiene 4 migraciones, funciones `cc_pay_cobra_subscription_real`, `cc_refund_cobra_real_subscription`, `cc_record_real_discount` y `cc_my_real_financial_audit`; audit global de movimientos de saldo real, concepto, referencia, monto, antes/después, y registros de bono/reversión.
- Suscripciones REAL separadas de `cy_access_periods` TEST, sin borrar registros; `cc_cobra_real_payment_settings.enabled=false` inicial.
- Frontend nuevo `scripts/v142-financial-audit.js`, `styles/v142-financial-audit.css` y pruebas CI V142; la consulta histórica previa sigue existiendo.

## Pendiente importante
- Cobros externos verificados y permiso comercial; no afirmar que operaciones reales fueron probadas. Flujo está **cerrado por configuración**.
- Validar escenarios en base aislada (alta, referidos, renovación, duplicado, reembolso, saldo insuficiente, RLS, concurrencia), revisar visualmente en smartphone y autorizar marcha comercial.
- Auditoría empezó desde V142: no reconstruye saldos anteriores ni clasifica automáticamente todas las operaciones antiguas; visor V132 sigue limitado a 500 registros. No tratar constancias como facturas.
- Las reversas sin saldo quedan anotadas `REVERSAL_PENDING` hasta compensación; para un lanzamiento se necesita política aprobada de recuperación y control.
- No convertir cargos TEST en REAL, no pagar préstamos de terceros con billetera, no permitir retiros ni transferencias entre usuarios, no liberar premios en efectivo.
