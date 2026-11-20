# V400 — auditoría general y corrección de respuestas tardías

## Resultado y alcance

Revisión del inicio y catálogo públicos, los cuatro negocios, navegación, búsqueda DNI, panel ADMIN, soporte y apariencia. Código base: `d8d70ee045329cf71c5006bf2b786f8b492490f9`. Respaldo completo recuperable verificado: `/workspace/clan-antes-auditoria-v400.bundle`.

Los errores corregidos están en el ciclo de vida del soporte. No se cambiaron esquemas, saldos, pedidos, préstamos, abonos, activaciones ni fórmulas financieras.

## Correcciones

- Cerrar soporte mientras se verificaba la sesión provocaba `Cannot set properties of undefined (setting 'innerHTML')`. Reproducido con la interfaz real y una respuesta demorada antes de corregirlo.
- Una respuesta de una ventana anterior podía reemplazar el contenido de una ventana recién abierta o desbloquear un formulario nuevo que todavía se estaba guardando. Las respuestas sólo actualizan su ventana y generación originales.
- Al cambiar de cuenta, el texto de búsqueda y otros estados de soporte podían conservarse. Se limpian al abrir con otra identidad y se atiende el evento existente de actualización de sesión.
- Después de cargar páginas antiguas, enviar una respuesta podía retirar el acceso a mensajes anteriores. Se conserva por separado la disponibilidad de páginas antiguas; una prueba recorre los 181 mensajes completos después de enviar.
- Una captura pedida en una conversación podía terminar de cargar sobre otra conversación. La vista previa valida también la conversación que la solicitó.

La misma API y los mismos permisos permanecen vigentes. No se cancelan ni duplican operaciones del servidor al cerrar una ventana: se ignoran las respuestas que ya no corresponden a la vista actual. Se añade una comprobación automática de estas regresiones en GitHub.

## Verificaciones locales

Las pruebas usan datos sintéticos y respuestas controladas, salvo cuando se especifica PostgreSQL local real. Nunca se usaron credenciales, dinero ni mensajes de clientes reales.

| Área | Evidencia |
|---|---|
| Recursos del sitio | 79 archivos locales referenciados presentes; sintaxis de scripts desplegados y 13 bloques inline correctos |
| MI COCHERA | 30 casos de navegador; regresiones adicionales V387 en PC/390/320 |
| MI ALQUILER | Suite completa en PC/390/320: formularios, búsqueda, reportes, activación; resumen financiero calculado por PostgreSQL local |
| STREAM BULL’S | 39 casos de roles y regresiones, incluidos afiliado, vencido y negocio distinto |
| Navegación general | 14 casos de retorno, ventanas anidadas y sesión conservada |
| DNI | PC y celular, cinco consultas controladas por tamaño; sin errores JS |
| COBRA YA | Base PostgreSQL local nueva: búsqueda, cuotas, moneda, idempotencia, aislamiento y activación vencida; interfaz, PDF real analizado, comprobantes, agenda, reportes, errores y estado vacío |
| ADMIN y autenticación | PC/celular: formulario de contraseña y errores, nonce, paginación, ficha de usuario, bono sin duplicidad ni activación, referidos, proveedores OAuth pendientes y cambio de sesión |
| Catálogo y cambio | 20 casos de roles, precios PEN/USD referencial y errores del proveedor; sin compras reales |
| Apariencia | Preferencia del sistema, elección explícita, recarga, sincronización entre pestañas y almacenamiento bloqueado |
| Soporte existente | Cliente/ADMIN, estado solucionado, reintento sin duplicar, adjuntos y cierre en PC/390/320, con RPC sobre PostgreSQL local y Storage HTTP simulado |
| Consultas de compra | Propiedad de pedido, producto, paginación, conexión fallida y ausencia de compras en tres tamaños |
| Regresiones V400 | Seis casos con solicitudes demoradas, cambio de cuenta, dos guardados y navegación entre conversaciones |

La primera ejecución de agenda COBRA YA sobre una base local antigua no encontró vencimientos de hoy porque sus fixtures tenían fechas de días anteriores. Se preparó una base nueva con los fixtures oficiales relativos a la fecha actual y pasó la suite completa. No se alteraron fechas de préstamos de producción.

## Revisión de producción sin operaciones de clientes

- Health Advisors de Supabase sin avisos en el momento de la consulta.
- Ventana de logs de 30 minutos al iniciar la auditoría: dos respuestas 401 en `cc_my_invitation_codes`; sin respuestas 5xx ni otros errores REST en esa ventana. Es una observación acotada, no una garantía permanente de disponibilidad.
- Revisión de RLS y permisos de tablas de clientes, préstamos, abonos, vehículos, inquilinos, contratos y cuentas operativas. Se conservan filtros por propietario y activación. En STREAM, la política de vigencia es RESTRICTIVE y se combina con la política de propiedad; no equivale a permitir consultar todos los propietarios.
- La función de correo de recargas registró 30 respuestas HTTP 200 en la misma ventana. Esto verifica respuesta del servicio, no certifica una recarga particular ni modifica sus movimientos.
- ADMIN conserva su acceso de supervisión mediante las funciones existentes autorizadas. No se amplían permisos en esta versión.

## Límites y pendientes

- Google y Apple siguen deshabilitados en los ajustes públicos de Auth. Requieren configurar cada proveedor con sus credenciales OAuth en Supabase → Authentication → Sign In / Providers. No se muestran como accesos operativos ni se simula un inicio de sesión social.
- Cambio real de contraseña, recepción de correos y conversaciones/adjuntos con cuentas reales de producción necesitan sesiones autorizadas. Aquí se comprobaron con pruebas controladas; no se enviaron correos ni mensajes a usuarios.
- No se ejecutó una prueba de 10 000 usuarios ni se certifica esa capacidad con esta auditoría.

## Publicación y reversión

Versión del sitio V400. Publicación mediante GitHub/main y el proyecto Cloudflare Pages existente, sin staging. Verificar versión y SHA256 del script de soporte servido, abrir inicio y catálogo en navegador real y confirmar despliegue del commit final.

Para revertir, revertir los cambios V400 de frontend en main y publicar por el mismo flujo. No hay migración ni reversión de datos que ejecutar. Las conversaciones y registros financieros permanecen intactos.
