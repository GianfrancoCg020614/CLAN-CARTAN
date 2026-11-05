# V322 — Revisión programada de avisos de depósitos

Base V321. Conserva la única billetera, los REC, las tarifas S/15 mensuales en tres negocios y S/25 anuales en STREAM BULL’S. Esta mejora no acredita dinero ni cambia saldos o vigencias.

Supabase Cron invoca cada cinco minutos un despacho privado. Sin buzones de un ADMIN vigente, o sin remitentes configurados, registra espera y no realiza solicitudes a proveedores. Con conexiones autorizadas, llama al backend existente con un secreto aleatorio guardado en Vault. Solo se guarda su hash para validar la invocación; no aparece en el comando del cron, GitHub, respuestas ni navegador.

Cada ciclo procesa un buzón, hasta cinco mensajes por página. Rota por la última selección programada, conserva el cursor y deduplica por conexión/mensaje. Una reserva temporal evita ciclos simultáneos. Una revocación marca la conexión para renovar autorización. Los errores no se presentan como éxito ni como acreditaciones.

ADMIN ve el estado y la última comprobación, y puede pausar/reanudar. La consulta manual continúa disponible. Se conservan las separaciones de conexiones ADMIN y proveedores STREAM BULL’S.

Validación: SQL aislado para permisos, falso secreto, exclusión concurrente, pausa, espera y rotación; pruebas de backend del programador y regresión ORD/correo; fixture móvil con pausa/reanudación. Los formatos reales y las autorizaciones de terceros no se simulan.

Pendientes que requieren al titular: crear/configurar aplicaciones OAuth de Google/Microsoft y autorizar el correo; validar mensajes reales autorizados; obtener un mecanismo oficial que confirme y asocie inequívocamente cada pago personal con su REC. Un QR personal y una notificación de correo no bastan. Guía: https://www.clancartan.com/recargas-configuracion.html.
