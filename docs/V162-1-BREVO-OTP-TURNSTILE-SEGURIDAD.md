# CLAN CARTAN V162.1 — OTP Brevo y Turnstile: preparación segura (22-OCT-2026)

## Punto 2: Brevo / Supabase OTP
- Registro histórico: Brevo SMTP configurado, dominio DKIM/DMARC presente, incidente de correo con cuerpo vacío (18-OCT-2026).
- Archivo de recuperación: `supabase/templates/confirm-signup-recovery-v162-1.html`. Contiene el marcador **dinámico** `{{ .Token }}` y cuerpo legible sin depender de hojas de estilo ni imágenes remotas.
- No asumir que la plantilla guardada en el repositorio es la que Supabase realmente envía. Antes de aplicar, respaldar/exportar el cuerpo y asunto reales de Authentication > Emails > Templates > Confirm signup.
- En Supabase Auth, usar el modo HTML/Source del editor; sustituir el cuerpo por el archivo de recuperación sin modificar `{{ .Token }}`, confirmar el guardado y volver a abrir el editor para verificar persistencia.
- Con un email de prueba propio y autorizado, efectuar **un** registro o reenvío controlado, validar asunto, cuerpo, OTP real y flujo completo de confirmación. No escribir OTP ni credenciales en GitHub, logs o chat. Si fallara, revisar logs de Supabase Auth y actividad transaccional de Brevo; distinguir error SMTP de cuerpo vacío.
- La interfaz del portal debe ajustarse a la longitud real configurada de OTP en Supabase; no asumir seis u ocho cifras por el texto histórico. La plantilla deliberadamente no fija esa longitud.

## Punto 3: Cloudflare Turnstile
- Widget creado en la cuenta Cloudflare: `CLAN CARTAN Auth - Supabase`, modo `managed`, `no_clearance`, dominios `clancartan.com`, `clan-cartan.pages.dev`, `gianfrancocg020614.github.io`.
- Sitekey PÚBLICA: `0x4AAAAAAFgi3l7LiJrucZTP`. **No registrar ni revelar la secret key** en GitHub, chat, frontend ni documentación.
- `main` tiene `scripts/v123-turnstile.js`: se activa solo si `<meta name="cc-turnstile-sitekey" content="...">` está configurada. Comprobar que el token `captcha_token` se transmite en **registro, login y recuperación**, y que se restablece tras envíos; probar flujos de éxito, error y expiración.
- Antes de habilitar en Supabase Auth > Authentication > Bot and Abuse Protection, guardar la **secret key** obtenida directamente desde Cloudflare mediante el formulario seguro de Supabase, seleccionar el proveedor **Turnstile**, y verificar que frontend/sitekey/token funcionen en staging.
- No habilitar CAPTCHA del lado servidor mientras producción no emita tokens: rompería login/registro/reinicio de contraseña. No incorporar la sitekey en el frontend de producción hasta coordinar el despliegue y las pruebas.
- Verificar en navegador móvil y escritorio; CAPTCHA no debe bloquear usuarios legítimos. Después activar gradualmente y mantener plan de reversión.

## Estado de esta rama
Preparación y widget creados; **NO** se ha reconfigurado Supabase Auth, **NO** se ha alterado el frontend `main`, **NO** se ha probado entrega de OTP ni autenticación con CAPTCHA. No fusionar/publicar sin QA y control de versión.
