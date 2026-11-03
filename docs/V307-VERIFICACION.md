# V307 — CAPTCHA y regreso a portada

Base: V306, 5e8e809079c21f8c53df32553881c55ef00f5069.
Sitio: https://www.clancartan.com/

## Diagnóstico

Los registros de Supabase Auth confirman rechazos captcha_failed con invalid-input-response. Ese código puede corresponder a un proveedor o una clave que no coinciden con el widget; no prueba por sí solo que el token haya caducado. El widget público es Cloudflare Turnstile, por lo que el proveedor de Supabase debe ser Turnstile. El propietario indicó que seleccionó Turnstile y guardó el cambio. Después de ese ajuste, el propietario confirmó que ya puede ingresar. No se solicitaron ni revelaron secretos. El conector no permite editar Auth config.

La prueba anterior de V306 confirmó que CAPTCHA era obligatorio, pero no validó un token legítimo ni identificó por sí sola el proveedor configurado.

## Correcciones de código

- Un token cliente se utiliza una sola vez; se rechazan tokens antiguos o distintos de la respuesta actual del SDK y se reinicia el widget.
- Se impide enviar dos veces el formulario mientras una solicitud está en curso.
- Los errores de CAPTCHA de acceso, registro y recuperación se presentan en español. El detalle técnico no se muestra como mensaje al usuario.
- El error de acceso tiene contraste y espacio legibles; desaparece el bloque vacío que generaba un hueco innecesario.
- Al volver desde acceso, negocio o panel, la portada comienza arriba. La reproducción previa conservaba scrollTop=100 y dejaba la cabecera en y=-100.
- Al abrir acceso se reinicia la posición del formulario para evitar una vista cortada.
- Los fondos decorativos de cabecera y paisaje se funden por sus cuatro lados; se eliminan la línea inferior y el marco añadido al logotipo, manteniendo bordes y focos de los controles interactivos.
- En tablet se ajusta el tamaño de la ilustración para no mostrar las bandas del archivo panorámico.
- Funciones, botones, diseño y datos de V305/V306 conservados; versión V307 y cachés relevantes actualizados.

## Verificación

- Batería existente de módulos, finanzas, identidad, roles y diez vistas de Chrome.
- Regresión de regreso a portada: cerrar cada acceso debe dejar scrollTop=0.
- Fixture sin red del ciclo del token: ausente, primer uso, segundo uso, caducidad, discrepancia del SDK y callbacks de error/expiración. Estos tokens de prueba solo se usan en un archivo temporal de la prueba, nunca en producción.

El propietario confirmó un ingreso real correcto tras seleccionar Turnstile. Esa comprobación es una confirmación manual del propietario; no un inicio de sesión ejecutado por el agente. La reutilización de un token real no se probó en el servidor; su rechazo en cliente se cubre con el fixture sin red. No se desactiva CAPTCHA ni se crean widgets/proyectos duplicados. No se modifican saldos, cuentas, membresías ni esquema.
