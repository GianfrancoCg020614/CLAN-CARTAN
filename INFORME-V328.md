# V328 — Pruebas y mejoras de MI COCHERA

Base: V327, commit 6e18263f4049391b852292296e62e28b524a8b00.

## Corregido

- Deuda completa: antes se sumaban únicamente los movimientos descargados con un límite de 2000. Ahora una consulta del servidor suma todos los movimientos propios y conserva las políticas RLS. No modifica importes ni crea registros.
- Listas de carritos y personas con paginación, sin presentar una lista recortada como completa.
- Historial por carrito, ordenado por fecha del movimiento y consultado por páginas, con protección contra respuestas de formularios cerrados.
- Fallar la billetera no bloquea las herramientas de la cochera; muestra saldo sin verificar.
- Filtro Con deuda. Carritos retirados conservan sus deudas y pueden recibir abonos, pero no ofrecen agregar hielo, respetando la regla existente del servidor.
- Validación de importes antes de enviar. Mensajes distintos para una operación guardada cuya lista no pudo refrescarse y para una respuesta no confirmada.
- Recuperación de la apertura sin cerrar toda la plataforma.

## Pruebas

Con datos ficticios: más de 2200 movimientos, abono histórico, carrito sin movimientos, dos propietarios, ADMIN, RLS, suspensión y vencimiento.
Funciones copiadas de producción y ejecutadas en base aislada: registro de carrito, alquiler diario sin duplicar, hielo, abono, rechazo de sobrepago, retiro, reactivación el mismo día, privacidad y cambio de moneda con historial.
Navegador: operaciones, 201 carritos paginados, fallo de billetera, historial tardío, guardado seguido de fallo de actualización, deuda no verificada y membresía vencida. Regresiones previas siguen en CI.
No se realizan pagos, alquileres, registros de personas ni consultas DNI reales de prueba en producción.

## Pendientes reales y límites

CRÍTICO: la RPC existente mc_record_movement no recibe una referencia única de operación. El bloqueo de doble clic no cubre por sí solo una respuesta de red perdida y reenviada después. Esta entrega conserva la RPC y advierte revisar el historial; se recomienda una ampliación transaccional e idempotente, con autorización antes de cambiar el registro de cobros.
La prueba externa de API Perú con un DNI autorizado sigue pendiente; las consultas de identidad de navegador son simuladas.

## Publicación y recuperación

Única migración: 20261106111322_v328_cochera_complete_balances_read_only. Función SECURITY INVOKER, sin permiso para anon, sin ampliar las políticas ni alterar datos.
El código anterior es recuperable desde el commit base. Antes de la desconexión del entorno se guardó copia local en /workspace/backups/v328-before. La continuación usa el mismo repositorio y CI, sin staging ni proyecto nuevo.
La publicación debe comprobarse por commit y meta V328-20261106.
