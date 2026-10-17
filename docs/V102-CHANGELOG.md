# CLAN CARTAN — Cambios V101–V102 (17 de octubre de 2026)

## Versiones y respaldos
- Punto de partida V100: commit `2f26f487623f6051435ff2200f7237cc8a0a1013`.
- V101: `8ffef756201193c74e2b884ac59af597101568a1`.
- V102: `979accacbde06e8183976bc91f0ab9d7af974f1d`.
- Las modificaciones del frontend se guardaron en `index.html` de la rama `main`; GitHub conserva la trazabilidad para retroceder.
- La publicación efectiva en Cloudflare Pages NO se ha comprobado desde esta sesión.

## V101: acceso y billeteras
- Se corrigió la alternancia entre registro e inicio de sesión: el formulario detectaba erróneamente "Crear mi cuenta" en lugar de "Registrar mi cuenta".
- Se retiraron del menú de STREAM BULL'S las entradas de retiros de Super Reseller y ADMIN.
- Se deshabilitaron en la demo local los controladores de solicitud, aprobación y rechazo de retiros (Stream Bull's y Cobra Ya).
- Se actualizaron las vistas para expresar el alcance real: bonos y saldos son **solo para servicios internos**, transferibles exclusivamente entre las dos billeteras del mismo usuario; no pagos de préstamos, retiros ni transferencias entre personas.
- Se validó sintaxis de los 14 scripts en línea.

## V102: cobro de la suscripción
- La antigua rutina de cobro automático `lnAutoRenewDue` se desactivó y se eliminó el temporizador que la llamaba periódicamente.
- La demo solo descuenta S/15 tras una acción de usuario en `lnPaySubscription`, comprobación de saldo, suscripción no activa y confirmación explícita.
- La activación se mantiene por 30 días sin renovación automática. Los datos del usuario permanecen guardados si decide no renovar.
- Se corrigieron los textos de la billetera, el acceso y el registro contable para no prometer descuentos automáticos.
- Esto afecta al **prototipo local**; la función real de prueba `cy_pay_subscription_test` de Supabase sigue siendo invocada por acción expresa del usuario.

## Auditoría de Supabase sin modificación de datos
- Una simulación SQL de usuario autenticado no administrador verificó que cinco operaciones privilegiadas/no propias **no se completaron**: historial administrativo, crédito de prueba ADMIN, aprobación de recarga ADMIN, abono a préstamo ajeno y préstamo con cliente ajeno. Transacción finalizada con `ROLLBACK`.
- Verificación al cierre: 9 préstamos ficticios, cero diferencias entre abonos y cuotas, cero saldos negativos, cero transferencias permanentes de billetera agregadas durante pruebas.
- Las 18 funciones `SECURITY DEFINER` siguen requiriendo revisión exhaustiva de control de permisos y pruebas E2E con sesiones firmadas.

## Validaciones
- `node scripts/check-v100.mjs` valida sintaxis JavaScript y la ausencia de rutas de retiro/cobro automático en el HTML. El archivo se amplió para cubrir V102 y versiones posteriores.
- La sintaxis se validó antes de cada actualización de `index.html`. El script de comprobación existe en GitHub, pero su ejecución dentro de GitHub Actions y la prueba integral en navegador **no están confirmadas**.

## Pendiente para comercialización
1. Verificar en Cloudflare que el último despliegue corresponda a `main` V102.
2. Configurar correo SMTP transaccional para confirmaciones y recuperación de contraseñas. No utilizar direcciones inexistentes.
3. Verificar con dos cuentas reales de prueba (sesiones firmadas) que RLS/RPC bloqueen accesos cruzados.
4. Probar afiliación, recarga ficticia, transferencia, registro de préstamos, abonos, correcciones, cierres y prórrogas en móvil y escritorio.
5. Integrar precios especiales de STREAM BULL'S con afiliación real en Supabase (el catálogo antiguo aún depende parcialmente de datos locales de demostración).
6. Revisar términos, privacidad, libro de reclamaciones y acuerdos con proveedores antes de activar transacciones reales.
7. Elegir y validar una pasarela de pagos verificados antes de aceptar dinero real.

No se habilitan retiros ni pagos de préstamos desde las billeteras. No hay pagos reales activos.
