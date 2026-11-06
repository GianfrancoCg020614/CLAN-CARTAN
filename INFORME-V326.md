# V326 — Activación compacta y saldo disponible común

Base: V325, commit 17852903e917cb298b81aa8378256bd099606f98.
No se modifican esquemas, movimientos, tarifas, comisiones ni permisos de Supabase.

## Mejoras

- Ventana STREAM BULL’S con tarifa anual consultada en `cc_finance_rates`, saldo disponible de `cc_finance_wallet`, importe faltante, Recargar, Activar con mi saldo y Cerrar.
- Consulta la vigencia específica mediante `cc_portal_my_business_access_v316`. Una membresía de otro negocio no concede acceso STREAM. Los usuarios ya activos y ADMIN no reciben otra ventana de activación.
- El cobro conserva la RPC protegida de V325, su referencia idempotente y su confirmación expresa. La tarifa se compara nuevamente tras refrescar el panel; no se cobra un precio cambiado sin volver a consultar.
- La activación confirmada vuelve al catálogo existente y actualiza sus precios. Cancelar no cobra. Una recarga pendiente no habilita fondos; la ventana informa «Recarga en verificación».
- Un componente de presentación reutiliza el saldo central en las cabeceras del panel, portada, catálogo, COBRA YA, MI COCHERA y MI ALQUILER. No añade billeteras ni barras flotantes superpuestas.
- Saldo cero válido, error de consulta explícito, deduplicación de consultas simultáneas, actualización al volver a la pestaña, después de operaciones y mientras la página permanece visible.
- COBRA YA y MI COCHERA dejan de calcular el saldo bruto: usan el disponible confirmado que ya descuenta reversiones. El resumen del panel y la billetera muestran el mismo disponible.
- Los resultados de una sesión anterior se descartan. Al cerrar sesión se limpian todos los saldos; cambiar de cuenta no conserva el importe anterior.
- Confirmación de compra con saldo disponible visible. El catálogo conserva un solo precio aplicable y los enlaces existentes.

## Pruebas

Fixtures con identidades, dinero y pagos ficticios: saldo cero, insuficiente, exacto y superior; cancelación; doble clic; activación vigente; ADMIN; cambio de tarifa; fallo de conexión sin bucle de reintentos; cierre y cambio de sesión con respuesta pendiente; recarga pendiente y posterior saldo confirmado.
Comprobaciones de navegador a 320, 390 y 1440 píxeles, sin desbordamiento; pruebas de regresión de billetera, navegación, activaciones, formularios y seguridad en CI.
No se ejecutan compras, activaciones ni recargas con dinero real para probar.

## Reglas conservadas

S/15 mensuales para COBRA YA, MI COCHERA y MI ALQUILER; S/25 anual para STREAM BULL’S. Renovaciones voluntarias, bonos, comisiones y activaciones independientes permanecen intactos.
No se introduce un precio especial de súper reseller inexistente.
Sin staging: se mantiene el proyecto oficial y la configuración de publicaciones de ramas deshabilitada.

## Recuperación y publicación

Respaldo local de archivos originales: `/workspace/backups/v326-before`; código recuperable desde el commit base.
La publicación debe verificarse mediante commit de producción y meta `V326-20261106` en el dominio oficial. Los resultados finales de CI y despliegue se entregan al terminar.
La prueba real de API Perú sigue siendo independiente y no se declara ejecutada.
