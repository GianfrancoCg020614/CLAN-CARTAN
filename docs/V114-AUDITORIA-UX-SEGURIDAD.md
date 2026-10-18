# CLAN CARTAN V114 — Corrección y simplificación (18-10-2026)

## Alcance de esta actualización
Portal CLAN CARTAN, COBRA YA, STREAM BULL'S y billeteras. Se ha respetado la versión V113 y el historial de datos existentes. Rama GitHub de restauración: \`resguardo/v113-antes-simplificacion-v114-2026-10-18\`. La rama conserva el código ANTERIOR; no equivale a respaldo completo de Supabase Auth, correo ni secretos.

### Errores identificados y corregidos
1. COBRA YA mostraba hasta cinco controles superpuestos/repetidos para volver o cambiar de cuenta. Ahora hay una única cabecera, con **Volver** y **Cambiar cuenta**; se suprime la inyección duplicada y se esconden accesos flotantes al entrar.
2. Al abrir COBRA YA, la lógica previa consultaba repetidamente la suscripción: dos envoltorios \`refreshAuth\` y otro temporizador. Se conserva una sola comprobación de estado por apertura en V114 (la versión anterior actúa solo como fallback si la nueva hoja de código no carga).
3. El fondo traslúcido dejaba ver las tarjetas del portal a través de COBRA YA, con apariencia de pantallas superpuestas. Ahora el módulo tiene fondo sólido.
4. La pantalla general de billeteras parecía quedar detrás del portal, con navegación confusa. Ahora es un panel visible, centrado, desplazable en móviles y con botón único para volver.
5. Los desplegables de COBRA YA podían quedar abiertos simultáneamente. Ahora se excluyen entre sí y reflejan \`aria-expanded\`.
6. Mensajes anteriores informaban erróneamente que, tras el pago, se esperaba aprobación ADMIN. Se corrigió también el texto de respaldo; tras el cargo de S/15 de saldo interno de prueba, el usuario queda habilitado automáticamente por 30 días.
7. Se acortó el texto redundante de la portada y pie, manteniendo el crédito legal, los logos y enlaces oficiales.
8. La comprobación automática de Cloudflare ahora exige encontrar **JS y CSS de V114** además de HTML, DNS y HTTPS. Evita falsos positivos cuando la portada se publica pero faltan los recursos que hacen funcionar la billetera.

### Funciones protegidas
- Las transferencias de saldo entre COBRA YA y STREAM BULL'S pertenecen al mismo usuario; no se admiten retiros, pagos de préstamos desde billeteras ni transferencias a terceros.
- El pago de la mensualidad COBRA YA es **voluntario**, único por vigencia y atómico en Supabase: saldo ficticio insuficiente o error en activación revierte la operación. El usuario debe confirmar el pago; no hay renovación automática.
- El alta de CLAN CARTAN mantiene DNI manual, invitación opcional, OTP de 8 dígitos y código único. La consulta de DNI mediante proveedor autorizado permanece solo para COBRA YA.
- COBRA YA es un software para gestionar préstamos entre terceros, no un prestamista.
- No se activaron recargas monetarias reales ni QR automáticos sin validación: las solicitudes de prueba requieren revisión antes de abono.
- STREAM BULL'S mantiene su propia afiliación de pago único con saldo ficticio.

### Comprobaciones y límites
Se usan las validaciones estáticas de JavaScript y reglas, seis comprobaciones de la API pública de invitaciones sin crear datos, y verificación de despliegue HTML+JS+CSS. No se realizaron cobros reales, se crearon cuentas nuevas ni se alteraron préstamos, saldos o expedientes existentes.

Quedan pendientes pruebas de interfaz manual con cuentas de cada rol, pago ficticio completo desde una cuenta preparada, integración de pagos verificados, WhatsApp API, comisiones de referidos y revisión jurídica antes de un lanzamiento comercial. Las advertencias de Supabase sobre protección de contraseñas filtradas y optimizaciones RLS deben abordarse por separado para no cambiar reglas de acceso de usuarios en producción. Las tablas restringidas con RLS sin políticas son deliberadamente privadas, no se deben abrir solo para silenciar avisos.

## Recuperación
- GitHub: rama \`resguardo/v113-antes-simplificacion-v114-2026-10-18\`.
- Código: \`index.html\`, \`scripts/v113-wallet.js\`, \`styles/v113-wallet.css\`, verificadores CI.
- Esquema de descuento de prueba: \`supabase/migrations/20261018052000_v113_atomic_cobra_self_activation.sql\`. No se ejecutaron nuevas migraciones de datos en V114.
- Dominio oficial: https://www.clancartan.com/
