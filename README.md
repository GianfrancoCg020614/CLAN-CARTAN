# CLAN CARTAN E.I.R.L. — Estado del proyecto

**Última versión de desarrollo: V130.** Decisión definitiva: **recargas exclusivamente automáticas para COBRA YA y STREAM BULL'S, usando Lemon/DALE o Binance**. Las vías antiguas de solicitud/aprobación manual están bloqueadas. **Recargas reales temporalmente inhabilitadas** hasta obtener confirmaciones autenticadas del proveedor y acreditar fondos con seguridad (no confundir con saldos de prueba). **[LEER PRIMERO: Punto de continuidad V130](docs/CONTINUIDAD-V130-2026-10-18.md)**. La versión visual V129 y las reglas históricas del resto del documento se conservan como referencia.


**Actualizado:** 18 de octubre de 2026 (UTC)  
**Razón social:** CLAN CARTAN E.I.R.L.  
**RUC comunicado por el titular:** 20612272078  
**Correo:** clancartan@gmail.com  
**Negocios:** STREAM BULL'S y COBRA YA  
**Repositorio:** https://github.com/GianfrancoCg020614/CLAN-CARTAN  
**Dominio principal operativo (V106, DNS y HTTPS verificados):** https://www.clancartan.com/  
**Respaldo Cloudflare Pages:** https://clan-cartan.pages.dev/  
**Respaldo anterior:** https://gianfrancocg020614.github.io/CLAN-CARTAN/

**Actualización de autenticación y DNI (18-OCT-2026):** Supabase Auth conserva `Confirm email=ON` y `Allow signup=ON`. Se guardó Site URL `https://www.clancartan.com/` y cuatro redirect URLs: www, raíz, respaldo pages.dev y GitHub Pages. Plantilla de confirmación de seis dígitos **guardada en Supabase Auth**, con marcador dinámico `{{ .Token }}` y asunto oficial; **SMTP Brevo habilitado**. Pendiente comprobar entrega real y completar verificación desde navegador. `APIPERU_TOKEN` figura guardado como secreto; falta la prueba de DNI autorizado para validar funcionalidad real. [Registro de Auth y pasos pendientes](docs/CONFIGURACION-CORREO-Y-APIPERU-V106.md).

**Brevo y autenticación del correo (18-OCT-2026):** El dominio `clancartan.com` quedó **autenticado en Brevo**, con los cuatro registros DNS verificados. Se creó el remitente unidireccional `no-reply@clancartan.com` y figura como **Verificado**. **SMTP Brevo confirmado habilitado en Supabase** tras configuración manual del titular (host `smtp-relay.brevo.com`, remitente `verificacion@clancartan.com`). Plantilla `Confirm signup` guardada y reabierta con `{{ .Token }}`. No se han enviado correos de prueba ni confirmado recepción del OTP; falta prueba con correo autorizado. [Estado detallado de Brevo](docs/BREVO-AUTENTICACION-V106-2026-10-18.md).

## Estado actual — V110 (18-OCT-2026)

**Registro con invitación opcional:** se agregó «Código de invitado» al formulario manual de CLAN CARTAN. Acepta códigos tipo `COBRA1`, `COBRA2`… y `BULL1`, `BULL2`…; también permite enlaces de registro `?ref=COBRA1`. La validación se hace en Supabase antes de crear la cuenta y se repite en el servidor para guardar quién invitó al nuevo usuario.

**Códigos individuales por negocio:** se asignan automáticamente a miembros **activos** con rol `AFFILIATE`, `RESELLER` o `SUPER_RESELLER`; cada persona habilitada puede copiar su código y enlace al ingresar. Se verificó la asignación `COBRA1` al primer RESELLER activo. Se otorgarán códigos `BULLn` cuando se active una membresía elegible de STREAM BULL'S.

**Sin incentivos prematuros:** registrarse con código **no** cambia accesos ni activa comisiones, billeteras o beneficios; estos quedarán sujetos a pagos válidos y a reglas comerciales específicas. Se preservan el OTP de ocho dígitos y DNI automático solo en COBRA YA. [Diseño y pruebas de V110](docs/V110-INVITACIONES-COBRA-BULL.md).

## Estado actual — V109 (18-OCT-2026)

**OTP email corregido en página:** Supabase envía 8 dígitos; el portal V109 ahora muestra 8 casillas y verifica el código completo sin truncarlo. Se conserva el registro CLAN CARTAN manual (sin consulta DNI) y DNI automatizado únicamente en COBRA YA. La conexión SMTP ya logró entregar el correo.

**Único cambio manual pendiente en la plantilla activa de Supabase:** en Auth > Emails > Templates > Confirm signup sustituir la frase **«6 dígitos»** por **«8 dígitos»**, manteniendo exactamente la variable `{{ .Token }}`, porque GitHub no controla automáticamente esa configuración del panel. [Registro de cambios V109](docs/V109-OTP-8-DIGITOS.md).

## Estado actual — V108 (18-OCT-2026)

**Corrección solicitada por titular:** se revirtió exclusivamente el formulario de alta de CLAN CARTAN al comportamiento **manual original de V106**. Se ingresa nombre completo y documento manualmente, sin consulta externa de DNI en registro. No se exige consentimiento ni se envía el DNI de este formulario a API Perú.

**Solo COBRA YA** mantiene la opción de autocompletar datos de clientes a partir de DNI, a través de la Edge Function autenticada `cc-consulta-dni` (`verify_jwt=true`). El secreto `APIPERU_TOKEN`, las cuotas de consulta y los datos comerciales no se tocaron.

**Endpoint de V107 retirado funcionalmente:** se desactivó `cc-dni-registro` en Supabase; ahora responde HTTP 410, sin consultar DNI ni consumir cuota. Su código previo permanece en `resguardo/v107-antes-reversion-formulario-2026-10-18`. Tabla y RPC auxiliares de V107 se dejan inactivos para preservar el historial y evitar cambios destructivos.

**Correo de verificación:** continúa configurada la plantilla `{{ .Token }}` y el SMTP en Supabase, pero los registros de Auth mostraron error de contraseña del servidor Brevo `535 5.7.8 Authentication failed` en `POST /signup`. Se debe corregir **la clave SMTP** en Supabase y probar con email propio; este error no está relacionado con el formulario DNI.

**Historial:** `V107` queda documentada como versión de prueba revertida. Nuevo código `index.html` usa etiqueta `V108-20261018`. [Registro de corrección V108](docs/V108-REGISTRO-CLANCARTAN-MANUAL.md).

## Estado y recuperación — V106 (18 de octubre de 2026, UTC)

**Respaldo del código:** rama `resguardo/v106-2026-10-18` conserva exactamente el commit `846577227f356e1f8309c4559c43a6a422334a25`. **Código de la Edge Function** `cc-consulta-dni` ahora versionado en `supabase/functions/cc-consulta-dni/index.ts`, sin secretos.

**Supabase:** proyecto COBRA-YA operativo; copia puntual interna de las 23 tablas `public` en el esquema restringido `cc_snapshot_v106_20261018`, sin modificar tablas originales. Se comprobaron recuentos coincidentes para clientes, préstamos y abonos. **No es un respaldo externo integral y no incluye Auth ni secretos.**

**Web:** dominio `clancartan.com` comprado en Cloudflare Registrar, activo con vencimiento indicado el 17-OCT-2027. En Cloudflare Pages se activaron los dominios personalizados `www.clancartan.com` y `clancartan.com` (DNS CNAME proxied hacia `clan-cartan.pages.dev`, HTTPS y certificados habilitados). Comprobación externa exitosa de ambas URL y del respaldo; `www` sirve `V106-20261017` y figura como dirección canónica. **Nota:** ambos hostnames sirven la página; la redirección HTTP 301 de raíz a `www` no se ha confirmado y queda como mejora independiente.

**Registro:** diseño OTP de seis dígitos preparado, pendiente de plantilla `{{ .Token }}`, SMTP y prueba real. **DNI:** Edge Function desplegada y secreto `APIPERU_TOKEN` guardado en Supabase (confirmado en panel el 18-OCT-2026). Contrato API Perú revisado, permisos de cuota verificados y cero consultas registradas durante la inspección. **Prueba real con DNI autorizado aún pendiente.** Ingreso manual sigue funcionando si falla la consulta o se agota el límite interno de 100 usos/mes. WhatsApp y correo de clientes pueden quedar vacíos.

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
