# MI COCHERA V396: grafito, crema y rojo

Adapta el módulo existente a la distribución de referencia: cabecera única, dos tarjetas financieras, cuatro indicadores interactivos, tres acciones principales y listado con pestañas. Paleta principal solicitada: #1C1C1C, #EDE6D8 y #B3261E; verde sobrio para cobrar. Conserva el logotipo original.

## Funciones y simplicidad

- «Por cobrar» muestra deuda en la moneda seleccionada; la tarjeta Billetera abre la billetera única y muestra únicamente saldo real disponible en PEN. No se suman monedas ni se duplican billeteras.
- Indicadores de carritos activos, alquiler del día, ventas del día y cobrado del día, vinculados a carritos, ventas o reportes existentes. No se inventan métricas.
- Nuevo carrito reutiliza el formulario DNI primero. Agregar producto y Registrar pago abren un selector paginado, con debounce, búsqueda por los campos autorizados existentes y selección explícita del carrito.
- El selector consulta mc373_workspace con el mismo aislamiento por propietario y sin descargar todos los registros. Permite elegir registros fuera de la página principal y filtra activos para productos o deuda para pagos.
- Las fichas se abren como ventanas tanto en PC como en celular, evitando un panel lateral y acciones duplicadas en el tablero. Calendario, historial, correcciones y retiro permanecen disponibles.
- La X vuelve a la ficha o selector anterior. Una respuesta tardía se descarta si se cerró el selector o cambió el usuario/token. Los reintentos de pago mantienen el identificador existente.
- Se agrega recuperación ante errores de apertura y de consulta. No se crean botones de notificación sin función ni contenedores vacíos de paginación.
- La página inicial muestra cinco carritos por página en PC y celular; Carritos conserva diez en PC y cinco en celular. La búsqueda y paginación siguen siendo del servidor.

## Corrección de navegación

«Volver a CLAN CARTAN» de MI COCHERA usa cc166CloseToHome, la función existente para el inicio público. Cierra el módulo y las ventanas, oculta el panel y llama a cc77Home, conservando la sesión. El respaldo de navegación tampoco abre el panel. No cambia los botones internos Atrás ni el cierre de otros módulos.

## Alcance y preservación

No cambia esquemas, autenticación, activaciones, roles, saldo, reglas de alquiler, precios, cronogramas, liquidaciones ni fórmulas. Pago y producto conservan formularios y RPC existentes. No modifica las operaciones de STREAM BULL’S, COBRA YA ni MI ALQUILER. No requiere migraciones ni una nueva aplicación/despliegue paralelo.

Respaldo anterior verificado: /workspace/mi-cochera-before-v396.bundle, base 5094fe92ae546102a9f8b49bfa4b71031a375b43. La reversión consiste en revertir el commit de integración mediante GitHub/Cloudflare, comprobando trabajo posterior; no hay datos ni esquemas que revertir.

## Verificación

Pruebas locales en 1366/390/320 px: cabecera/logo/billetera únicos, indicadores, tres acciones, búsqueda, selector paginado, selección de carrito fuera de la primera página, moneda del carrito, recuperación de errores, respuesta tardía al cambiar de propietario, cierre anidado y estado vacío. Regresiones V387: pago con clave idempotente, historial, correcciones y calendario. La prueba de navegación del índice completo verifica el inicio público y la sesión conservada, y mantiene las expectativas originales de los demás negocios. Integración con workspace PostgreSQL local, sintaxis y moneda compartida también se verifican.

Las capturas son renders reales de Chromium con datos ficticios locales. No se registran operaciones financieras reales en producción para probar la interfaz. La publicación se verifica por commit de Cloudflare, versión y hashes de CSS/JS.
