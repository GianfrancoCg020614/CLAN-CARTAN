# CLAN CARTAN V153 — Punto 1: verificación de recargas reales (20-OCT-2026, hora Perú)

## Estado
**En proceso. No se ha recibido ni verificado un depósito real. NO pasar al punto 2.**

Proyecto Supabase: `pqalxtrcyrpmwqdlibqd` (COBRA-YA, sa-east-1). Portal: `https://www.ClanCartan.com`.
GitHub: `GianfrancoCg020614/CLAN-CARTAN`, rama main.

## Evidencias comprobadas
- Base activa; existe cuenta ADMIN y membresía RESELLER/ACTIVE.
- Recargas reales, órdenes reales, billeteras reales y auditoría: 0 antes y después de las pruebas técnicas.
- `cc_manual_recharge_settings.collection_enabled=false`, `merchant_permission_verified=false`, QR comercial sin configurar.
- `cc_cobra_real_payment_settings.enabled=false` preservado; **no** habilitar suscripción S/15 durante punto 1.
- `cc_submit_manual_recharge`: crea solicitud pendiente usando contexto de RESELLER en transacción reversible.
- `cc_admin_decide_manual_recharge`: rechaza aprobación si falta autorización comercial.
- Simulación completa con datos temporales **solo dentro de BEGIN/ROLLBACK**: una orden y acreditación S/1, ledger y auditoría generados; intento de reutilizar la referencia en segunda recarga manual rechazado.
- Se reprodujo un problema previo: una misma referencia podía duplicarse entre `cc_real_wallet_ledger` y `cc_admin_verified_personal_topups` (S/2 simulados de un solo comprobante, **reversión completa**).
- Se aplicó y versionó la migración `20261020225500_v153_verified_recharge_cross_channel_idempotency.sql`: registro interno transaccional con clave única por familia de proveedor + referencia normalizada, compartida por `cc_real_wallet_ledger`, `cc_admin_verified_personal_topups` y `cc_binance_merchant_credits`. RLS y sin acceso REST público.
- Repetición de la prueba cruzada: primer S/1 simulado aceptado; segundo crédito de misma referencia bloqueado; recibo único y auditoría correcta. Simulación personal independiente: un crédito, una referencia y un registro de auditoría. Todas las pruebas usan ROLLBACK; no generaron dinero real ni saldos persistentes.
- Verificación posterior: siguen 0 solicitudes/órdenes/recibos/saldos/movimientos reales; ambos flags comerciales continúan deshabilitados.

## Bloqueantes para prueba real extremo a extremo
1. Falta confirmar y conectar un medio **legalmente autorizado para cobros comerciales** a CLAN CARTAN. Los QR personales compartidos para visualización no son prueba de autorización comercial, no implican conciliación automática y no deben tratarse como tales.
2. Falta realizar un depósito real mínimo de la cuenta RESELLER a una cuenta recaudadora autorizada y **verificarlo de forma independiente** en la cuenta del ADMIN.
3. Falta ejecutar la operación con sesiones reales de RESELLER y ADMIN a través del portal, comprobar su presentación, actualizar saldos, contabilidad, auditoría y rechazo de segundo abono con misma referencia.
4. Los pagos automáticos siguen pendientes de integración y validación firmada. No atribuirles carácter de recarga automática activa.

## Continuidad
Mantener sin cambios: solo roles ADMIN/RESELLER; suscripción COBRA YA S/15 voluntaria y sin habilitar; historial persistente; los préstamos se pagan al prestamista directamente y **nunca** mediante billeteras internas; no retiros ni transferencias entre usuarios.

**Solo declarar PUNTO 1 TERMINADO después de depósito auténtico, verificación independiente, acreditación única y conciliación visible por ambos roles.** Punto 2 pendiente.
