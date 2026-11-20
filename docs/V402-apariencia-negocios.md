# V402 · Negocios más claros y con identidad

Base: V401, 73e52408511a0ce0eeb2c135c8d501e0c3ab230f. Respaldo previo completo y verificado: /workspace/clan-antes-v402.bundle.

Se conserva la organización de los módulos existentes: cabecera única, búsqueda, tarjetas, indicadores, acciones rápidas, listas y navegación. No se añaden botones ni rutas alternativas. Los colores distinguen información y acciones sin sustituir los nombres, iconos o estados.

- COBRA YA: cartera morada, billetera turquesa, indicadores azules/verdes, vencimientos dorados y vencidos rojos; acciones diferenciadas para cliente, préstamo y abono.
- MI COCHERA: identidad ámbar del oso, billetera turquesa y cuatro indicadores diferenciados; pago en verde, creación en ámbar y producto en azul cuando está disponible.
- MI ALQUILER: ocupación dorada y disponibilidad turquesa; indicadores y acciones de inmuebles, inquilinos y contratos diferenciados.
- STREAM BULL’S: identidad dorada, indicadores de atención y acciones existentes con colores diferenciados. Se conserva la separación entre afiliado, reseller, Súper reseller y administrador.

Ambos temas mantienen superficies cómodas, textos legibles, iconos más visibles y estados deshabilitados identificables. La preferencia de tema sigue siendo la existente.

## Correcciones

El botón Ayuda se reutilizaba desde su versión flotante y conservaba z-index 2147483647. Aunque su posición era estática, al ser elemento flex podía dibujarse encima de la cabecera fija durante el desplazamiento. Se restablece su nivel de capa y se contiene la barra de controles; la cabecera y la búsqueda quedan por encima al desplazarse.

MI ALQUILER tenía un fondo oscuro fijo detrás del buscador en modo día. MI COCHERA mantenía filas móviles de fondo crema en modo noche. Ambos usan ahora la superficie del tema activo.

## Verificación

La prueba de navegación comprueba tres colores de indicadores como mínimo, modos día/noche, ayuda integrada con nivel de capa automático y que el buscador de COBRA YA continúa recibiendo el toque durante el desplazamiento. Conserva los casos de navegación, cierre, borrador y regreso al inicio de los cuatro negocios en 1366, 390 y 320px.

La prueba de STREAM BULL’S conserva sus siete perfiles y operaciones simuladas y añade capturas de cada perfil en ambos temas. Las capturas se conservan en artifacts/v402 y como artefactos de GitHub Actions. Se ejecutan además las regresiones existentes de billetera y soporte.

Las pantallas privadas se prueban con datos sintéticos; no se usan operaciones reales ni se modifican clientes, saldos, permisos o activaciones. La entrega solo cambia presentación, metadatos de versión y pruebas. No hay migraciones ni cambios de fórmulas financieras.

Para revertir, revertir el commit de esta entrega en main y publicar mediante el flujo existente de Cloudflare Pages; no se necesita revertir datos ni se crea staging.
