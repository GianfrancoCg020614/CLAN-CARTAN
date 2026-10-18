# CLAN CARTAN E.I.R.L. — Estado de Brevo y Supabase Auth (V106)

**Fecha de inspección:** 18-OCT-2026 (UTC). **Sitio:** https://www.clancartan.com/.

## Confirmado en Brevo y Cloudflare
- Dominio `clancartan.com` autenticado en Brevo: el panel mostró **«Todos los dominios están autenticados»** tras verificar el DNS.
- Remitente transaccional **CLAN CARTAN E.I.R.L. <no-reply@clancartan.com>** creado y marcado **Verificado**. Este remitente es solo de envío: no presupone que exista un buzón para respuestas.
- Remitente anterior existente conservado, sin cambios.
- Cloudflare DNS: TXT `@` de verificación `brevo-code`; dos CNAME DNS-only `brevo1._domainkey` y `brevo2._domainkey`; TXT `_dmarc`: `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`.
- Propagación DNS comprobada en un resolvedor público para código de Brevo, dos registros DKIM y DMARC; además Brevo confirmó éxito en los cuatro controles.
- **No** se cambió el DNS del sitio `@` / `www`, MX, SPF u otras entradas de correo. Los datos, cuentas, roles, billeteras y préstamos de la aplicación permanecen intactos.
- El registro DMARC `p=none` es monitorización y NO equivale a política de rechazo de suplantación.

## SMTP de Supabase: pendiente de la verificación humana de Brevo
- Servidor Brevo `smtp-relay.brevo.com`, puerto `587`.
- Login SMTP previamente observado en Brevo: `beaa15001@smtp-brevo.com`. Volver a comprobar antes de guardar.
- Remitente: `no-reply@clancartan.com`; nombre remitente: `CLAN CARTAN E.I.R.L.`.
- Supabase: proyecto `pqalxtrcyrpmwqdlibqd`; menú `Authentication > SMTP Settings`, o https://supabase.com/dashboard/project/pqalxtrcyrpmwqdlibqd/auth/smtp.
- Al intentar generar UNA contraseña SMTP, Brevo exigió una validación 2FA con código remitido al correo privado de la cuenta. No se ingresó código y **NO se generó la contraseña SMTP**. **Custom SMTP no está habilitado**.
- Paso humano necesario: la persona titular debe introducir el código de seguridad directamente en Brevo, obtener la contraseña SMTP única y pegarla en Supabase, sin enviarla a ChatGPT. Guardar únicamente tras completar todos los campos. Nunca publicar la contraseña en GitHub ni el chat. No compartir códigos 2FA.
- Una vez habilitado SMTP, personalizar `Confirm signup` con la plantilla versionada en `supabase/templates/confirm-signup.html`, usando `{{ .Token }}` (código OTP, no un valor fijo) y asunto `Tu código para confirmar CLAN CARTAN`.
- **Aún NO se ha probado** la entrega real a un correo de control, la caducidad/reenvío ni la verificación exitosa del OTP desde el portal. No afirmar «registro funcional» hasta probar con destinatario autorizado.
- Conservar `Confirm email=ON`, lista de redirecciones a `www.clancartan.com`/raíz/pages.dev y URL oficial del sitio.

## Seguridad y continuidad
- Conservar snapshots y ramas V106 existentes, incluida `resguardo/v106-dni-configurado-2026-10-18`.
- No desplegar contraseñas, claves SMTP, API keys ni códigos OTP en frontend, repositorio o documentación.
- La consulta de DNI con API Perú es una función separada, con secreto guardado y una prueba real autorizada aún pendiente.
