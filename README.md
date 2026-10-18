# CLAN CARTAN E.I.R.L. — Estado del proyecto

**Actualizado:** 18 de octubre de 2026 (UTC)  
**Razón social:** CLAN CARTAN E.I.R.L.  
**RUC comunicado por el titular:** 20612272078  
**Correo:** clancartan@gmail.com  
**Negocios:** STREAM BULL'S y COBRA YA  
**Repositorio:** https://github.com/GianfrancoCg020614/CLAN-CARTAN  
**Dominio principal declarado (V106, conexión DNS aún pendiente):** https://www.clancartan.com/  
**Respaldo Cloudflare Pages:** https://clan-cartan.pages.dev/  
**Respaldo anterior:** https://gianfrancocg020614.github.io/CLAN-CARTAN/

## Estado y recuperación — V106 (18 de octubre de 2026, UTC)

**Respaldo del código:** rama `resguardo/v106-2026-10-18` conserva exactamente el commit `846577227f356e1f8309c4559c43a6a422334a25`. **Código de la Edge Function** `cc-consulta-dni` ahora versionado en `supabase/functions/cc-consulta-dni/index.ts`, sin secretos.

**Supabase:** proyecto COBRA-YA operativo; copia puntual interna de las 23 tablas `public` en el esquema restringido `cc_snapshot_v106_20261018`, sin modificar tablas originales. Se comprobaron recuentos coincidentes para clientes, préstamos y abonos. **No es un respaldo externo integral y no incluye Auth ni secretos.**

**Web:** V106 validada en GitHub y publicada en `clan-cartan.pages.dev`. Aún no hay DNS válido de `www.clancartan.com`; la asociación del dominio debe completarse en Cloudflare. El verificador de GitHub ya distingue ese error.

**Registro:** diseño OTP de seis dígitos preparado, pendiente de plantilla `{{ .Token }}`, SMTP y prueba real. **DNI:** llamada externa preparada por Edge Function, pendiente de secreto `APIPERU_TOKEN` y autorización del proveedor; se mantiene ingreso manual y máximo interno de 100 consultas/mes con control de acceso. WhatsApp y correo de clientes pueden quedar vacíos.

**Continuidad y pendientes exactos:** [Estado y recuperación de V106](docs/ESTADO-Y-RECUPERACION-V106-2026-10-18.md) · [Changelog V106](docs/V106-CHANGELOG.md).

## Estado actual — V105 (17 de octubre de 2026)

**Dominio:** sitio canónico `https://www.clancartan.com/`, con respaldo `clan-cartan.pages.dev` y vigilancia de versión V105 en GitHub Actions. La publicación del dominio y la configuración de Auth en Supabase aún necesitan verificación externa.

**Interfaz:** clientes y préstamos de COBRA YA simplificados a dos pasos, opciones adicionales plegadas y botón «Guardar y continuar». Al ingresar DNI de 8 dígitos ya guardado por el mismo prestamista, se rellenan nombre y WhatsApp y el cliente queda seleccionado para el préstamo sin otro clic.

**Supabase:** `cy_lookup_dni_saved` usa SECURITY INVOKER, autenticación y RLS; índice único parcial impide duplicar el DNI dentro de la misma cartera. Pruebas de titular/no titular e invalidación de formato superadas en transacciones revertidas. **No consulta RENIEC** hasta disponer de servicio y permisos autorizados.

**Documentos:** [Cambios V105](docs/V105-CHANGELOG.md) · [Integración oficial de DNI pendiente](docs/RENIEC-INTEGRACION.md).

**Pendientes:** comprobación DNS/SSL y redirects para `www`, conexión de correo, claves reales y validación de Turnstile (la captura de éxito no constituye una integración), pruebas de navegador y proveedor autorizado de datos DNI. Sin dinero real.

## Estado actual — V104 (17 de octubre de 2026)

**GitHub:** una marca pública `cc-deploy-version` permite comprobar automáticamente la versión visible del portal en Cloudflare Pages. Se añadió el workflow [Verificar despliegue Cloudflare Pages](.github/workflows/verificar-cloudflare.yml), que consulta la web después de cada push y diariamente; también se eliminó una referencia externa de antivirus que no forma parte del proyecto.

**Comprobación pendiente:** GitHub Actions deberá confirmar que `clan-cartan.pages.dev` sirve `V104-20261017`. Esta conexión aún no permite administrar la cuenta de Cloudflare ni verificar el estado de un despliegue dentro del panel. [Detalle V104](docs/V104-CHANGELOG.md).

**Se mantienen:** Supabase Free, saldos de prueba, pagos de servicios voluntarios, sin retiros ni cobros reales ni contratación de nuevos planes.

## Estado actual — V103 (17 de octubre de 2026)

**Supabase:** consultas y créditos administrativos de COBRA YA utilizan la billetera por servicio; 3 RPC de consulta personal redujeron sus privilegios para respetar RLS. Advertencias por RPC privilegiadas: de 18 a 15. Se añadieron 13 índices de claves foráneas y se comprobaron permisos para operaciones de préstamos ajenos sin modificar datos.

**GitHub:** formulario de registro/recuperación con contraseñas nuevas de al menos 12 caracteres; validador estático ampliado y workflow `.github/workflows/validar-portal.yml` para futuras actualizaciones. [Detalle completo](docs/V103-CHANGELOG.md).

**Aún pendientes:** confirmar el despliegue Cloudflare, SMTP transaccional, pruebas reales del navegador y revisión de las 15 funciones privilegiadas restantes. No hay cobros reales, retiros ni pagos de préstamos desde billeteras.

## Estado actual — V102 (17 de octubre de 2026)

**GitHub:** se corrigió el cambio entre registro/inicio de sesión, se bloquearon los retiros de las billeteras internas en los paneles del prototipo y se desactivaron las renovaciones automáticas de COBRA YA. En modo de pago, los S/15 solo pueden descontarse tras confirmación voluntaria del usuario. Se amplió `node scripts/check-v100.mjs` con pruebas estáticas de estas reglas. [Ver registro V102](docs/V102-CHANGELOG.md).

**Supabase:** las mejoras de cálculo de V100 siguen activas. Pruebas simuladas de 5 operaciones privilegiadas/ajenas no se completaron. Nueve préstamos ficticios, sin diferencias contables en cuotas/abonos ni saldos negativos al cierre.

**Pendientes para producción:** verificar el despliegue de Cloudflare, correo SMTP, pruebas E2E con cuentas distintas, acceso a precios especiales de afiliados y documentación legal. Sin dinero real ni retiros.

## Estado actual — V100 (17 de octubre de 2026)

**GitHub:** correcciones de sesiones, etiquetas de entorno ficticio, filtros por fecha real del cronograma y eliminación de la contraseña maestra de demostración. **Supabase:** mejoras de cálculo en correcciones y prórrogas; 4 préstamos ficticios nuevos para pruebas de estados. Consulte [el registro completo de V100](docs/V100-CHANGELOG.md) y ejecute `node scripts/check-v100.mjs` para validar los scripts del portal.

**Pendiente:** verificar despliegue real en Cloudflare, SMTP de autenticación, pruebas E2E y revisión de RPC privilegiadas. Ningún pago real está habilitado.

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
- **Decisión de infraestructura:** utilizar **Cloudflare** para el futuro dominio, alojamiento con Pages y seguridad con Turnstile; mantener **GitHub** para el código y **Supabase** para autenticación, base de datos y permisos. El titular indicó que el dominio **www.ClanCartan.com** ya está configurado; la conexión DNS/HTTPS y su publicación deben verificarse. No apagar la dirección de respaldo de Cloudflare hasta comprobarlo.
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
6. **Dominio**: comprobar la configuración DNS, SSL, dominio personalizado de Pages y Site URL/Redirect URLs en Supabase antes de anunciar el lanzamiento.

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
