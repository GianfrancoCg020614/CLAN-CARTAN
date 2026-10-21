# CLAN CARTAN · MI ALQUILER · V161.1 (parte 1/5)

## Objetivo
Agregar cuarta tarjeta y navegación a MI ALQUILER sin desplegar ni modificar la rama principal.

## Base y límites
- Punto de partida: main con V161 / V161.1 original intactos.
- Nueva tarjeta MI ALQUILER después de MI COCHERA, una sola vez.
- Acceso a panel solo después de detectar sesión existente CLAN CARTAN; sin contraseñas o acceso paralelo.
- Vista de integración sin cifras ni inquilinos ficticios; sin altas, cobros, recargas ni API Perú durante V161.1.
- Ningún permiso, saldos ni datos de MI COCHERA, COBRA YA o STREAM BULL'S se alteran.

## Secuencia de versiones solicitada
- V161.1 (esta entrega): tarjeta y pantalla visual.
- V161.2: entidades e inquilinos en Supabase, RLS por propietario/RESELLER y validaciones.
- V161.3: cobros, deudas, garantías, consumos, gastos, suscripciones y control contable.
- V161.4: avisos WhatsApp al teléfono de cada inquilino, API Perú en backend, reportes, exportación y auditoría.
- V162: pruebas de regresión y seguridad, verificación de cobros de producción y aprobación antes de fusionar/publicar.

## Pruebas de V161.1
- Prueba de navegador local: tarjeta, bloqueo sin sesión, apertura con sesión, pestañas, cierre, sin duplicados y diseño móvil; sin errores JS.
- Prueba de sintaxis Node `--check`: aprobada.
- No se han realizado migraciones ni escrituras financieras.
- La apertura en CLAN CARTAN real requiere probar esta rama en entorno de pruebas.

## Importante
El núcleo V5.2 local/SQLite requiere una migración técnica y validación de privacidad antes de exponer datos de inquilinos en Supabase. No debe copiarse la base local directamente a la web pública.