# CLAN CARTAN V329 — conciliación Lemon
Fecha 2026-11-10. Rama main. Sin STAGING.

Implementado en Supabase:
- Edge Function cc-recharge-mail v16 ACTIVE: extrae payer_name_hint de campo Origen/Remitente/Pagador en correo permitido con DKIM y DMARC.
- Tabla cc_internal.recharge_mail_events.payer_name_hint y guardado desde mail_notice.
- Función privada cc_internal.reconcile_lemon_notice(uuid), acceso solo service_role; se invoca tras guardar un evento nuevo.
- Validaciones: emisor autenticado, proveedor LEMON, PEN, importe exacto, nombre originante igual al perfil y a solicitud, hora de llegada dentro de ventana REC de 15 minutos, referencia única, un solo candidato; bloqueo de filas, bloqueo por transacción, ledger y protección de referencia global; crédito a wallet, órdenes y auditoría en una transacción.
- Si no hay coincidencia, no acredita y queda para revisión. Errores de conciliación se anotan en evento sin perder aviso.

Verificado: función vinculada; execute restringido a service_role; columna existe; tres escenarios de decisión simulados mediante SELECT (no prueba financiera end-to-end): elegible, ambiguo y duplicado.

Pendiente obligatorio: probar integración completa con correo real nuevo, comprobar regex del email Lemon real, validar que 'Origen' significa efectivamente pagador, pruebas de concurrencia/rollback de ledger, observar créditos y verificar deploy Cloudflare. No afirmar que producción financiera esté validada. La antigua REC-100009 sigue pendiente y sin payer_name_hint; no acreditar con transcripción manual.
