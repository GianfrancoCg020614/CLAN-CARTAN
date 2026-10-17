# CLAN CARTAN – V100 / mejora inicial COBRA YA

Fecha: 17-10-2026.

## Cambio aplicado en Supabase

Migración `fix_cobra_loan_corrections_schedule_v100`: la función `public.cy_correct_loan` conserva el registro histórico en `cy_loan_corrections`, compara los abonos registrados con las cuotas pagadas, evita corregir el total por debajo de los pagos, redistribuye el saldo pendiente entre cuotas ajustables, modifica el vencimiento final y valida la igualdad entre suma del cronograma y nuevo total. Las cuotas completamente pagadas se conservan cuando no son la última.

## Pruebas (transacciones finalizadas con ROLLBACK)

- Corrección a S/ 900.00: suma del cronograma = S/ 900.00.
- Corrección a S/ 2,200.00 en préstamo con pagos: abonos registrados y asignados = S/ 1,200.00, suma de cuotas = S/ 2,200.00.

No habilitar dinero real todavía. Queda pendiente prueba extremo a extremo desde navegador y revisar estados de préstamo cancelado/prorrogado. El despliegue Cloudflare V99 debe verificarse por separado.
