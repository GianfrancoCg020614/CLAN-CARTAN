# CLAN CARTAN — V123 · DALE real y protección Turnstile preparada
Fecha: 18 de octubre de 2026.

## Cobros Lemon / DALE
- Número público receptor facilitado por el operador: **923319637**, visible y copiable en la pantalla de recargas Lemon/DALE.
- QR original de Lemon aún pendiente de validación como imagen apta para los clientes.
- Binance: el enlace personal del QR sigue visible, pero su modo personal NO habilita automáticamente API de comercios ni webhook firmado.
- Continúa la generación de solicitudes `PENDING` desde el usuario autenticado, nunca abonos basados en capturas, SMS, una declaración `ya pagué` ni en el número/QR por sí solos.

## Separación de dinero real (Supabase)
- Migración `v123_separate_real_wallets_verified_topups`.
- Tabla `cc_real_service_wallets` (saldos confirmados `balance_pen`) completamente separada de `cc_service_wallets.balance_test`.
- Tabla `cc_real_wallet_ledger` con índice único para evitar reusar una orden o transacción externa.
- Función `cc_credit_verified_real_topup`: únicamente `service_role` puede ejecutarla; **nunca** usuarios autenticados ni anónimos. Requiere orden `PENDING`, importe exacto, moneda PEN y receptor DALE autorizado. Opera en transacción atómica, sin doble abono de orden o referencia.
- La función NO es un webhook verificador. La instancia de servidor que la invoque debe comprobar primero la autenticidad de la confirmación bancaria/proveedor, la cuenta receptora, la moneda, referencia de orden y el ID externo. **No desplegar un webhook que acepte declaraciones de pago del cliente.**
- Función para Lemon/DALE preparada, pero falta API de pagos entrantes o una conciliación verificable. Binance Merchant API necesita la cuenta comercial autorizada y el verificador de firma de webhook de Binance, más la conversión y conciliación de moneda.
- **No se activó ninguna acreditación automática en producción** al faltar esos prerrequisitos. Saldos reales existentes: ninguno. Las suscripciones y transferencias previas siguen operando SOLO contra saldos de prueba y no deben anunciarse como cobros reales.

## Cloudflare Turnstile
- Archivo `scripts/v123-turnstile.js` carga el widget solo si la meta etiqueta `cc-turnstile-sitekey` tiene la **sitekey real** de `www.clancartan.com`.
- `index.html` ya envía `gotrue_meta_security.captcha_token` en autenticación por contraseña y alta de cuenta, compatible con Supabase Auth.
- Pendiente crear y configurar un widget Turnstile válido en Cloudflare, pasar su sitekey PÚBLICA a `index.html` y añadir el secret PRIVADO en la configuración de CAPTCHA de Supabase Auth (Settings > Authentication > Bot and Abuse Protection). Nunca guardar el secreto en GitHub.
- **Antes de completar esos dos ajustes, Turnstile NO está activo ni protege la página.** No introducir claves falsas ni un recuadro decorativo.
- Revisar rutas de recuperación de contraseña, reenvío y confirmación, y probar inicio de sesión/alta/reset en navegadores móvil y PC después de activar CAPTCHA.
- Perfil de navegador Cloudflare requiere que el titular inicie sesión en el acceso seguro, sin compartir contraseña por chat.

## Pruebas verificadas
- Las cuentas autenticadas no poseen permiso INSERT/UPDATE para saldos reales ni EXECUTE para la función de acreditación. Solo service_role tiene EXECUTE.
- Tablas reales vacías antes del primer pago. No se simuló ni realizó dinero real.
- Archivos de V123 visibles en Cloudflare Pages.
- El HTML fue corregido para situar los scripts al final de la página, no dentro de la rutina de impresión de cronogramas.

## Pendientes
1. Cloudflare: completar acceso al panel, crear widget y configurar Siteverify/Supabase.
2. Lemon/DALE: validar que la cuenta receptora admite cobros comerciales y obtener API o conciliador autenticado por orden.
3. Binance: obtener cuenta Merchant y credenciales de recepción firmadas si quiere automatización.
4. Realizar prueba end-to-end con pago controlado y autorización del titular, verificar cada evento y emitir comprobantes según obligación aplicable.
5. Antes de activar uso real de saldo prepago, revisar el modelo legal, tributario, contable y de protección de consumidores aplicable en Perú.
