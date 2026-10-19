# V131 — Implementación técnica y estado real, 18-10-2026

## Ejecutado
- Se conservaron V130, registro, RLS de clientes y saldos existentes.
- Se creó la migración aditiva `v131_binance_merchant_orders_fail_closed` **aplicada exitosamente** al proyecto Supabase COBRA-YA. Tablas `cc_binance_merchant_orders` y `cc_binance_merchant_credits`, RLS, unicidad y funciones protegidas.
- Consultas de post-migración: 0 órdenes Merchant, 0 créditos Merchant, 0 billeteras reales; `authenticated` NO puede ejecutar crédito; `service_role` sí.
- Código en GitHub rama `dev/v131-pagos-verificados-ci`: creación de orden fiat PEN contra API Binance Pay Merchant, HMAC-SHA512, firma RSA de webhook, consulta Merchant y acreditación SQL transaccional/idempotente.
- El nuevo frontend de recarga oculta números/QR personales y requiere proveedor habilitado en `cc_auto_topup_method_status`; el servidor sigue devolviendo **false** para Binance y DALE.
- CI pasó en el commit anterior a los últimos cambios. Vuelve a comprobar antes de fusionar.

## Limitaciones y bloqueantes
- Titular dispone de **Binance personal** sin Merchant aprobado ni llaves de API Merchant; este código NO crea órdenes verdaderas con cuenta personal.
- NO se desplegaron las dos funciones de cobro en Supabase; NO se configuraron credenciales reales; NO se realizaron cargos ni transferencias. El flag `CC_BINANCE_MERCHANT_ENABLED` se requiere en ambas funciones y, sin él, responden 503.
- Firma, eventos, nombres de campos y formato de la consulta Merchant deben cotejarse con credenciales/documentación contractual vigente; tests sintéticos NO sustituyen prueba end-to-end con proveedor.
- La migración es infraestructura preparada, NO una autorización comercial ni acreditación de dinero.
- Lemon/DALE también permanece bloqueado hasta confirmar por API/webhook autenticado sus abonos entrantes.
- **No enviar dinero a QR personal para comprobar acreditación:** un pago podría salir sin poder confirmarse/abonarse en la plataforma.

## Siguiente fase
1. Obtener acceso Binance Pay Merchant y parámetros autorizados: Merchant ID, API Key/Secret en secretos de Supabase, certificado verificador de Binance y validación de moneda PEN.
2. Validar contrato de órdenes y notificación real del Merchant contra código; revisar tiempos, conversiones, reembolsos y pagos tardíos.
3. Desplegar funciones con disabled en entorno productivo y realizar diagnóstico 503 no cobrable, luego pruebas de webhooks con credenciales y pago pequeño autorizado.
4. Habilitar `cc_auto_topup_method_status` solo tras superar pruebas reales, auditoría y conciliación.
5. Validar servicios de STREAM BULL'S y COBRA YA consumiendo **saldo real** y no saldo de prueba antes de comercializar.
