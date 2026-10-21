# V161 — ejecución selectiva puntos 2, 3, 5, 6 y 7 (21-OCT-2026)

## Confirmado en código / base de datos
**Punto 2 — Selector de monedas:** enlazado el componente `scripts/shared-currency-selector.js` al script activo `scripts/v160-invitation-register.js`, con contenedores en portada CLAN CARTAN, Cobra Ya y Mi Cochera. Ocho monedas con banderas y preferencia local. Es selector de **visualización**, no recalcula saldos ni precios sin tasas auténticas. Es preciso comprobar visualmente el despliegue y que las pantallas/DOM admitan estos contenedores.

**Punto 3 — Referidos:** la integración `v160-invitation-register.js` ya precarga `ref` y el módulo; RPC existentes `cc_my_invitation_codes` y `cc_validate_invitation_code`. El componente `shared-invitations-v161.js` está guardado. Falta E2E con una cuenta nueva real autorizada (OTP, atribución inmutable, cada servicio), sin fingir bonos por registro.

**Punto 5 — Billeteras, transferencias, bonos:** componente de consulta `shared-wallets-v161.js` preparado; backend `mc_transfer_real_balance`, `mc_admin_grant_bonus` existente, COBRA YA con saldo real y saldo promocional segregados. Se conservan controles de saldo y bonos. Falta integración de interfaz compartida y pruebas de transferencias/reversión; no modificar balances ni habilitar retiros.

**Punto 6 — Suscripciones:** `scripts/v145-cobra-access.js` existe: control de vencimiento, bono exclusivo, cobro real protegido por configuración comercial; Mi Cochera `scripts/v158-mi-cochera.js` controla vencimiento y activación con bono. Sin evidencias de cobro comercial real ni prueba transversal de renovación. Mantener S/15/30 días por módulo y renovación voluntaria.

**Punto 7 — ADMIN y auditoría:** Mi Cochera tiene panel ADMIN de resellers/bonos, existe RPC `cc_my_real_financial_audit` y panel histórico COBRA. `shared-admin-v161.js` está preparado pero **no integrado** en todas las pantallas. Faltan filtros centralizados, permisos E2E y conciliación contable.

## Pendientes restantes (no afirmar terminados)
1. **API Perú:** prueba E2E de un DNI de titular autorizado en Cobra Ya y Mi Cochera; revisar alta de cliente y cupo proveedor real.
2. **Punto 2:** confirmar selector visible en las 3 pantallas publicadas y no confundir visualización con conversión real; poblar tasas verificadas donde se muestre equivalencia.
3. **Punto 3:** pruebas alta OTP, enlaces COCHERA#, COBRA#, BULL#, atribución inmutable y elegibilidad de referidos.
4. **Punto 4:** recargas Lemon/DALE y Binance USDT: conciliación real, QR, USDT recibido, tasa neta, aprobaciones, referencias únicas, duplicados y permisos de proveedor.
5. **Punto 5:** conexión de billeteras compartidas, cálculo correcto de total visible/desglose y pruebas de bonos y transferencias restringidas.
6. **Punto 6:** suscripciones S/15, renovaciones voluntarias, bloqueo al vencimiento, bono inicial y referidos sobre pago verificado, no sobre TEST; activar pago real solo cuando esté autorizado y probado.
7. **Punto 7:** panel ADMIN integral, auditoría paginada y contabilidad consolidada, RLS entre propietarios y módulos, revisiones de reversos.
8. **Seguridad/regresión:** respaldo completo de V161, pruebas ADMIN/RESELLER y dispositivos, sin secretos en front-end ni pérdida de historiales.
9. **Despliegue:** verificar GitHub/Cloudflare y resultado visible tras cambios, y controlar cache del navegador.

Este trabajo no realizó depósitos, créditos, bonos, cobros reales, modificaciones de saldos ni pruebas DNI contra proveedor.