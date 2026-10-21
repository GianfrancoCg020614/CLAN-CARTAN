# CLAN CARTAN V158 · MI COCHERA — tercera plataforma integrada con controles comerciales
**Fecha:** 21-OCT-2026. **Base exacta:** main V157.1 commit e566e6f (seguridad Lemon).

## ¿Qué se incorpora?
- Tarjeta **MI COCHERA** como tercer servicio de https://www.clancartan.com, manteniendo las tarjetas COBRA YA y STREAM BULL'S, un solo Supabase Auth y roles ADMIN/RESELLER.
- Emblema original del oso proporcionado por el titular, en versión compacta conservando diseño.
- Registro general permite seleccionar MI COCHERA e invitación opcional tipo `COCHERA1`, `COCHERA2`… El código de invitación de MI COCHERA se genera al abrirla por primera vez, con secuencia exclusiva. La referencia no genera comisión automática.
- **Ocho tablas nuevas** `public.mc_*` con RLS, tenencia por `reseller_id`, acceso solo a cartera propia con suscripción vigente; ADMIN puede leer para auditar. SQL nunca borra la historia de un carro retirado.
- RESELLER: registrar carrito con DNI/documentos extranjeros del propietario/trabajador, apodo, tipo de negocio y tarifa diaria, alquiler por día con cargo idempotente, hielo y otras ventas fiadas, abonos parciales, retiro/reactivación y movimientos. El campo de país y moneda puede definirse antes de crear el primer carrito para no reinterpretar deudas antiguas.
- API Perú `mc-verify-dni`: primero cartera del propio RESELLER, consulta externa solo DNI Perú con autorización documentada, cuota y sesión validada, corrección de identidad verificada sin borrar celular; si no hay cupo/permiso, manual.
- Suscripción voluntaria prevista S/15 por 30 días; **bono gratuito otorgado por ADMIN** ingresa al saldo promocional intransferible y puede pagar S/15 de activación de MI COCHERA mediante RPC idempotente.
- Tercera billetera **real** `MI_COCHERA` en `cc_real_service_wallets` y transferencias internas del MISMO usuario con COBRA YA/STREAM BULL'S vía `mc_transfer_real_balance`, con control de referencia, saldos insuficientes, contabilidad/auditoría general y bloqueo de transferencias de bonos.
- CI `scripts/check-v158-mi-cochera.mjs`; verificaciones previas V138–V142–V136 aceptan los metadatos V158 y conservan todas sus pruebas funcionales.

## Restricciones conservadas sin excepción
- **NO habilitar recargas comerciales con QR PERSONAL Lemon/DALE ni Binance** mientras falte autorización real del proveedor: `collection_enabled=false`, `merchant_permission_verified=false`, `commercial_authorized=false`.
- `YA PAGUÉ`, número de operación o WhatsApp no constituyen confirmación financiera. USDT efectivamente recibidos y neto PEN verdaderamente liquidado deben verificarse independientemente antes de acreditación y con referencia global única. Continuidad de V156/V157 intacta.
- El pago de suscripción real de COBRA YA V157 sigue deshabilitado. El checkout real MI COCHERA **no está habilitado** por ahora, y no se integra a los pagos sin verificación.
- El movimiento de préstamos de COBRA YA no se cobra desde ninguna billetera de CLAN CARTAN.
- Ninguna transferencia entre distintos usuarios o retiros de billeteras. Bonos ADMIN de MI COCHERA no transferibles, contabilizados como promociones, no ingresos.

## Pruebas y estado verificable
- Supabase: migraciones `20261021070000`, `71000`, `72000`, `73000`, `74000`, `75000` de V158 APLICADAS. Edge Function `mc-verify-dni` activa, verify_jwt=true.
- Verificado RLS en 8 tablas originales MI COCHERA y una tabla adicional `mc_real_transfer_requests` también con RLS.
- Pruebas SQL con `BEGIN...ROLLBACK`: bono ADMIN S/15, activación voluntaria, crear carrito, 1 día alquiler, hielo, abono, denegación de lectura a otro RESELLER; transferencia REAL S/5 a MI COCHERA, retransmisión de la misma referencia sin doble abono; tras revertir, **0 nuevos clientes, carritos, bonos o saldos de prueba**.
- GitHub Actions validación de scripts y regresiones preexistentes APROBADA sobre branch V158.

## PENDIENTES para declarar las 20 áreas completas y cobrar comercialmente
1. Acreditación de recargas MI COCHERA solo contra recepción VERIFICADA en proveedor autorizado, Manual y Automática idempotentes; QR Lemon solo imagen pública y Binance Pay ID 1276635702, WhatsApp al número de atención informado por ADMIN, sin PDF obligatorio en web.
2. Checkout S/15 con saldo REAL confirmado (no habilitar antes de cerrar Punto 1 de V157) y notificaciones automáticas 7/3/1 días.
3. Reportes ADMIN comerciales completos, fotos en almacenamiento seguro, inventario de botellas/hielo, factura interna de caja, filtros por estado, ranking exhaustivo, y condiciones legales de SaaS.
4. Verificación con cuentas RESELLER reales autorizadas, UI móvil, pruebas de rendimiento y publicación con pagos comerciales habilitados solo después del proveedor.
5. Comprobar disponibilidad del sitio www.clancartan.com en el despliegue Cloudflare tras la integración. Una rama, migración y CI no prueban por sí solos que Cloudflare haya actualizado.

**Estado de V158:** integración técnica del módulo, base de datos y billetera/bono; **beta controlada, NO lanzamiento comercial total**. No confundir tercer módulo disponible con las 20 áreas completas.
