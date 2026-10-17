# CLAN CARTAN E.I.R.L. — Estado del proyecto

**Actualizado:** 16 de octubre de 2026  
**Razón social:** CLAN CARTAN E.I.R.L.  
**RUC comunicado por el titular:** 20612272078  
**Correo:** clancartan@gmail.com  
**Negocios:** STREAM BULL'S y COBRA YA  
**Repositorio:** https://github.com/GianfrancoCg020614/CLAN-CARTAN  
**Sitio piloto:** https://gianfrancocg020614.github.io/CLAN-CARTAN/

## Decisiones que debemos conservar

- Mantener la identidad visual original: fondo de luna, logos de CLAN CARTAN, STREAM BULL'S y COBRA YA, diseño accesible para celular y computadora.
- Una sola cuenta de usuario y contraseña en CLAN CARTAN para ambos negocios. La cuenta requiere **confirmación por correo** al registrarse; la confirmación de correo NO activa las funciones de pago.
- Registro internacional en pantalla única: nombre completo, país, documento (DNI, cédula, pasaporte u otro), teléfono/WhatsApp con prefijo, departamento/estado/provincia/municipio/distrito según país, moneda preferida, correo, contraseña, confirmación y aceptación informada de términos y privacidad.
- STREAM BULL'S: catálogo y precios públicos sin registro; afiliación **voluntaria y única de S/ 20** desde billetera Stream Bull's. Beneficios desde la activación; no volver a cobrar esa afiliación.
- COBRA YA: software de gestión de préstamos otorgados por cada RESELLER, no por CLAN CARTAN; suscripción **voluntaria de S/ 15 por 30 días** mediante billetera Cobra Ya; sin cobros automáticos; preservar registros financieros.
- Dos billeteras independientes del mismo usuario con transferencias internas bidireccionales; no retiros ni transferencias entre usuarios ni pagos de préstamos desde billetera. **SOLO saldos ficticios en el piloto; NO transacciones reales**.
- PANEL ADMIN visible en la parte superior únicamente cuando ingresa un ADMIN verificado en Supabase; mostrar nombre, iniciales y rol del usuario después del login.
- Roles y proveedores: SUPER RESELLER, RESELLER y proveedores independientes asumen sus propias obligaciones por sus ofertas y servicios; CLAN CARTAN conserva las responsabilidades legales que correspondan. Borradores legales deben ser revisados antes de operar comercialmente.
- No mencionar «Vendomix» en la web o textos comerciales. Marca usada: CLAN CARTAN.
- **Decisión de infraestructura:** utilizar **Cloudflare** para el futuro dominio, alojamiento con Pages y seguridad con Turnstile; mantener **GitHub** para el código y **Supabase** para autenticación, base de datos y permisos. Dominio clancartan.com aún **no comprado**. No migrar ni apagar GitHub Pages antes de probar Cloudflare.
- Confirmación y recuperación por correo: las URL de Supabase se configuraron visualmente para https://gianfrancocg020614.github.io/CLAN-CARTAN/ ; cuando se migre a Cloudflare Pages, actualizar URLs permitidas sin perder cuentas.

## Implementación hasta el momento

- Página HTML autocontenida en `index.html` de `main`; cambios funcionales de la secuencia V91–V95 integrados al repositorio.
- Perfil internacional respaldado en `cc_user_details` de Supabase; autenticación única y correos de confirmación configurados parcialmente.
- RPC de prueba de billeteras, transferencias y recargas con aprobación ADMIN.
- RPC `sb_pay_affiliation_test` para un descuento único **ficticio** de S/ 20 y tabla `sb_affiliations`; botón de afiliación y «Solicitar recarga» en la página.
- Cobra Ya contiene funciones de cartera, préstamos, cuotas, abonos, extensiones, reportes, etc., algunas todavía sin pruebas integrales.
- Panel visual de nombre/iniciales/rol agregado después del login; botón PANEL ADMIN en encabezado.
- **No declarar producción lista:** varias funciones se han probado solo por sintaxis/estructura; falta prueba de navegador y RLS con cuentas separadas.

## Pendientes prioritarios

1. **Correos de autenticación**: el SMTP de Supabase alcanzó `email rate limit exceeded` y se recibieron advertencias de rebotes porque se usaron direcciones ficticias (clancartan2/3/4@gmail.com). NO repetir pruebas con correos inexistentes. Configurar servicio SMTP autorizado, luego probar confirmación y recuperación con correo real.
2. **Cloudflare Pages**: conectar GitHub `GianfrancoCg020614/CLAN-CARTAN` desde panel Cloudflare, construir como sitio estático (directorio raíz), verificar URL `.pages.dev`, ajustar URL de confirmación en Supabase; después Turnstile con validación en servidor.
3. **Recargas ficticias y afiliación**: probar solicitud, aprobación ADMIN, saldo, descuento único y rechazo de doble cobro; verificar que usuario sin afiliación solo vea precios públicos.
4. **Permisos y seguridad**: probar aislamiento de usuarios distintos, JWT, RLS, roles, errores del navegador; corregir la coherencia contable entre préstamos y correcciones.
5. **Prelanzamiento legal**: revisar textos definitivos, acuerdos de proveedor y protección de datos; evaluar requisitos de pagos/billeteras reales. No habilitar dinero real sin cumplimiento y pasarela regulada.
6. **Dominio**: comprar/conectar `clancartan.com` solo tras funcionamiento completo.

## Observaciones de seguridad y operaciones

- `clancartan@gmail.com` se mantiene: contiene registros de pruebas (clientes, préstamos, cuotas, pagos) y **no fue borrada**. La eliminación solicitada fue bloqueada por la protección de inmutabilidad de operaciones financieras; no deshabilitarla.
- `gianfrancocarbajal44@gmail.com` es cuenta ADMIN y estaba confirmada.
- No subir llaves secretas de Supabase, credenciales, contraseñas ni datos personales reales al repositorio público.
- El correo en Supabase NO está plenamente validado; Cloudflare Email Routing (recepción) y SMTP de envío son servicios distintos, y se debe verificar disponibilidad y precios actuales.

## Avance V97 — 17 de octubre de 2026

- Cloudflare Pages quedó vinculado manualmente por el titular a GitHub y confirmó la dirección gratuita `https://clan-cartan.pages.dev/` (el usuario confirmó que abre). La configuración de GitHub Pages se mantiene temporalmente por seguridad.
- V96: CSS para reducir doble desplazamiento vertical en la portada; se requiere confirmación visual tras despliegue.
- V97: reforzada la RPC `cc_request_test_topup`: bloqueo por usuario y servicio, índice único de recarga pendiente por servicio y límite de 5 solicitudes por 24 horas. Saldos exclusivamente ficticios.
- **Pendiente Turnstile real**: obtener SITE KEY y configurar SECRET KEY en un servidor (Supabase Edge Function, nunca en GitHub/HTML); validar tokens en servidor antes de habilitar protección efectiva. No insertar captcha decorativo ni exponer el secreto.
- **Pendiente Supabase Auth**: añadir `https://clan-cartan.pages.dev/**` en Redirect URLs; revisar Site URL y corregir los redireccionamientos de registro/recuperación del `index.html` solo cuando se haya confirmado el cambio para no romper confirmaciones.
- El chequeo de Supabase marcó advertencias para funciones SECURITY DEFINER publicadas intencionalmente y protección contra contraseñas filtradas desactivada: requiere revisar permisos por función, y activar protección de contraseñas desde Auth Settings.
