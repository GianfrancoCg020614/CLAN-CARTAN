# CLAN CARTAN E.I.R.L. — V141: BONOS POR REFERIDOS Y LIBRO COMPLETO DE MOVIMIENTOS
**Fecha:** 19 de octubre de 2026, Perú.
**Naturaleza:** especificación funcional, reglas comerciales vigentes y continuidad. **No es declaración de implementación financiera o cobros en producción.**
**Versión funcional más reciente antes de este documento:** V140; no sobrescribir V119–V140.

## 1. Decisiones vigentes del propietario

### A. Ampliaciones del préstamo (COBRA YA) — confirmado V139 / V140
- Selector legible **+1 mes, +2 meses, … +12 meses** (respetar el máximo general del préstamo).
- Mostrar claramente **plazo anterior + meses agregados = plazo total resultante**, vencimiento anterior y nuevo, y **contador real actualizado de días restantes**. No confundir días calendario con meses de 30 días fijos.
- Al confirmar, guardar prórroga en la **misma operación/ID de préstamo** y su historial. Mantener capital, interés original, garantías, abonos y cronograma histórico. Las prórrogas por sí solas **no aumentan intereses**, salvo un acuerdo expreso gestionado separadamente.
- Backend ya dispone de RPC `cy_extend_loan_months(uuid,integer,text)`; se verificó el esquema sin generar ampliaciones de prueba contra cartera real.

### B. WhatsApp moderno con marca y enlace — confirmado V140
- Los avisos preparados para **Inicio de préstamo, Próximo a vencer y Vencido** deben utilizar emojis Unicode correctos, títulos elegantes, datos financieros legibles y no caracteres de sustitución `�`.
- Añadir la URL pública **https://www.clancartan.com/** para invitar a conocer otros servicios digitales de CLAN CARTAN E.I.R.L. No sugerir que el prestatario tenga login para visualizar su deuda: **no se crean cuentas a prestatarios**.
- Los mensajes los prepara y envía **el prestamista**, no una automatización de envíos activada sin evidencia. No prometer avisos automáticos inexistentes.
- Mantener monto en moneda del préstamo, interés simple mensual, plazo, saldo/vencimiento correcto y branding **COBRA YA | CLAN CARTAN E.I.R.L.**; usar `encodeURIComponent` sobre texto Unicode al abrir WhatsApp.

### C. Política DEFINITIVA del bono por referido de COBRA YA
1. Cada **RESELLER** paga **S/15** en activación inicial o renovación, una vez que se habilite el cobro **real** correspondiente.
2. Si un RESELLER nuevo se registra con el **código de invitación de otro reseller**, se atribuye **una sola vez** a ese código, **durante su registro**, y la asociación es **inmutable** posteriormente.
3. El titular del código obtiene **S/5** **por cada pago válido y efectivamente cobrado de S/15** por ese reseller: tanto primera activación como **cada renovación posterior**. Cada pago elegible genera **un máximo de un bono S/5**, nunca un bono por mera inscripción, por simple recarga o por usar billetera de prueba.
4. Programa de **referidos DIRECTOS de un solo nivel**. No generar bonos por referidos del referido. No aceptar autorreferidos, cuentas duplicadas, fraudes, referencias sustituidas ni repetición de cobros/bonos.
5. Un mismo RESELLER referido solo puede quedar vinculado a **un** código de invitación; se conserva `cc_invitation_attributions.registered_user_id` como identificador único, que hoy tiene **PRIMARY KEY**.
6. La atribución debe corresponder al código **COBRA** de un reseller apto. Los códigos `BULL` de STREAM BULL'S siguen reglas de ese negocio, sin mezclarlos con bonos de suscripción COBRA YA.
7. El bono será saldo interno **COBRA YA** del titular del código (usuario invitador) y podrá transferirse a su propia billetera STREAM BULL'S siguiendo las restricciones existentes: **no retiros, no pagar préstamos de terceros, no transferencias entre usuarios**. No acreditar al prestatario ni al reseller referido.
8. Los pagos cancelados, rechazados, fraudulentos o no verificados **NO** generan bono. Si un bono fue creado y el pago relacionado se reembolsa/cancela, registrar **anulación/reversión** y ajuste de saldo único, con trazabilidad de la operación original. En reembolsos parciales, aplicar la política proporcional/estado que se apruebe antes de habilitar producción; evitar descuentos automáticos arbitrarios.
9. **Condición de S/15:** el bono depende de **S/15 efectivamente pagados/validados**. Descuentos promocionales que reducen la cobranza neta por debajo de S/15 no equivalen a un pago elegible de S/15 sin una regla comercial posterior explícita. Mostrar por separado importe de lista, descuento y pago neto.

**Regla principal (literal):** «El titular del código de invitación recibirá **S/5 por cada pago válido de S/15** realizado por el reseller referido, tanto por la activación inicial como por cada renovación posterior».

## 2. Registro de TODOS los movimientos económicos

Cada activación, renovación, compra, recarga, bono, transferencia entre billeteras propias, descuento, devolución, reembolso, ajuste o reversión debe estar representado con un evento **auditable** e identificable. No son equivalentes las órdenes PENDIENTES, el dinero recibido realmente ni los saldos TEST. Un evento de estado que no afecta saldo tiene que constar como informativo/pendiente, **sin manipular balance**.

**Conceptos obligatorios en el historial:**
- `Bono por suscripción inicial del referido`: **+S/5** tras la primera compra validada de S/15 del RESELLER referido.
- `Bono por renovación del referido`: **+S/5** tras cada renovación válida S/15.
- `Reembolso de bono por suscripción`: **−S/5** o importe aplicable por reversión única del bono inicial.
- `Reembolso de bono por renovación`: **−S/5** o importe aplicable al revertir bono de renovación.
- `Pago por suscripción`: **−S/15** si realmente se debitó la billetera del RESELLER.
- `Pago por renovación`: **−S/15** si realmente se debitó la billetera.
- `Descuento por suscripción o renovación`: registrar el beneficio aplicado **por separado** con la operación relacionada.
- `Reembolso de suscripción o renovación`: **+importe efectivamente devuelto** a la billetera del pagador; referenciar cargo original.
- Registrar además `Compra`, `Descuento por compra`, `Reembolso de compra`, `Recarga verificada`, `Transferencia interna propia`, `Ajuste` y `Reversión` según su origen real.

**Importante sobre el ejemplo «Descuento por renovación — +S/3»:** es un **ahorro** informativo de S/3, NO necesariamente ingreso de saldo en billetera. Mostrarlo como descuento/beneficio separado y referenciado. **No sumar S/3 al saldo** a menos que exista una operación autorizada y contabilizada explícitamente como crédito real. Nunca duplicar el descuento como +S/3 y además descontar solo S/12 de forma que ambos incrementen ficticiamente fondos.

### Campos mínimos de cada evento
| Campo | Requisito |
|---|---|
| Tipo | Suscripción, renovación, compra, recarga, bono, descuento, reembolso, ajuste, reversión, transferencia |
| Concepto | Texto legible inequívoco, como «Bono por renovación del referido» |
| Monto | Decimal de 2 dígitos, moneda PEN, signo y naturaleza del efecto |
| Saldo anterior | Saldo real del usuario y billetera correspondiente, **antes** de la transacción |
| Saldo posterior | Saldo real **después** de la transacción; igualdad para descuentos informativos |
| Fecha y hora | Timestamp del evento; mostrar hora Perú sin perder UTC persistido |
| Estado | Pendiente, aprobado/confirmado, rechazado, anulado, reembolsado o revertido, según proceso |
| Referencia | ID único, no editable, correlación idempotente con transacción origen |
| Origen | Tipo de operación y actor/servicio |
| Pago relacionado | ID del pago de **S/15** que disparó bono, si corresponde |
| Reseller referido | Identificador interno/código autorizado del RESELLER cuya suscripción o renovación generó bono |
| Beneficiario | Billetera y titular del bono (invocador no decide otro beneficiario) |
| Motivo | Obligatorio para ajustes/reembolsos/reversiones |
| Efecto | `affects_balance` verdadero/falso (o equivalente), sin contabilizar órdenes meramente pendientes |

### Ejemplos de la vista para el usuario
- **Bono por suscripción inicial del referido — +S/5**
- **Bono por renovación del referido — +S/5**
- **Reembolso de bono por suscripción — −S/5**
- **Reembolso de bono por renovación — −S/5**
- **Pago por suscripción — −S/15**
- **Pago por renovación — −S/15**
- **Descuento por renovación — Ahorro S/3 (no acredita saldo por sí solo)**
- **Reembolso de suscripción — +S/15** cuando se efectúa realmente ese reembolso.

### Requisitos técnicos para ejecución comercial, sin saldos falsos
1. Una **transacción única y atómica** debe cobrar el importe real desde la billetera COBRA YA del reseller, validar periodo y referencia, activar/renovar servicio, registrar evento de pago y registrar **un solo bono** de S/5 al invitador elegible cuando la condición comercial y de liquidación se cumpla.
2. Validar contra servidor: precio realmente cobrado S/15; acceso/suscripción de COBRA YA, rol RESELLER; atribución única al código COBRA de otro reseller; usuario y titular distintos; cuenta válida; transacción no previamente procesada. **Nunca confiar en monto, destinatario o referencia enviados por el navegador**.
3. Evitar pagos y bonos duplicados con `UNIQUE` sobre ID de pago confirmado + tipo de bono + beneficiario. Usar bloqueos transaccionales de filas y/o protección de concurrencia `FOR UPDATE`, respetando RLS/roles.
4. Reembolsos y ajustes con **eventos compensatorios** inmutables; no borrar ni sobrescribir historial. Vincular reversión a movimiento anterior. Rechazar segundos intentos de anulación o reembolso fuera del saldo / monto permitido. Si el saldo ya se gastó, definir procedimiento de compensación sin crear saldo negativo oculto.
5. Guardar siempre instantáneas de **saldo anterior/saldo posterior** calculadas **en backend dentro de la misma transacción**, tanto para debitar al referido como acreditar al invitador; saldo de descuento informativo queda igual.
6. Mostrar historial cronológico paginado y exportable. El visor V135 de los últimos 500 movimientos **no** constituye historial contable completo; añadir paginación o extracción auditada total. Evitar llamar facturas SUNAT a constancias internas.
7. Añadir pruebas de pago inicial, dos renovaciones distintas, reintentos, webhook duplicado, conflicto concurrente, autorreferido, código inválido o cambiado, pago de menos de S/15, solicitud fallida, reembolso total/parcial, ajuste, saldos previos/posteriores, separación TEST/REAL, y cambios de RESELLER/cuenta.
8. No activar cobros mientras Lemon/DALE o Binance Pay no tengan permisos comerciales y conciliación real autenticada. El backend de prueba `cy_pay_subscription_test` **NO** debe generar S/5 reales.

## 3. Situación verificada 19-OCT-2026 — NO EXAGERAR
- Última versión funcional de interfaz examinada: **V140**. Sus prórrogas y WhatsApp con enlace ya figuran en GitHub. La RPC `cy_extend_loan_months` existe en Supabase.
- `cc_invitation_attributions` dispone de una sola fila posible por `registered_user_id` (PRIMARY KEY). Este requisito de unicidad **no sustituye** la verificación antifraude ni prueba bloqueo total de edición por toda ruta privilegiada.
- Existen dos billeteras reales separadas de las de prueba, `cc_real_wallet_spends`, `cc_real_wallet_refunds` y `cc_my_real_wallet_movements`, pero no hay mecanismo comprobado de acreditación **real de bono S/5 en cada renovación** ni registro completo de saldo anterior/saldo posterior para cada tipo. **El punto 3 se deja aprobado como REQUISITO PARA IMPLEMENTAR**, no como lanzamiento realizado.
- Supabase: **0 asientos de crédito real** a la hora de consulta; `cc_manual_recharge_settings.collection_enabled=false`. La ausencia de captación externa autorizada sigue bloqueando la facturación real.
- No se han ejecutado pagos de prueba ni abonado S/5 reales como resultado de crear este documento; no se han alterado préstamos, atribuciones, clientes ni billeteras.

## 4. Continuidad — siguiente chat
> Continuamos CLAN CARTAN desde V140 funcional, con **especificación V141 de bonos por referidos y historial económico completo**. Abre `docs/V141-BONOS-REFERIDOS-Y-MOVIMIENTOS.md` en GitHub y los documentos V140/V139/V137; revisa versión real y estado Supabase. Implementa con seguridad cobros válidos S/15 y bono único S/5 por activación y renovación, código de invitación permanente, registro de toda operación con saldos antes/después; mantén la captación y acreditación reales desactivadas hasta autorización contractual y conciliación. No borres registros ni mezcles TEST con REAL.

**Documento maestro:** `docs/CONTINUIDAD-ACTUAL-V141-2026-10-19.md`.
