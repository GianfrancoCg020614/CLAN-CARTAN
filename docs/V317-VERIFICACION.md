# V317 — Formularios operativos de STREAM BULL’S

Base: V316, main 7d963da2ce8608cd31e475ad86bc1fe98741060e. Mismo repositorio y Pages; sin cambios en Supabase, Auth, precios ni permisos.

## Cambios

- Los formularios nativos se muestran por encima del panel. Se integran al controlador común de diálogos: título accesible, foco inicial, Tab/Shift+Tab, Escape y retorno al control de origen o al módulo actualizado.
- Un único Cancelar visible en la cabecera y Guardar al pie. Controles de al menos 44 px y campos de 16 px en móvil.
- Guardar se bloquea mientras está pendiente, evitando dobles envíos desde el mismo formulario. Muestra «Guardando…» y estado aria-busy.
- Los errores de las operaciones iniciadas desde un formulario se propagan al propio formulario: conserva el borrador y permite reintentar. Las acciones directas conservan sus avisos existentes.
- Cancelar la confirmación de continuidad de un cliente conserva el formulario y no realiza la asignación.
- Una respuesta de un formulario anterior no cierra uno nuevo. Los formularios se retiran al salir del módulo, cambiar la sesión o cerrar sesión.
- Fallos de lectura permiten «Volver a consultar», sin repetir el guardado. Se descartan resultados y errores de consultas anteriores o de otra sesión.
- Versión y cachés V317. Se mantienen todos los RPC y parámetros de operación originales.

## Verificación

Fixture con módulos reales del panel, STREAM operativo y controlador común, con API interceptada. Correcta en Chrome remoto a 375×844 y 1440×844: 23 comprobaciones de apertura, foco, visibilidad, tamaño táctil, teclado, errores, reintento, doble envío, borrador posterior, cancelación, navegación, renovación de sesión, cierre y ausencia de desbordamiento.

Reproducción con JavaScript anterior: el formulario se cierra después de rechazar el servidor el guardado y muestra un aviso, perdiendo la edición. La regla de capa anterior era z-index 9999, menor que el panel.

Regresión de los formularios COBRA YA, MI COCHERA y MI ALQUILER aprobada en móvil con el controlador actualizado. Se agrega V317 al workflow existente para ejecutar todas las regresiones antes de integrar.

Las tres solicitudes de guardado de la prueba (cuenta fallida, cuenta diferida y pago fallido) se simulan en memoria. No se crean cuentas, clientes ni pagos reales ni se modifica ninguna billetera. La prueba no confirma operaciones privadas con una sesión real del propietario.
