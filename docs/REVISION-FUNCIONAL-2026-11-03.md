# Revisión funcional · 2026-11-03
Se revisó directamente https://www.clancartan.com con Browser Rendering de la cuenta existente de Cloudflare, en escritorio y móvil. No se usó TinyFish.

Hallazgos corregidos:
- El login con noValidate enviaba correos mal formados a Supabase. Se valida el correo antes de enviar y se conserva el control manual de registro.
- Los consentimientos ocultos figuraban como required en login. Solo se requieren en modo registro; el login ya evitaba el bloqueo nativo mediante noValidate.
- El catálogo vacío mostraba ejemplos con estados de disponibilidad y un pie que afirmaba tener productos y precios confirmados. Se etiquetan los ejemplos explícitamente y se corrige el pie sin alterar inventario ni compras.

Comprobaciones:
- Accesos de COBRA YA, MI COCHERA y MI ALQUILER abren autenticación común sin sesión.
- STREAMBULLS abre catálogo público. Búsqueda sin resultados, registro, retorno a login, recuperación inválida y cierre a portada revisados.
- La RPC cc_portal_public_catalog_v3 devuelve 0 publicaciones, confirmado mediante SQL en Supabase.
- No se crearon usuarios, proyectos, pagos ni registros de negocio. No se eliminaron datos.

Límite: no hay sesión de usuario disponible para probar operaciones internas autenticadas, OTP recibido ni pagos reales. No se afirma que esos flujos estén verificados.
