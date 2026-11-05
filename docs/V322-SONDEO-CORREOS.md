# V322 — Revisión programada de avisos de depósitos

Conserva la única billetera, los REC y las tarifas: S/15 mensuales en los tres negocios, STREAM BULL’S S/25 anuales. No acredita dinero ni cambia saldos o periodos.

Cloudflare Worker `clan-cartan-recharge-poller` invoca cada cinco minutos el backend existente. La credencial se genera y guarda como binding secreto en Cloudflare; Supabase solo conserva su hash. No se imprime ni se guarda en GitHub o el navegador. No existen rutas públicas del Worker y las invocaciones HTTP generales devuelven 404. Logs y trazas habilitados sin cuerpos ni credenciales.

Sin conexiones autorizadas o remitentes configurados el backend no consulta proveedores. Cada ciclo procesa un buzón y hasta cinco mensajes por página, rota por selección programada y conserva el cursor. La reserva temporal bloquea ciclos simultáneos; los mensajes repetidos no se duplican. Las revocaciones requieren reautorización. ADMIN puede pausar/reanudar y consultar manualmente.

Se descartó el despacho mediante pg_net al comprobar que las tablas de esa extensión son administradas por Supabase y sus permisos no pueden restringirse desde este rol. No se enviaron solicitudes ni credenciales por esa cola. El job SQL se eliminó, el despacho antiguo se retiró y su credencial de Vault se borró. Las extensiones administradas por Supabase permanecen instaladas sin jobs ni solicitudes de esta integración. El único programador de avisos activo es Cloudflare.

Pruebas: SQL aislado para permisos, secreto falso, exclusión concurrente, pausa, espera, rotación y retirada del job anterior; 27 pruebas ORD, 10 de avisos, siete del programador y tres del Worker; fixture móvil con pausa. Los saldos y suscripciones anteriores se verifican sin cambios.

Pendientes del titular: crear/configurar una aplicación OAuth Google o Microsoft y autorizar el correo; validar formatos reales; disponer de confirmación oficial de pagos personales y una referencia inequívoca por REC. El correo nunca acredita saldo por sí solo. Guía: https://www.clancartan.com/recargas-configuracion.html.

Migraciones iniciales aplicadas: 20261105130549_v322_scheduled_deposit_notices.sql y 20261105131144_v322_private_worker_dispatch.sql. Migración de retirada del job: 20261105131514_v322_remove_legacy_poll_job.sql. Backend final preparado para reflejar espera sin simular consultas.

Validación del primer ciclo: Cloudflare requiere redirect:manual y rechazo explícito de 3xx; PostgREST requiere WHERE singleton en las actualizaciones del estado. Ambos contratos quedan cubiertos por regresiones. Migración de compatibilidad: 20261105134223_v322_scheduler_safe_updates.sql.
