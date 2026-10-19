# CLAN CARTAN V139 — Ampliar plazos +1, +2, … meses
Fecha 19-10-2026. Conserva V138 y todas las versiones previas.

COBRA YA ahora permite indicar cuántos meses se sumarán: +1 a +12 en cada operación, siempre con límite total de 120 meses. El cuadro muestra plazo actual, meses añadidos, plazo acumulado, vencimiento anterior, nuevo vencimiento y días restantes calculados con meses calendario. Solicita confirmación antes de guardar y un motivo opcional. Tras la operación se refrescan cronograma, semáforo y contadores.

RPC Supabase `cy_extend_loan_months(uuid,integer,text)` con bloqueo de préstamo y última cuota en transacción, control por usuario propietario y suscripción, abonos preservados y auditoría en `cy_loan_extensions`. El campo `duration_months` incrementa únicamente los meses añadidos; no crea un nuevo ID, no modifica capital, interés, saldo ni pagos previos. La RPC anterior +1 sigue disponible por compatibilidad. SQL en `supabase/migrations/20261019090000_v139_variable_loan_extensions.sql`.

Hacer prueba autenticada de RESELLER con préstamo propio, +1 y +2, comprobar fecha con final de mes, cronograma, historial y filtro por vencer; conservar movimientos y clientes. Recargas externas continúan condicionadas a autorización y confirmación auténtica.
