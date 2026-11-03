# V310 — Súper reseller y reseller

Base: V309, 2ec0909eeb16409526f55a7be69c9a19e095cb90.
Sitio: https://www.clancartan.com/

## Correcciones

- Súper reseller: actualizar la vista de publicaciones conserva el formulario real con sus campos, archivo seleccionado y eventos. No se serializa el archivo ni se guarda en almacenamiento local. Tras publicar con éxito se muestra un formulario nuevo y vacío.
- El bloqueo de publicación comienza antes de la validación asíncrona de la imagen y evita envíos simultáneos; el botón permanece bloqueado durante actualizaciones y se recupera después de terminar.
- Entregas: se exige sesión verificada, categoría Súper reseller, pedido propio y estado pendiente. El botón permanece bloqueado mientras se espera; las respuestas de otra sesión se descartan. Se preserva la comprobación en servidor.
- Reseller: «Recargar billetera» desde Negocios usa el historial común del panel, de modo que Atrás regresa al punto de origen y abre la pestaña manual desde arriba.
- Mis compras tiene un solo filtro por estado, conserva la selección al actualizar y sólo muestra compras de la cuenta.
- Se elimina el segundo acceso idéntico al catálogo en la ficha STREAM BULL’S del reseller; el acceso al catálogo público permanece.

## Validación y límites

Fixture de Chrome para Súper reseller y reseller: borrador y archivo conservados, validación de flyer y publicación simuladas, doble envío, estados ocupados, entrega propia simulada y confirmada, compras propias, filtro vacío, actualización, WhatsApp y catálogo con regreso. La red está bloqueada por el fixture; publicaciones, archivos y entregas se simulan en memoria. El módulo real de flyers se verifica además mediante la suite existente, no mediante el sustituto del fixture.

Se conservan las pruebas de ADMIN, afiliado y membresías pendientes, roles, compras, precios, flyers y controles financieros. No se han iniciado sesiones reales con credenciales del propietario, creado productos/pedidos reales, marcado entregas reales ni efectuado pagos. Sin cambios de base de datos, Auth, RPC, RLS, proyectos o widgets.
