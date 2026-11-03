# V306 — activación de CAPTCHA y cierre de versión

Base: V305, 0a28b7c374f9f800624d36ff16db0d433adf1562.
Sitio oficial: https://www.clancartan.com/
Comprobación: 2026-11-03, 16:25 UTC.

## Resultado confirmado

El propietario habilitó CAPTCHA en Supabase Auth. La prueba negativa de esta versión no confirmó por sí sola el proveedor seleccionado ni la aceptación de un token legítimo; véase la investigación posterior V307. Dos solicitudes al endpoint real /auth/v1/token?grant_type=password con un correo reservado .invalid, inexistente, confirmaron:

| Caso | HTTP | Código | Respuesta |
| --- | --- | --- | --- |
| CAPTCHA ausente | 400 | captcha_failed | no captcha_token found |
| CAPTCHA deliberadamente inválido | 400 | captcha_failed | invalid-input-response |

Antes de la configuración devolvían invalid_credentials; ahora el servidor exige CAPTCHA antes de comprobar credenciales.

## Cambios de esta versión

- Versión pública y etiqueta del panel actualizadas a V306; caché del cargador del panel actualizada.
- Registro de la activación de seguridad y de las comprobaciones reales.
- Diseño, botones, funciones y datos de V305 conservados. No se repite ni reimplementa el trabajo visual.

## Límites pendientes

El navegador automatizado cargó la API de Cloudflare y montó el widget, pero no recibió un token fresco. La prueba de token válido y su reutilización requiere completar el desafío interactivamente. No se afirma haber iniciado sesión en una cuenta real ni haber verificado íntegramente esa secuencia.

No se enviaron correos, pagos, bonos ni recargas. No se modificaron cuentas, saldos, membresías ni esquema. No se recuperaron secretos ni se crearon proyectos/widgets duplicados.
