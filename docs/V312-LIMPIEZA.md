# V312 — Retirada de interfaces anteriores

Base: V311, a303122bf0443d28fdfe223c692f72b38d1906c2.
Sitio: https://www.clancartan.com/

## Retirado

- Archivo y carga de scripts/v127-wallet-switch.js: pantalla de tres billeteras, selectores de transferencia y llamada manual a su RPC.
- Estilos exclusivos de esa pantalla. Se conserva en su hoja la identidad visual de COBRA YA, que sigue activa.
- Controles y manejadores de transferencia de MI COCHERA y del adaptador de billeteras antiguo.
- HTML y método de transferencia de prueba de la billetera anterior; formulario central de recarga de prueba generado por v113.
- Formulario duplicado de bonos ADMIN en MI COCHERA: reemplazado por una entrada al formulario único, con los permisos del panel vigente.
- Consulta de saldos de prueba en el refresco de cuenta v116, suma visual de dinero real con bonos en MI COCHERA, distintivos de versiones antiguas visibles y promesas de funciones pendientes en MI ALQUILER.

## Se conserva por dependencia o trazabilidad

La API cc80.api continúa atendiendo a módulos activos. Su apertura y recarga conducen a la billetera actual. El nodo oculto cc80wallet se mantiene como soporte técnico de integraciones todavía cargadas; ya no presenta una interfaz alternativa al usuario.

Movimientos, filtros, constancias, CSV y PDF siguen disponibles en un diálogo propio, fuera de ese soporte oculto. El filtro nombra los cuatro negocios como origen del movimiento, sin representar cuatro billeteras que el cliente deba transferir manualmente.

No se eliminan tablas, registros, funciones SQL, migraciones, solicitudes, operaciones ni historial de transferencias. Las comprobaciones financieras históricas de bloqueos, titularidad y aislamiento de bonos se mantienen; las pruebas de interfaz se actualizan para exigir la ausencia del módulo retirado. Los nombres históricos de archivos que aún contienen funciones vigentes no se renombran indiscriminadamente.

## Verificación

Fixture de integración sin red: aperturas antiguas hacia el panel actual, recarga manual, saldo real global separado del bono, ausencia de transferencias manuales, ruta de bonos ADMIN única e historial con filtro, CSV, PDF y regreso. Ninguna transferencia ni pago real se ejecuta.

Suite completa de sintaxis, seis estados de rol, negocios, membresías, formularios, privacidad, saldos, recargas, compras y publicaciones antes de publicar. Sin cambios de base de datos, Auth, RPC o RLS.
