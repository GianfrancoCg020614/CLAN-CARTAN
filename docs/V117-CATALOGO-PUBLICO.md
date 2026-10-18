# CLAN CARTAN V117 — Catálogo público STREAM BULL'S

Fecha: 18-10-2026. Dominio: https://www.clancartan.com/

## Cambios de interfaz
- Se puede pulsar «Ver catálogo público» y explorar servicios, precios, imágenes, categorías y fichas **sin iniciar sesión**.
- Nueva cabecera simple: marca STREAM BULL'S, Inicio (regresa al portal CLAN CARTAN), Productos, control de tema e Ingresar / Crear cuenta **que llevan al formulario único de CLAN CARTAN**. Una sesión iniciada muestra «Mi cuenta» en vez de formularios adicionales.
- Barra horizontal de categorías **dinámica**, creada a partir de los productos disponibles, con desplazamiento horizontal en celular.
- Buscador central grande «Busca tu producto», que filtra por nombre y categoría. Se conserva la búsqueda sin perder el foco al escribir.
- Se eliminaron del catálogo los menús secundarios, la duplicación de botones de cuenta y el bloque que solicitaba registrarse antes de explorar.
- Tarjetas más amplias y legibles con imagen, precio, descripción breve y **una acción principal** «Comprar» que abre primero la ficha de producto. Productos a pedido muestran «Consultar disponibilidad». Sin stock: estado «Sin stock» y, solo si hay número de vendedor válido, botón WhatsApp.
- Las fichas mantienen descripción, precio, condiciones, vendedor y disponibilidad. Se ocultan accesos redundantes a favoritos y carritos en la ficha para simplificar el recorrido.

## Seguridad y alcance
- «Comprar» en la **tarjeta** lleva al detalle; no descuenta billeteras ni crea pedidos automáticamente.
- El catálogo y la compra simulada heredada todavía manejan inventario ficticio/local; no son ventas transaccionales en Supabase. **No se habilitan cobros con dinero real ni descuentos automáticos del saldo verdadero** hasta tener stock y órdenes verificables en servidor.
- No cambia la asignación de códigos COBRA/BULL, el registro manual, la verificación por correo, permisos, préstamos, billeteras ni precios configurados de los productos existentes.
- Se conserva la rama `resguardo/v116-antes-catalogo-v117-2026-10-18` y el documento `docs/ANOTACIONES-FUTURAS.md` (anotación de ventana de comunidad pendiente).
- Pruebas CI: sintaxis JavaScript, diseño de catálogo, controles de registro y RPC de referidos; Cloudflare comprueba HTML y todos los recursos CSS/JS.
- Navegación visual automatizada completa pendiente por insuficiencia de saldo del proveedor de navegador externo.

## Pendientes para compras reales
Inventario, pedidos, débito atómico de la billetera de STREAM BULL'S y entrega deben conectarse a backend con control de stock concurrente, pagos externos verificados, y pruebas por rol. No utilizar el carrito de demostración como evidencia de cobros reales.
