# V399 — catálogo compacto y consultas sobre compras

## Catálogo

Una cabecera y una zona central: título, cantidad de resultados, buscador, categorías y productos reales. Se retiraron de su generación la escena decorativa, el botón flotante antiguo de contacto, el banner informativo antiguo y los seis ejemplos sin stock. No se ocultan tarjetas ficticias ni se mantienen contenedores vacíos para ellas.

Los accesos globales antiguos que siguen sirviendo a otras pantallas no se activan en el catálogo. El acceso de soporte existente se mueve a su cabecera cuando hay sesión; para visitantes queda un contacto por WhatsApp en esa misma barra. Se conservan los destinos y el perfil existentes.

Las fichas muestran una sola vez el stock y el precio aplicable. Las condiciones se despliegan al solicitarlas. La búsqueda y las categorías filtran el contenido sin reconstruir la cabecera ni perder el foco del campo. El equivalente USD, el origen del tipo de cambio, la compra por billetera y los precios decididos por la RPC se conservan. Paletas de día/noche compartidas con el resto de la plataforma.

Se sustituyeron las hojas del catálogo V117/V169, retirando sus sucesivos parches de ejemplos y contactos flotantes. Se conservaron los estilos de perfil y publicación que compartían ese archivo. No hay migraciones ni cambios de reglas financieras para el catálogo.

## Soporte: Ayuda con mi compra

Motivos del formulario: Información de producto, Ayuda con mi compra, Propuesta de proveedor y Otro motivo. Se mantienen válidos los motivos históricos ya registrados.

Al elegir Ayuda con mi compra se consultan únicamente los pedidos cuyo comprador coincide con `auth.uid()`. Selector de pedido, producto real asociado, carga de pedidos anteriores (20 por página) y reintento ante fallo de conexión. La compra es obligatoria en ese motivo; si no hay compras, se informa y se puede elegir Otro motivo. Cada pedido actual corresponde a una publicación/producto; no se inventan productos adicionales.

El servidor valida nuevamente la propiedad del pedido al guardar. Genera el asunto con código y título reales y clasifica esa consulta como STREAM BULL’S. ADMIN puede ver el contexto dentro de la conversación, conservando sus permisos existentes. La API sigue siendo `cc_support398`: no hay otro chat, login ni billetera.

Migración aditiva aplicada: `20261120065224_support_purchase_selection_v399.sql`. Añade contexto de pedido a los tickets y amplía motivos válidos. No modifica pedidos, saldos ni pagos. Los códigos y títulos se guardan como contexto histórico del soporte, sin introducir restricciones de borrado sobre las tablas de pedidos.

La revisión automática rechazó el primer intento por un posible problema de permisos. Se hizo explícito el GRANT de la API pública a authenticated, se volvió a probar toda la migración en una base local limpia y el segundo intento fue aprobado. Se verificó en producción: API disponible para authenticated, denegada para anon y sin acceso directo a la función privada antigua. El wrapper público mantiene SECURITY INVOKER.

## Pruebas

- 20 casos de regresión de catálogo y tipo de cambio: precios público/distribuidor, PEN/USD referencial, publicación y cotización de compra simuladas, roles y errores de tipo de cambio.
- Interfaz real local: visitante/afiliado/ADMIN en 1366, 390 y 320 píxeles, día/noche, una cabecera, un contacto, ausencia de botones flotantes antiguos y ejemplos, filtros, foco del buscador, condiciones, estados sin productos, error y reintento; regreso al inicio sin perder soporte.
- Migraciones V398/V399 desde cero en PostgreSQL local y pruebas de aislamiento de consulta/pedido, pedidos ausentes/ajenos, asunto generado por servidor, idempotencia y lectura ADMIN del pedido asociado.
- Formulario de soporte real local conectado a PostgreSQL local: tres tamaños, cuatro motivos, compra seleccionada, producto asociado, paginación, error/reintento y ausencia de compras. Regresión de conversación, adjuntos, cierre y estados de soporte V398.
- Sintaxis JS y 13 bloques inline; diff sin errores de espacios.

Las pruebas usan cuentas y pedidos sintéticos. No se hicieron compras, recargas ni mensajes a clientes reales. Las capturas privadas de soporte y catálogo con productos se tomaron en Chromium local con esos datos de prueba. No constituyen una prueba autenticada con cuentas reales de producción.

## Respaldo y reversión

Respaldo Git completo verificado antes de modificar: `/workspace/clan-antes-catalogo-v399.bundle`, base `881dfa1d1ea7c0d71e85011c4fd69ba2c4e7a890`.

Revertir el commit de interfaz y publicar mediante el flujo GitHub/Cloudflare existente. Conservar las columnas, tickets y contexto nuevos; no borrar historial. La API nueva acepta los motivos y solicitudes antiguas, por lo que el frontend anterior sigue siendo compatible.

Si fuese indispensable revertir también el wrapper, restaurar primero el permiso EXECUTE de `cc_internal.support398(text,jsonb)` a authenticated y hacer que la API pública invoque esa función anterior. Mantener el GRANT de la API pública a authenticated y conservar los motivos/columnas añadidos; no ejecutar una migración destructiva.

## Reproducir localmente

En una base desechable con roles anon/authenticated: `tests/fixtures/support398.sql`, migración V398, `tests/fixtures/support399-orders.sql`, migración V399 y `scripts/test-v399-purchases.sql`. Los runners Python usan el contenedor existente `cobra-v371-test`, base `support398test` y HTTP 127.0.0.1:8000; adaptar esos nombres en otra máquina. No crear un entorno de producción de prueba ni ejecutar fixtures sobre Supabase real.
