# CLAN CARTAN V160 — Continuidad y preservación

Fecha: 21-OCT-2026. Base: V159, posteriormente a MI COCHERA V158 y transferencias V158.3.

## Entrega
1. Identidad **STREAM BULL’S** actualizada al emblema original suministrado por el propietario (Bull Terrier dorado con CLAN CARTAN), recurso ligero `assets/stream-bulls-logo.svg`, variable CSS `--ccc-bull-logo`, reglas de portada/cabeceras/login y nueva etiqueta `V160-20261021`. El emblema COBRA YA V159 y el logo oso MI COCHERA permanecen intactos.
2. Cada botón **Copiar enlace** genera `https://www.clancartan.com/?ref=CODIGO#registro`; el nuevo `scripts/v160-invitation-register.js` abre la pantalla de **CREAR CUENTA** sin requerir clics adicionales, precarga el código y selecciona el negocio `COBRA_YA`, `STREAM_BULLS` o `MI_COCHERA`. No cierra sesiones ya activas.
3. Portapapeles robustecido en iOS/Safari: API Clipboard segura, selección temporal como respaldo, alternativa de copiar manualmente. Nunca se muestra ✓ Copiado antes de que se confirme la acción.
4. Nuevo registro servidor `mc_invitation_attributions` con RLS y trigger `mc_signup_cochera_invitation_capture` en `auth.users`. Captura una sola atribución para cada nuevo registro mediante `invitation_code=COCHERA#` proporcionado en metadata; busca titular en `mc_accounts` y rechaza autoresreferencia y códigos inexistentes. Los referidos COBRA/BULL siguen gestionándose por su trigger previo.
5. CI `scripts/check-v160-referrals-and-brand.mjs` y etiquetas de versión aceptadas en comprobaciones históricas V132/V136/V138/V140/V142/V152/V158, manteniendo sus verificaciones funcionales.

## Protecciones preservadas
- Un solo inicio de sesión; códigos únicos propios COBRA#, BULL#, COCHERA#.
- Sin pago ni activación por código de invitación. La comisión de referido NO se paga automáticamente por abrir enlace o registrarse.
- Las tres billeteras mantienen saldos reales separados de **bonos ADMIN intransferibles**; transferencias entre las 3 exclusivamente con saldo real del mismo usuario, idempotencia.
- No se activa pago comercial mediante QR personal Lemon/DALE ni Binance hasta autorización y recepción verificada; deudas de COBRA YA nunca se pagan con billetera.

## Pruebas y límites
- Se comprobó existencia de tabla, políticas RLS y trigger, sin usuarios de prueba y sin atribuciones inventadas.
- Verificaciones de código fuente y CI de regresión; publicación GitHub → Cloudflare Pages mediante pipeline principal.
- La atribución completa con nuevo registro y correo real requiere prueba de invitación con usuario voluntario; no se han creado cuentas nuevas sin autorización ni enviado correos.
- No afirmar que absolutamente todos los casos del SaaS están libres de fallos o pagos comerciales habilitados.
