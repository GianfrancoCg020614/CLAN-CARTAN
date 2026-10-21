# CLAN CARTAN · MI ALQUILER V161.4 · Parte 4 de 5

**Base conservada:** V161, V161.1, MI ALQUILER V161.2 y V161.3.
**Rama:** `integracion/mi-alquiler-v161-4`. No fusionada con `main` ni publicada en Cloudflare.

## Funciones implementadas
- La sección Avisos consulta únicamente contratos, movimientos y personas del usuario conectado; RLS y membresía vigente obligatorias.
- Recordatorios visibles al faltar hasta 5 días, a 3 y 1 día, el día de vencimiento, y atrasos; datos de Lima.
- El enlace `https://wa.me/<número del inquilino>` toma exclusivamente la columna `ma_tenants.whatsapp` de ese RESELLER, con consentimiento explícito `consent_whatsapp`. No se usa el número del ADMIN.
- Cambiar teléfono o fecha invalida el indicador de apertura anterior; `ma_log_notice` rechaza teléfono obsoleto, cuentas ajenas, ausencia de consentimiento o contrato cerrado.
- La única marca auditada es **OPENED / enlace abierto**, nunca «mensaje enviado», entregado o leído. Envío desatendido requiere WhatsApp Business Platform con backend, cuentas comerciales y consentimiento adecuado.
- Búsqueda parcial por nombre, DNI, teléfono, unidad/local y pequeñas erratas.
- Exportación `.xlsx` local con ocho hojas reales, sin librerías remotas ni ejecución de fórmulas inyectadas; botón Imprimir permite guardar PDF.
- Botón «Verificar DNI ahora»: función Edge `ma-verify-dni`, JWT verificado, membresía, búsqueda primero en cartera propia, luego permiso central `cc_dni_auto_permission`, cupo compartido `cc_claim_dni_quota` y API Perú `POST https://api.apiperu.pe/dni` usando secreto `APIPERU_TOKEN` solo en servidor. Cuando falta token, cupo, permisos o disponibilidad, permite registro manual.
- Edge independiente desplegada en Supabase con `verify_jwt=true`; NO se modificaron las funciones DNI de COBRA YA o MI COCHERA.

## Seguridad y validación
- Tabla `ma_whatsapp_notice_events`: RLS SELECT por arrendador y membresía activa, sin DML directo para clientes.
- RPC `ma_log_notice` SECURITY DEFINER con guard `ma_guard`, validación de propietario, consentimiento, WhatsApp actual, vencimiento actual e idempotencia.
- La primera migración aplicada creaba una FK a `ma_accounts` que impedía avisos de ADMIN con contratos propios; se aplicó hotfix a `auth.users`. En el repositorio hay tanto migración inicial corregida como hotfix para reflejar el entorno migrado.
- Prueba SQL `BEGIN; ... ROLLBACK;`: apertura, duplicado, teléfono cambiado, falta de consentimiento, RLS, escritura cruzada y sin datos ficticios persistentes.
- Prueba de navegador móvil: DNI simulado, WhatsApp individual, búsqueda con error tipográfico y Excel descargado.
- Archivo Excel validado con openpyxl: ocho hojas, nombres y teléfonos intactos.
- No se ha probado una consulta **real** al proveedor con token vigente; el backend se despliega pero requiere token, permiso y cuota existentes. No atribuir verificación real a la prueba simulada.

## Pendiente para V162
- Regresión completa de cuatro módulos en entorno de pruebas con autenticación real, roles, vencimientos y datos reales autorizados.
- Verificar credencial/token API Perú real sin exponerlo; validar cupo y respuesta proveedor bajo permiso legal.
- Revisar pendientes de recargas reales y suscripción comercial (no habilitados en V161.4), copias de seguridad, consentimiento, protección de datos y métricas.
- Confirmar WhatsApp Business oficial solo si el usuario requiere envíos totalmente desatendidos.
- Fusionar a `main`, publicar en Cloudflare y habilitar el acceso comercial únicamente después de las comprobaciones y aprobación explícita de publicación.

**Estado:** V161.4 integrada en rama de desarrollo y su componente Edge aislado en Supabase. No publicada en la portada pública.
