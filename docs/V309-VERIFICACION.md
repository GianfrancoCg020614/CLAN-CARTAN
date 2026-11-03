# V309 — Formularios administrativos y pedidos

Base: V308, 2c27126501743e5ec179b15b18a521aaec89dbc7.
Sitio: https://www.clancartan.com/

## Correcciones

- «Otorgar recarga» abre directamente el formulario desde Acciones rápidas, conservando la selección al llegar desde una ficha.
- El formulario de bonos conserva destinatario, negocio, importe y motivo durante actualizaciones. La recarga conserva incluso un importe incompleto mientras se escribe.
- Ambos formularios muestran el estado de procesamiento y mantienen el bloqueo de envío durante un redibujado; al terminar desbloquean el botón actual, incluso si el elemento original fue sustituido.
- El resultado de aprobar/rechazar una recarga se muestra después de actualizar la cola, evitando que la actualización lo borre.
- El módulo de liquidaciones conserva «Supervisar pedidos» en el menú y sus reportes quedan en un desplegable al final, después de los pedidos. No se eliminan exportaciones ni controles de liquidación.
- La referencia opcional de recarga comunica su longitud válida (4–120 caracteres) en lugar de mostrar un error de importe.
- Pedidos muestra estados en español y un único selector Todos/Pendientes/Entregados/Reembolsados. El filtro permanece durante actualizaciones. Las métricas conservan su alcance total y no se modifican reglas contables.

## Validación

Fixture de Chrome sin red y con UUID ficticios: operaciones simuladas exclusivamente en memoria. Reproduce los fallos de la versión anterior y cubre apertura directa, destinatario, borradores, bloqueo y recuperación del botón tras redibujados, prevención de envíos simultáneos, confirmación de solicitud pendiente, resultado de revisión, actualización de cola, traducción de estados y filtro. ADMIN sigue sin poder entregar como vendedor. No se reutilizan claves de prueba en producción.

Se ejecutan también las pruebas existentes de recargas, permisos, identidad, membresías, roles y vistas públicas. El backend conserva sus RPC, RLS, confirmación bancaria e idempotencia existentes.

No se ejecutaron pagos, recargas, bonos o cambios sobre cuentas reales, ni se inició sesión con credenciales del propietario. Sin migraciones ni cambios de Auth, proyectos o widgets.
