# V308 — Navegación y usuarios del panel

Base publicada: V307, commit 6dd888e06c28d60279d5b92f8cfae6d7418996bd.
Sitio: https://www.clancartan.com/

## Problemas reproducidos

En Chrome móvil de 375 px, el menú anterior excedía la anchura disponible y exigía desplazamiento lateral. La búsqueda de «jose» no encontraba «José», y actualizar las cuentas perdía el término de búsqueda y cerraba las fichas. No había un resultado visible al buscar una cuenta inexistente y la ayuda aún hablaba de un ojo, aunque el control ya decía «Ver ficha».

## Cambios

- Tres destinos principales y «Más» en móvil. ADMIN: Resumen, Usuarios y Billetera. Los otros roles conservan destinos adecuados a sus permisos. Todas las opciones anteriores permanecen disponibles.
- «Más» se cierra al elegir un destino, pulsar fuera o usar Escape. El teclado vuelve al control al cerrar con Escape; se declaran controles, etiquetas y estado expandido.
- En escritorio se conservan todos los destinos visibles; las etiquetas accesibles también identifican los iconos en tableta.
- Búsqueda tolerante a tildes, contador de resultados y mensaje sin coincidencias. El término y las fichas abiertas se conservan durante actualizaciones dentro de la sesión; se borran al terminar/cambiar de sesión.
- La ayuda coincide con «Ver ficha»; se conservan edición de nombre, recargas, bonos y controles de roles.
- Versión V308 y caché del cargador y panel actualizadas. La nueva hoja se carga después de las hojas compartidas para asegurar la cascada real.

## Verificación y límites

La prueba de regresión usa datos ficticios y el código real del panel en Chrome. Cubre menú y cierre, separación de permisos ADMIN/Súper reseller/reseller, búsqueda, actualización, fichas, ADMIN protegido y ausencia de promoción cuando la membresía está pendiente. Un guard impide operaciones de escritura durante el fixture.

Se mantienen las pruebas existentes de navegación, tres roles, membresías, recargas, bonos y permisos. No se ha iniciado sesión con credenciales del propietario ni ejecutado pagos, cambios de rol o ediciones de cuentas reales. No hay migraciones, cambios de Auth ni proyectos/widgets nuevos. El ingreso real confirmado por el propietario en V307 se conserva.
