# V305 — acabado visual y acceso

Continúa desde V304 (3b8e4a4). Conserva botones y lógica de los cuatro negocios, así como Acciones rápidas del ADMIN.

- Bordes y sombras discretos, paisaje integrado y pie corporativo con CREADA POR CLAN CARTAN y contactos existentes.
- Móvil: cabecera compacta; logotipos y títulos sin solaparse; tarjetas más breves; controles táctiles y texto legible.
- Inicio de sesión: etiquetas visibles, mostrar/ocultar contraseña, recuperación y registro conservados.
- Turnstile: reutiliza el widget CLAN CARTAN Auth - Supabase. Sin widgets/proyectos duplicados ni secretos en el navegador. Token enviado al Auth existente para ingreso, registro, recuperación y reenvío; reinicio tras cada intento y al expirar.

## Activación de CAPTCHA — completada en V306

Durante V305, las solicitudes sin token y con token inválido devolvían invalid_credentials. El propietario configuró después Turnstile en Supabase Auth con el widget existente.

La comprobación posterior del 2026-11-03 confirmó, sobre el servicio real:
- Sin token: HTTP 400, captcha_failed, no captcha_token found.
- Token inválido: HTTP 400, captcha_failed, invalid-input-response.

No se recuperó ni expuso la clave secreta. No se crearon widgets ni proyectos adicionales. El conector no cambió la configuración Auth: la guardó el propietario en su panel.

La emisión de un token nuevo y el rechazo de su reutilización siguen pendientes de una comprobación interactiva: el navegador automatizado montó el widget y cargó su API, pero no obtuvo un token. No se eludió el desafío ni se desactivó la protección para probarlo.

## Verificación

La batería existente revisa diez vistas Chrome: 1920/1366/768/390/375, día y noche; formularios, documentos legales, navegación, tamaños táctiles, solapamientos, tarjeta/cabecera móvil compactas, cambio de tema/moneda, recursos y excepciones JavaScript. Se revisan capturas reales de la vista previa antes de publicar.

Las pruebas de interfaz por rol usan fixtures. No se modifican cuentas, saldos, membresías ni esquema de Supabase. No se envían correos, pagos ni bonos reales durante estas comprobaciones.
