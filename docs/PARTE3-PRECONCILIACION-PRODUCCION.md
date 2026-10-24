# Parte 3/7 — preconciliación productiva (solo lectura)

Fecha: 2026-10-23 (hora Perú).

Consultado proyecto Supabase de producción COBRA-YA, sin modificar registros:

| Fuente | Registros | Total PEN |
|---|---:|---:|
| public.cc_real_service_wallets | 1 | 0.00 |
| public.cc_real_wallet_ledger | 0 | 0.00 |
| public.ma_wallets (real_verified_pen) | 1 | 0.00 |

Estos resultados **no son prueba suficiente** para una migración de saldos: falta auditar `cc_wallets`, `cc_service_wallets`, movimientos TEST, transferencias y otros módulos, determinar identidad canónica y conciliar registros históricos, confirmaciones externas de cobros y posibles pendientes por usuario.

Estado de tareas:
- Versionado: migración de contabilidad transaccional para STAGING existente.
- Permisos: RPC solo `service_role`; no exponer a navegador.
- UI: módulo de lectura preparado, no integrado aún al monolito `index.html`.
- Pago: no habilitar acreditación por capturas, autodeclaraciones ni órdenes no confirmadas.
- Saldos: no escribir en producción, no copiar TEST a REAL y no consolidar importes sin firma de auditoría.
- Test E2E: faltan usuarios sintéticos y pruebas de carrera, reembolso y origen de fondos.

Dependencia del titular: definir y comprobar medio de pago real y su confirmación fiable del proveedor, más validar conciliación de saldos antes de habilitar migración financiera. **No solicitar claves ni credenciales por chat.**

NO fusionar a main ni publicar habilitación financiera mientras falten estos gates.
