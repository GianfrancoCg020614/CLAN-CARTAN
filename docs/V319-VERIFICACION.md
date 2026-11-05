# V319 — Ayuda de correo y consultas coherentes

Corrige la respuesta tardía de asistencia: si el comprador cambia el ORD, navega o cambia de sesión, la confirmación anterior no se añade al resultado nuevo. La interfaz explica cuándo la cuenta asignada requiere atención. La selección de inventario vuelve a una cuenta disponible si la selección anterior ya no existe.

Añade correo-configuracion.html, guía pública y responsive enlazada desde Mis correos y la supervisión ADMIN: registro OAuth, callbacks exactos, secretos en el proyecto existente, costes posibles, permisos delegados mínimos, buzón dedicado, caducidad, comprobación y desconexión. No contiene secretos ni registra aplicaciones automáticamente.

Validación: pruebas de navegador de comprador, proveedor y ADMIN con pedidos ficticios; nueva regresión de asistencia tardía y mensaje de cuenta no disponible; acceso a guía, aislamiento, móvil y copia de códigos. Ejecutar también la suite existente de GitHub antes de publicar.

Pendiente externo: el propietario no tiene aplicaciones OAuth de Google/Microsoft. Debe registrarlas, configurar secretos y autorizar cada buzón. La lectura real se valida después de ese consentimiento. No se alteran tablas, saldos, comisiones ni datos reales.
