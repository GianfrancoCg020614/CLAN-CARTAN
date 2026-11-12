# COBRA YA V371 — implementación y verificación

Fecha: 12 de noviembre de 2026. Mismo repositorio, proyecto Supabase y Cloudflare Pages. Sin STAGING.

## Alcance

Se reemplaza la capa V368–V370 por una interfaz dentro de `cy53layer`, con una cabecera, un logotipo oficial del proyecto, regreso al panel CLAN CARTAN, navegación plegable y drawer móvil. Se conserva la pantalla de pago existente y sus medios real/bono. La entrada automática después de confirmar una activación está acotada a `COBRA_YA`; la apertura vuelve a consultar Supabase.

Inicio horizontal: cartera por moneda, billetera central real, cuatro indicadores interactivos, tres acciones principales y listado compacto. En celular: cuadrícula de dos indicadores por fila, pestañas desplazables, cinco registros por página y formularios adaptables. Atención de hoy se consulta desde la campana en un panel lateral emergente, evitando duplicar listados en Inicio.

La referencia usa otro logotipo; el propietario autorizó utilizar el archivo oficial existente `assets/logo-cobraya-v304.avif`. No se generó ni sustituyó la marca. Se eliminaron del flujo y del repositorio las dos capas V368 de interfaz; la capa V152 ya no añade otra cabecera ni buscador.

## Datos e integración

- Misma sesión `CC_V53_SESSION`; ningún usuario, negocio o login paralelo.
- Billetera mediante `cc_finance_wallet`; no mezcla capital, deuda, intereses o bono con saldo real.
- Autorización y propietario derivados de `auth.uid()` en todas las nuevas operaciones protegidas. Los clientes/UUID de entrada se validan contra el propietario. No hay parámetro público para cambiar de propietario.
- Códigos `PR-0001` por propietario, generados con contador transaccional y restricción única. Solo se asignan a inserciones nuevas: no se renumeran préstamos anteriores ni se cambian sus UUID.
- Búsqueda normalizada en servidor con debounce, alias, documento, teléfonos, códigos, palabras fuera de orden, tildes y coincidencias parciales. Priorización exacta y tolerancia limitada, indicada como aproximada. Sugerencias sin documentos ni teléfonos completos.
- Consultas paginadas y agregados por moneda en servidor; el navegador ya no descarga todos los clientes para buscar ni calcula indicadores a partir de una página limitada.
- Escrituras idempotentes con clave, argumentos y resultado guardados en la misma transacción. Reintentar una respuesta perdida devuelve el resultado existente. La resolución de solicitudes pendientes impide que una petición tardía se ejecute después de cancelarla.
- Fecha y medio de abono se adjuntan al INSERT. El trigger previo que impide UPDATE/DELETE de pagos permanece intacto.
- Clientes con varias operaciones y monedas; ficha con seis pestañas, edición, alias, contactos adicionales y observaciones. Se conserva la consulta opcional de DNI mediante la función existente y autorización de su backend.
- Préstamos, cronogramas, abonos, garantías, impresión, WhatsApp, ampliación, corrección auditada y finalización usan las operaciones existentes. WhatsApp prepara el mensaje; el propietario confirma su envío.
- Se mantiene el interés simple mensual y la ampliación existente sin interés adicional. Los importes finales se validan y calculan con `numeric` en PostgreSQL. La vista previa usa centavos enteros y BigInt. No hay conversión entre monedas.
- Vencimiento comprobado al abrir, al volver a la pestaña, periódicamente y en cada RPC. Los datos permanecen en Supabase aunque se bloquee el acceso. Las respuestas de una sesión anterior se descartan y el cambio de propietario limpia la pantalla.

## Migración y seguridad

`supabase/migrations/20261112114133_cobra_ya_v371_premium.sql` es aditiva. El propietario la ejecutó en SQL Editor después de dos respuestas de confirmación caducada del conector. La lectura posterior confirmó las funciones, los campos, ocho índices y RLS en las dos tablas auxiliares privadas. Se registró la versión `20261112114133` en el historial de migraciones tras verificar su aplicación.

Antes y después: 0 clientes, 0 préstamos y 0 abonos. No se insertaron operaciones ficticias en producción. Las funciones financieras anteriores no se reemplazaron. El código nuevo de navegación compartida solo cambia el comportamiento de COBRA YA y la versión de carga del archivo.

Las 10 funciones nuevas niegan ejecución a `anon`. Las tablas privadas niegan lectura directa a `authenticated`; su acceso ocurre dentro de las operaciones controladas. Los avisos de Supabase sobre SECURITY DEFINER ejecutable por usuarios autenticados son esperados en estas RPC: se inspeccionaron sus validaciones explícitas, propietario y search_path vacío. Las tablas privadas sin políticas tienen RLS y ningún acceso directo concedido; no se añadieron políticas permisivas para silenciar el aviso.

Referencia de los avisos revisados: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable

## Pruebas realizadas

| Prueba | Evidencia |
| --- | --- |
| Migración completa en PostgreSQL 17 aislado | Estructuras locales y definiciones financieras extraídas de producción; `check-v371-database.sql` |
| Capital, interés, cuotas, saldo y abonos | 1,000 + 10% mensual por 3 meses = 1,300; 100.01 de abono deja 1,199.99; cuotas y movimientos concilian |
| Rechazos financieros | Sobrepago, moneda distinta, más de dos decimales, solicitud repetida con otros argumentos |
| Numeración concurrente | 16 préstamos simultáneos: 16 UUID y códigos distintos |
| Idempotencia concurrente | 16 solicitudes con la misma clave: un préstamo y una entrada de control |
| Solicitud cancelada | Un reintento tardío se rechaza; no crea movimiento |
| Búsqueda | Juan, Rodríguez/Rodriguez, Juanca, DNI, teléfono entero/parcial, palabras invertidas, PR y error leve de escritura |
| Aislamiento y expiración | Propietario distinto sin resultados ajenos; lectura/escritura bloqueadas con acceso vencido |
| Paginación | Dos páginas sin solapamientos; total y filtro calculados en servidor |
| Navegador Chromium | Página real del repositorio y RPC contra PostgreSQL local; alta, préstamo, abono, selectores rápidos, seis pestañas, exportación y atención |
| Respuesta de abono perdida | El servidor guardó; el navegador perdió la respuesta; reintentar dejó un solo abono |
| PC y móvil | 1280 px, 390 px, 320 px y orientación horizontal; sin desplazamiento horizontal de toda la página |
| Sesión y navegación | Regreso, perfil y billetera conservan la sesión; otra identidad elimina los datos anteriores |
| Activación | Flujo de pago existente con respuesta local confirmada abre V371 automáticamente; no fue un pago real |
| Vacíos y errores | Propietario local sin datos, error de conexión, acceso bloqueado y recuperación |
| Errores JavaScript de navegador | Ninguno detectado en la prueba integrada |

También pasaron las verificaciones existentes V130, sintaxis inline V304, COBRA V138/V140/V159, autenticación V161, marca/referidos V160, monedas V161 y MI ALQUILER V226.4. `check-v152-cobra.mjs` ya fallaba antes de modificar por exigir versiones históricas; se conserva como antecedente y no es una verificación vigente de V371.

La nueva acción `validar-cobra-v371.yml` ejecuta las pruebas financieras y de concurrencia en PostgreSQL aislado. Los scripts de pruebas locales nunca deben ejecutarse contra producción.

En CI se reprodujo, también sobre el commit previo `cd0361d`, un fallo histórico de `check-v136-manual.mjs`: exigía la etiqueta antigua «Moneda y garantía» y no admitía «Moneda del préstamo y garantía», ya vigente. Se actualizó solo esa comprobación para conservar la exigencia de garantía visible con ambas etiquetas; no se cambió la recarga manual ni su lógica financiera. También se reprodujo sobre la base anterior una aserción V193 que exigía paréntesis de formato alrededor de la etiqueta Activar/Renovar; se conserva la comprobación de ambas acciones sin exigir ese formato. Las 17 verificaciones estáticas del flujo general pasan localmente.

## Respaldos y reversión

- Base de código: `cd0361df318ab2a547f9797b1276740fc09ff34d`.
- Bundle recuperable en la sesión: `/workspace/clan-cartan-before-v371.bundle`, verificado; SHA256 `0371417b6b71b069723c4a39e55aa97b5742d32087d62f7fcc3a6c2c6f9c923c`.
- Metadatos previos y conteos guardados en `/workspace/v371-supabase-baseline.json` y `/workspace/v371-production-before-migration.json`. Estos archivos no son un respaldo completo de Supabase; las tablas financieras afectadas estaban vacías.
- Despliegue anterior confirmado: Cloudflare Pages `a987b888-2a5e-4a0f-b1d3-35fc4ce7211e`.
- Si fuera necesario, revertir el commit de interfaz mediante un commit nuevo, tras comprobar cambios concurrentes; conservar la migración, los códigos y movimientos. La interfaz anterior sigue siendo compatible con las adiciones. No borrar columnas, registros ni claves idempotentes al revertir.

## Límites de la comprobación

Las capturas `artifacts/v371/pc-local.png` y `celular-local.png` son capturas reales de Chromium con datos de prueba locales y saldo de billetera de fixture. No son imágenes generadas ni capturas de una sesión autenticada de producción. Hay capturas adicionales del estado vacío.

No se realizó un cobro real de activación ni se crearon préstamos reales para comprobar el despliegue. La comprobación final de la vista protegida en producción requiere iniciar sesión con una cuenta existente y con activación vigente; no se solicitarán contraseñas en el chat.

Se conservan las monedas que ya admite el esquema. USDT no estaba admitido por la restricción existente de `cy_loans`; no se amplió esa regla financiera ni se simuló su soporte.

El dominio de producción sigue siendo https://www.clancartan.com/. El estado definitivo de publicación y el commit se entregan después de verificar Cloudflare.

## Archivos del cambio

- Interfaz: `scripts/cobra-v371.js`, `styles/cobra-v371.css`.
- Integración y carga: `index.html`, `scripts/v151-portal-polish.js`, `scripts/v166-portal-roles.js`.
- Base de datos: `supabase/migrations/20261112114133_cobra_ya_v371_premium.sql`.
- Pruebas: `scripts/check-v371-database.sql`, `scripts/test-v371-concurrency.py`, `scripts/test-v371-browser.py`, `scripts/v371-test-bootstrap.sql`, `scripts/v371-test-functions.sql`.
- CI: `.github/workflows/validar-cobra-v371.yml`.
- Documentación: este informe y `docs/V371-AUDITORIA-Y-PROPUESTA.md`; `.gitignore` excluye artefactos de pruebas y temporales del CLI.
- Eliminados tras comprobar que ya no se cargan: `scripts/cobra-phase1-v368.js` y `styles/cobra-phase1-v368.css`.
