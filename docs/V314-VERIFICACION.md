# V314 — Usabilidad de MI COCHERA y MI ALQUILER

Base: main V313 (`3fef68f936129834961900a80347f3f2c4e44c49`). Se mantiene el repositorio, Pages y Supabase existentes.

## Cambios

- MI COCHERA: búsqueda sin diferencias por tildes y por código C-001; conserva el campo al escribir, agrega filtro por estado y contador, conserva filtros al actualizar y explica resultados vacíos.
- Dos acciones principales por carrito y acciones secundarias en «Más acciones». Cobrar queda bloqueado cuando no existe deuda.
- WhatsApp selecciona un teléfono válido del propietario o trabajador y ofrece un enlace alternativo cuando el navegador no devuelve ventana.
- Desactiva controles durante el guardado y evita duplicar retiros, reactivaciones y activaciones por dobles pulsaciones.
- Las cargas tardías no reemplazan datos de otra cuenta. Un guardado iniciado en un formulario no cierra un formulario nuevo. Los errores se muestran en el formulario correspondiente.
- La insignia de billetera suma solo saldos reales y mantiene separado el bono de activación.
- MI ALQUILER: búsqueda y actualización mantienen «Solo vencimientos», con indicación del filtro activo y mensaje sin coincidencias.
- El formulario de gastos se integra al controlador de ventanas: foco, Tab, Escape, botón accesible y eliminación al cerrar el negocio.
- Campos móviles de 16 px y controles de al menos 44 px en las superficies modificadas; se retira una regla CSS exclusiva del formulario de bonos duplicado ya eliminado.
- Versión visible y cachés actualizadas a V314. No cambia precios, RPC, esquema, secretos ni reglas financieras.

## Verificación

- Sintaxis de los módulos modificados y comprobaciones estáticas de MI COCHERA y MI ALQUILER: correctas.
- Chrome mediante Cloudflare Browser Rendering a 375×844 y 1440×900: tres escenarios V314 correctos (búsquedas/acciones/sesiones, contabilidad y avisos). Sin desbordamiento horizontal ni errores JavaScript.
- Regresión V313 de DNI en ambos negocios: correcta con respuestas simuladas, conservando la edición manual y rechazando respuestas de otra sesión o formulario cerrado.
- Se agrega la regresión V314 al flujo existente de GitHub Actions. Debe aprobarse el conjunto completo antes de integrar y publicar.

## Límites y protección de datos

Las pruebas privadas ejecutan los módulos reales con cuentas y datos ficticios y API interceptada. Las dos escrituras del escenario de carritos se simulan en memoria: no se realizan cobros, ventas, retiros ni cambios de membresía reales. No se consultó API Perú. No se borran registros ni se crean proyectos. Chrome local está restringido por el sandbox; el navegador remoto y GitHub Actions realizan la comprobación de navegador.
