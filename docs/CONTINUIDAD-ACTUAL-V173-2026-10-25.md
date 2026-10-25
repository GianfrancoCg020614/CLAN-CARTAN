# CLAN CARTAN · estado operativo V173
**Fecha de verificación:** 25 de octubre de 2026 (Perú)  
**Versión publicada:** V173  
**Rama de producción:** `main`  
**Commit:** `4bbdf37fd0225c4a78b8790bd14180d9dcd54849`  
**Sitio oficial:** https://www.clancartan.com/

## Verificación objetiva
- Cloudflare Pages proyecto `clan-cartan`: despliegue de producción `9949afbd-3af9-4ebc-893f-1a139d121d16`, resultado `success`, correspondiente exactamente al commit V173.
- GitHub Actions del commit V173: validación del portal, comprobación de despliegue y construcción/publicación completadas satisfactoriamente. Validación: https://github.com/GianfrancoCg020614/CLAN-CARTAN/actions/runs/40241655207
- Migraciones productivas registradas hasta `20261025220358_cc_stream_public_distributor_v172`. La V173 comprende correcciones de interfaz/sesión y no requiere migración adicional.

## Cambios ya presentes en V169–V173
- Catálogo único con perfiles y pestañas por negocio; carga de flyers desde la administración con almacenamiento sujeto a políticas.
- Precios públicos para visitante/afiliado y precios de distribuidor únicamente cuando corresponda a una membresía verificada de reseller/súper reseller.
- V172 retira la oferta de pruebas gratuitas y mantiene las compras respaldadas por operaciones auténticas, no por saldo ficticio.
- V173 evita duplicar paneles tras renovación del JWT, preserva la pestaña del titular, gestiona el catálogo con JWT expirado sin exponer descuentos, enlaza membresías reales desde portada y oculta la administración antigua.
- No se deben conceder accesos comerciales basándose únicamente en el rol visual ni acreditar dinero a partir de simples comprobantes.

## Datos comerciales comprobados (consulta de solo lectura)
- Productos de STREAM BULL'S: **0**.
- Flyers asociados a productos: **0**.
- Pedidos de STREAM BULL'S: **0**.
- Pruebas temporales registradas en `cc_portal_role_trials`: **0**.
- Membresías generales registradas: **2**; este total **no** demuestra membresía pagada/activa.

## Pendientes para el lanzamiento comercial
1. Subir las **publicaciones reales** desde ADMIN o SUPER_RESELLER autorizado, cada una con servicio, precio público, precio distribuidor, stock, descripción y flyer opcional. No inventar mercancía, precios, imágenes ni compras.
2. Probar manualmente con cuentas autorizadas los tres accesos comerciales (afiliado, reseller y súper reseller), la vista pública y la administración; exigir permiso y estado de membresía respaldados en servidor.
3. Validar en navegador los pasos de compra y pago auténtico, permisos de lectura/escritura, facturación/saldo y recuperación de sesión con credenciales propias. Las pruebas automáticas con mocks no sustituyen esos pasos.
4. No activar medios de cobro externos ni acreditaciones automáticas mientras falte integración y conciliación verificable. Preservar todos los datos productivos y mantener separadas las operaciones de prueba.
5. Mantener como referencia histórica el PR #31 (V163.5, borrador). No fusionarlo directamente con `main` actual: su rama se creó sobre una base antigua.

## Política de cambios
**Conservar registro y autenticación actuales, catálogo y panel únicos, cuatro negocios, datos reales, usuarios, roles y billeteras.** No reinstaurar pruebas gratuitas ni recargas ficticias. Cambios de datos/migraciones requieren revisión y respaldo verificable. Este documento actualiza únicamente la referencia de estado; **no** equivale a autorización para operaciones financieras.
