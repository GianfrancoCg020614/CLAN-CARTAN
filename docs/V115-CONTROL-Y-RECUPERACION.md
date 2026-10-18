# CLAN CARTAN V115 — Continuidad, saldos y recuperación

Fecha de revisión: 18-10-2026. Portal: https://www.clancartan.com/

## Ajustes aplicados sin alterar datos de usuarios
- COBRA YA permite actualizar el saldo y la vigencia dentro de su tarjeta, sin cerrar el módulo. El pago continúa siendo voluntario, mediante saldo interno ya disponible: S/ 15 por 30 días en modo de prueba; descuento y activación son una operación atómica en Supabase y no requieren aprobación manual.
- Al registrar un pago exitoso, se cierran las acciones de recarga y transferencia para dejar el plan y sus accesos visibles.
- La afiliación de STREAM BULL'S muestra un pequeño control de actualización de saldo y permite cerrar el diálogo con Escape. El estado visual del usuario se refresca tras el pago ficticio de afiliación de S/ 20.
- La vista general de billeteras deja de mostrar saldos potencialmente antiguos cuando se vuelve a consultar: presenta 'Consultando…', todos los servicios incluidos, o 'No disponible' si falla la lectura.
- Se corrigió la validación de transferencias para aceptar montos monetarios decimales válidos sin falsos rechazos por representación binaria (por ejemplo S/ 0.29). Se mantiene el límite del backend y la prohibición de transferir a otras personas.
- Al volver al portal se cierran las ventanas de COBRA YA y STREAM BULL'S que hayan quedado abiertas.

## Preservación del estado técnico
- Resguardo GitHub previo: `resguardo/v114-antes-mejoras-v115-2026-10-18`.
- Código de la versión en `main`, acciones GitHub y despliegue Cloudflare.
- Archivo `supabase/recovery/v115_critical_functions_snapshot.sql`: copia SOLO de las definiciones de 14 funciones críticas que hoy están desplegadas en Supabase, incluidas las que asignan códigos de invitación, controlan suscripciones, recargas, transferencias y permisos. Es material de auditoría y eventual restauración técnica; NO contiene usuarios, correos, dinero, contraseñas, secretos ni movimientos.
- Se conserva historial de versiones previas. No se ejecutaron DDL ni operaciones financieras en Supabase durante V115.
- Sigue faltando un respaldo externo recuperable completo de la base de datos, almacenamiento, Auth y secretos. Un repositorio de GitHub NO es sustituto de ese respaldo.

## Pruebas y pendientes
- Verificar en GitHub la sintaxis JS, reglas comerciales y endpoints públicos de invitación, y en Cloudflare la versión y sus recursos JS/CSS.
- Último control leído antes del cambio: 6 cuentas, 6 códigos personales, 9 préstamos; no hubo recargas ni transferencias registradas en las tablas consultadas.
- No se completó una prueba visual automatizada: el proveedor externo de navegación informó saldo insuficiente. Esta limitación NO afecta GitHub, Supabase ni Cloudflare.
- Pendientes para integración externa: recargas reales verificadas por proveedor (no comprobantes/capturas), WhatsApp Business API, bonos por mensualidades efectivamente cobradas, revisión jurídica definitiva y prueba con cuentas de cada rol.
- La advertencia de Supabase sobre protección frente a contraseñas filtradas requiere configuración Auth del proyecto; las funciones SECURITY DEFINER deben auditarse individualmente antes de alterar permisos.

## Reglas invariables
CLAN CARTAN opera software; COBRA YA administra préstamos de terceros y NO presta dinero. Billeteras solo para consumir servicios de sus dos negocios bajo la misma cuenta, nunca para retirar, pagar préstamos, ni transferir a otros usuarios. Registro general manual, invitado opcional, código personal consecutivo e irrepetible. Consulta por DNI solo en módulo de clientes COBRA YA.