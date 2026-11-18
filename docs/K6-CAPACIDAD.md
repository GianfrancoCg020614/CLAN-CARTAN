# CLAN CARTAN: comprobación inicial de capacidad

Fecha de ejecución: 17 de noviembre de 2026 (America/Lima). Base: V394, commit 7fe4deff21a2c6fe8957b994d61b9da11eaffa77. k6 v2.4.0 oficial, checksum verificado. Respaldo previo local: /workspace/clan-cartan-before-capacity-tests.bundle.

## Resultados reales, producción, solo lecturas

| Prueba | Usuarios virtuales | Duración configurada | Solicitudes HTTP | Errores HTTP | p95 inicio | p95 catálogo |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| Inicial | 1 | 30 s | 35 | 0 | 222 ms | 1597 ms |
| Gradual | hasta 5 | 90 s | 281 | 0 | 166 ms | 477 ms |

Todas las verificaciones funcionales pasaron: 38/38 y 284/284. No hubo respuestas 429. La prueba inicial **falló** el objetivo de latencia del catálogo (<1500 ms); la gradual pasó todos los umbrales. No se cambió el umbral para aprobarla. Las causas de la variación no están establecidas: no se atribuye a SQL, caché ni red sin evidencia adicional.

Se consultaron inicio, JavaScript público V394 y RPC público de catálogo. El catálogo devolvió **cero productos**: estas mediciones no representan un catálogo grande. No hubo registros, cambios de contraseñas, compras, recargas, pagos ni operaciones autenticadas. No se alteraron datos financieros.

## Lo que no está demostrado

Estas pruebas NO certifican 10 000 usuarios simultáneos ni 10 000 cuentas con actividad representativa. Una cuenta registrada no equivale a una conexión de PostgreSQL ni a un usuario virtual activo. Auditoría puntual: Supabase Free, 6 cuentas registradas, base aproximadamente 25 MB, max_connections=60 y 23 conexiones en ese momento. El límite de conexiones no establece un límite de 60 usuarios.

La paginación y varios índices por propietario ya existen. Para determinar capacidad real falta una carga representativa con autenticación, permisos por rol, catálogo poblado, búsquedas, concurrencia financiera e idempotencia; además hay que observar CPU, memoria, conexiones y cuotas. No se ejecutó la configuración de 10 000 VU. El script bloquea ese perfil contra los destinos conocidos de producción. No se creó STAGING ni se contrató capacidad adicional.

## Ejecutar localmente

Con k6 instalado, desde la raíz:

```sh
K6_BIN=/ruta/a/k6 node scripts/test-k6-safety.mjs
k6 run tests/k6/clancartan.js
k6 run -e PROFILE=baseline tests/k6/clancartan.js
```

La primera orden inspecciona configuraciones sin enviar tráfico. Las otras ejecutan lecturas reales; no automatizar ejecuciones repetidas en cada despliegue. No cambiar los límites desde el editor de ejecución.

El perfil capacity-isolated se entrega exclusivamente como preparación para un destino aislado autorizado con API y datos propios. Requiere BASE_URL, API_URL, SUPABASE_PUBLISHABLE_KEY, ISOLATED=YES y ALLOW_LARGE_TEST=YES. No crearlo ni ejecutarlo contra producción para demostrar una cifra. La máquina generadora también debe dimensionarse y monitorizarse.

## Guardar en Grafana sin TinyFish

1. Abrir https://gracefulclematis1698.grafana.net/a/k6-app/projects/8503904/tests/new con la sesión propia.
2. Elegir crear una prueba desde un script JavaScript; pegar el contenido completo de tests/k6/clancartan.js (también entregado como CLAN-CARTAN-k6.js).
3. Guardar. Conservar el perfil predeterminado: 1 usuario virtual durante 30 segundos. No seleccionar 10 000 ni sustituir los escenarios del script.
4. Antes de ejecutar, revisar las cuotas/créditos de Grafana. La ejecución local realizada no necesitó TinyFish ni acceso a Grafana; ejecutar en Grafana puede consumir su cuota.
5. Si la cuota permite la ejecución, iniciarla y compartir el enlace del resultado para revisarlo. Si no hay cuota, consultar los resultados locales entregados.

No se guardó ni ejecutó una prueba dentro de Grafana: no se dispone de acceso directo a esa sesión privada. No enviar contraseñas ni tokens por el chat. Los resultados locales no se suben automáticamente a Grafana.

## Administración

La base V394 contiene la simplificación del resumen administrativo y del otorgamiento de bono, directorio paginado y consulta de fichas. Esta entrega agrega pruebas y documentación; no modifica el panel, las reglas de bono, las políticas RLS ni la versión visible. No constituye una auditoría exhaustiva de todos los flujos administrativos.

## Ejecución de Grafana aportada por el propietario

https://gracefulclematis1698.grafana.net/a/k6-app/runs/9038812

Evidencia: capturas del propietario, no acceso autenticado directo del agente. Muestran 36 solicitudes, 0 fallos HTTP, 1 usuario virtual, p95 global 477 ms, 5/5 umbrales y 36/36 verificaciones. El encabezado muestra 5 s mientras el script entregado configura 30 s: no se certifica la duración efectiva sin revisar el script ejecutado y los registros de esa ejecución. No se infiere capacidad masiva de este resultado.

## Prueba local con 10 000 cuentas ficticias

Se ejecutó scripts/sql/capacity-10000.sql en el contenedor local clan-v393-test, base test393, con la función real cc394_admin_directory de V394 y sus dependencias de la fixture de regresión. Se agregaron 10 000 cuentas sintéticas a las cuentas existentes, con códigos y nombres, dentro de una transacción finalmente revertida. El esquema Auth de la fixture es reducido; no equivale al servicio Auth de Supabase completo. Las tablas operativas de negocios no tienen volumen representativo en esta fixture.

Diez ejecuciones por caso, una conexión, tiempos SQL locales:

| Caso | Promedio | p95 | Máximo |
| --- | ---: | ---: | ---: |
| Primera página | 94.58 ms | 297.75 ms | 496.15 ms |
| Página 500 | 414.79 ms | 443.17 ms | 457.39 ms |
| Buscar código de cuenta 10 000 | 68.94 ms | 72.38 ms | 73.81 ms |
| Buscar nombre de cuenta 10 000 | 69.08 ms | 70.43 ms | 70.67 ms |

Pasaron las comprobaciones del total registrado, páginas acotadas, coincidencia exacta de cuenta buscada y rechazo de acceso a un usuario no administrador. La consulta posterior al ROLLBACK confirmó cero cuentas sintéticas restantes. Se comprobó que GitHub main seguía en 7fe4def antes de guardar.

Conclusión limitada: el directorio funciona con ese volumen de cuentas en esta fixture. La última página resulta más costosa por ordenamiento/offset y la búsqueda usa normalización y coincidencia parcial; no se ha modificado la función ni creado índices sin demostrar necesidad con datos operativos representativos. No se probó concurrencia de 10 000 sesiones, login masivo, ni carga de operaciones financieras con esta prueba. No se requiere ninguna acción manual adicional para consultar este informe. Una certificación integral requiere una prueba representativa y monitorizada fuera de producción y dimensionar tanto el generador como los servicios; no se creó STAGING ni se adquirió infraestructura.

## Ampliación solicitada: carga de lectura y funciones

Se ejecutó PROFILE=stress-read sobre producción: rampas de 10, 25 y 50 usuarios virtuales, pausas de 5 s por iteración, 100 s de escenario y hasta 5 s de finalización. No se aumentó más la carga. Resultado: 1427 solicitudes, 472 iteraciones completas, 3 interrumpidas al finalizar, 1 solicitud fallida (0.0701 %), 0 respuestas 429. Todos los umbrales agregados pasaron; 1429 verificaciones pasaron y 1 falló. No es una ejecución sin fallos. p95 inicio 187.57 ms; p95 catálogo 360.76 ms. El log resumido no permite atribuir con certeza la solicitud fallida al servidor o a la cancelación del escenario. El catálogo sigue vacío; no representa consultas con volumen de productos. No hubo operaciones autenticadas ni financieras en producción.

Pruebas adicionales ejecutadas localmente:

- Sintaxis de 13 scripts inline y sincronización de sesión V192: aprobadas.
- Mensajes y comprobantes V372: importes decimales, fechas, privacidad, rechazo de datos incompletos: aprobados.
- Avisos Binance V392/V393: 25 casos aprobados, con validación de fecha, moneda, autenticación del correo, caché e idempotencia de solicitudes. Fuentes externas simuladas; no depósitos reales.
- Integridad financiera V167: 92 comprobaciones aprobadas, sin pagos reales.
- Administración V394 en PC y celular: cambio de contraseña mediante API simulada, nonce, directorio paginado, ficha, bono sin duplicidad ni activación, referidos y cambio de sesión: aprobado.
- Navegación V390: COBRA YA, MI COCHERA y MI ALQUILER a 1366, 390 y 320 px: aprobada con respuestas simuladas.
- MI COCHERA: índice completo, cargadores compartidos y workspace SQL real de la fixture local: aprobado sin errores de página.
- MI ALQUILER: índice completo, resumen SQL real local, formularios, búsqueda, exportaciones y vencimiento en PC/390/320: aprobado. Escrituras simuladas.
- STREAM BULL’S: 39 casos de interfaz/roles en local aprobados; escrituras simuladas.
- Regresión SQL V394 sobre test393: aprobada y revertida.
- Seis aprobaciones concurrentes del mismo bono en test393: un único crédito y saldos reales ficticios conservados. La fixture se limpió al finalizar.

Estas verificaciones complementan la prueba de volumen, pero no equivalen a una prueba de estrés de todos los negocios. No se han probado todas sus funciones con miles de sesiones autenticadas simultáneas. El entorno generador disponible tiene límite de 8 GiB y 2 CPU y unos 367 MiB libres de disco; solo hay PostgreSQL local y fixtures reducidas, no una réplica completa local de Auth, PostgREST y Edge Functions. No se puede certificar la plataforma completa para 10 000 simultáneos con estas condiciones. No se habilitaron servicios de pago ni se ejecutaron 10 000 usuarios sobre producción.
