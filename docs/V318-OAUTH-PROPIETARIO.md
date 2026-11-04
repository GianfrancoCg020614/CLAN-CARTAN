# Activación real de Gmail y Outlook para entregas comerciales

El propietario confirmó que todavía no dispone de aplicaciones OAuth. El código está preparado, pero no puede autorizar buzones reales sin registrarlas. No son otros proyectos de la web, ni otros usuarios, bases de datos o aplicaciones de Supabase. Reutiliza tus proyectos de Google/Microsoft si ya existen. Nunca publiques secretos en GitHub ni los compartas por el chat.

## Google

1. Abre https://console.cloud.google.com/apis/credentials y selecciona tu proyecto de Google Cloud.
2. Habilita Gmail API: https://console.cloud.google.com/apis/library/gmail.googleapis.com.
3. Configura la pantalla de consentimiento en https://console.cloud.google.com/auth/overview con CLAN CARTAN, su contacto y el dominio `clancartan.com`. Portada: https://www.clancartan.com. Aviso de privacidad: https://www.clancartan.com/correo-privacidad.html.
4. Crea un cliente OAuth de tipo **Aplicación web**. URI de redirección autorizada exacta:

   `https://pqalxtrcyrpmwqdlibqd.supabase.co/functions/v1/cc-stream-delivery/oauth/google`

5. El servicio pide `openid`, `email` y `https://www.googleapis.com/auth/gmail.readonly`. En modo de pruebas agrega los buzones dedicados autorizados como usuarios de prueba. Google puede exigir verificación y evaluación de seguridad para el uso público de este permiso restringido; no marques esa verificación como terminada hasta obtener la aprobación.
6. En Supabase → Edge Functions → Secrets, guarda el ID público del cliente como `CC_STREAM_GOOGLE_CLIENT_ID` y su secreto como `CC_STREAM_GOOGLE_CLIENT_SECRET`.

## Microsoft / Outlook

1. Abre https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade y registra la aplicación web. Para Outlook personal y organizaciones, selecciona cuentas de cualquier directorio y cuentas personales Microsoft.
2. Agrega la plataforma **Web**, no SPA. URI de redirección exacta:

   `https://pqalxtrcyrpmwqdlibqd.supabase.co/functions/v1/cc-stream-delivery/oauth/microsoft`

3. Permisos delegados: `User.Read` y `Mail.Read`, con `openid`, `email`, `offline_access` para la autorización y continuidad. No se solicitan permisos de aplicación para todos los buzones, envío o edición de correo. Algunas organizaciones exigen consentimiento del administrador.
4. Crea un secreto del cliente y copia **su valor**, no el identificador del secreto. Guarda en Supabase Secrets: `CC_STREAM_MICROSOFT_CLIENT_ID` y `CC_STREAM_MICROSOFT_CLIENT_SECRET`. Opcional: `CC_STREAM_MICROSOFT_TENANT` si utilizas un tenant concreto; de forma predeterminada es `common`.

Enlace de secretos del proyecto existente: https://supabase.com/dashboard/project/pqalxtrcyrpmwqdlibqd/functions/secrets. Renovar los secretos cuando caduquen; no exponerlos en JavaScript de la web. No cambies los proveedores de Supabase Auth, Turnstile o el inicio de sesión de CLAN CARTAN para esta función.

## Después de guardar los secretos

1. Entra en CLAN CARTAN como Súper reseller con STREAM BULL’S vigente → **Mis correos**.
2. Confirma que es un buzón dedicado a entregas comerciales. Pulsa **Conectar Gmail** o **Conectar Outlook** y acepta la autorización oficial. Se pueden conectar varios buzones de ambos tipos.
3. En **Mis cuentas**, asocia a cada cuenta individual su publicación, método y buzón. No se comparte automáticamente el correo entre cuentas de una misma plataforma.
4. Para **Código comercial automático**, configura el remitente autorizado. El correo debe ser una entrega comercial con esta plantilla exacta (no sirve un mensaje de login o MFA):

```
Asunto: CLAN CARTAN ENTREGA ORD-526272

CLAN-CARTAN-DELIVERY/1
Order: ORD-526272
Account: CODIGO-DE-LA-CUENTA
Purpose: COMMERCIAL_DELIVERY
Code: LICENSE-COMMERCIAL-EXAMPLE
Expires: FECHA-ISO-UTC
```

Usa el ORD real, el código de la cuenta del inventario y una caducidad futura de un máximo de quince minutos, dentro de la vigencia del pedido. La plantilla está limitada intencionadamente a entregas comerciales autorizadas: no interpreta mensajes de autenticación de Netflix, Disney, Max, Google, Microsoft u otros servicios.

Para licencias que no llegan por esta plantilla, utiliza **Entrega directa** o **Verificación manual**. Para un autenticador, se solicita asistencia del titular mediante su procedimiento oficial; nunca se almacena ni entrega la semilla o un TOTP.

## Pendientes externos que no se pueden simular

- Registro y configuración de ambas aplicaciones y sus secretos.
- Consentimiento real de cada titular de buzón.
- Verificación de Google y consentimiento organizativo de Microsoft cuando el proveedor lo exija.
- Prueba final con un buzón dedicado y un pedido comercial autorizado. Las pruebas automatizadas usan datos y tokens ficticios y no equivalen a una autorización real del correo.

Los mensajes deben estar en la bandeja de entrada, recibidos en los últimos 15 minutos, con remitente autorizado y Authentication-Results del proveedor que indique DKIM y DMARC válidos para ese dominio. El sistema no descarga adjuntos.
