# CLAN CARTAN — prueba E2E de abono de referidos (STAGING)

## Resultado: APROBADO, con datos sintéticos y ROLLBACK

Ejecutada con Supabase STAGING el 24/10/2026 UTC.

Procedimiento: transacción SQL con dos usuarios temporales que incluyen aceptaciones legales vigentes, atribución CLAN válida (`CLAN999991`), invitador RESELLER activo hasta 2027, tres activaciones REAL verificadas **simuladas** y su posterior `ROLLBACK`.

Verificaciones dentro de la transacción:
1. Activación `STREAM_BULLS`, octubre: `CREDITED_5_REAL_PEN`.
2. Segunda activación `COBRA_YA`, mismo referido y octubre: `ALREADY_PAID_THIS_MONTH`.
3. Nueva activación `MI_COCHERA`, noviembre: `CREDITED_5_REAL_PEN`.
4. Saldo sintético acumulado del invitador: **S/ 10.00**, no S/ 15.
5. Tras `ROLLBACK`: comprobado que permanecen **0 usuarios sintéticos, 0 movimientos de la prueba, 0 premios de la prueba**.

Problemas detectados y resueltos en la preparación de prueba: el trigger de registro exige `legal_accepted`, `data_processing_accepted` y versiones legales vigentes; la tabla de atribuciones exige `code_snapshot` que cumpla formato numérico CLAN y `source='SIGNUP_CLAN'`. **No se desactivaron controles.**

## Lo que NO se ha probado
- Una pasarela o flujo real de cobranza que llame al proceso tras validar el pago REAL y generar la activación. El origen de `cc_clan_verified_real_activations` se simuló por SQL privilegiado.
- Simultaneidad de múltiples transacciones en conexiones separadas.
- Despliegue del proceso automático a producción.

## Siguiente paso
Implementar la conexión desde el backend verificable de cada plataforma, garantizar comprobantes no falsificables y transacción única del pago+activación+bono. Mantener la función exclusivamente en STAGING mientras falten estas pruebas.