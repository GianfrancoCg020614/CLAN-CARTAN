# V311 — Formularios de COBRA YA, MI COCHERA y MI ALQUILER

Base: V310, 81ae4d3f97f39d3aa3295dfd6c34c128f9fa4aa9.
Sitio: https://www.clancartan.com/

## Correcciones

- Un controlador compartido mejora únicamente los formularios emergentes existentes de los tres negocios. No añade botones, formularios ni vías de acceso a datos.
- Los diálogos reciben nombre accesible, el foco entra en un campo o control apropiado, Tab/Shift+Tab permanecen dentro y Escape activa el cierre nativo del formulario.
- Al cerrar se restaura el foco al botón de origen si sigue disponible; se conserva la ventana del negocio. Los botones de cierre tienen nombre accesible y un objetivo de al menos 44 px.
- Las ventanas emergentes se muestran por encima de los paneles. La reproducción de MI ALQUILER usa su ventana nativa a z-index máximo; el formulario anterior quedaba detrás.
- Cerrar MI COCHERA retira también su formulario pendiente; antes podía permanecer visible al salir del negocio.
- Las secciones de MI ALQUILER comienzan arriba al cambiar de pestaña, evitando llegar a mitad o al final del contenido.

## Verificación y límites

Chrome ejecuta los módulos reales con API simulada, red bloqueada y datos ficticios. Abre la ficha nativa de COBRA YA, Registrar carrito en MI COCHERA y Registrar inmueble en MI ALQUILER. Comprueba foco, nombre, superposición con hit-test, recorrido Tab, Escape, regreso, limpieza al salir y posición inicial. También comprueba bloqueo cuando se retira el permiso COBRA o la membresía de COCHERA/ALQUILER. No se envían formularios ni se guardan datos.

Se mantiene la suite anterior de seis estados de rol, publicaciones, compras, entregas, recargas, bonos y finanzas. No es una prueba de operaciones privadas reales con credenciales del propietario ni una auditoría integral de accesibilidad. No cambia RPC, RLS, Auth, esquema, proyectos, widgets ni datos existentes.
