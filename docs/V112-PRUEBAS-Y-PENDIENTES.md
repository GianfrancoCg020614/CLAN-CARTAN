# CLAN CARTAN — V112: comprobaciones controladas, 18-10-2026

Repositorio: https://github.com/GianfrancoCg020614/CLAN-CARTAN
Dominio: https://www.clancartan.com/

## Punto 1: Registro y referidos
- Cuenta inicial: 6 usuarios y 6 códigos, ninguno faltante ni duplicado.
- COBRA1 válido, BULL999 inexistente. Validación por RPC.
- Código opcional, prefijo según negocio seleccionado, servidor emite un código por cuenta, OTP de ocho casillas.
- Faltan pruebas reales de nueva alta, entrega de OTP, atribución real y asignación BULL en un alta de producción. No se crean cuentas ni se simulan correos sin bandeja autorizada.
- La prueba HTTP de solo lectura vive en scripts/check-v112-live.mjs y corre desde GitHub Actions.

## Punto 2: Billeteras y pagos
- RPC test cc_transfer_test_balance usa auth.uid() para ambas billeteras; no tiene parámetro para transferir a otra persona.
- Funciones de recarga son de prueba, requieren aprobación ADMIN. No se probó ningún proveedor de cobros reales. En la consulta inicial había cero solicitudes y transferencias.
- Los cobros reales deben depender exclusivamente de confirmaciones verificadas e idempotentes del proveedor; no aceptar comprobantes o capturas como verificación automática.

## Punto 3: Bonos
- El código de invitado registra la atribución; no existe abono automático por registro. Falta motor por transacción real, deduplicación, reversos y tarifa configurable (S/5 inicial propuesta).

## Punto 4: Mensajería
- Avisos comerciales del portal incluyen simulación, no WhatsApp automático confirmado. Faltan proveedor Business API conectado, plantillas, consentimiento y registro de entrega.

## Punto 5: Roles y paneles
- Las funciones SQL de administración y préstamos revisadas requieren sesión y verifican permisos de ADMIN/propietario.
- V112 muestra etiqueta del rol AFFILIATE, RESELLER o SUPER_RESELLER activo; no cambia autorizaciones ni concede acceso por invitación.
- Quedan pruebas E2E por rol con cuentas y permisos autorizados.

## Punto 6: Seguridad, respaldos y legal
- Se agregaron índices de FK en atribuciones, sin tocar datos.
- Revisión Supabase señaló: protección de contraseñas filtradas desactivada, 18 optimizaciones RLS, advertencias informativas de tablas internas RLS sin políticas y avisos SECURITY DEFINER a auditar individualmente.
- Respaldos GitHub: resguardo/v111-antes-auditoria-v112-2026-10-18. Una rama de Git NO es respaldo integral de Auth, la base de datos, correo ni secretos.
- Contratos, términos y privacidad todavía son borradores. No habilitar transacciones reales hasta verificar marco operativo/legal, proveedor, facturación y reglas finales.

### Reglas que se conservan
COBRA YA es software: CLAN CARTAN no otorga préstamos. Saldo únicamente para servicios del mismo usuario. Prohibidos retiros, pagar préstamos desde billeteras o transferir entre usuarios. El DNI del registro general se llena manualmente; la consulta solo aplica a COBRA YA.
