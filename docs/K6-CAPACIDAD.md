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
