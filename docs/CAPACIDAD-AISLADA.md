# Entorno temporal de capacidad autorizado

El propietario autorizó una excepción temporal a «no STAGING» para probar datos ficticios sin contratar servicios de pago. El repositorio es público; el workflow usa exclusivamente un runner estándar ubuntu-latest y un servicio PostgreSQL efímero de GitHub Actions. No crea proyectos de Supabase, Workers, Pages, servidores contratados ni conexiones con las bases productivas.

## Alcance verificable

- PostgreSQL 17 y PostgREST 16.6 real, conectados solo por loopback.
- Migraciones y funciones existentes de billetera, compra, seguridad financiera, recibos y administración, cargadas sobre las fixtures de regresión existentes.
- 10 000 propietarios sintéticos, saldo inicial ficticio de 100 PEN por propietario y 100 productos ficticios de 1 PEN.
- JWT locales firmados para propietarios distintos; validación real de firma en PostgREST y rechazo de consulta administrativa de usuario no administrador.
- Por iteración: consulta de billetera, dos compras simultáneas con la misma clave idempotente y nueva consulta de billetera. Esperado: misma operación y saldo final 99 PEN, independientemente de los reintentos.
- Etapas de 10, 100, 500, 1000, 2500, 5000 y 10 000 VU, 30 s cada una, con pausa de 10 s por iteración. Se detiene al primer incumplimiento: errores >=1 %, p95 >=2 s o memoria del generador excesiva. No se continúa hasta 10 000 si un escalón anterior falla.
- El resultado de saturación se registra en stages.csv y en el JSON de k6; una ejecución de workflow verde solo indica que se recogió el resultado y pasaron los invariantes contables, no que todas las etapas de carga aprobaron.
- Al terminar se cotejan órdenes, saldos y movimientos; ningún débito puede quedar sin su movimiento. PostgreSQL del runner tiene límite de 2 CPU y 2 GiB; PostgREST pool de 30 conexiones. Estos recursos y topología **no equivalen a Cloudflare/Supabase de producción**.

No se ejecutan 10 000 navegadores, inicio de sesión masivo, proveedores externos de pagos, API DNI, correo ni WhatsApp. Las identidades tienen tokens de prueba firmados localmente; no se crea otro login en el producto. Auth real y las funciones de los cuatro negocios tienen regresiones separadas previamente documentadas. Este entorno es representativo de consultas y compras por API, no una réplica exacta de toda la plataforma. Incluso si la etapa de 10 000 pasa, no constituye por sí sola una certificación de producción para todos los negocios.

## Calibración local ejecutada

Se reutilizó el contenedor local existente con una copia descartable llamada capacity, sin conectarlo a redes externas. Un intento inicial de crear otro contenedor excedió el disco local; se retiró únicamente su capa incompleta, recuperando el espacio. No se alteraron las bases existentes. k6 y PostgREST oficiales se verificaron mediante SHA-256.

La calibración de 10 VU durante 30 s realizó 124 solicitudes sin errores, 30 iteraciones y p95 de 41.8 ms. Sesenta intentos de compra produjeron exactamente 10 órdenes y 10 débitos de 1 PEN. Pasaron los invariantes contables. Esta calibración no es el resultado de la prueba grande.

## Reproducción

El workflow `.github/workflows/capacidad-aislada.yml` se ejecuta al publicar esta rama de prueba o manualmente desde Actions una vez registrado en main. Usa scripts/capacity-bootstrap-local.sh, scripts/sql/capacity-http-seed.sql, tests/k6/isolated-finance.js y scripts/capacity-run-stages.sh. Solo admite una base nueva llamada capacity en localhost y exige ISOLATED=YES; el script de carga tiene el destino loopback fijo y no acepta URL de producción.

Los artefactos duran siete días e incluyen etapas, resúmenes, recursos, logs de PostgREST y conciliación. El runner, su API y PostgreSQL se eliminan al terminar. No hay gastos de infraestructura nueva ni se activaron servicios de pago. Detener el workflow cancela la carga y elimina el entorno temporal del runner; la aplicación y sus datos reales permanecen independientes.

## Ejecución ampliada y conservación

PR: https://github.com/GianfrancoCg020614/CLAN-CARTAN/pull/148

Ejecución aislada: https://github.com/GianfrancoCg020614/CLAN-CARTAN/actions/runs/44222284604

La ejecución finalizó y se descargaron/revisaron los artefactos. El workflow terminó correctamente porque recogió los resultados y la conciliación pasó; la etapa de 2500 **falló por latencia** y activó la parada. No se afirma aprobación de 10 000 VU.

| VU | Solicitudes | Fallos HTTP | p95 | Resultado |
| ---: | ---: | ---: | ---: | --- |
| 10 | 124 | 0 | 72.02 ms | Aprobado |
| 100 | 1204 | 0 | 217.09 ms | Aprobado |
| 500 | 6004 | 0 | 471.52 ms | Aprobado |
| 1000 | 12004 | 0 | 1528.26 ms | Aprobado |
| 2500 | 10092 | 19 | 4782.16 ms | Detenido por p95 >=2000 ms |

Total: 29 428 solicitudes y 19 fallos HTTP. La etapa de 2500 se detuvo aproximadamente a los 15.5 s con exit 99. Las etapas de 5000 y 10 000 **no se ejecutaron**. No se elevaron umbrales para conseguir un resultado favorable.

La conciliación posterior encontró exactamente 2500 compradores con una orden cada uno; los reintentos simultáneos no duplicaron órdenes ni débitos. Cada débito conservó su movimiento, y el total de órdenes coincidió con el total descontado. PostgreSQL registró cero deadlocks. La memoria máxima observada de k6 fue 933.54 MiB; no activó su protección de memoria. No se capturó telemetría de CPU por consulta ni latencia por endpoint: el resultado prueba degradación de latencia bajo esa carga, pero no atribuye la causa exacta a CPU, pool, bloqueos, consultas o al generador sin un diagnóstico adicional.

Runner medido: 4 CPU y 15 983 MiB de RAM; base limitada a 2 CPU/2 GiB, pool PostgREST 30 y max_connections 100. No equivale al plan Free productivo ni a su infraestructura. La carga usa JWT prefirmados, sesiones HTTP, pausas de 10 s y compras repetidas con la misma clave, **no** 1000 solicitudes financieras simultáneas sostenidas ni 1000 navegadores. El escalón de 1000 aprobado duró 30 s; no es una prueba prolongada ni de todas las funciones.

Los pasos de cierre del API y eliminación del servicio temporal de GitHub finalizaron; no quedan recursos cloud nuevos. El entorno local de calibración también se eliminó (copia capacity, rol exclusivo y binarios copiados), dejando los contenedores existentes detenidos. No se cambió la aplicación publicada ni su indicador V394.

Conclusión: el objetivo de 10 000 usuarios activos simultáneos **no está demostrado**. Este ensayo encontró un límite reproducible de la fixture con los recursos descritos y comprobó integridad financiera ante reintentos. Para dimensionar producción hace falta diagnosticar la degradación y una prueba con datos/servicios representativos de todos los negocios y de la concurrencia prevista; no se autoriza un aumento de gasto a partir de este resultado.
