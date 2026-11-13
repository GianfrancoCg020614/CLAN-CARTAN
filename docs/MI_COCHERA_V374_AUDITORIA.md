# MI COCHERA — Auditoría funcional V374 (13-11-2026)

## Alcance y evidencia
Revisión de `scripts/v158-mi-cochera.js`, `styles/v158-mi-cochera.css` y entrega V373. Auditoría estática; **no** es una prueba de pagos reales ni una certificación de producción.

## Hallazgos
1. **Alquiler diario (alta)**: `load(syncRents=true)` invoca `rpc/mc_sync_rents` al abrir o refrescar; no se observa temporizador para actualizar mientras el módulo permanece abierto después de medianoche. Validar idempotencia del RPC y cierre de día en base de datos antes de automatizar.
2. **Pago (crítica)**: `mc158pay` llama `rpc/mc_record_movement` sin identificador de solicitud. La bandera `busy` evita doble envío simultáneo en la interfaz, pero no prueba idempotencia ante respuesta perdida/reintento. No cambiar RPC ni registrar pagos de prueba en producción sin aprobación de la regla financiera.
3. **Venta (media)**: `mc158sale` llama al mismo RPC para `PRODUCT`; el formulario limita precio a 1.50/2.00/3.00. Evaluar precio libre validado en cliente y servidor y control de precisión, manteniendo registros previos.
4. **Alertas (media)**: `collections` filtra carritos con deuda, pero no se confirma programación de avisos ni estado de envío; WhatsApp abre un mensaje revisable y no lo envía automáticamente.
5. **Moneda (alta)**: la configuración se comparte con MI ALQUILER y COBRA YA. Antes de cambiar país/moneda comprobar datos de los tres negocios, no solo `carts.length`. El RPC actual debe seguir siendo autoridad.
6. **Interfaz (baja)**: V374 reduce espacios y muestra explicación visible para acciones deshabilitadas; verificar en 320, 390 y 1366 px.

## Plan de verificación obligatorio antes de integrar
- Ejecutar regresiones V373 existentes en CI y revisar resultados; pruebas con dos propietarios, aislamiento RLS y sin datos reales.
- Abrir carrito activo sin deuda: pago bloqueado con explicación; venta disponible.
- Abrir carrito con deuda: abono parcial, completo, límite máximo y respuesta de error, exclusivamente en entorno local aislado.
- Simular dos reintentos idénticos del mismo pago en PostgreSQL aislado y documentar si hay duplicación; **no** asumir idempotencia.
- Validar un alquiler diario en cambio de fecha, actualización repetida y carrito retirado.
- Comprobar búsqueda, paginación, historial y moneda con más de 2.000 movimientos.
- Verificar PC/iPhone, menú, X, volver a CLAN CARTAN y activación vencida.
- Confirmar respaldo Git y procedimiento de reversión; antes de migraciones financieras exigir respaldo de base de datos.

## Decisión
V374 sigue como PR pendiente de revisión. No fusionar ni publicar por el solo hecho de aprobar esta auditoría. La idempotencia financiera y alertas requieren especificación y pruebas separadas.

## Verificación directa de producción (solo lectura)
Se consultó `pg_get_functiondef` de `public.mc_record_movement` y `public.mc_sync_rents` en el proyecto Supabase CLAN CARTAN. No se ejecutaron escrituras.

- `mc_record_movement` recibe `p_cart, p_kind, p_label, p_quantity, p_unit, p_amount, p_method`; **no recibe idempotency key**. Bloquea la fila del carrito con `FOR UPDATE`, verifica propiedad y membresía, rechaza pagos mayores que la deuda, y registra un nuevo UUID para cada llamada aceptada.
- Un pago parcial duplicado puede ser aceptado dos veces si la deuda remanente alcanza. La comprobación de deuda no es deduplicación de solicitudes.
- `mc_sync_rents` usa `ON CONFLICT DO NOTHING`; la garantía de unicidad depende también de los índices vigentes. No se ha ejecutado una prueba de concurrencia real.
- Ambas funciones son `SECURITY DEFINER` y verifican `auth.uid()` y propietario; cualquier cambio debe mantener aislamiento y auditar privilegios EXECUTE.

## Propuesta de corrección V375 (requiere pruebas antes de desplegar)
1. Añadir clave de solicitud UUID generada una vez por intento de pago y reutilizada al reintentar el mismo intento; generar una nueva clave solo para un nuevo pago deliberado.
2. Registrar solicitudes de pago en tabla interna protegida por RLS/privilegios, con restricción `UNIQUE (reseller_id, request_id)`, huella de parámetros y UUID del movimiento confirmado.
3. Crear RPC transaccional que serialice por propietario/solicitud y por carrito, valide la membresía y la huella; si ya se completó la solicitud, devolver **el mismo UUID** sin insertar otro movimiento. Si se reutiliza clave con parámetros distintos, rechazar.
4. Mantener el RPC histórico para compatibilidad durante migración, pero no dejar rutas alternativas inseguras accesibles al cliente. Revisar quién lo invoca antes de restringir EXECUTE.
5. Simular en PostgreSQL aislado: 16 reintentos concurrentes iguales => 1 movimiento; 2 solicitudes diferentes mismo importe => 2 movimientos; respuesta perdida => mismo UUID; distinta huella => rechazo; deuda insuficiente, propietario ajeno, activación vencida y reintentos tras sesión nueva.
6. Hacer respaldo verificable y revisión de permisos antes de cualquier DDL; migración aditiva y reversión documentada.

**No se ejecutó esta propuesta en producción** ni se cambió el esquema financiero en V374.
