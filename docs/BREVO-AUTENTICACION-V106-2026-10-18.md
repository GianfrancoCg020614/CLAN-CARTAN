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

## Supabase Custom SMTP y OTP — activados en panel (18-OCT-2026)

- El usuario completó el 2FA de Brevo y guardó SMTP manualmente en Supabase. Comprobación independiente de TinyFish en `Authentication > SMTP Settings`: **Enable custom SMTP ON** y host `smtp-relay.brevo.com`; remitente configurado `verificacion@clancartan.com`, nombre `CLAN CARTAN E.I.R.L.`. No se accedió ni reveló contraseña.
- El dominio `clancartan.com` está autenticado en Brevo. Se verificó antes el remitente `no-reply@clancartan.com`; el remitente del SMTP `verificacion@clancartan.com` pertenece al mismo dominio autenticado, pero la entrega de correo de ese remitente **no se ha probado todavía**.
- En Supabase `Auth > Emails > Templates > Confirm signup`, se guardó asunto **`Tu código para confirmar CLAN CARTAN`** y HTML con encabezado corporativo, `{{ .Token }}` dinámico, URL oficial y contacto. La notificación de Supabase indicó `Successfully updated email template`. Al reabrir la plantilla se verificó la persistencia del asunto y del contenido con token.
- El frontend V106 tiene seis casillas de OTP y usa `POST /auth/v1/verify` con `type=email`, como en la documentación pública de Supabase para verificación de OTP de registro. **No se probó aún el flujo extremo a extremo**, ni SMTP entrega, reenvío, caducidad o creación de sesión; evitar afirmar funcionamiento total hasta probar.
- `Confirm email` sigue habilitado conforme a la última comprobación previa. Site URL y redirects permanecen en `www.clancartan.com` y rutas previstas.
- Prueba pendiente con cuenta de correo propia/autorizada: registrar una dirección nueva de prueba (sin datos reales innecesarios), abrir email recibido, comprobar código, verificar en el portal, iniciar sesión; en caso de error revisar `Auth logs`, `Brevo Transactional Logs` y límite de emails. No compartir ni almacenar OTP ni claves en el chat.
- No se tocaron otras plantillas, usuarios, tablas, saldos, roles o DNS. La plantilla de referencia permanece en `supabase/templates/confirm-signup.html`, aunque la plantilla que se guardó directamente en Supabase puede usar diseño distinto.
- El estado actual es **configuración lista para pruebas**, NO una certificación de envío y recepción.

## Seguridad y continuidad
- Conservar snapshots y ramas V106 existentes, incluida `resguardo/v106-dni-configurado-2026-10-18`.
- No desplegar contraseñas, claves SMTP, API keys ni códigos OTP en frontend, repositorio o documentación.
- La consulta de DNI con API Perú es una función separada, con secreto guardado y una prueba real autorizada aún pendiente.
