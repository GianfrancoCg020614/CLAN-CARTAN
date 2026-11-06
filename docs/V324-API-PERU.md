# V324 — API Perú: autorización del servidor y diagnóstico

Se reprodujo un bloqueo real del control de cupo: con JWT moderno de servicio, la función devolvía forbidden porque leía el ajuste antiguo request.jwt.claim.role. Se cambia únicamente esa lectura por auth.jwt()->>role. Se mantienen permisos service_role, elegibilidad existente, bloqueo transaccional, 100 consultas mensuales y 20 diarias por operador.

Se conserva la fuente desplegada con caché de identidad de COBRA YA, MI COCHERA y MI ALQUILER al versionarla. Los tres backends registran al iniciar únicamente el módulo y si APIPERU_TOKEN está cargado. No registran el token, DNI, nombres, teléfonos ni credenciales.

Pruebas aisladas: JWT moderno, intento de suplantación con campo antiguo y user_metadata, límites diarios/mensuales y contadores. Quince pruebas de backend con proveedor simulado: consulta, token ausente, reutilización de caché, permisos y cupo. No se usan documentos reales ni se contacta al proveedor en estas pruebas.

La presencia del token y un servicio desplegado no prueban que el proveedor acepte la clave, que haya saldo externo o que un DNI autorizado devuelva datos. Esa validación se distingue expresamente del diagnóstico interno. No se inventan DNIs ni se solicita la clave por chat. No cambia billeteras, tarifas, roles comerciales ni datos personales.

Migración aplicada: 20261106003325_v324_dni_service_claims.sql. Comprobación de producción con JWT de servicio y usuario nulo: not_authorized (antes forbidden), sin consumir cupo; cero consultas registradas. Preflight de los tres servicios: HTTP 200.

Diagnóstico de producción: los tres módulos confirman provider_configured=true. Esto confirma presencia del token, no su aceptación por el proveedor. La consulta de un DNI autorizado debe realizarla el titular desde su sesión; se solicitó únicamente el resultado, sin compartir documentos ni nombres.

Se actualiza también el reconocimiento del rol de servicio al registrar agotamiento del proveedor y se alinea la notificación de MI COCHERA con los otros módulos. Migración: 20261106003801_v324_dni_exhaustion_claims.sql. No se invoca esa señal en producción para probar; se verifica con datos ficticios.
