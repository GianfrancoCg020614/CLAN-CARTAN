# CLAN CARTAN V106 — Correo OTP y DNI

## Plantilla de registro de 6 dígitos
La plantilla para Supabase Auth → Email Templates → **Confirm signup** está en [confirm-signup.html](../supabase/templates/confirm-signup.html).
Título recomendado: `Tu código para confirmar CLAN CARTAN`. Debe conservar literalmente `{{ .Token }}`, el valor OTP que proporciona Supabase. La interfaz V106 verifica ese código con el endpoint oficial `/auth/v1/verify` y `type=email`, no con un código fijo inventado.

## Ajustes pendientes y medidas de seguridad
1. En Supabase Auth de proyecto `pqalxtrcyrpmwqdlibqd`, configurar **Site URL** `https://www.clancartan.com/`; añadir en Allow List `https://www.clancartan.com/**`, `https://clancartan.com/**` y opcionalmente `https://clan-cartan.pages.dev/**` como respaldo.
2. Habilitar **Confirm email**, deshabilitar autoconfirmación; mantener contraseña de al menos 12 caracteres en frontend.
3. **SMTP de terceros obligatorio para uso público:** el SMTP de Supabase Free para proyecto creado en octubre 2026 no entrega a destinatarios externos del equipo y su plantilla no es personalizable sin SMTP propio. Configurar proveedor compatible, comprobar remitente autenticado, SPF/DKIM y política DMARC en la zona DNS Cloudflare. No sustituir por Cloudflare Email Routing, que recibe/redirige mensajes pero no sirve como SMTP saliente. No incluir credenciales SMTP en el repositorio.
4. Establecer plantilla **Confirm signup** a `{{ .Token }}` e idealmente caducidad apropiada, límite de reenvíos y protección antiautomatización. Realizar una prueba de registro desde navegador con dirección de correo de control autorizada y confirmar en `auth.users` si se completó.
5. **API Perú:** la documentación oficial está en https://docs.apiperu.dev/referencia/consultar-dni/; la función `cc-consulta-dni` ya usa `POST https://api.apiperu.dev/dni`, JWT y cupo local de hasta 100 usos al mes. Obtener token privado del panel https://app.apiperu.dev/dashboard y guardarlo únicamente como secreto de la función `APIPERU_TOKEN` en Supabase. Nunca pegarlo en chat/cliente/GitHub. Confirmar términos del plan y cupo real; DNI nuevo sin respuesta → ingreso manual, sin inventar nombres.
6. La función no se conecta a RENIEC directamente; obtiene datos del proveedor sujetos a su cobertura. Mantener autorización del titular/finalidad válida y privacidad.
7. Antes del lanzamiento público verificar acceso y aislamiento entre prestamistas, envíos SMTP, antispam y uso legítimo de DNI.

**Estado actual de este documento:** material preparado, NO equivale a plantilla/SMTP/token activados. Evitar afirmar éxito sin prueba.
