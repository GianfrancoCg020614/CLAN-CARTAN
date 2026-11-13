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
