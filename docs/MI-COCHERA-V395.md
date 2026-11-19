# MI COCHERA V395: interfaz compacta

Actualiza exclusivamente la presentación e interacción del módulo existente. Conserva el logotipo original, activación, roles, sesión, billetera única, RPC, búsqueda paginada, movimientos y reglas financieras. No requiere migración ni modifica otros negocios.

## Cambios

- Paleta grafito con dorado, contraste legible y verde para registrar pagos; tarjetas y tablas con jerarquía consistente.
- Un único «Nuevo carrito» en Inicio y Carritos, junto al título. Se eliminó la cuadrícula de tres columnas que contenía un solo botón y dejaba espacio vacío.
- La ficha destaca pago y producto; calendario, historial y WhatsApp quedan como consultas. Correcciones, fechas anteriores y retiros siguen disponibles en «Más acciones», sin botones repetidos.
- Filas con «Abrir» y selección visible; tarjetas compactas en celular, menú plegable y controles táctiles.
- Menú con nombre accesible y estado expandido actualizado en PC/celular. Estado sin carritos sin panel lateral vacío.
- Carga visual breve, moneda identificada y controles preparados para pantallas de 320 px.
- Estilos anteriores consolidados en la hoja existente; se retiraron reglas y variables de la cuadrícula de acciones obsoleta.
- Versión y parámetros de caché actualizados a V395 para servir los archivos nuevos.

## Validación

Pruebas de navegador locales con datos ficticios a 1366, 390 y 320 px: cabecera/logo/billetera únicos, acción principal única, navegación, búsqueda parcial sin tildes, ventanas emergentes, cierre y retorno a CLAN CARTAN. Acciones avanzadas se comprueban desde su desplegable.

Regresiones V387: moneda del carrito, reintentos de pago con la misma clave, formulario de historial, correcciones que fallan de forma segura y calendario sin inferir pagos inexistentes. Integración del índice completo con el workspace PostgreSQL local: aprobada sin errores JavaScript.

Se verifica además sintaxis inline, integración V158 y configuración compartida de moneda V357. No se registraron pagos, compras ni clientes reales. Las capturas son renders reales de Chromium con **datos ficticios locales**, no capturas de una cuenta productiva.

## Respaldo y reversión

Respaldo recuperable previo: /workspace/mi-cochera-before-v395.bundle, verificado con git bundle verify, base 406240c783fb3466d1988f805d54931991b782ac. Para revertir esta entrega se revierte su commit de integración mediante el flujo GitHub/Cloudflare existente. No hay cambios de esquema ni datos que revertir. No sobrescribir commits posteriores.

La validación publicada comprueba el despliegue de Cloudflare, la versión y los hashes de HTML/JS/CSS. Las operaciones autenticadas de producción no se ejecutan con dinero real como prueba.
