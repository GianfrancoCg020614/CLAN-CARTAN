## Actualización de API Perú: secreto recibido en Supabase

- Fecha de comprobación: 18-OCT-2026 (hora UTC).
- Usuario mostró el secreto **`APIPERU_TOKEN`** guardado en Supabase > Edge Functions > Secrets, proyecto `COBRA-YA`, con digest SHA-256 (sin compartir el valor).
- `cc-consulta-dni` permanece desplegada con JWT requerido y orígenes permitidos únicamente para `www.clancartan.com`, `clancartan.com` y respaldo Pages.
- Contrato oficial del servicio comprobado en https://docs.apiperu.dev/referencia/consultar-dni/: petición `POST /dni`, `Authorization: Bearer <token>`, respuesta `success:true`, `data.nombre_completo`; es **fuente pública**, no un servicio de RENIEC.
- Comprobación SQL de permisos: `cc_claim_dni_quota` **no** es ejecutable por `anon` ni `authenticated`, solo por `service_role`; tablas de cuotas tampoco son legibles por usuarios anónimos y normales.
- **Consultas reservadas en base de datos: 0** durante esta inspección. No se hizo ninguna consulta DNI real ni se consumió cupo del proveedor.
- Queda **pendiente la prueba de extremo a extremo con DNI de titular autorizado**, desde un usuario `ADMIN` o `RESELLER` activo y con consentimiento. No afirmar conexión externa 100% validada antes de esa prueba.
- Entrada manual de datos continúa disponible si falla la API, el DNI no se encuentra o se agota la cuota. Los datos WhatsApp y correo se ingresan manualmente, sin obligatoriedad.
- Tokens de prueba anteriores de API Perú deben revocarse una vez comprobado que el token válido de Supabase funciona. Nunca documentar ni mostrar tokens.
- SMTP / confirmación por correo de seis dígitos continúa pendiente de proveedor externo, DNS remitente y pruebas de envío.

## Cambios confirmados en Supabase (18 de octubre de 2026)

- TinyFish abrió el proyecto `COBRA-YA` y guardó Site URL: `https://www.clancartan.com/`.
- **Allow new users to sign up** habilitado y **Confirm email** habilitado; no se activó autoconfirmación.
- Se preservaron las redirecciones existentes: `https://gianfrancocg020614.github.io/CLAN-CARTAN/` y `https://clan-cartan.pages.dev/**`.
- Se agregaron y verificaron como **dos filas separadas** las redirecciones `https://www.clancartan.com/**` y `https://clancartan.com/**`. Los modales indicaron **Successfully added 1 URL** en ambas.
- Email Templates de Confirm signup sigue por defecto y bloqueada porque **todavía no hay Custom SMTP**. El registro público **NO** está aún confirmado mediante mensaje de 6 dígitos; no se hizo prueba de entrega de correo.
- El número de dígitos y expiración del OTP **no se comprobaron aún en la configuración del proyecto**; requieren prueba real/configuración del Email Provider. No afirmar que SMTP determina obligatoriamente la longitud.
- API Perú: sin token privado del proveedor en Supabase, la Edge Function devuelve entrada manual; no se han hecho consultas externas de prueba.
- Próximos pasos: conectar la sesión de API Perú en TinyFish sin exponer tokens; obtener/probar SMTP autorizado y configurar remitente y registros DNS específicos que entregue el proveedor.
- No se modificaron datos, roles, suscripciones, billeteras, ni se crearon nuevos usuarios.

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
