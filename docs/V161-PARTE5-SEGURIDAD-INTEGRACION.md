# CLAN CARTAN — V161 | Parte 5 de 5 — seguridad, panel ADMIN y preparación de integración
**Fecha:** 21-OCT-2026. **Estado:** artefactos preparados; integración a V161 y pruebas reales pendientes.

## Alcance
- Pantalla común ADMIN con suscripciones, recargas, bonos, contabilidad, auditoría y alertas. Script de presentación `scripts/shared-admin-v161.js`, deliberadamente de **solo lectura**. No es una API para conceder permisos.
- Dos roles de operación principales: ADMIN y RESELLER; preservar cualquier compatibilidad de afiliados histórica de Stream Bull's sin elevar permisos.
- Administración multiempresa: separación por módulo y por titular; un login centralizado; permisos validados desde Supabase con RLS y comprobaciones backend. Nunca aceptar `role=ADMIN` por dato del navegador.
- Historial inmutable con referencias de transacción, actor, servicio, fecha/hora, estado, motivo, saldos antes/después. Paginación y exportación autorizadas; no mezclar registros TEST con saldo real.
- Suscripciones: renovación voluntaria; bloqueo del acceso de servicio al expirar, pero sin borrar datos; alertas y semáforo. Cobra Ya / Mi Cochera S/15 conforme reglas aprobadas; mantener separado Stream Bull's.
- Bonos ADMIN: sumados al saldo visible de su servicio con desglose, pero excluidos del saldo real y de transferencias; mantener intransferibilidad de bono Mi Cochera. No se trasladan a otros usuarios ni se retiran.
- Recargas manuales Lemon/DALE y Binance: QR configurado, monto, «YA PAGUÉ», número de operación, notificación WhatsApp; el cliente solicita, ADMIN/backend verifica cobro auténtico. No mostrar CCI ni teléfono privado públicamente. Solo una acreditación por depósito confirmado y destino elegido.
- Binance USDT: verificar importe recibido, tasa neta USDT→PEN, gastos, margen y vigencia, nunca acreditar sobre importe declarado ni solamente captura. Conciliación del proveedor necesaria para automatizar.
- Transferencias del saldo real del mismo titular únicamente; controles concurrentes backend. Prohibidos retiros, transferencias entre usuarios y pagos de préstamos de Cobra Ya desde billeteras CLAN CARTAN.
- Bonos por referidos de Cobra Ya: S/5 por pago S/15 auténtico inicial o renovación; uno por evento válido, atribución de registro única, sin duplicados ni atribución posterior.
- No activar cobros de producción hasta autorización comercial y E2E acreditado.

## Pruebas de aceptación finales
1. Respaldo de código+esquema+datos de producción y plan de reversión; confirmar versión V161 real antes de modificarla.
2. Login/OTP y recuperación; ADMIN, RESELLER, sesión expirada, prohibición de autorizarse por UI.
3. Selector de monedas con banderas uniforme en TODOS los módulos; PEN contable; conversión visual sin alterar pagos.
4. Enlace `?ref=COCHERA1` y otros códigos de titular existentes; prefijado, validación RPC servidor, alta OTP, atribución permanente, sin bono por solo registro.
5. Billeteras separadas, desglose de saldo real+bono, montos pendientes por fuera; restricciones de transferencias probadas con backend.
6. Solicitud recarga Lemon y Binance pendiente, sin acreditación; conciliación de proveedor auténtica, referencia idempotente y contabilización exacta una sola vez.
7. ADMIN: roles, autorizaciones, auditoría paginada y exportaciones sin fuga de datos entre usuarios o servicios.
8. Suscripción: precio, cobro validado, fecha de inicio y vencimiento, renovación voluntaria, bloqueo por expiración, registros conservados.
9. Reversión/contracargo: ajustes contables compensatorios sin historial borrado ni saldo fabricado, reintentos duplicados y concurrencia.
10. Verificación responsive escritorio/móvil y contraste, QR correctos, textos definitivos, consentimiento publicitario opcional.
11. Pruebas de roles Supabase/RLS, RPC SECURITY DEFINER, webhook firmado, ausencia de secretos en front-end, límites antiabuso.
12. Publicación escalonada y comparación del despliegue GitHub/Cloudflare con V161, comprobación de regresión y opción rollback.

## Integración final pendiente
Se requiere acceso al código COMPLETO de V161 para insertar:
`scripts/shared-currency-selector.js`, `scripts/shared-invitations-v161.js`, `scripts/shared-wallets-v161.js`, `scripts/shared-admin-v161.js`.
Verificar primero las interfaces RPC exactas del backend y corregir adaptadores; no dar por operativas las pantallas hasta pruebas. No sobrescribir `index.html` vacío o no recuperable. No tocar credenciales ni producción por esta preparación.

**Ninguna función crítica de pagos quedó activada por este trabajo.**