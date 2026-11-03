# V305 — acabado visual y acceso

Continúa desde V304 (3b8e4a4). Conserva botones y lógica de los cuatro negocios, así como Acciones rápidas del ADMIN.

- Bordes y sombras discretos, paisaje integrado y pie corporativo con CREADA POR CLAN CARTAN y contactos existentes.
- Móvil: cabecera compacta; logotipos y títulos sin solaparse; tarjetas más breves; controles táctiles y texto legible.
- Inicio de sesión: etiquetas visibles, mostrar/ocultar contraseña, recuperación y registro conservados.
- Turnstile: reutiliza el widget CLAN CARTAN Auth - Supabase. Sin widgets/proyectos duplicados ni secretos en el navegador. Token enviado al Auth existente para ingreso, registro, recuperación y reenvío; reinicio tras cada intento y al expirar.

## Activación de CAPTCHA en servidor: pendiente del propietario

La comprobación con un correo inexistente reservado .invalid devolvió invalid_credentials tanto sin token como con un token deliberadamente inválido. Por tanto, Supabase Auth todavía no exige CAPTCHA. El widget visible y el bloqueo cliente no sustituyen la validación del servidor.

El conector Supabase disponible no permite editar Auth config ni escribir sus secretos. El propietario debe abrir https://supabase.com/dashboard/project/pqalxtrcyrpmwqdlibqd/auth/protection, activar CAPTCHA, elegir Turnstile y guardar allí la clave secreta del widget existente de Cloudflare, sin enviarla al chat. No debe crearse otro widget ni rotarse la clave existente por este motivo.

Después: comprobar rechazo de token ausente/inválido y verificar un acceso con token fresco; comprobar rechazo al repetirlo. No afirmar protección integral antes de completar esa prueba.

## Verificación

La batería existente revisa diez vistas Chrome: 1920/1366/768/390/375, día y noche; formularios, documentos legales, navegación, tamaños táctiles, solapamientos, tarjeta/cabecera móvil compactas, cambio de tema/moneda, recursos y excepciones JavaScript. Se revisan capturas reales de la vista previa antes de publicar.

Las pruebas de interfaz por rol usan fixtures. No se modifican cuentas, saldos, membresías ni esquema de Supabase. No se envían correos, pagos ni bonos reales durante estas comprobaciones.
