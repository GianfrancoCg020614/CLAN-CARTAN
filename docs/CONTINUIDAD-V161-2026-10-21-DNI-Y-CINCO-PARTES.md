# CLAN CARTAN — Continuidad V161 — 21 octubre 2026
## Política de conservación
Preservar usuarios, membresías, préstamos, cronogramas, abonos, saldos reales, bonos restringidos, transferencias, códigos de referidos, atribuciones, historial financiero y datos TEST históricos. No borrar ni sobrescribir funcionalidad anterior. Respaldo de versión completa previo a la integración final.

## Cinco partes
1. Login unificado: usuario confirmó que ingresa; validación integral E2E pendiente.
2. Selector de monedas: scripts/shared-currency-selector.js creado. PEN es moneda contable, ocho monedas con banderas, conversiones visuales únicamente con tasas verificadas.
3. Invitaciones: scripts/shared-invitations-v161.js creado; COBRA#, BULL#, COCHERA#; atribución única y validada en backend.
4. Billeteras: scripts/shared-wallets-v161.js preparado; saldo real separado de bono, bono Mi Cochera intransferible, ninguna acreditación real desde el navegador; Lemon/DALE y Binance pendientes de conciliación verificada.
5. ADMIN: scripts/shared-admin-v161.js y docs/V161-PARTE5-SEGURIDAD-INTEGRACION.md preparados; controles financieros y auditoría sujetos a backend y pruebas.

## API Perú — DNI
- Supabase proyecto pqalxtrcyrpmwqdlibqd, funciones cc-consulta-dni y mc-verify-dni activas.
- Migración v161_shared_dni_permissions_cobra_cochera aplicada: permiso y cupo reconocen Cobra Ya y Mi Cochera.
- Migración v161_admin_dni_operator_authorization aplicada, herramienta ADMIN disponible para autorizaciones documentadas; se conservó pero la regla actual NO requiere aprobación individual.
- Migración v161_dni_automatic_active_membership_access aplicada: usuario con membresía COBRA YA activa o cuenta MI COCHERA vigente, no suspendida, puede consultar automáticamente; se conservan JWT y control de cupo.
- Cupo compartido 100 consultas/mes y hasta 20 consultas por operador/día.
- COBRA YA: scripts/v119-clients.js actualizado con botón visible Verificar DNI ahora y sin chequeo previo de aprobación individual en formulario de edición; formulario nuevo emite eventos de entrada/cambio. Aún falta prueba funcional completa del alta.
- MI COCHERA: scripts/v158-mi-cochera.js actualizado con botón explícito en dueño y trabajador; conserva búsqueda previa de cartera y contacto.
- Se verificaron el 21/10/2026 los archivos publicados https://www.clancartan.com/scripts/v119-clients.js y https://www.clancartan.com/scripts/v158-mi-cochera.js y contienen el botón actualizado.
- NO se probó consulta con DNI auténtico autorizado; token API Perú, cuota efectiva del proveedor y resultado externo sin confirmar. No presentar consulta real como validada.
- Sin consumir consultas ni modificar datos de clientes durante esta etapa.

## Integración final pendiente
Asegurar fuente completa V161, respaldo, conectar todos los componentes, validación funcional del botón en alta de Cobra Ya, QA de ambas plataformas desde cuentas elegibles y prueba de DNI autorizado; auditar RLS, referidos, balances y cierres de pagos antes de habilitar cobros. No permitir transferir bonos entre módulos ni usuarios. Mantener login, diseño uniforme y recargas verificadas sin duplicación.
