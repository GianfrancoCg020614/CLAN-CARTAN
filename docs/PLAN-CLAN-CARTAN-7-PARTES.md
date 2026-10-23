# CLAN CARTAN · Plan maestro de siete partes — política final

**Última revisión:** 23 de octubre de 2026. Este documento ordena las etapas del proyecto; **no supone que las Partes 2–7 están implementadas**.

## Condiciones obligatorias que se mantendrán en todas las partes

- Una identidad de Supabase Auth por usuario para los cuatro negocios: STREAM BULL'S, COBRA YA, MI COCHERA y MI ALQUILER.
- **Nuevo código de referido universal** `CLAN1, CLAN2, CLAN3...`, asignado de modo secuencial y único por persona, con códigos históricos BULL/COBRA/COCHERA/ALQUILER preservados como alias. No se crean ni migran nuevos códigos durante la Parte 1.
- **Recompensa de S/ 5 recurrente por referido y mes:** solo tras activación o renovación comercial efectiva, íntegramente descontada de saldo REAL verificado, en cualquiera de las cuatro plataformas. Máximo un pago de S/ 5 por usuario referido y mes en horario Perú. Si no activa ese mes, no hay premio; si vuelve a activar otro mes, vuelve a generar S/ 5. No se paga por simple registro, enlace, recarga sin activación ni mes transcurrido. Pago y recompensa deben ser transaccionales, idempotentes, auditados, con reversos.
- **Bonos de bienvenida o ADMIN:** exclusivamente para activación/renovación de COBRA YA, MI COCHERA y MI ALQUILER. Nunca se aceptan en STREAM BULL'S. No se convierten en dinero real, no se retiran ni se transfieren y no generan recompensa.
- **Una billetera visible para todos los negocios:** saldo REAL disponible separado de bonos promocionales. La infraestructura actualmente tiene cuatro subbilleteras `cc_real_service_wallets`; una unificación contable real posterior exige conciliación financiera y pruebas.
- Consentimiento de Términos y tratamientos necesarios requerido para registro. Publicidad por correo/WhatsApp opt-in independiente, nunca preseleccionado ni impuesto, revocable.
- Interfaz unificada responsive con modos claro y oscuro, preservando branding original.
- Mantener backups, autorización y E2E antes de modificar producción o saldos.

## Implementación secuencial

1. **Cuenta, registro y seguridad**: preservación, formulario, doble aceptación necesaria, marketing voluntario, validador, prueba aislada y preflight de Supabase. Rama `feature/parte1-cuenta-registro-seguridad`; PR #32; requiere instancia Supabase de staging para validar Auth real.
2. **Código CLAN y referidos universales**: código único por usuario, vínculo seguro con referidor, aliases históricos, interfaz, atribuciones únicas, sin recompensas por registro.
3. **Billetera única y separación de bonos**: migración auditada, total real, gastos por cuatro negocios, bonos de activación solo en tres.
4. **Recompensa S/ 5 mensual condicionada a activación REAL**: integración de los cuatro flujos, una sola recompensa por referido y mes, revocaciones, anti-fraude y rollback.
5. **STREAM BULL'S administración completa**: múltiples cuentas y plataformas, perfiles/clientes y fechas independientes, renovaciones/ciclos, espacios, pagos/deudas, WhatsApp manual, «Atención de hoy», pocos botones, sin violar condiciones de proveedores.
6. **Diseño y navegación premium**: tarjetas de cuatro negocios, modo claro/oscuro, secciones de billetera y referidos, adaptación móvil.
7. **Certificación e integración final**: pruebas E2E (incluidas las 24 pendientes de MI ALQUILER), seguridad, conciliación, backups, reversión, aprobación del titular y eventual despliegue de producción.

## Calidad y autorización

- Cada parte requiere PR propio, GitHub Actions exitoso, reporte de alcance y Cloudflare Pages preview.
- Preview web debe usar datos ficticios y, para verificar Auth/SQL, **un proyecto Supabase de staging independiente**.
- No ejecutar migraciones reales hasta contar con proyecto aislado, revisión y respaldo.
- No fusionar a la rama oficial ni desplegar producción antes de cumplir los criterios y de recibir **«APROBADO, ACTUALIZAR CLAN CARTAN»**.
