# CLAN CARTAN V100 — Mejoras verificadas (17 de octubre de 2026)

## Código GitHub
- **5dce7a7:** renovación en memoria de tokens de sesión Supabase mientras el sitio está abierto; los registros de préstamos y saldos se identifican como ficticios.
- **0482897:** filtros de cartera basados en importes corregidos y vencimiento efectivo de cuotas, incluso después de prórrogas.
- **9011ab9:** retirada de la contraseña maestra compartida de la antigua demo local; las cuentas locales sin hash individual ya no aceptan esa contraseña.
- **bc8a88f:** script de pruebas estáticas `node scripts/check-v100.mjs`, sin dependencias externas.

## Base de datos Supabase
- Migración `fix_cobra_loan_corrections_schedule_v100`: actualizar cronograma al corregir capital, interés o plazo, respetando abonos previos.
- Migración `cobra_correction_duration_extension_total_v100`: sincronizar duración e interés mensual; comprobar el importe corregido al prorrogar.
- Pruebas de corrección + prórroga en transacciones con ROLLBACK: 11 meses; total S/ 2,200; abonos registrados y asignados S/ 1,200.
- Billeteras: transferencias reversibles en ambos sentidos; saldos totales conservaron S/ 15 al finalizar pruebas.

## Nuevos datos de demostración
Se crearon cuatro clientes y cuatro préstamos ficticios, sin teléfonos:
- `SIM-V100-01`: vencido; dos cuotas; S/ 1,008.
- `SIM-V100-02`: próximo a vencer; tres cuotas; S/ 1,560.
- `SIM-V100-03`: vigente; una cuota; S/ 810.
- `SIM-V100-04`: cancelado; abono registrado **simulado** de S/ 420.

La cartera tiene 9 préstamos. La validación comprobó: cero cronogramas desbalanceados sin corrección, cero diferencias entre pagos y cuotas abonadas, cero saldos internos negativos y cero tablas públicas sin RLS.

## Antes del lanzamiento comercial
- Verificar que Cloudflare Pages ha desplegado el commit V100 más reciente; no se confirmó la URL en esta sesión.
- Probar autenticación, renovación de sesión, formularios y RPC con usuarios reales de prueba y navegadores.
- Configurar SMTP transaccional compatible con Supabase y verificar confirmación/recuperación sin correos falsos.
- Revisar 18 RPC `SECURITY DEFINER` y habilitar protección contra contraseñas filtradas cuando el plan contratado lo permita.
- Validar documentos legales definitivos y el proveedor de pagos verificados antes de permitir recargas de dinero real.
- No activar pagos reales ni retirar la etiqueta de piloto hasta superar todas las pruebas anteriores.

El código y la base de datos se han actualizado de forma real; **la disponibilidad de V100 en Cloudflare y su funcionamiento E2E siguen pendientes de confirmar**.
