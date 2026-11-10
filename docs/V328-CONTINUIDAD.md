# CLAN CARTAN — V328 (checkpoint de continuidad)
Fecha: 2026-11-10
Estado: EN DESARROLLO — no declarar la recarga automática terminada.
Repositorio: GianfrancoCg020614/CLAN-CARTAN, rama main. Sin STAGING.

## Base verificada
- Supabase proyecto pqalxtrcyrpmwqdlibqd.
- Edge Function cc-recharge-mail v15 ACTIVE: lee notificaciones Gmail y ahora intenta extraer payer_name_hint; la columna cc_internal.recharge_mail_events.payer_name_hint y su persistencia se agregaron.
- Último commit funcional de interfaz antes de este checkpoint: 3d94b6d93f4ecf858877daea144067ab477d9b57.
- Interfaz: REC con vencimiento de 15 minutos, contador, Esperar verificación y Cancelar REC. Cancelación usa RPC cc_recharge_cancel y solo se permite si no hay pago identificado ni revisión.
- Los avisos Gmail incluyen importe y transaction_hint; índice único para transaction_hint evita duplicados en eventos.

## Trabajo pendiente prioritario
1. Verificar extracción real de nombre del pagador con notificaciones Lemon y no confundir destinatario con originante.
2. Conciliar únicamente avisos autenticados de Lemon con REC inequívoca: nombre del pagador frente al titular registrado, importe PEN, momento del depósito dentro de 15 minutos, transacción única y sin otras REC compatibles.
3. Implementar RPC financiera de servicio para acreditar exactamente una vez, con locks transaccionales, registro de ledger y auditoría, sin desactivar controles de seguridad ni simular aprobación humana. No acreditar con nombre solo ni con monto/hora solamente.
4. Implementar vencimiento seguro de REC sin depósito, conservando conciliación de avisos tardíos.
5. Pruebas de concurrencia: dos usuarios con el mismo monto, nombres similares, reenvío de correo, mismo ID repetido, depósitos fuera de plazo y cancelación tras pago.
6. Verificar despliegue Cloudflare y comportamiento del navegador.

## Caso sin resolver
REC-100009, S/ 8, Lemon, recibo de Gmail 2026-11-10 11:18 Perú, transaction_hint 8f0646b6-329e-48e9-a604-9ec229ac3a5d; estado PENDING, sin acreditación. No duplicar pago ni marcar acreditada sin conciliación verificable.

## Reglas
Mantener respaldo y controles financieros. No utilizar STAGING. Versionar avances posteriores a V328.
