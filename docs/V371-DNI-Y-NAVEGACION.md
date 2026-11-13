# V371 · DNI primero y navegación

El registro de clientes presenta primero el documento y consulta automáticamente `cc-consulta-dni` al completar ocho dígitos, con debounce de 350 ms y consulta manual alternativa. Se reutiliza la autorización y cuota actuales de API Perú. El servicio devuelve nombres y apellidos; teléfono, correo y dirección se registran manualmente. No cambia el servidor, esquema, permisos ni reglas financieras.

Se descartan respuestas de documentos anteriores, otra sesión, ventanas cerradas o consultas canceladas. Se conserva el nombre escrito manualmente durante una consulta. La falta de autorización, cupo o conexión permite continuar manualmente.

En las ventanas emergentes de COBRA YA se muestra una sola X: cierra la ventana y recupera la vista anterior, conservando el contexto. Escape tiene el mismo comportamiento. Se elimina el botón Atrás redundante del encabezado emergente. El cierre del panel principal regresa a la portada de los cuatro negocios sin cerrar sesión. El panel compartido conserva el origen al consultar billetera/perfil desde COBRA YA; MI COCHERA conserva el origen de su acceso a billetera y el catálogo conserva el regreso desde perfil. Cerrar en el panel compartido también cierra las capas de negocio y elimina el historial de navegación de esa visita. No se modifican operaciones de los negocios.

## Verificación

- `scripts/test-v371-dni-navigation.py`: Chromium, 1280×800 y 390×844; documento primero, foco, consulta automática, documento incompleto, nombre manual, respuesta tardía, autorización denegada simulada, regreso entre formularios, billetera y pestañas, cierre a portada y sesión conservada. Todos los servicios se simulan; no se consultan identidades reales.
- `scripts/test-v371-browser.py`: regresión con PostgreSQL aislado; se adapta el cierre del recorrido de ventanas al nuevo retroceso acumulado.
- GitHub Actions ejecuta además la prueba DNI/navegación en el flujo V371.

## Respaldo y reversión

Base: `8c1a39bc0e25d30d8324db126d58e1a6b6228ebf`. Respaldo Git completo en el entorno: `/workspace/clan-cartan-before-dni-navigation.bundle`. Revertir el commit de esta entrega mediante el flujo normal y volver a desplegar Cloudflare. No hay migraciones ni datos que revertir.
