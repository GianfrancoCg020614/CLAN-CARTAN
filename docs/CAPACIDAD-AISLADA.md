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
