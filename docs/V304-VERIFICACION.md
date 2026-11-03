# V304 — portada y navegación

Base: V303, commit 8a2696ddf0b1856566d397645e320f9c4e11bea1.
Punto de recuperación: rama checkpoint/v303-before-v304.
Sitio oficial: https://www.clancartan.com/

## Cambios

- Una hoja de estilos para la portada y sus dos temas, retirando capas históricas de V217–V303 e inyección visual desde JavaScript.
- Título y subtítulo visibles en HTML; ilustración panorámica sin texto incrustado y marcas con transparencia real.
- Cuatro tarjetas funcionales: cuatro columnas en escritorio, dos en tablet y una en móvil. Un selector de moneda visible.
- Cabecera adaptable sin solapamientos y botones uniformes; contraste corregido en modo día.
- Panel sin accesos duplicados en Resumen; tareas solo cuando existen pendientes; acciones por usuario conservadas.
- Atrás solo cuando hay destino, Cerrar único, Ver ficha/Ocultar ficha y Editar nombre con etiquetas claras.
- Recargas y bonos conservan destino, origen y desplazamiento al inicio; refrescar la misma vista conserva posición.
- Resumen financiero usa la consulta de auditoría existente, sin inventar movimientos o importes.
- Reparado JavaScript de impresión COBRA YA, referencias a nodos retirados y ruta antigua del logo MI COCHERA.
- Términos y privacidad se muestran encima del registro.

## Evidencia y pruebas

La batería de GitHub Actions incluye:

- Análisis de los 13 scripts inline y pruebas existentes de autenticación, identidad, referidos, reglas financieras y módulos.
- Chrome con la página real servida desde el repositorio: 1920, 1366, 768, 390 y 375 px, en día y noche.
- Ausencia de desbordamiento y solapamiento de cabecera, cuatro tarjetas, selector único, botones táctiles y alineación STREAM BULL’S.
- Persistencia de tema y moneda tras recarga; seis accesos públicos/protegidos; correo inválido; catálogo y WhatsApp; términos y privacidad.
- Ausencia de excepciones JavaScript y recursos locales rotos.
- Diez capturas y results.json disponibles como artefacto v304-responsive-chrome de cada ejecución.
- Batería del panel en Chrome para ADMIN, Súper reseller, reseller, afiliado y membresías pendientes. Estos casos usan respuestas de prueba; no equivalen a iniciar sesión en cuentas reales.

Se compararon las diez vistas de la portada candidata con la referencia aportada. El título, las tarjetas y los controles son elementos reales, sin zonas invisibles sobre una captura.

## Conservación y límites

No se modificaron datos, cuentas, saldos, membresías, permisos, esquema ni proyectos de Supabase. No se enviaron recargas, bonos, pagos, correos ni mensajes WhatsApp reales durante las pruebas públicas.

Las verificaciones anteriores de RLS en Supabase fueron transacciones revertidas; no constituyen inicios de sesión en navegador. Sigue pendiente la comprobación integral con sesiones reales de los tres roles y operaciones financieras efectivamente conciliadas.

La publicación requiere validación de la vista previa de Cloudflare y comprobación posterior del dominio oficial. No debe considerarse publicada por el solo hecho de existir este documento o un commit.
