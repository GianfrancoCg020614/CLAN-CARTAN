# V321 — Recargas REC y conciliación

Autorización vigente del propietario: S/15 mensuales para COBRA YA, MI COCHERA y MI ALQUILER; S/25 anuales para STREAM BULL’S. Aplicar a pagos futuros, conservar vigencias y recibos ya pagados. La respuesta del propietario fue «15 y 25 stream» a la aclaración entre V320 y el nuevo prompt; se confirmó explícitamente la interpretación anual según el prompt.

Base: V320 publicada, commit 2caf641b007786bca30fd11d1944f6fe5fb52581. Reutilizar billetera y ledger existentes, solicitudes cc_manual_recharge_requests/cc_real_topup_orders y flujo Binance Merchant ya firmado y reconsultado. No crear un sistema de usuarios ni una billetera nueva.

Objetivo: registro único REC para vincular solicitudes existentes de recarga manual y órdenes Merchant; WhatsApp 51923319637 con REC real; aprobación manual transaccional con recibo global único; depósitos detectados por correo sin efectos financieros; administración de pendientes/no identificados; OAuth ADMIN de Gmail/Outlook separado en permisos de la consulta de entregas. Reutilizar el código OAuth seguro existente cuando sea posible.

Las cuentas personales no tienen habilitación automática probada. Los QR no son órdenes individuales ni confirman recepción. No asignar por importe/hora. No acreditar por correo. Mantener los métodos automáticos cerrados hasta autorización, conexión oficial y referencia inequívoca.

Investigación oficial inicial: Binance Merchant documenta firmas y consulta de órdenes; la API personal también documenta historial Pay, pero no demuestra la asociación REC de un QR estático. Lemon documenta recepción por QR, sin una API pública de conciliación personal verificada en las fuentes revisadas. Investigar y citar fuentes oficiales antes de afirmar límites definitivos. No inventar APIs ni descifrar contraseñas.

Pendientes externos ya conocidos: el propietario no tiene aplicaciones OAuth Google/Microsoft ni ha autorizado buzones. No existen muestras reales de correos de depósito. Los adjuntos son QR de Binance personal User-f81cdb6a y Lemon/DALE a nombre Luis Gianfranco Carbajal Gomez, no confirmaciones de pago. El sitio ya conserva assets/qr-binance-personal.png y assets/qr-dale-gianfranco.svg; verificar equivalencia antes de reutilizar o cambiar. No activar autorizaciones comerciales a partir del QR.

Migración aplicada: 20261105124920_v321_recharge_rec_and_reconciliation.sql. Backend cc-recharge-mail v1 y cc-stream-delivery v4 desplegados. No se realizaron operaciones financieras de prueba en producción. Billeteras y periodos anteriores verificados sin cambios.

Pruebas: regresión SQL aislada, aprobaciones concurrentes de un REC, colisión de la misma referencia entre dos titulares, 27 pruebas de entregas ORD, 10 pruebas de avisos/correo y fixtures móviles. El sondeo de correo es a petición de ADMIN; no existe una tarea programada activa. La confirmación de pagos personales y su asociación automática siguen pendientes de una integración autorizada y configuración real.

Actualización: el sondeo programado se incorpora en V322 mediante un Worker privado de Cloudflare; consultar docs/V322-SONDEO-CORREOS.md. Los requisitos OAuth y de confirmación personal siguen pendientes.
