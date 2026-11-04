# V318 — Consulta de entregas comerciales por ORD

Implementación progresiva en el proyecto existente, sin alterar saldos ni comisiones. El comprador autenticado introduce únicamente su ORD; el servidor verifica propiedad, estado, fechas, cuenta y método. Los códigos comerciales se cifran en Vault. Autenticador requiere asistencia, nunca revela TOTP, semillas ni recuperación.

## Verificado con datos ficticios

PostgreSQL aislado: pedidos activos, vencidos, suspendidos, cancelados, renovados, inexistentes y ajenos; múltiples cuentas y buzones Gmail/Outlook independientes; entrega directa y comercial automática; ausencia de código; autenticador y asistencia manual; desconexión, reasignación e invalidación de respuestas antiguas; separación entre proveedores, permisos privados, límites de consulta y conservación de saldos/comisiones. Un proveedor cuya membresía venció puede desconectar sus propios buzones.

27 pruebas backend con OAuth y mensajes simulados: autenticación, CORS, PKCE, estados de un solo uso, renovación/revocación de tokens, remitente autenticado, plantilla comercial estricta y rechazo de OTP/MFA.

Navegador móvil de 375 px: comprador, proveedor y ADMIN; consulta de un solo campo, copia, estados, respuestas tardías, navegación, cierre de sesión, configuración independiente de cuentas, solicitudes y supervisión sin secretos. Sin desbordamiento horizontal.

## Pendientes reales

El propietario confirmó que no tiene aplicaciones OAuth. Debe registrar Google y Microsoft, configurar los secretos en Supabase y autorizar buzones dedicados siguiendo V318-OAUTH-PROPIETARIO.md. La conexión y lectura de correos reales requieren esa autorización y las aprobaciones del proveedor. Las pruebas simuladas no sustituyen esa validación. No se crean pedidos ni usuarios ficticios en producción.
